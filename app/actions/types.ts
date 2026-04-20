// Types for the send-email server action.
//
// Kept in a separate (non-"use server") module because Next.js 16 requires
// every export from a "use server" file to be an async function. Exporting
// `type` aliases from the action file breaks the bundler with a
// "Cannot access toStringTag" runtime error at import time.

export type SendEmailInput = {
  to: string
  cc?: string
  bcc?: string
  replyTo?: string
  subject: string
  html: string
  text: string
  contentJson?: unknown
}

export type SendEmailResult =
  | { ok: true; id: string; resendId: string }
  | { ok: false; error: string }
