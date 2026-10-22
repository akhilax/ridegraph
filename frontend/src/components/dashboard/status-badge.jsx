// status-badge.jsx - one consistent colour per status, everywhere in the app.
// Colour is never the only signal: every badge also has a text label (and live
// statuses get a pulsing dot).
import { cn } from "@/lib/utils";

const STYLES = {
  // ride statuses
  requested: { label: "Requested", tone: "warning", live: true },
  accepted: { label: "Accepted", tone: "info", live: true },
  ongoing: { label: "Ongoing", tone: "info", live: true },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  // driver statuses
  available: { label: "Available", tone: "success", live: true },
  busy: { label: "On a ride", tone: "info" },
  offline: { label: "Offline", tone: "muted" },
  // payment statuses
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Payment due", tone: "warning" },
};

const TONES = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className, size = "md" }) {
  const s = STYLES[status] || { label: status, tone: "muted" };
  return (
    <span className={cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
      size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs",
      TONES[s.tone], className)}>
      <span className="relative inline-flex size-1.5" aria-hidden="true">
        {s.live && <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
      {s.label}
    </span>
  );
}
