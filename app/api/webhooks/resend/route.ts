import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { Webhook } from "svix"

import type { EmailStatus } from "@/generated/prisma/client"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Resend event type → how it maps to our simple `EmailStatus` lifecycle.
// `null` means "don't override an existing status" (e.g. an `opened` event
// shouldn't clobber a later `clicked` status).
const STATUS_FOR: Record<string, EmailStatus | null> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
}

// "Progress" ranking — a higher ranked event advances status; a lower ranked
// event never walks it back.
const STATUS_RANK: Record<EmailStatus, number> = {
  queued: 0,
  sent: 1,
  delivery_delayed: 2,
  delivered: 3,
  opened: 4,
  clicked: 5,
  bounced: 6,
  complained: 7,
  failed: 8,
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET is not set" },
      { status: 500 }
    )
  }

  const payload = await req.text()
  const h = await headers()
  const svixId = h.get("svix-id")
  const svixTimestamp = h.get("svix-timestamp")
  const svixSignature = h.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 })
  }

  let event: {
    type?: string
    created_at?: string
    data?: Record<string, unknown>
  }
  try {
    event = new Webhook(secret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const type = event.type ?? "unknown"
  const data = (event.data ?? {}) as Record<string, unknown>
  const emailId = typeof data.email_id === "string" ? data.email_id : null

  // Events not tied to an email (e.g. domain.*, contact.*) are acknowledged
  // but not persisted in this minimal email client.
  if (!emailId) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const email = await db.email.findUnique({
    where: { resendId: emailId },
    select: { id: true, status: true },
  })
  if (!email) {
    // Row may not exist yet due to webhook arriving before our DB insert
    // completes, or because the email was sent outside this app. Ack so Resend
    // doesn't retry forever.
    return NextResponse.json({ ok: true, unknown_email: emailId })
  }

  const createdAt = event.created_at ? new Date(event.created_at) : new Date()

  // Idempotency: unique on svixId. If a duplicate arrives, upsert no-ops.
  await db.emailEvent.upsert({
    where: { svixId },
    create: {
      svixId,
      emailId: email.id,
      type,
      createdAt,
      data: event as never,
    },
    update: {},
  })

  const next = STATUS_FOR[type]
  const bumpOpen = type === "email.opened" ? 1 : 0
  const bumpClick = type === "email.clicked" ? 1 : 0

  const advance =
    next !== null && next !== undefined && STATUS_RANK[next] > STATUS_RANK[email.status]

  await db.email.update({
    where: { id: email.id },
    data: {
      lastEventAt: createdAt,
      openCount: { increment: bumpOpen },
      clickCount: { increment: bumpClick },
      ...(advance ? { status: next } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}
