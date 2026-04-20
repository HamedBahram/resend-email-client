import {
  AtSign,
  CheckCircle2,
  Circle,
  Clock,
  MousePointerClick,
  ShieldAlert,
  Send,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import type { EmailEventItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const ICONS: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  "email.sent": { icon: Send, color: "text-blue-500", label: "Sent" },
  "email.delivered": {
    icon: CheckCircle2,
    color: "text-emerald-500",
    label: "Delivered",
  },
  "email.delivery_delayed": {
    icon: Clock,
    color: "text-amber-500",
    label: "Delivery delayed",
  },
  "email.opened": { icon: AtSign, color: "text-violet-500", label: "Opened" },
  "email.clicked": {
    icon: MousePointerClick,
    color: "text-fuchsia-500",
    label: "Clicked",
  },
  "email.bounced": { icon: XCircle, color: "text-red-500", label: "Bounced" },
  "email.complained": {
    icon: ShieldAlert,
    color: "text-red-500",
    label: "Complained",
  },
  "email.failed": { icon: TriangleAlert, color: "text-red-500", label: "Failed" },
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

function getDetail(event: EmailEventItem) {
  if (event.type !== "email.clicked") return null
  const data = event.data as { data?: { click?: { link?: string } } } | null
  const link = data?.data?.click?.link
  return link ?? null
}

export function EventTimeline({ events }: { events: EmailEventItem[] }) {
  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Circle className="size-3" /> Waiting for events…
      </div>
    )
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const meta = ICONS[event.type] ?? {
          icon: Circle,
          color: "text-muted-foreground",
          label: event.type,
        }
        const Icon = meta.icon
        const detail = getDetail(event)
        return (
          <li key={event.id} className="flex items-start gap-3">
            <Icon className={cn("mt-0.5 size-4 shrink-0", meta.color)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium">{meta.label}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {fmtTime(event.createdAt)}
                </span>
              </div>
              {detail ? (
                <a
                  href={detail}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block truncate font-mono text-[11px] text-fuchsia-500 hover:underline"
                  title={detail}
                >
                  {detail}
                </a>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
