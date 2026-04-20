"use client"

import { Eye, MousePointerClick } from "lucide-react"

import { StatusBadge } from "@/components/status-badge"
import type { EmailListItem } from "@/lib/types"
import { cn } from "@/lib/utils"

function relTime(iso: string) {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const s = Math.max(0, Math.round(diffMs / 1000))
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  const day = Math.round(h / 24)
  if (day < 7) return `${day}d`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function EmailList({
  emails,
  selectedId,
  onSelect,
  query,
  onQueryChange,
}: {
  emails: EmailListItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  query: string
  onQueryChange: (value: string) => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-3 py-2">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search sent…"
          className="w-full rounded-md bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-muted"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-auto">
        {emails.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-muted-foreground">
            {query ? "No matches." : "No sent emails yet. Press c to compose."}
          </li>
        ) : null}
        {emails.map((email) => {
          const isSelected = email.id === selectedId
          return (
            <li key={email.id}>
              <button
                type="button"
                onClick={() => onSelect(email.id)}
                className={cn(
                  "group w-full cursor-pointer border-l-2 border-transparent px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                  isSelected && "border-l-fuchsia-500 bg-muted"
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {email.to.join(", ")}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {relTime(email.sentAt)}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {email.subject || "(no subject)"}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={email.status} />
                  {email.openCount > 0 ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                      <Eye className="size-3" /> {email.openCount}
                    </span>
                  ) : null}
                  {email.clickCount > 0 ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                      <MousePointerClick className="size-3" /> {email.clickCount}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
