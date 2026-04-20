"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { SendEmailInput, SendEmailResult } from "@/app/actions/types"
import { db } from "@/lib/db"
import { FROM, resend } from "@/lib/resend"

const recipient = z.string().trim().email("Invalid email address")

// We accept a comma/whitespace-separated string to keep the client payload
// simple — the UI lets the user type multiple addresses like in Gmail.
const recipientList = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(/[,\s;]+/)
      .map((v) => v.trim())
      .filter(Boolean)
  )
  .pipe(z.array(recipient))

const sendEmailSchema = z.object({
  to: recipientList,
  cc: recipientList.optional(),
  bcc: recipientList.optional(),
  replyTo: recipientList.optional(),
  subject: z.string().trim().min(1, "Subject is required").max(998),
  html: z.string().min(1, "Email body is empty"),
  text: z.string(),
  contentJson: z.unknown().optional(),
})

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const parsed = sendEmailSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const data = parsed.data
  if (data.to.length === 0) {
    return { ok: false, error: "At least one recipient is required" }
  }

  let resendId: string
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: data.to,
      cc: data.cc?.length ? data.cc : undefined,
      bcc: data.bcc?.length ? data.bcc : undefined,
      replyTo: data.replyTo?.length ? data.replyTo : undefined,
      subject: data.subject,
      html: data.html,
      text: data.text,
    })
    if (result.error) {
      return { ok: false, error: result.error.message }
    }
    if (!result.data?.id) {
      return { ok: false, error: "Resend did not return an email id" }
    }
    resendId = result.data.id
  } catch (err) {
    return { ok: false, error: toMessage(err, "Failed to send email") }
  }

  // The email is already in flight at this point.
  // Return a user-safe error instead of throwing across the action boundary.
  try {
    const row = await db.email.create({
      data: {
        resendId,
        from: FROM,
        to: data.to,
        cc: data.cc ?? [],
        bcc: data.bcc ?? [],
        replyTo: data.replyTo ?? [],
        subject: data.subject,
        html: data.html,
        text: data.text,
        contentJson: (data.contentJson ?? null) as never,
        status: "sent",
      },
      select: { id: true, resendId: true },
    })

    revalidatePath("/")
    return { ok: true, id: row.id, resendId: row.resendId! }
  } catch (err) {
    console.error("[sendEmail] DB persist failed", err)
    return {
      ok: false,
      error: `Email sent (Resend id ${resendId}) but failed to record: ${toMessage(
        err,
        "database error"
      )}. Run \`bun run db:push\` to sync the Prisma schema to Neon.`,
    }
  }
}

function toMessage(err: unknown, fallback: string): string {
  try {
    if (typeof err === "string") return err
    if (err && typeof err === "object" && "message" in err) {
      const msg = (err as { message?: unknown }).message
      if (typeof msg === "string" && msg.trim()) return msg
    }
    return fallback
  } catch {
    return fallback
  }
}
