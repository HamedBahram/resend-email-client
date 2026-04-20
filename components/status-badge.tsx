import type { EmailStatus } from "@/generated/prisma/client"

import { cn } from "@/lib/utils"

const STYLES: Record<EmailStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  delivery_delayed:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  delivered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  opened: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  clicked: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  bounced: "bg-red-500/10 text-red-600 dark:text-red-400",
  complained: "bg-red-500/10 text-red-600 dark:text-red-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
}

const LABEL: Record<EmailStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  delivery_delayed: "Delayed",
  delivered: "Delivered",
  opened: "Opened",
  clicked: "Clicked",
  bounced: "Bounced",
  complained: "Complained",
  failed: "Failed",
}

export function StatusBadge({
  status,
  className,
}: {
  status: EmailStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight",
        STYLES[status],
        className
      )}
    >
      {LABEL[status]}
    </span>
  )
}
