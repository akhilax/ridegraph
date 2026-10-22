// Rider.jsx - book a ride, see fare + nearby drivers, track status, pay, rate, history
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bike, Car, CarTaxiFront, CircleAlert, Crown, History, Loader2, MapPin, Navigation, Send, Star, Ticket, UsersRound, WifiOff, XCircle,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { usePolling } from "../hooks";
import { fmtDate, money, sleep } from "../utils";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Page, PageHeader } from "@/components/dashboard/app-shell";
import { EmptyState, ErrorState, ListSkeleton, Panel } from "@/components/dashboard/panel";
import { DetailList, RideCard } from "@/components/dashboard/ride-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { CountUp, FadeIn } from "@/components/dashboard/motion-kit";
import { Confetti, Radar, RouteLine, Stars, Stepper } from "@/components/dashboard/ride-visuals";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";

const ACTIVE = ["requested", "accepted"];
const TYPE_ICONS = { Bike: Bike, Auto: CarTaxiFront, Economy: Car, Premium: Crown };
const PAY_METHODS = [["upi", "UPI"], ["card", "Card"], ["cash", "Cash"]];

// ---------- details + actions of one ride (cancel / pay / rate) ----------
function RideDetails({ ride, userId, onChanged, onPaid }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("upi");
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");

  async function run(fn, okText, after) {
    setBusy(true); setError("");
    try { await fn(); toast(okText); after && after(); onChanged(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  }
  const post = (action, body) => api("POST", `/api/rides/${ride.ride_id}/${action}`, { user_id: userId, ...body });

  return (
    <div className="grid gap-5">
      <DetailList items={[
        ride.driver_name && ["Driver", (
          <span className="inline-flex items-center gap-2">{ride.driver_name}
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Star className="size-3.5 fill-gold text-gold" aria-hidden="true" />{Number(ride.driver_rating).toFixed(2)}</span>
          </span>
        )],
        ride.driver_name && ["Vehicle", (
          <span>{ride.vehicle_color} {ride.vehicle_model} <span className="ml-1 rounded-sm border px-1.5 py-0.5 font-mono text-xs">{ride.plate_number}</span></span>
        )],
        ride.driver_name && ["Phone", ride.driver_phone],
        ride.promo_code && ["Promo", `${ride.promo_code} (${ride.promo_percent}% off)`],
        ride.status === "completed" && ride.payment_status === "paid" && ["Payment", (
          <span className="inline-flex items-center gap-2"><StatusBadge status="paid" />
            <span className="text-muted-foreground">{money(ride.payment_amount)} by <span className="uppercase">{ride.payment_method}</span></span></span>
        )],
        ride.status === "completed" && ride.rating_score != null && ["Your rating", (
          <span className="inline-flex items-center gap-2"><Stars value={ride.rating_score} readOnly size="sm" />
            {ride.rating_comment && <span className="text-muted-foreground">"{ride.rating_comment}"</span>}</span>
        )],
        ride.status === "cancelled" && ["Cancelled", `by ${ride.cancelled_by}: ${ride.cancel_reason}`],
      ]} />

      {ACTIVE.includes(ride.status) && (
        <div>
          <ConfirmDialog
            trigger={<Button variant="outline" disabled={busy}><XCircle aria-hidden="true" />Cancel ride</Button>}
            title="Cancel this ride?" confirmLabel="Yes, cancel ride"
            description={ride.driver_name ? `${ride.driver_name} is already on the way. They'll be freed up for other riders.` : "We'll stop looking for a driver for this trip."}
            onConfirm={() => run(() => post("cancel", { cancelled_by: "rider", reason: "Cancelled by rider" }), "Ride cancelled")} />
        </div>
      )}

      {/* pay first, then rate (both only for completed rides) */}
      {ride.status === "completed" && ride.payment_status !== "paid" && (
        <div className="grid gap-3 rounded-md border bg-muted/40 p-4">
          <div className="text-sm font-semibold">Pay for this ride</div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Payment method" className="inline-flex rounded-md border bg-card p-1">
              {PAY_METHODS.map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={method === value} onClick={() => setMethod(value)}
                  className={cn("min-h-9 rounded-sm px-4 text-sm font-medium transition-colors duration-150",
                    method === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  {label}
                </button>
              ))}
            </div>
            <Button className="bg-gold text-gold-foreground hover:bg-gold/90" disabled={busy}
              onClick={() => run(() => post("pay", { method }), "Payment successful 🎉", onPaid)}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}Pay {money(ride.fare_amount)}
            </Button>
          </div>
        </div>
      )}
      {ride.status === "completed" && ride.rating_score == null && (
        <div className="grid gap-3 rounded-md border bg-muted/40 p-4">
          <div className="text-sm font-semibold">How was your ride{ride.driver_name ? ` with ${ride.driver_name}` : ""}?</div>
          <Stars value={score} onChange={setScore} />
          <div className="flex gap-3">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment (optional)" aria-label="Rating comment" />
            <Button variant="secondary" disabled={busy} onClick={() => run(() => post("rate", { score, comment }), "Thanks for rating!")}>
              Rate driver
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm font-medium text-destructive">
            <CircleAlert className="size-4" aria-hidden="true" />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- the big panel for the ride in progress ----------
function CurrentRide({ ride, userId, onChanged, onPaid }) {
  const live = ACTIVE.includes(ride.status);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: EASE_OUT }}>
      <Panel title={live ? "Your ride" : "Finish up"} className={live ? "border-primary/40 ring-2 ring-primary/15" : undefined}
        description={`${ride.ride_type} · ${fmtDate(ride.requested_at)}`}
        actions={<span className="text-2xl font-bold tabular-nums">{money(ride.fare_amount)}</span>}
        bodyClassName="grid gap-6">
        <Stepper status={ride.status} />
        {ride.status !== "cancelled" && <RouteLine from={ride.pickup} to={ride.dropoff} status={ride.status} distance={ride.distance_km} />}
        {ride.status === "requested" && <Radar text="Waiting for a driver to accept..." />}
        <RideDetails ride={ride} userId={userId} onChanged={onChanged} onPaid={onPaid} />
      </Panel>
    </motion.div>
  );
}

export default function Rider() {
  const { session } = useAuth();
  const me = session.user;
  const toast = useToast();

  // ----- booking form state -----
  const [locations, setLocations] = useState(null);
  const [types, setTypes] = useState([]);
  const [pickup, setPickup] = useState("L1");
  const [dropoff, setDropoff] = useState("L4");
  const [typeId, setTypeId] = useState("");
  const [promo, setPromo] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [estimate, setEstimate] = useState(null);           // {data} or {error}
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  // ----- nearby drivers: {pickup, list} for the pickup they were loaded for -----
  const [nearby, setNearby] = useState(null);
  // ----- rides -----
  const [rides, setRides] = useState(null);
  const [burst, setBurst] = useState(false);
  const [loadError, setLoadError] = useState("");

  // load locations + ride types once
  useEffect(() => {
    Promise.all([api("GET", "/api/locations"), api("GET", "/api/ride-types")])
      .then(([locs, ts]) => {
        setLocations(locs); setTypes(ts);
        setTypeId((ts.find((t) => t.type_name === "Economy") || ts[0]).ride_type_id);
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  // fare estimate: re-calculate whenever the choices change (latest request wins)
  const samePlace = pickup === dropoff;
  useEffect(() => {
    if (!typeId || samePlace) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await api("POST", "/api/fare-estimate", { pickup_id: pickup, dropoff_id: dropoff, ride_type_id: typeId, promo_code: promo });
        if (!cancelled) setEstimate({ data });
      } catch (e) { if (!cancelled) setEstimate({ error: e.message }); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pickup, dropoff, typeId, promo, samePlace]);
  const shownEstimate = samePlace ? { error: "Pickup and dropoff must be different." } : estimate;

  // nearby drivers: show the radar for at least a moment, then the list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list] = await Promise.all([api("GET", `/api/locations/${pickup}/nearby-drivers`), sleep(1200)]);
        if (!cancelled) setNearby({ pickup, list });
      } catch { if (!cancelled) setNearby({ pickup, list: [] }); }
    })();
    return () => { cancelled = true; };
  }, [pickup]);
  const nearbyList = nearby?.pickup === pickup ? nearby.list : null;   // null = still searching

  // rides (auto-refresh every 5 seconds so status changes show up)
  const loadRides = useCallback(async () => {
    try { setRides(await api("GET", `/api/users/${me.user_id}/rides`)); setLoadError(""); }
    catch (e) { setLoadError(e.message); }
  }, [me.user_id]);
  usePolling(loadRides, 5000);

  async function book() {
    setBooking(true); setBookError("");
    try {
      await api("POST", "/api/rides", { user_id: me.user_id, pickup_id: pickup, dropoff_id: dropoff, ride_type_id: typeId, promo_code: promo });
      toast("Ride requested! Looking for a driver...");
      loadRides();
    } catch (e) { setBookError(e.message); }
    setBooking(false);
  }

  const onPaid = useCallback(() => setBurst(true), []);
  const stopBurst = useCallback(() => setBurst(false), []);

  const active = (rides || []).filter((r) => ACTIVE.includes(r.status));
  const needsAction = (rides || []).filter((r) => r.status === "completed" && (r.payment_status !== "paid" || r.rating_score == null)).slice(0, 1);
  const current = [...active, ...needsAction];
  const history = (rides || []).filter((r) => !current.includes(r));
  const est = shownEstimate?.data;
  const firstName = (me.name || "").split(" ")[0];

  return (
    <Page>
      {burst && <Confetti onDone={stopBurst} />}
      <PageHeader title={`Where to, ${firstName}?`} subtitle="Book a ride across Chennai and follow it live." />

      <div className="grid grid-cols-12 items-start gap-6">
        {/* ---------------- LEFT: booking ---------------- */}
        <div className="col-span-5 grid gap-6">
          <Panel title="Book a ride" bodyClassName="grid gap-5">
            {loadError && !locations ? <ErrorState message={loadError} /> : !locations ? (
              <div className="grid gap-4" role="status" aria-label="Loading">
                <Skeleton className="h-11" /><Skeleton className="h-11" /><Skeleton className="h-24" /><Skeleton className="h-28" />
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pickup"><MapPin className="size-4 text-success" aria-hidden="true" />Pickup</Label>
                    <NativeSelect id="pickup" className="w-full" value={pickup} onChange={(e) => setPickup(e.target.value)}>
                      {locations.map((l) => <NativeSelectOption key={l.location_id} value={l.location_id}>{l.address}</NativeSelectOption>)}
                    </NativeSelect>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dropoff"><Navigation className="size-4 text-destructive" aria-hidden="true" />Drop-off</Label>
                    <NativeSelect id="dropoff" className="w-full" value={dropoff} onChange={(e) => setDropoff(e.target.value)}>
                      {locations.map((l) => <NativeSelectOption key={l.location_id} value={l.location_id}>{l.address}</NativeSelectOption>)}
                    </NativeSelect>
                  </div>
                </div>

                <div className="grid gap-2">
                  <span id="ride-type-label" className="text-sm font-medium">Ride type</span>
                  <div role="radiogroup" aria-labelledby="ride-type-label" className="grid grid-cols-4 gap-2">
                    {types.map((t) => {
                      const Icon = TYPE_ICONS[t.type_name] || Car;
                      const selected = typeId === t.ride_type_id;
                      return (
                        <motion.button type="button" key={t.ride_type_id} role="radio" aria-checked={selected}
                          onClick={() => setTypeId(t.ride_type_id)} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}
                          className={cn("relative flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-center transition-colors duration-200",
                            selected ? "border-primary text-foreground" : "bg-card text-muted-foreground hover:border-primary/40")}>
                          {selected && <motion.span layoutId="ride-type-selected" aria-hidden="true" className="absolute inset-0 rounded-[11px] bg-primary-soft"
                            transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                          <Icon className={cn("relative size-5", selected && "text-primary")} aria-hidden="true" />
                          <span className="relative text-sm font-semibold text-foreground">{t.type_name}</span>
                          <span className="relative text-[11px]">₹{t.base_fare} + ₹{t.per_km_rate}/km</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2">
                  <button type="button" onClick={() => setPromoOpen((o) => !o)} aria-expanded={promoOpen} aria-controls="promo-box"
                    className="inline-flex min-h-9 w-fit items-center gap-2 rounded-sm text-sm font-semibold text-primary hover:underline">
                    <Ticket className="size-4" aria-hidden="true" />{promoOpen ? "Hide promo code" : "Have a promo code?"}
                  </button>
                  <AnimatePresence initial={false}>
                    {promoOpen && (
                      <motion.div id="promo-box" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.22 }} className="overflow-hidden">
                        <Input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="e.g. WELCOME20" aria-label="Promo code" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* fare estimate + route summary */}
                <div aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    {shownEstimate?.error ? (
                      <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 rounded-md border border-destructive/30 bg-danger-soft px-4 py-3 text-sm text-destructive">
                        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />{shownEstimate.error}
                      </motion.div>
                    ) : est ? (
                      <motion.div key="est" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }} className="grid gap-4 rounded-md border bg-muted/40 p-4">
                        <RouteLine from={est.pickup} to={est.dropoff} status="preview" distance={est.distance_km} />
                        <div className="flex items-end justify-between border-t pt-3">
                          <div>
                            <div className="text-sm font-semibold">{est.ride_type} fare</div>
                            <div className="text-xs text-muted-foreground">
                              {est.promo_code ? <span className="font-semibold text-success">{est.promo_code}: {est.discount_percent}% off applied</span> : "Upfront price, straight-line distance"}
                            </div>
                          </div>
                          <div className="text-right">
                            {est.discount_percent > 0 && <s className="mr-2 text-sm text-muted-foreground">{money(est.fare_before_discount)}</s>}
                            <span className="text-3xl font-bold tracking-tight text-primary"><CountUp value={est.fare_amount} format={(v) => money(v)} /></span>
                          </div>
                        </div>
                      </motion.div>
                    ) : <Skeleton key="sk" className="h-40 rounded-md" />}
                  </AnimatePresence>
                </div>

                {bookError && (
                  <p role="alert" className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <CircleAlert className="size-4" aria-hidden="true" />{bookError}
                  </p>
                )}
                <Button size="lg" className="w-full" disabled={!est || booking} onClick={book}>
                  {booking ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                  {booking ? "Requesting..." : "Request ride"}
                </Button>
              </>
            )}
          </Panel>

          <Panel title="Drivers near pickup" count={nearbyList?.length} description="Available now, best rated first">
            {nearbyList === null ? <Radar /> : nearbyList.length === 0 ? (
              <EmptyState icon={UsersRound} title="No drivers nearby" description="No drivers are free in this zone right now. Try another pickup point." />
            ) : (
              <ul className="grid gap-2">
                {nearbyList.map((d, i) => (
                  <FadeIn as="li" key={d.driver_id} i={i}
                    className="flex items-center gap-3 rounded-md border px-4 py-3 transition-colors hover:bg-muted/40">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary" aria-hidden="true">{d.name[0]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{d.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{d.color} {d.model} · {d.plate_number}</div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold">
                      <Star className="size-4 fill-gold text-gold" aria-hidden="true" />{Number(d.rating_avg).toFixed(2)}
                    </span>
                  </FadeIn>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ---------------- RIGHT: rides ---------------- */}
        <div className="col-span-7 grid gap-6">
          <AnimatePresence initial={false}>
            {current.map((r) => <CurrentRide key={r.ride_id} ride={r} userId={me.user_id} onChanged={loadRides} onPaid={onPaid} />)}
          </AnimatePresence>
          {rides !== null && current.length === 0 && (
            <FadeIn className="flex items-center gap-4 rounded-lg border border-dashed bg-card px-6 py-5">
              <span className="inline-flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary"><CarTaxiFront className="size-5" aria-hidden="true" /></span>
              <div><div className="font-semibold">No ride in progress</div>
                <div className="text-sm text-muted-foreground">Choose a pickup and drop-off on the left to book one.</div></div>
            </FadeIn>
          )}

          <Panel title="Ride history" count={rides ? history.length : undefined} description="Your past trips"
            actions={<History className="size-5 text-muted-foreground" aria-hidden="true" />}>
            {rides === null ? (loadError ? <ErrorState message={loadError} onRetry={loadRides} /> : <ListSkeleton rows={4} />)
              : history.length === 0 ? (
                <EmptyState icon={History} title="No past rides yet" description="Your completed and cancelled trips will show up here." />
              ) : (
                <div className="grid gap-3">
                  {loadError && (
                    <div role="status" className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-warning">
                      <WifiOff className="size-4" aria-hidden="true" />Connection problem. Retrying automatically...
                    </div>
                  )}
                  {history.map((r, i) => (
                    <RideCard key={r.ride_id} ride={r} index={i}>
                      <RideDetails ride={r} userId={me.user_id} onChanged={loadRides} onPaid={onPaid} />
                    </RideCard>
                  ))}
                </div>
              )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
