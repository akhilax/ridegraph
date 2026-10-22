// ride-visuals.jsx - ride progress stepper, route line, "searching" radar, star rating, confetti
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CarFront, CarTaxiFront, Check, CircleCheckBig, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";
import { StatusBadge } from "./status-badge";

// ---------- requested -> accepted -> completed ----------
const STEPS = [
  { key: "requested", label: "Requested", icon: Clock },
  { key: "accepted", label: "Driver on the way", icon: CarFront },
  { key: "completed", label: "Completed", icon: CircleCheckBig },
];

export function Stepper({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-md bg-danger-soft px-4 py-3 text-sm">
        <StatusBadge status="cancelled" /> <span className="text-destructive">This ride was cancelled.</span>
      </div>
    );
  }
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === status));
  const finished = status === "completed";
  return (
    <ol className="relative grid grid-cols-3" aria-label={`Ride progress: ${STEPS[idx].label}`}>
      {/* track + animated fill behind the step dots */}
      <div className="absolute top-5 right-[16.66%] left-[16.66%] h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }}
          animate={{ width: `${(idx / (STEPS.length - 1)) * 100}%` }} transition={{ duration: 0.4, ease: EASE_OUT }} />
      </div>
      {STEPS.map((step, i) => {
        const reached = i <= idx;
        const current = i === idx && !finished;
        const Icon = i < idx || finished ? Check : step.icon;
        return (
          <li key={step.key} className="relative flex flex-col items-center gap-2 text-center"
            aria-current={current ? "step" : undefined}>
            <span className="relative inline-flex">
              {current && <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" aria-hidden="true" />}
              <span className={cn("relative inline-flex size-10 items-center justify-center rounded-full border-2 transition-colors duration-300",
                reached ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </span>
            <span className={cn("text-xs font-medium", reached ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- pickup -> drop-off line; the car drives along it while the driver is on the way ----------
export function RouteLine({ from, to, status, distance }) {
  const reduce = useReducedMotion();
  const driving = status === "accepted";
  const rest = status === "completed" ? "100%" : "0%";
  return (
    <div>
      <div className="flex items-start justify-between gap-6 text-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />Pickup
          </div>
          <div className="mt-0.5 font-semibold">{from}</div>
        </div>
        <div className="min-w-0 text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />Drop-off
          </div>
          <div className="mt-0.5 font-semibold">{to}</div>
        </div>
      </div>
      <div className="relative mx-2 mt-3 h-8" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-border" />
        <motion.div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" initial={{ left: rest }}
          animate={driving && !reduce ? { left: ["0%", "100%"] } : { left: driving ? "50%" : rest }}
          transition={driving && !reduce ? { duration: 5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4, ease: EASE_OUT }}>
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float">
            <CarFront className="size-4" />
          </span>
        </motion.div>
      </div>
      {distance != null && <div className="text-center text-xs text-muted-foreground">{distance} km straight-line</div>}
    </div>
  );
}

// ---------- ripple "searching" loader ----------
export function Radar({ text = "Finding nearby drivers..." }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8" role="status">
      <div className="relative grid size-16 place-items-center">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-primary/40 bg-primary/10"
            initial={{ scale: 0.4, opacity: 0.8 }} animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }} />
        ))}
        <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float">
          <CarTaxiFront className="size-6" aria-hidden="true" />
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// ---------- star rating: pops when picked; read-only version for history ----------
export function Stars({ value, onChange, readOnly = false, size = "md" }) {
  const box = size === "sm" ? "size-4" : "size-7";
  if (readOnly) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={cn(box, n <= value ? "fill-gold text-gold" : "text-border")} aria-hidden="true" />
        ))}
      </span>
    );
  }
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Rate your driver">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
          animate={n === value ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}
          className="inline-flex size-11 items-center justify-center rounded-md">
          <Star className={cn(box, "transition-colors duration-150", n <= value ? "fill-gold text-gold" : "text-muted-foreground/50")} aria-hidden="true" />
        </motion.button>
      ))}
    </div>
  );
}

// ---------- confetti burst after a completed / paid ride (decorative, never blocks clicks) ----------
const CONFETTI = ["var(--primary)", "var(--gold)", "var(--success)", "var(--info)"];
function makePieces() {
  return Array.from({ length: 60 }, (_, i) => ({
    id: i, x: (Math.random() - 0.5) * 820, up: -(Math.random() * 320 + 120), spin: Math.random() * 720 - 360,
    color: CONFETTI[i % CONFETTI.length], size: 6 + Math.random() * 7, delay: Math.random() * 0.12,
  }));
}
export function Confetti({ onDone }) {
  const reduce = useReducedMotion();
  const [pieces] = useState(makePieces);
  useEffect(() => {
    const t = setTimeout(() => onDone && onDone(), 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed top-[40%] left-1/2 z-[70] size-0" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span key={p.id} className="absolute block rounded-[2px]"
          style={{ background: p.color, width: p.size, height: p.size * 0.6 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.up, p.up + 640], opacity: [1, 1, 0], rotate: p.spin }}
          transition={{ duration: 1.8, delay: p.delay, ease: "easeOut", times: [0, 0.35, 1] }} />
      ))}
    </div>
  );
}
