"use client"

import { Eye, MousePointerClick, RefreshCw } from "lucide-react"
import { useTheme } from "next-themes"
import useSWR from "swr"

import { EventTimeline } from "@/components/event-timeline"
import { StatusBadge } from "@/components/status-badge"
import type { EmailDetail } from "@/lib/types"
import { cn } from "@/lib/utils"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load email")
  const json = (await res.json()) as { email: EmailDetail }
  return json.email
}

function fmtFullTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function EmailReader({ id }: { id: string | null }) {
  const { resolvedTheme } = useTheme()
  const { data: email, isLoading, mutate } = useSWR(
    id ? `/api/emails/${id}` : null,
    fetcher,
    { refreshInterval: 5_000 }
  )

  if (!id) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Nothing selected</p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
            Press <Kbd>c</Kbd> to compose, <Kbd>j</Kbd>/<Kbd>k</Kbd> to navigate
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !email) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">
              {email.subject || "(no subject)"}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>to</span>
              <span className="truncate font-mono">{email.to.join(", ")}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span>from</span>
              <span className="truncate font-mono">{email.from}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => mutate()}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Refresh"
            >
              <RefreshCw className="size-3.5" />
            </button>
            <StatusBadge status={email.status} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
          <span>{fmtFullTime(email.sentAt)}</span>
          <span className="flex items-center gap-1">
            <Eye className="size-3" /> {email.openCount}
          </span>
          <span className="flex items-center gap-1">
            <MousePointerClick className="size-3" /> {email.clickCount}
          </span>
          {email.resendId ? (
            <span className="truncate" title={email.resendId}>
              id: {email.resendId.slice(0, 8)}…
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_280px]">
        <div className="min-h-0 overflow-auto">
          <iframe
            title="Email preview"
            srcDoc={withPreviewTheme(email.html, resolvedTheme === "dark")}
            sandbox="allow-same-origin"
            className="h-full w-full border-0 bg-card"
          />
        </div>
        <aside className="min-h-0 overflow-auto border-l border-border bg-muted/30 px-4 py-5">
          <h2 className="mb-3 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Activity
          </h2>
          <EventTimeline events={email.events} />
        </aside>
      </div>
    </div>
  )
}

function withPreviewTheme(html: string, isDark: boolean): string {
  const fallbackBackground = isDark ? "oklch(0.145 0.008 326)" : "#ffffff"
  const fallbackForeground = isDark ? "oklch(0.985 0 0)" : "#111827"
  const style = `<style id="resend-preview-theme">html,body{margin:0;min-height:100%;background:${fallbackBackground};color:${fallbackForeground};font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.55;}body{padding:24px 28px;}</style>`

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}${style}`)
  }
  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html(\s[^>]*)?>/i, (m) => `${m}<head>${style}</head>`)
  }
  return `<!doctype html><html><head>${style}</head><body>${html}</body></html>`
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "mx-0.5 inline-flex min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground"
      )}
    >
      {children}
    </kbd>
  )
}
