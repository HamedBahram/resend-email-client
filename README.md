# Resend Mail

A keyboard-first outbound email client built with:

- **Send with [Resend](https://resend.com)**
- **Compose with [React Email Editor](https://react.email/docs/editor/overview)**
- **Track events via [Resend webhooks](https://resend.com/docs/webhooks/introduction)** (Svix-verified)
- **Stack:** Next.js 16, Prisma 7, Neon Postgres

The UI is a 2-pane mailbox (list + reader) with a per-email activity timeline.

## Quick Start

### 1) Prerequisites

- A Resend account and a verified sending domain
- A Neon Postgres database (both pooled and direct connection strings)
- Bun (or swap `bun` for your package manager of choice)

### 2) Install and configure

```bash
bun install
cp .env.example .env
```

Set these variables in `.env`:

| Variable                | Value                                                           |
| ----------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`          | Neon pooled URL (hostname includes `-pooler`)                   |
| `DIRECT_URL`            | Neon direct URL (used by `prisma migrate`)                      |
| `RESEND_API_KEY`        | API key from [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM`           | Verified sender, e.g. `"You <you@yourdomain.com>"`              |
| `RESEND_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) from Resend                |

### 3) Run

```bash
bun run db:push
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Keyboard Shortcuts

| Key             | Action                            |
| --------------- | --------------------------------- |
| `c`             | Open composer                     |
| `j` / `k`       | Next / previous email             |
| `/`             | Focus search                      |
| `Esc`           | Close composer or clear selection |
| `⌘↵` / `Ctrl+↵` | Send email (inside composer)      |

## Local Webhooks (ngrok)

The webhook endpoint at `app/api/webhooks/resend/route.ts` verifies Svix signatures, so you must use a real `whsec_...` secret in development.

1. Start the app: `bun run dev`
2. Expose localhost: `ngrok http 3000`
3. In Resend Webhooks, add:
   - URL: `https://<your-ngrok-subdomain>.ngrok.app/api/webhooks/resend`
   - Events: all `email.*` events
4. Copy the webhook signing secret into `.env` as `RESEND_WEBHOOK_SECRET`
5. Restart the app and send a test email

> New domains may have open/click tracking disabled by default. Enable it in [Domain Tracking settings](https://resend.com/docs/dashboard/domains/tracking) if `email.opened` / `email.clicked` events do not appear.

## Deploy to Vercel

1. Push to GitHub and import into Vercel
2. Add the same environment variables from `.env`
3. Deploy (the `postinstall` script runs `prisma generate`)
4. Add a production webhook endpoint:
   `https://<your-app>.vercel.app/api/webhooks/resend`

Use a separate production `RESEND_WEBHOOK_SECRET` value from the local ngrok one.

## How It Works

### Sending flow

1. `components/compose.tsx` builds `{ html, text, contentJson }` from the editor
2. `app/actions/send-email.ts` validates input and sends through `resend.emails.send(...)`
3. The app stores the outbound row in `Email` with `resendId`

### Tracking flow

1. Resend posts to `POST /api/webhooks/resend`
2. The handler verifies Svix headers/signature
3. Events are upserted into `EmailEvent` keyed by `svixId` (idempotent)
4. `Email.status` advances via monotonic rank (out-of-order events do not roll state back)
5. `openCount` / `clickCount` increment on `email.opened` / `email.clicked`

### API routes

| Route                       | Purpose                             |
| --------------------------- | ----------------------------------- |
| `GET /api/emails`           | List latest sent emails             |
| `GET /api/emails/:id`       | Fetch one email with ordered events |
| `POST /api/webhooks/resend` | Verify + persist webhook events     |

## Data Model

- `Email`: one outbound message with recipient fields, rendered content, status, and counters
- `EmailEvent`: append-only raw webhook log for timeline/debugging

See `prisma/schema.prisma` for details.

## Scripts

| Command              | Purpose                        |
| -------------------- | ------------------------------ |
| `bun run dev`        | Next.js dev server (Turbopack) |
| `bun run build`      | Production build               |
| `bun run start`      | Run production server          |
| `bun run lint`       | ESLint                         |
| `bun run typecheck`  | TypeScript check               |
| `bun run db:push`    | Push Prisma schema (dev)       |
| `bun run db:migrate` | Create/apply migration         |
| `bun run db:studio`  | Open Prisma Studio             |

## Out of Scope

Intentionally excluded for this project:

- Inbound email, replies, or threading
- Auth / multi-user support
- Drafts, scheduled sends, attachments, labels, contacts
