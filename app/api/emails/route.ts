import { NextResponse } from "next/server"

import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const emails = await db.email.findMany({
    orderBy: { sentAt: "desc" },
    take: 200,
    select: {
      id: true,
      resendId: true,
      from: true,
      to: true,
      subject: true,
      status: true,
      sentAt: true,
      lastEventAt: true,
      openCount: true,
      clickCount: true,
    },
  })

  return NextResponse.json({ emails })
}
