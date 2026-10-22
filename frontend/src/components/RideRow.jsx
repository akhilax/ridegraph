// RideRow.jsx - one ride shown as a compact row that expands when clicked
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "./ride-ui";
import { fmtDate, money } from "../utils";

export default function RideRow({ ride, index = 0, defaultOpen = false, live = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div className={`ride ${live ? "live" : ""}`}
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, delay: Math.min(index, 10) * 0.06 }} whileHover={{ y: -2 }}>
      <button type="button" className="ride-sum" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="main">
          <div className="route-line">{ride.pickup} → {ride.dropoff}</div>
          <div className="when">{fmtDate(ride.requested_at)} · {ride.ride_type} · {ride.distance_km} km</div>
        </div>
        <span className="amt">{money(ride.fare_amount)}</span>
        <Badge status={ride.status} />
        <motion.span className="chev" animate={{ rotate: open ? 90 : 0 }}>›</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="ride-body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
