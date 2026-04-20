"use client"

import { Inbox, Mail, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Toaster } from "sonner"
import useSWR from "swr"

import { Compose } from "@/components/compose"
import { EmailList } from "@/components/email-list"
import { EmailReader } from "@/components/email-reader"
import type { EmailListItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load emails")
  const json = (await res.json()) as { emails: EmailListItem[] }
  return json.emails
}

function isTypingTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable) return true
  const tag = t.tagName.toLowerCase()
  return tag === "input" || tag === "textarea" || tag === "select"
}

export function Mailbox() {
  const { data: emails = [], mutate } = useSWR<EmailListItem[]>(
    "/api/emails",
    fetcher,
    { refreshInterval: 5_000, revalidateOnFocus: true }
  )

  const [rawSelectedId, setSelectedId] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return emails
    const q = query.toLowerCase()
    return emails.filter((e) => {
      const hay = [e.subject, e.to.join(" "), e.from, e.status]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [emails, query])

  // Normalize selection during render to avoid setState-in-effect cascades:
  // if the selected id is missing from the filtered list (or nothing is
  // selected yet), fall back to the first item in view.
  const selectedId: string | null =
    rawSelectedId && filtered.some((e) => e.id === rawSelectedId)
      ? rawSelectedId
      : (filtered[0]?.id ?? null)

  const moveSelection = useCallback(
    (delta: 1 | -1) => {
      if (filtered.length === 0) return
      const currentIndex = Math.max(
        0,
        filtered.findIndex((e) => e.id === selectedId)
      )
      const nextIndex = Math.min(
        filtered.length - 1,
        Math.max(0, currentIndex + delta)
      )
      setSelectedId(filtered[nextIndex].id)
    },
    [filtered, selectedId]
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (composeOpen) return
      if (isTypingTarget(e.target)) return

      if (e.key === "c") {
        e.preventDefault()
        setComposeOpen(true)
        return
      }
      if (e.key === "j") {
        e.preventDefault()
        moveSelection(1)
        return
      }
      if (e.key === "k") {
        e.preventDefault()
        moveSelection(-1)
        return
      }
      if (e.key === "/") {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder="Search sent…"]'
        )
        input?.focus()
        return
      }
      if (e.key === "Escape") {
        setSelectedId(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [composeOpen, moveSelection])

  const handleSent = useCallback(
    (id: string) => {
      mutate()
      setSelectedId(id)
    },
    [mutate]
  )

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <TopBar
        total={emails.length}
        onCompose={() => setComposeOpen(true)}
      />
      <div className="grid min-h-0 flex-1 grid-cols-[360px_1fr]">
        <aside className="min-h-0 border-r border-border bg-sidebar">
          <EmailList
            emails={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            query={query}
            onQueryChange={setQuery}
          />
        </aside>
        <main className="min-h-0">
          <EmailReader id={selectedId} />
        </main>
      </div>

      <Compose
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={handleSent}
      />
      <Toaster position="bottom-right" theme="system" />
    </div>
  )
}

function TopBar({ total, onCompose }: { total: number; onCompose: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-2">
      <div className="flex items-center gap-2">
        <Mail className="size-4 text-fuchsia-500" />
        <span className="text-sm font-semibold tracking-tight">Resend Mail</span>
        <span className="hidden items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
          <Inbox className="size-3" /> Sent · {total}
        </span>
      </div>
      <button
        type="button"
        onClick={onCompose}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        )}
      >
        <Plus className="size-3.5" /> Compose
        <kbd className="ml-1 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1 font-mono text-[10px]">
          c
        </kbd>
      </button>
    </header>
  )
}
