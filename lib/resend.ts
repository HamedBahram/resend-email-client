import { Resend } from "resend"

if (!process.env.RESEND_API_KEY) {
  // We don't throw here because Next.js may import this during build; we surface
  // a clear error only when actually invoked.
  console.warn("[resend] RESEND_API_KEY is not set")
}

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev"
