# Resend Mail

A minimal, keyboard-first email client built with:

- **[Resend](https://resend.com)** for sending
- **[React Email editor](https://react.email/docs/editor/overview)** for composing
- **[Resend webhooks](https://resend.com/docs/webhooks/introduction)** (Svix-verified) for open/click/delivery tracking
- **Next.js 16**, **Prisma 7**, and **Neon Postgres**

The UI is a 2-pane Superhuman-style layout with a full per-email event timeline on the right side of every message.

## Prerequisites

1. A **Resend** account with a **verified sending domain** — see [Managing Domains](https://resend.com/docs/dashboard/domains/introduction). Until your domain is verified, Resend will reject sends with `422`.
2. A **Neon** Postgres database — copy both the **pooled** (`-pooler` hostname) and **direct** connection strings.
3. **Bun** (any recent version) — or swap `bun` for `pnpm`/`npm` in the scripts; the lockfile is Bun's.

## Setup

```bash
bun install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon → the **pooled** connection string (hostname contains `-pooler`) |
| `DIRECT_URL` | Neon → the **direct** connection string (used only by `prisma migrate`) |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) — Full access |
| `RESEND_FROM` | e.g. `"You <you@yourdomain.com>"` — must be on a verified domain |
| `RESEND_WEBHOOK_SECRET` | [resend.com/webhooks](https://resend.com/webhooks) — `whsec_…` (added after step 3 below) |

Push the schema and start the dev server:

```bash
bun run db:push
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Keyboard shortcuts

| Key | Action |
|---|---|
| `c` | Compose |
| `j` / `k` | Next / previous email |
| `/` | Focus search |
| `Esc` | Deselect / close composer |
| `⌘↵` / `Ctrl+↵` | Send (in composer) |

## Webhooks: local development with ngrok

The webhook handler (`app/api/webhooks/resend/route.ts`) verifies every request with **Svix**, so you need a real signing secret even in dev.

1. Start the app: `bun run dev`.
2. In another terminal, expose port 3000: `ngrok http 3000`.
3. Copy the HTTPS forwarding URL (e.g. `https://abc123.ngrok.app`).
4. In the [Resend dashboard → Webhooks](https://resend.com/webhooks), click **Add Webhook**:
   - Endpoint URL: `https://abc123.ngrok.app/api/webhooks/resend`
   - Events: select **every `email.*` event** (sent, delivered, delivery_delayed, opened, clicked, bounced, complained, failed).
5. After saving, open the webhook's details page and copy the **Signing Secret** (starts with `whsec_`). Paste it into `.env` as `RESEND_WEBHOOK_SECRET` and restart the dev server.
6. Send yourself a test email from the composer. Within a few seconds the reader's right-side "Activity" panel will start filling in with `Sent → Delivered → Opened → Clicked`.

> Open/click tracking is **off by default on new domains**. Enable it in [Resend → Domains → your domain → Tracking](https://resend.com/docs/dashboard/domains/tracking), otherwise `email.opened` and `email.clicked` events will never fire.

## Deploying to Vercel (production)

1. Push to GitHub and import into Vercel.
2. Add the same environment variables from `.env` to the Vercel project settings.
3. Deploy. Vercel will run `prisma generate` via the `postinstall` script automatically.
4. In the Resend dashboard, add a **second** webhook endpoint pointing at your production URL (`https://your-app.vercel.app/api/webhooks/resend`). Copy its `whsec_…` secret into the Vercel env as `RESEND_WEBHOOK_SECRET` (you can keep the ngrok one for local, they're independent).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                               UI                                    │
│  components/mailbox.tsx  ← 2-pane shell, keyboard shortcuts, SWR    │
│    ├─ components/email-list.tsx                                     │
│    ├─ components/email-reader.tsx (iframes sandboxed HTML + events) │
│    └─ components/compose.tsx (React Email editor + send action)     │
└──────────────────┬──────────────────────────────┬───────────────────┘
                   │ Server Action                │ fetch /api/emails
                   ▼                              ▼
         app/actions/send-email.ts          app/api/emails/[...]
                   │                              │
                   ▼                              │
              Resend SDK ──────────► email         │
                   │                              ▼
                   ▼                        Prisma / Neon
              email row saved             ▲
                                          │
                                          │ webhook events
                                          │
  Resend ──► POST /api/webhooks/resend (Svix-verified, idempotent)
```

### Data model (`prisma/schema.prisma`)

- **`Email`** — one row per outbound message. `status` auto-advances from `sent → delivered → opened → clicked` (monotonic — never walks backwards). Bumps `openCount` and `clickCount` as events arrive.
- **`EmailEvent`** — raw append-only log, keyed by the webhook's `svix-id` for idempotency. The reader panel renders these as a timeline.

### Sending

`app/actions/send-email.ts` is a Next server action. It calls the editor's `getEmail()` ref to get `{ html, text }`, passes them through `resend.emails.send()`, and persists the returned Resend `id` on the row. Webhooks later find the row by `resendId`.

`components/compose.tsx` normalizes the editor JSON (`JSON.parse(JSON.stringify(...))`) before sending it as `contentJson`. This keeps the payload plain/serializable for the server-action boundary in Next.js 16.

### Webhook handler

`app/api/webhooks/resend/route.ts`:

1. Reads the raw body + `svix-id`/`svix-timestamp`/`svix-signature` headers.
2. Verifies with `new Webhook(secret).verify(...)` — rejects with `401` on invalid signatures.
3. `upsert`s an `EmailEvent` keyed on `svix-id` so retried deliveries are no-ops ([Resend retries up to 6 times](https://resend.com/docs/webhooks/introduction#delivery-guarantees)).
4. Advances `Email.status` using a monotonic rank table so out-of-order events don't corrupt state.

## Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Next dev server (Turbopack) |
| `bun run build` | Production build |
| `bun run db:push` | Push schema without migrations (dev) |
| `bun run db:migrate` | Create + apply a migration |
| `bun run db:studio` | Open Prisma Studio |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |

## What's not included

Kept intentionally out of scope for this build:

- Inbound email / replies / threading (would use [Resend Inbound](https://resend.com/docs/dashboard/receiving/introduction))
- Auth / multi-user support
- Drafts, scheduled sends, attachments, labels, contacts

These all map cleanly onto the current schema and handler structure if you want to extend.
