// ride-card.jsx - one ride as a row that expands smoothly to show its details.
// Used for driver requests, driver history and rider history.
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CalendarClock, CarFront, ChevronDown, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate, money } from "@/utils";
import { StatusBadge } from "./status-badge";
import { EASE_OUT } from "@/lib/motion";

// fresh = a brand-new request: it springs in, glows and gets a "New" tag so drivers notice it
export function RideCard({ ride, index = 0, defaultOpen = false, fresh = false, children, className }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `ride-${ride.ride_id}-details`;

  return (
    <motion.article layout="position"
      initial={fresh ? { opacity: 0, y: -18, scale: 0.97 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
      transition={fresh ? { type: "spring", stiffness: 380, damping: 26 } : { duration: 0.3, delay: Math.min(index, 8) * 0.04, ease: EASE_OUT }}
      className={cn("overflow-hidden rounded-md border bg-card transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-card",
        fresh && "border-primary/50 ring-2 ring-primary/25", className)}>
      {/* two lines: route + fare on top, details + status below (reads well in narrow columns too) */}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={bodyId}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1.5 px-5 py-4 text-left transition-colors hover:bg-muted/40">
        <div className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
          <span className="truncate" title={ride.pickup}>{ride.pickup}</span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-label="to" />
          <span className="size-2 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
          <span className="truncate" title={ride.dropoff}>{ride.dropoff}</span>
          {fresh && <span className="ml-1 shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold tracking-wide text-primary-foreground uppercase">New</span>}
        </div>
        <span className="text-right text-base font-bold tabular-nums">{money(ride.fare_amount)}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="row-span-2 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground">
          <ChevronDown className="size-5" aria-hidden="true" />
          <span className="sr-only">{open ? "Hide details" : "Show details"}</span>
        </motion.span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" aria-hidden="true" />{fmtDate(ride.requested_at)}</span>
          <span className="inline-flex items-center gap-1"><CarFront className="size-3.5" aria-hidden="true" />{ride.ride_type}</span>
          <span className="inline-flex items-center gap-1"><Route className="size-3.5" aria-hidden="true" />{ride.distance_km} km</span>
        </div>
        <span className="justify-self-end"><StatusBadge status={ride.status} /></span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={bodyId} key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.18 } }} transition={{ duration: 0.26, ease: EASE_OUT }}
            className="overflow-hidden">
            <div className="grid gap-4 border-t border-dashed px-5 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

// label/value pairs inside an expanded ride (rider, driver, payment ...)
export function DetailList({ items }) {
  const rows = items.filter(Boolean);
  if (!rows.length) return null;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
