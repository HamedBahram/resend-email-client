import type { EmailStatus } from "@/generated/prisma/client"

export type EmailListItem = {
  id: string
  resendId: string | null
  from: string
  to: string[]
  subject: string
  status: EmailStatus
  sentAt: string
  lastEventAt: string | null
  openCount: number
  clickCount: number
}

export type EmailEventItem = {
  id: string
  type: string
  createdAt: string
  data: unknown
}

export type EmailDetail = EmailListItem & {
  cc: string[]
  bcc: string[]
  replyTo: string[]
  html: string
  text: string
  events: EmailEventItem[]
}
