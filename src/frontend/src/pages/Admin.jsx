// Admin.jsx - statistics for the whole system (data from GET /api/admin/stats)
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Ban, Car, CircleCheckBig, IndianRupee, LayoutDashboard, MapPinned, RotateCw, Route, Star, Trophy, UsersRound,
} from "lucide-react";
import { api } from "../api";
import { money } from "../utils";
import { EASE_OUT } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Page, PageHeader, SectionNav } from "@/components/dashboard/app-shell";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
import { EmptyState, ErrorState, Panel } from "@/components/dashboard/panel";
import { CountUp, Reveal } from "@/components/dashboard/motion-kit";
import { Stars } from "@/components/dashboard/ride-visuals";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "zones", label: "Rides by zone", icon: MapPinned },
  { id: "drivers", label: "Top drivers", icon: Trophy },
  { id: "cancellations", label: "Cancellations", icon: Ban },
];
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

// horizontal bar that grows from the left (scaleX, so no layout work while animating)
function Bar({ value, max, delay = 0, tone = "bg-primary" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <motion.div className={`h-full origin-left rounded-full ${tone}`}
        initial={{ scaleX: 0 }} whileInView={{ scaleX: max ? value / max : 0 }} viewport={{ once: true }}
        transition={{ duration: 0.4, delay, ease: EASE_OUT }} />
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // same request as before; also used by the Refresh / Retry buttons
  const load = useCallback(() => {
    setRefreshing(true);
    return api("GET", "/api/admin/stats")
      .then((s) => { setStats(s); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  }, []);
  useEffect(() => {
    api("GET", "/api/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  const s = stats;
  const zoneMax = s ? Math.max(1, ...s.rides_per_zone.map((z) => z.rides)) : 1;
  const zoneTotal = s ? s.rides_per_zone.reduce((n, z) => n + z.rides, 0) : 0;
  const by = s?.cancellations_by || {};

  return (
    <Page>
      <PageHeader title="Admin dashboard" subtitle="How RideGraph is doing across Chennai"
        actions={(
          <Button variant="outline" onClick={load} disabled={refreshing}>
            <RotateCw className={refreshing ? "animate-spin" : undefined} aria-hidden="true" />Refresh
          </Button>
        )} />

      <div className="flex gap-8">
        <SectionNav items={SECTIONS} label="Admin sections" />

        <div className="grid min-w-0 flex-1 gap-8">
          {error && <ErrorState message={error} onRetry={load} />}

          {/* ----- overview ----- */}
          <section id="overview" aria-label="Overview" className="scroll-mt-24">
            <div className="grid grid-cols-3 gap-5 2xl:grid-cols-6">
              {!s ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />) : (
                <>
                  <StatCard i={0} icon={Route} tint="info" label="Total rides" value={s.total_rides} />
                  <StatCard i={1} icon={IndianRupee} tint="success" label="Revenue" value={s.revenue} format={(v) => money(v)}
                    hint={s.completed_rides ? `Avg ${money(s.revenue / s.completed_rides)} per completed ride` : "Completed rides only"} />
                  <StatCard i={2} icon={CircleCheckBig} tint="success" label="Completed" value={s.completed_rides}
                    hint={`${pct(s.completed_rides, s.total_rides)}% of all rides`} />
                  <StatCard i={3} icon={Ban} tint="danger" label="Cancellations" value={s.cancellation_count}
                    hint={`${pct(s.cancellation_count, s.total_rides)}% of all rides`} />
                  <StatCard i={4} icon={UsersRound} tint="primary" label="Riders" value={s.riders} />
                  <StatCard i={5} icon={Car} tint="gold" label="Drivers" value={s.drivers} />
                </>
              )}
            </div>
          </section>

          <div className="grid grid-cols-2 items-start gap-8">
            {/* ----- rides per zone ----- */}
            <Reveal>
              <Panel id="zones" title="Rides by zone" count={s?.rides_per_zone.length}
                description="Where rides start (pickup zone)" bodyClassName="px-2 pb-2 pt-0">
                {!s ? <div className="grid gap-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}</div>
                  : s.rides_per_zone.length === 0 ? <div className="p-4"><EmptyState icon={MapPinned} title="No zones yet" /></div> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Zone</TableHead>
                          <TableHead className="w-24 text-right">Rides</TableHead>
                          <TableHead className="w-[45%] pr-4">Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.rides_per_zone.map((z, i) => (
                          <motion.tr key={z.zone_name} data-slot="table-row" className="border-b transition-colors hover:bg-muted/50"
                            initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            transition={{ duration: 0.25, delay: i * 0.04 }}>
                            <TableCell className="pl-4 font-medium">{z.zone_name}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums"><CountUp value={z.rides} /></TableCell>
                            <TableCell className="pr-4">
                              <div className="flex items-center gap-3">
                                <Bar value={z.rides} max={zoneMax} delay={0.1 + i * 0.04} />
                                <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{pct(z.rides, zoneTotal)}%</span>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </Panel>
            </Reveal>

            {/* ----- top drivers ----- */}
            <Reveal delay={0.05}>
              <Panel id="drivers" title="Top-rated drivers" count={s?.top_drivers.length}
                description="Highest average rating, with completed rides" bodyClassName="px-2 pb-2 pt-0">
                {!s ? <div className="grid gap-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}</div>
                  : s.top_drivers.length === 0 ? <div className="p-4"><EmptyState icon={Trophy} title="No rated drivers yet" description="Drivers appear here after their first completed ride." /></div> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 pl-4">#</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead className="pr-4 text-right">Completed rides</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.top_drivers.map((d, i) => (
                          <motion.tr key={d.driver_id} data-slot="table-row" className="border-b transition-colors hover:bg-muted/50"
                            initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            transition={{ duration: 0.25, delay: i * 0.04 }}>
                            <TableCell className="pl-4">
                              <span className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary" aria-hidden="true">{d.name[0]}</span>
                                <span className="font-medium">{d.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-2">
                                <Stars value={Math.round(d.rating_avg)} readOnly size="sm" />
                                <span className="font-semibold tabular-nums">{Number(d.rating_avg).toFixed(2)}</span>
                              </span>
                            </TableCell>
                            <TableCell className="pr-4 text-right font-semibold tabular-nums">{d.completed_rides}</TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </Panel>
            </Reveal>
          </div>

          {/* ----- cancellations ----- */}
          <Reveal>
            <Panel id="cancellations" title="Cancellations" count={s?.cancellation_count}
              description="Who cancelled, out of all cancelled rides">
              {!s ? <Skeleton className="h-24" /> : s.cancellation_count === 0 ? (
                <EmptyState icon={Star} title="No cancellations" description="Every ride so far has gone ahead." />
              ) : (
                <div className="grid grid-cols-3 gap-8">
                  {[["By riders", by.rider || 0, "bg-warning"], ["By drivers", by.driver || 0, "bg-destructive"]].map(([label, n, tone], i) => (
                    <div key={label} className="grid gap-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium text-muted-foreground">{label}</span>
                        <span className="text-2xl font-bold tabular-nums"><CountUp value={n} /></span>
                      </div>
                      <Bar value={n} max={s.cancellation_count} tone={tone} delay={0.1 + i * 0.05} />
                      <span className="text-xs text-muted-foreground">{pct(n, s.cancellation_count)}% of cancellations</span>
                    </div>
                  ))}
                  <div className="grid content-start gap-1 rounded-md bg-muted/50 p-4">
                    <span className="text-sm font-medium text-muted-foreground">Cancellation rate</span>
                    <span className="text-2xl font-bold tabular-nums">{pct(s.cancellation_count, s.total_rides)}%</span>
                    <span className="text-xs text-muted-foreground">{s.cancellation_count} of {s.total_rides} rides</span>
                  </div>
                </div>
              )}
            </Panel>
          </Reveal>
        </div>
      </div>
    </Page>
  );
}
