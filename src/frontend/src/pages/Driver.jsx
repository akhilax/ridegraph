// Driver.jsx - earnings, requests in my zone (accept), current ride (complete), history
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck, Car, CircleCheckBig, Gauge, History, Inbox, MapPin, Radio, Star, Wallet, WifiOff, XCircle,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { usePolling } from "../hooks";
import { money } from "../utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Page, PageHeader } from "@/components/dashboard/app-shell";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
import { EmptyState, ErrorState, ListSkeleton, Panel } from "@/components/dashboard/panel";
import { DetailList, RideCard } from "@/components/dashboard/ride-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Confetti, RouteLine, Stars, Stepper } from "@/components/dashboard/ride-visuals";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";

// Rider + payment + rating details shown inside an expanded ride
function rideDetails(ride) {
  return [
    ["Rider", `${ride.rider_name} · ${ride.rider_phone}`],
    ride.status === "completed" && ["Payment", (
      <span className="inline-flex items-center gap-2">
        <StatusBadge status={ride.payment_status === "paid" ? "paid" : "pending"} />
        {ride.payment_status === "paid" && <span className="text-muted-foreground capitalize">via {ride.payment_method}</span>}
      </span>
    )],
    ride.status === "completed" && ride.rating_score != null && ["Rating", (
      <span className="inline-flex items-center gap-2"><Stars value={ride.rating_score} readOnly size="sm" />
        {ride.rating_comment && <span className="text-muted-foreground">"{ride.rating_comment}"</span>}</span>
    )],
    ride.status === "cancelled" && ["Cancelled", `by ${ride.cancelled_by}: ${ride.cancel_reason}`],
  ];
}

function InlineError({ text }) {
  return text ? <p role="alert" className="text-sm font-medium text-destructive">{text}</p> : null;
}

export default function Driver() {
  const { session } = useAuth();
  const me = session.user;
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState(null);
  const [mine, setMine] = useState(null);            // {rides, total_earnings, completed_rides}
  const [error, setError] = useState("");
  const [rideError, setRideError] = useState({});    // per-ride error text
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(false);
  // UI only: which requests arrived since the page opened (they get highlighted for a few seconds)
  const seenRequests = useRef(null);
  const [fresh, setFresh] = useState(() => new Set());

  const load = useCallback(async () => {
    try {
      const [p, r, m] = await Promise.all([
        api("GET", `/api/drivers/${me.driver_id}`),
        api("GET", `/api/drivers/${me.driver_id}/requests`),
        api("GET", `/api/drivers/${me.driver_id}/rides`),
      ]);
      setProfile(p); setRequests(r); setMine(m); setError("");

      // highlight requests we haven't seen before (not on the very first load)
      const ids = r.map((x) => x.ride_id);
      if (seenRequests.current === null) {
        seenRequests.current = new Set(ids);
      } else {
        const added = ids.filter((id) => !seenRequests.current.has(id));
        ids.forEach((id) => seenRequests.current.add(id));
        if (added.length) {
          setFresh((f) => new Set([...f, ...added]));
          toast(added.length === 1 ? "New ride request in your zone" : `${added.length} new ride requests in your zone`);
          setTimeout(() => setFresh((f) => { const n = new Set(f); added.forEach((id) => n.delete(id)); return n; }), 8000);
        }
      }
    } catch (e) { setError(e.message); }
  }, [me.driver_id, toast]);
  usePolling(load, 5000);                            // new requests appear without refreshing

  async function act(ride, action, body, okText, celebrate) {
    setBusy(true);
    setRideError((x) => ({ ...x, [ride.ride_id]: "" }));
    try {
      await api("POST", `/api/rides/${ride.ride_id}/${action}`, { driver_id: me.driver_id, ...body });
      toast(okText);
      if (celebrate) setBurst(true);
      await load();
    } catch (e) { setRideError((x) => ({ ...x, [ride.ride_id]: e.message })); }
    setBusy(false);
  }
  const stopBurst = useCallback(() => setBurst(false), []);

  const loading = !profile || !mine;
  const current = (mine?.rides || []).filter((r) => r.status === "accepted");
  const past = (mine?.rides || []).filter((r) => r.status !== "accepted");
  const available = profile?.status === "available";
  const firstName = (me.name || "").split(" ")[0];

  return (
    <Page>
      {burst && <Confetti onDone={stopBurst} />}

      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={profile ? (
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{profile.zone_name} zone</span>
            <span className="inline-flex items-center gap-1.5"><Car className="size-4" aria-hidden="true" />{profile.color} {profile.model}</span>
            <span className="rounded-sm border bg-card px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-foreground">{profile.plate_number}</span>
          </span>
        ) : <Skeleton className="h-5 w-80" />}
      />

      {/* first load failed: nothing to show yet */}
      {error && !profile && <ErrorState message={error} onRetry={load} className="mb-6" />}
      {/* a later refresh failed: keep showing the last data */}
      {error && profile && (
        <div role="status" className="mb-6 flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-warning">
          <WifiOff className="size-4" aria-hidden="true" />Connection problem. Retrying automatically...
        </div>
      )}

      {/* ----- stat cards that count up ----- */}
      <div className="mb-8 grid grid-cols-4 gap-5">
        {loading ? [0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard i={0} icon={Wallet} tint="success" label="Total earnings" value={mine.total_earnings} format={(v) => money(v)} />
            <StatCard i={1} icon={CircleCheckBig} tint="info" label="Completed rides" value={mine.completed_rides} />
            <StatCard i={2} icon={Star} tint="gold" label="Rating" value={Number(profile.rating_avg)} format={(v) => v.toFixed(2)} hint="Average from riders" />
            <StatCard i={3} icon={Gauge} tint="primary" label="Status" value={<StatusBadge status={profile.status} size="lg" />}
              hint={available ? "You can accept requests" : "Finish your ride to accept more"} />
          </>
        )}
      </div>

      <div className="grid grid-cols-12 items-start gap-6">
        <div className="col-span-7 grid gap-6">
          {/* ----- ride in progress ----- */}
          <AnimatePresence initial={false}>
            {current.map((r) => (
              <motion.div key={r.ride_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }} transition={{ duration: 0.3 }}>
                <Panel title="Current ride" className="border-primary/40 ring-2 ring-primary/15"
                  description={`${r.ride_type} · ${r.distance_km} km`}
                  actions={<span className="text-2xl font-bold tabular-nums">{money(r.fare_amount)}</span>}
                  bodyClassName="grid gap-6">
                  <Stepper status={r.status} />
                  <RouteLine from={r.pickup} to={r.dropoff} status={r.status} distance={r.distance_km} />
                  <DetailList items={rideDetails(r)} />
                  <div className="flex items-center gap-3 border-t pt-5">
                    <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90" disabled={busy}
                      onClick={() => act(r, "complete", {}, "Ride completed 🎉", true)}>
                      <BadgeCheck aria-hidden="true" />Complete ride
                    </Button>
                    <ConfirmDialog
                      trigger={<Button size="lg" variant="outline" disabled={busy}><XCircle aria-hidden="true" />Cancel ride</Button>}
                      title="Cancel this ride?" confirmLabel="Yes, cancel ride"
                      description={`The rider at ${r.pickup} will be told the ride was cancelled by the driver.`}
                      onConfirm={() => act(r, "cancel", { cancelled_by: "driver", reason: "Cancelled by driver" }, "Ride cancelled")} />
                    <InlineError text={rideError[r.ride_id]} />
                  </div>
                </Panel>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ----- open requests in my zone ----- */}
          <Panel title="Requests in my zone" count={requests?.length}
            description={profile ? `Riders waiting for pickup in ${profile.zone_name}` : "Riders waiting for pickup"}
            actions={(
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Radio className="size-4 text-success" aria-hidden="true" />Live · updates every 5 s
              </span>
            )}>
            {requests === null ? (error ? <EmptyState icon={WifiOff} title="Requests unavailable" description="They'll appear here once the connection is back." /> : <ListSkeleton rows={2} />)
              : requests.length === 0 ? (
                <EmptyState icon={Inbox} title="No open requests right now"
                  description="New requests in your zone will pop up here automatically." />
              ) : (
                <div className="grid gap-3" aria-live="polite">
                  {!available && (
                    <p className="rounded-md bg-info-soft px-4 py-2.5 text-sm text-info">Finish your current ride to accept another request.</p>
                  )}
                  <AnimatePresence mode="popLayout" initial={false}>
                    {/* display order only: brand-new requests are pinned to the top so they're seen */}
                    {[...requests].sort((a, b) => fresh.has(b.ride_id) - fresh.has(a.ride_id)).map((r, i) => (
                      <RideCard key={r.ride_id} ride={r} index={i} defaultOpen fresh={fresh.has(r.ride_id)}>
                        <DetailList items={rideDetails(r)} />
                        <div className="flex items-center gap-3">
                          <Button disabled={busy || !available} onClick={() => act(r, "accept", {}, "Ride accepted")}>
                            <CircleCheckBig aria-hidden="true" />Accept ride
                          </Button>
                          <InlineError text={rideError[r.ride_id]} />
                        </div>
                      </RideCard>
                    ))}
                  </AnimatePresence>
                </div>
              )}
          </Panel>
        </div>

        {/* ----- history ----- */}
        <Panel className="col-span-5" title="History" count={mine ? past.length : undefined}
          description="Your completed and cancelled rides"
          actions={<History className="size-5 text-muted-foreground" aria-hidden="true" />}>
          {mine === null ? (error ? <EmptyState icon={WifiOff} title="History unavailable" /> : <ListSkeleton rows={4} />)
            : past.length === 0 ? (
              <EmptyState icon={History} title="No rides yet" description="Rides you complete or cancel will be listed here." />
            ) : (
              <div className="grid gap-3">
                {past.map((r, i) => (
                  <RideCard key={r.ride_id} ride={r} index={i}><DetailList items={rideDetails(r)} /></RideCard>
                ))}
              </div>
            )}
        </Panel>
      </div>
    </Page>
  );
}
