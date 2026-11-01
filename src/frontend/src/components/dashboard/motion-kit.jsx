// motion-kit.jsx - small animation helpers shared by the dashboards.
// Every animation is short (150-400 ms) and switches off with "reduce motion"
// (Framer Motion does that through <MotionConfig reducedMotion="user"> in main.jsx).
import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";

import { EASE_OUT } from "@/lib/motion";

// Fade + rise in, staggered by index i (lists, stat cards).
export function FadeIn({ i = 0, y = 10, className, children, as = "div", ...rest }) {
  const Comp = motion[as];
  return (
    <Comp className={className} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.05, ease: EASE_OUT }} {...rest}>
      {children}
    </Comp>
  );
}

// Same, but only when the element scrolls into view (once).
export function Reveal({ className, children, delay = 0 }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.35, delay, ease: EASE_OUT }}>
      {children}
    </motion.div>
  );
}

// A number that counts up to its value (and animates smoothly when it changes).
export function CountUp({ value, format = (v) => Math.round(v), duration = 0.4 }) {
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
  return <span className="tabular-nums">{reduce ? format(value) : text}</span>;
}
