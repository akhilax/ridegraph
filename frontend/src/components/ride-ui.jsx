// ride-ui.jsx - small animated building blocks for the ride screens
import { useEffect, useRef, useState } from "react";
import { motion, animate, useReducedMotion, AnimatePresence } from "motion/react";

// ---------- status badge ----------
export function Badge({ status }) {
  return <span className={`badge b-${status}`}>{status}</span>;
}

// ---------- skeleton loaders (grey shimmering placeholders) ----------
export function Skeleton({ h = 16, w = "100%", r = 8, style }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} aria-hidden="true" />;
}
export function SkeletonList({ n = 3, h = 64 }) {
  return (
    <div role="status" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => <Skeleton key={i} h={h} r={12} style={{ marginBottom: 10 }} />)}
    </div>
  );
}

// ---------- fade + slide in, one after another (stagger with index i) ----------
export function FadeIn({ i = 0, y = 16, className, children, ...rest }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(i, 12) * 0.07, ease: "easeOut" }} {...rest}>
      {children}
    </motion.div>
  );
}

// ---------- number that counts up from 0 ----------
export function CountUp({ value, format = (v) => Math.round(v), duration = 1.1 }) {
  const reduce = useReducedMotion();
  const from = useRef(0);
  const [text, setText] = useState(() => format(0));
  useEffect(() => {
    if (reduce) return;                      // reduced motion: the final value is shown directly below
    const controls = animate(from.current, value, { duration, ease: "easeOut", onUpdate: (v) => setText(format(v)) });
    from.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);
  return <span>{reduce ? format(value) : text}</span>;
}

// ---------- star rating that bounces when you pick a star ----------
export function Stars({ value, onChange, readOnly = false }) {
  return (
    <div className="stars" role={readOnly ? "img" : "radiogroup"} aria-label={`Rating: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button key={n} type="button" className={`star ${n <= value ? "on" : ""}`} disabled={readOnly}
          role={readOnly ? undefined : "radio"} aria-checked={n === value} aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange && onChange(n)}
          whileHover={readOnly ? undefined : { scale: 1.3 }} whileTap={readOnly ? undefined : { scale: 0.75 }}
          animate={n === value && !readOnly ? { scale: [1, 1.7, 1], rotate: [0, -18, 0] } : { scale: 1 }}
          transition={{ duration: 0.45 }}>
          ★
        </motion.button>
      ))}
    </div>
  );
}

// ---------- confetti burst (success!) ----------
const COLORS = ["#6B1E3C", "#B8860B", "#1B1B2F", "#e6b422", "#c2527a", "#2e7d32"];
// random pieces are created once per burst (outside render, see useState below)
function makePieces() {
  return Array.from({ length: 70 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 900,
    up: -(Math.random() * 380 + 140),
    spin: Math.random() * 900 - 450,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 0.15,
  }));
}
export function Confetti({ onDone }) {
  const reduce = useReducedMotion();
  const [pieces] = useState(makePieces);
  useEffect(() => {
    const t = setTimeout(() => onDone && onDone(), 2700);
    return () => clearTimeout(t);
  }, [onDone]);
  if (reduce) return null;               // respect "reduce motion"
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span key={p.id} className="piece" style={{ background: p.color, width: p.size, height: p.size * 0.6 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.up, p.up + 750], opacity: [1, 1, 0], rotate: p.spin }}
          transition={{ duration: 2.5, delay: p.delay, ease: "easeOut", times: [0, 0.35, 1] }} />
      ))}
    </div>
  );
}

// ---------- radar / ripple "searching" animation ----------
export function Radar({ text = "Finding nearby drivers..." }) {
  return (
    <div className="radar-wrap" role="status">
      <div className="radar">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="radar-ring" initial={{ scale: 0.2, opacity: 0.7 }}
            animate={{ scale: 2.6, opacity: 0 }}
            transition={{ duration: 2.1, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }} />
        ))}
        <span className="radar-icon">🚖</span>
      </div>
      <div className="meta">{text}</div>
    </div>
  );
}

// ---------- ride progress stepper: requested -> accepted -> completed ----------
const STEPS = [["requested", "Requested"], ["accepted", "Driver on the way"], ["completed", "Completed"]];
export function Stepper({ status }) {
  if (status === "cancelled") {
    return <div className="stepper-cancelled"><Badge status="cancelled" /> This ride was cancelled</div>;
  }
  const idx = STEPS.findIndex((s) => s[0] === status);
  const live = status !== "completed";
  return (
    <div className="stepper" aria-label={`Ride status: ${status}`}>
      <div className="track">
        <motion.div className="fill" initial={{ width: 0 }} animate={{ width: `${(idx / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
      {STEPS.map(([key, label], i) => {
        const done = i < idx || (status === "completed" && i === idx);
        return (
          <div key={key} className={`step ${i <= idx ? "reached" : ""}`}>
            <motion.div className="step-dot" animate={i === idx && live ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={i === idx && live ? { repeat: Infinity, duration: 1.4 } : { duration: 0.3 }}>
              {done ? "✓" : i + 1}
            </motion.div>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- pickup -> dropoff route with a car driving along it ----------
export function RouteCar({ from, to, status, distance }) {
  const reduce = useReducedMotion();
  const driving = status === "accepted" || status === "preview";
  const rest = status === "completed" ? "100%" : "0%";
  return (
    <div className="routecar">
      <div className="ends">
        <div><span className="pin start" />Pickup<b>{from}</b></div>
        <div className="right"><span className="pin end" />Dropoff<b>{to}</b></div>
      </div>
      <div className="roadline">
        <div className="roadline-dash" />
        <motion.div className="car" initial={{ left: rest }}
          animate={driving && !reduce ? { left: ["0%", "100%"] } : { left: reduce && driving ? "50%" : rest }}
          transition={driving ? { duration: 4.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.8 }}>
          <span className="car-icon">🚗</span>
        </motion.div>
      </div>
      {distance != null && <div className="meta center">{distance} km</div>}
    </div>
  );
}

// ---------- two-step confirm button ("Cancel ride" -> "Sure? Yes / No") ----------
export function ConfirmButton({ label, confirmLabel = "Yes, cancel", onConfirm, disabled }) {
  const [asking, setAsking] = useState(false);
  return (
    <AnimatePresence mode="wait" initial={false}>
      {asking ? (
        <motion.span key="ask" className="row-inline" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
          <span className="meta">Are you sure?</span>
          <motion.button className="small danger" whileTap={{ scale: 0.94 }} disabled={disabled}
            onClick={() => { setAsking(false); onConfirm(); }}>{confirmLabel}</motion.button>
          <motion.button className="small ghost" whileTap={{ scale: 0.94 }} onClick={() => setAsking(false)}>No</motion.button>
        </motion.span>
      ) : (
        <motion.button key="btn" className="small ghost" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }} disabled={disabled} onClick={() => setAsking(true)}>
          {label}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
