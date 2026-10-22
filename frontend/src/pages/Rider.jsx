// Rider.jsx - book a ride, see fare + nearby drivers, track status, pay, rate, history
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { usePolling } from "../hooks";
import { fmtDate, money, sleep } from "../utils";
import { Badge, ConfirmButton, Confetti, CountUp, FadeIn, Radar, RouteCar, SkeletonList, Skeleton, Stars, Stepper } from "../components/ride-ui";
import RideRow from "../components/RideRow";

const ACTIVE = ["requested", "accepted"];

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
    <>
      {ride.driver_name && (
        <dl className="kv">
          <dt>Driver</dt><dd><b>{ride.driver_name}</b> · ★ {Number(ride.driver_rating).toFixed(2)}</dd>
          <dt>Vehicle</dt><dd>{ride.vehicle_color} {ride.vehicle_model} · {ride.plate_number}</dd>
          <dt>Phone</dt><dd>{ride.driver_phone}</dd>
        </dl>
      )}
      {ride.promo_code && <div className="meta">Promo {ride.promo_code} ({ride.promo_percent}% off)</div>}
      {ride.status === "cancelled" && <div className="meta">Cancelled by {ride.cancelled_by}: {ride.cancel_reason}</div>}

      {ACTIVE.includes(ride.status) && (
        <div className="row">
          <ConfirmButton label="Cancel ride" disabled={busy}
            onConfirm={() => run(() => post("cancel", { cancelled_by: "rider", reason: "Cancelled by rider" }), "Ride cancelled")} />
        </div>
      )}

      {ride.status === "completed" && (
        <>
          {ride.payment_status === "paid" ? (
            <div className="meta">Paid {money(ride.payment_amount)} by {ride.payment_method} <Badge status="paid" /></div>
          ) : (
            <div className="row">
              <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: "auto" }} aria-label="Payment method">
                <option value="upi">UPI</option><option value="card">Card</option><option value="cash">Cash</option>
              </select>
              <motion.button className="gold small" disabled={busy} whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.94 }}
                onClick={() => run(() => post("pay", { method }), "Payment successful 🎉", onPaid)}>
                Pay {money(ride.fare_amount)}
              </motion.button>
            </div>
          )}
          {ride.rating_score != null ? (
            <div className="rated"><Stars value={ride.rating_score} readOnly /> <span className="meta">{ride.rating_comment}</span></div>
          ) : (
            <div className="rate-box">
              <Stars value={score} onChange={setScore} />
              <div className="row">
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (optional)" />
                <motion.button className="navy small" disabled={busy} whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }}
                  onClick={() => run(() => post("rate", { score, comment }), "Thanks for rating!")}>Rate driver</motion.button>
              </div>
            </div>
          )}
        </>
      )}
      <AnimatePresence>{error && <motion.div className="msg error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>{error}</motion.div>}</AnimatePresence>
    </>
  );
}

// ---------- the big card for the ride in progress ----------
function CurrentRide({ ride, userId, onChanged, onPaid }) {
  return (
    <motion.div className={`current-ride ${ACTIVE.includes(ride.status) ? "live" : ""}`}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
      <div className="head"><b>{money(ride.fare_amount)}</b> <span className="meta">{ride.ride_type} · {fmtDate(ride.requested_at)}</span></div>
      <Stepper status={ride.status} />
      {ride.status !== "cancelled" && <RouteCar from={ride.pickup} to={ride.dropoff} status={ride.status} distance={ride.distance_km} />}
      {ride.status === "requested" && <Radar text="Waiting for a driver to accept..." />}
      <RideDetails ride={ride} userId={userId} onChanged={onChanged} onPaid={onPaid} />
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
  // ----- nearby drivers -----
  const [nearby, setNearby] = useState(null);                // null = searching
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
  useEffect(() => {
    if (!typeId) return;
    if (pickup === dropoff) { setEstimate({ error: "Pickup and dropoff must be different." }); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const data = await api("POST", "/api/fare-estimate", { pickup_id: pickup, dropoff_id: dropoff, ride_type_id: typeId, promo_code: promo });
        if (!cancelled) setEstimate({ data });
      } catch (e) { if (!cancelled) setEstimate({ error: e.message }); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pickup, dropoff, typeId, promo]);

  // nearby drivers: show the radar for at least a moment, then the list
  const loadNearby = useCallback(async () => {
    setNearby(null);
    try {
      const [list] = await Promise.all([api("GET", `/api/locations/${pickup}/nearby-drivers`), sleep(1200)]);
      setNearby(list);
    } catch { setNearby([]); }
  }, [pickup]);
  useEffect(() => { loadNearby(); }, [loadNearby]);

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
  const est = estimate?.data;

  return (
    <main className="container grid">
      {burst && <Confetti onDone={stopBurst} />}

      {/* ---------------- LEFT: booking ---------------- */}
      <div>
        <FadeIn className="card" i={0}>
          <h2>Where to?</h2>
          {loadError && !locations ? <div className="msg error">{loadError}</div> : !locations ? (
            <><Skeleton h={44} style={{ marginBottom: 12 }} /><Skeleton h={60} style={{ marginBottom: 12 }} /><Skeleton h={90} /></>
          ) : (
            <>
              <div className="split">
                <div><label htmlFor="pickup">Pickup</label>
                  <select id="pickup" value={pickup} onChange={(e) => setPickup(e.target.value)}>
                    {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.address}</option>)}
                  </select></div>
                <div><label htmlFor="dropoff">Dropoff</label>
                  <select id="dropoff" value={dropoff} onChange={(e) => setDropoff(e.target.value)}>
                    {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.address}</option>)}
                  </select></div>
              </div>

              <label>Ride type</label>
              <div className="types">
                {types.map((t) => (
                  <motion.button type="button" key={t.ride_type_id} className={`type ${typeId === t.ride_type_id ? "sel" : ""}`}
                    whileHover={{ y: -4 }} whileTap={{ scale: 0.94 }} onClick={() => setTypeId(t.ride_type_id)}>
                    {typeId === t.ride_type_id && <motion.span layoutId="type-sel" className="type-bg" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                    <b>{t.type_name}</b><span>₹{t.base_fare} + ₹{t.per_km_rate}/km</span>
                  </motion.button>
                ))}
              </div>

              <button type="button" className="link" onClick={() => setPromoOpen((o) => !o)} aria-expanded={promoOpen}>
                {promoOpen ? "− Hide promo code" : "+ Have a promo code?"}
              </button>
              <AnimatePresence initial={false}>
                {promoOpen && (
                  <motion.div className="collapse-box" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="e.g. WELCOME20" aria-label="Promo code" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* fare estimate + route summary */}
              <AnimatePresence mode="wait">
                {estimate?.error ? (
                  <motion.div key="err" className="msg error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{estimate.error}</motion.div>
                ) : est ? (
                  <motion.div key="est" className="estimate-block" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <RouteCar from={est.pickup} to={est.dropoff} status="preview" distance={est.distance_km} />
                    <div className="estimate">
                      <div><b>{est.ride_type}</b>
                        <div className="meta">{est.promo_code ? `${est.promo_code}: ${est.discount_percent}% off` : "Straight-line distance"}</div></div>
                      <div className="fare">
                        {est.discount_percent > 0 && <s>{money(est.fare_before_discount)}</s>}
                        <CountUp value={est.fare_amount} format={(v) => money(v)} duration={0.6} />
                      </div>
                    </div>
                  </motion.div>
                ) : <Skeleton key="sk" h={110} r={12} style={{ marginTop: 16 }} />}
              </AnimatePresence>

              <AnimatePresence>{bookError && <motion.div className="msg error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>{bookError}</motion.div>}</AnimatePresence>
              <motion.button className="big" disabled={!est || booking} whileHover={!est || booking ? undefined : { y: -2, scale: 1.01 }} whileTap={!est || booking ? undefined : { scale: 0.97 }} onClick={book}>
                {booking ? "Requesting..." : "Request ride"}
              </motion.button>
            </>
          )}
        </FadeIn>

        <FadeIn className="card" i={1}>
          <h2>Drivers near pickup {nearby && <span className="count">{nearby.length}</span>}</h2>
          {nearby === null ? <Radar /> : nearby.length === 0 ? (
            <div className="empty">No drivers available in this zone right now.</div>
          ) : nearby.map((d, i) => (
            <FadeIn key={d.driver_id} i={i} y={10} className="drv">
              <span><b>{d.name}</b><br /><span className="meta">{d.color} {d.model} · {d.plate_number}</span></span>
              <span className="rating">★ {Number(d.rating_avg).toFixed(2)}</span>
            </FadeIn>
          ))}
        </FadeIn>
      </div>

      {/* ---------------- RIGHT: rides ---------------- */}
      <div>
        <AnimatePresence>
          {current.length > 0 && (
            <motion.div className="card" key="current" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              <h2>Current ride</h2>
              <AnimatePresence>
                {current.map((r) => <CurrentRide key={r.ride_id} ride={r} userId={me.user_id} onChanged={loadRides} onPaid={onPaid} />)}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <FadeIn className="card" i={2}>
          <h2>Ride history {rides && <span className="count">{history.length}</span>}</h2>
          {rides === null ? (loadError ? <div className="msg error">{loadError}</div> : <SkeletonList n={3} />) :
            history.length === 0 ? <div className="empty">No past rides yet.</div> : (
              <AnimatePresence initial>
                {history.map((r, i) => (
                  <RideRow key={r.ride_id} ride={r} index={i}>
                    <RideDetails ride={r} userId={me.user_id} onChanged={loadRides} onPaid={onPaid} />
                  </RideRow>
                ))}
              </AnimatePresence>
            )}
        </FadeIn>
      </div>
    </main>
  );
}
