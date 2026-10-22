// Admin.jsx - statistics for the whole system
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { money } from "../utils";
import { CountUp, FadeIn, Skeleton } from "../components/ui";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("GET", "/api/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <main className="container"><div className="msg error">{error}</div></main>;
  if (!stats) {
    return (
      <main className="container">
        <div className="stats">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={92} r={16} />)}</div>
        <div className="grid"><Skeleton h={240} r={16} /><Skeleton h={240} r={16} /></div>
      </main>
    );
  }

  const max = Math.max(1, ...stats.rides_per_zone.map((z) => z.rides));
  const by = stats.cancellations_by;
  const cards = [
    ["Total rides", stats.total_rides, (v) => Math.round(v)],
    ["Revenue", stats.revenue, (v) => money(v)],
    ["Completed", stats.completed_rides, (v) => Math.round(v)],
    ["Cancellations", stats.cancellation_count, (v) => Math.round(v)],
  ];

  return (
    <main className="container">
      <div className="stats">
        {cards.map(([label, value, fmt], i) => (
          <FadeIn key={label} i={i} className="stat"><div className="n"><CountUp value={value} format={fmt} /></div><div className="l">{label}</div></FadeIn>
        ))}
      </div>

      <div className="grid">
        <FadeIn className="card" i={4}>
          <h2>Rides per zone</h2>
          {stats.rides_per_zone.map((z, i) => (
            <div className="bar-row" key={z.zone_name}>
              <div className="name">{z.zone_name}</div>
              <div className="bar-track">
                <motion.div className="bar" initial={{ width: 0 }} animate={{ width: `${(z.rides / max) * 100}%` }}
                  transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease: "easeOut" }} />
              </div>
              <b><CountUp value={z.rides} duration={0.9} /></b>
            </div>
          ))}
        </FadeIn>

        <FadeIn className="card" i={5}>
          <h2>Top-rated drivers</h2>
          <table>
            <thead><tr><th>Driver</th><th>Rating</th><th>Rides</th></tr></thead>
            <tbody>
              {stats.top_drivers.map((d, i) => (
                <motion.tr key={d.driver_id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }}>
                  <td>{d.name}</td><td>★ {Number(d.rating_avg).toFixed(2)}</td><td>{d.completed_rides}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          <p className="meta" style={{ marginTop: 14 }}>
            Cancellations: {by.rider || 0} by riders · {by.driver || 0} by drivers · {stats.riders} riders · {stats.drivers} drivers in total
          </p>
        </FadeIn>
      </div>
    </main>
  );
}
