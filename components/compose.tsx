"use client"

import { EmailEditor, type EmailEditorRef } from "@react-email/editor"
import "@react-email/editor/themes/default.css"

import { Loader2, Send, X } from "lucide-react"
import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import { toast } from "sonner"

import { sendEmail } from "@/app/actions/send-email"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EMPTY_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

// The editor's built-in "basic"/"minimal" themes hard-code body and container
// backgrounds to #ffffff, which creates a visible white slab inside a
// dark-themed composer. We override both to transparent so the editor inherits
// the surrounding card color. For the exported email this is actually fine:
// mail clients (Gmail, Apple Mail, Outlook) apply their own body background,
// and most real-world emails don't force one either.
const COMPOSER_THEME = {
  extends: "minimal",
  styles: {
    body: { backgroundColor: "transparent" },
    container: {
      backgroundColor: "transparent",
      color: "inherit",
    },
  },
} as const

const EDITOR_COLOR_VARS = {
  "--re-bg": "var(--popover)",
  "--re-border": "var(--border)",
  "--re-text": "var(--foreground)",
  "--re-text-muted": "var(--muted-foreground)",
  "--re-hover": "var(--muted)",
  "--re-active": "var(--accent)",
  "--re-pressed": "var(--accent)",
} as CSSProperties

export function Compose({
  open,
  onClose,
  onSent,
}: {
  open: boolean
  onClose: () => void
  onSent: (id: string) => void
}) {
  const editorRef = useRef<EmailEditorRef>(null)
  const toRef = useRef<HTMLInputElement>(null)
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      queueMicrotask(() => toRef.current?.focus())
    }
  }, [open])

  function handleSend() {
    const ref = editorRef.current
    if (!ref) return

    startTransition(async () => {
      const { html, text } = await ref.getEmail()
      // Keep the payload plain/serializable for server actions.
      const contentJson = toPlainJson(ref.getJSON())

      const result = await sendEmail({
        to,
        cc: showCc ? cc : undefined,
        bcc: showCc ? bcc : undefined,
        subject,
        html,
        text,
        contentJson,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Sent")
      onSent(result.id)
      onClose()
    })
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        handleSend()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, to, cc, bcc, subject, showCc])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="flex h-[min(800px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-fuchsia-500" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              New message
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="border-b border-border px-4 py-2 text-sm">
          <div className="flex items-center gap-2">
            <label
              className="w-14 shrink-0 text-xs text-muted-foreground"
              htmlFor="to"
            >
              To
            </label>
            <input
              id="to"
              ref={toRef}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="jane@example.com, john@example.com"
              className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/60"
              autoComplete="off"
            />
            {!showCc ? (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              >
                Cc/Bcc
              </button>
            ) : null}
          </div>
          {showCc ? (
            <>
              <div className="flex items-center gap-2 border-t border-border/60 pt-1">
                <label
                  className="w-14 shrink-0 text-xs text-muted-foreground"
                  htmlFor="cc"
                >
                  Cc
                </label>
                <input
                  id="cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="flex-1 bg-transparent py-1.5 text-sm outline-none"
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2 border-t border-border/60 pt-1">
                <label
                  className="w-14 shrink-0 text-xs text-muted-foreground"
                  htmlFor="bcc"
                >
                  Bcc
                </label>
                <input
                  id="bcc"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="flex-1 bg-transparent py-1.5 text-sm outline-none"
                  autoComplete="off"
                />
              </div>
            </>
          ) : null}
          <div className="flex items-center gap-2 border-t border-border/60 pt-1">
            <label
              className="w-14 shrink-0 text-xs text-muted-foreground"
              htmlFor="subject"
            >
              Subject
            </label>
            <input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/60"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto" style={EDITOR_COLOR_VARS}>
          <EmailEditor
            ref={editorRef}
            content={EMPTY_CONTENT}
            theme={COMPOSER_THEME}
            placeholder='Write your message — try "/" for blocks.'
            className="min-h-full bg-card px-6 py-4 text-foreground"
          />
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            <kbd className={kbd}>⌘</kbd>
            <kbd className={kbd}>↵</kbd> to send ·{" "}
            <kbd className={kbd}>Esc</kbd> to discard
          </p>
          <Button onClick={handleSend} disabled={isPending} size="sm">
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send
          </Button>
        </footer>
      </div>
      <style jsx global>{`
        [data-re-slash-command] {
          background: var(--popover);
          border-color: var(--border);
        }

        [data-re-slash-command-item],
        [data-re-slash-command-item] svg,
        [data-re-slash-command-category],
        [data-re-slash-command-empty] {
          color: var(--popover-foreground);
        }

        [data-re-slash-command-item]:hover,
        [data-re-slash-command-item][data-selected] {
          background: var(--muted);
        }
      `}</style>
    </div>
  )
}

const kbd = cn(
  "mx-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground"
)

function toPlainJson(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return undefined
  }
}
