// Driver.jsx - earnings, requests in my zone (accept), current ride (complete), history
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { usePolling } from "../hooks";
import { money } from "../utils";
import { Badge, ConfirmButton, Confetti, CountUp, FadeIn, RouteCar, Skeleton, SkeletonList, Stars, Stepper } from "../components/ride-ui";
import RideRow from "../components/RideRow";

// Rider + payment + rating info shown inside an expanded ride
function Info({ ride }) {
  return (
    <dl className="kv">
      <dt>Rider</dt><dd>{ride.rider_name} · {ride.rider_phone}</dd>
      {ride.status === "completed" && (<><dt>Payment</dt><dd>{ride.payment_status}{ride.payment_status === "paid" ? ` via ${ride.payment_method}` : ""}</dd></>)}
      {ride.status === "completed" && ride.rating_score != null && (<><dt>Rating</dt><dd><Stars value={ride.rating_score} readOnly /> {ride.rating_comment}</dd></>)}
      {ride.status === "cancelled" && (<><dt>Cancelled</dt><dd>by {ride.cancelled_by}: {ride.cancel_reason}</dd></>)}
    </dl>
  );
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

  const load = useCallback(async () => {
    try {
      const [p, r, m] = await Promise.all([
        api("GET", `/api/drivers/${me.driver_id}`),
        api("GET", `/api/drivers/${me.driver_id}/requests`),
        api("GET", `/api/drivers/${me.driver_id}/rides`),
      ]);
      setProfile(p); setRequests(r); setMine(m); setError("");
    } catch (e) { setError(e.message); }
  }, [me.driver_id]);
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
  const err = (id) => rideError[id] && <div className="msg error">{rideError[id]}</div>;

  return (
    <main className="container">
      {burst && <Confetti onDone={stopBurst} />}
      {error && !profile && <div className="msg error">{error}</div>}

      {/* ----- stat cards that count up ----- */}
      <div className="stats">
        {loading ? [0, 1, 2, 3].map((i) => <Skeleton key={i} h={92} r={16} />) : (
          <>
            <FadeIn i={0} className="stat"><div className="n"><CountUp value={mine.total_earnings} format={(v) => money(v)} /></div><div className="l">Total earnings</div></FadeIn>
            <FadeIn i={1} className="stat"><div className="n"><CountUp value={mine.completed_rides} /></div><div className="l">Completed rides</div></FadeIn>
            <FadeIn i={2} className="stat"><div className="n">★ <CountUp value={Number(profile.rating_avg)} format={(v) => v.toFixed(2)} /></div><div className="l">Rating</div></FadeIn>
            <FadeIn i={3} className="stat"><div className="n"><Badge status={profile.status} /></div><div className="l">Status</div></FadeIn>
          </>
        )}
      </div>
      {profile && <FadeIn i={4} className="meta subtitle">{profile.zone_name} zone · {profile.color} {profile.model} · {profile.plate_number}</FadeIn>}

      <div className="grid">
        <div>
          {/* ----- ride in progress ----- */}
          <AnimatePresence>
            {current.length > 0 && (
              <motion.div className="card" key="current" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                <h2>Current ride</h2>
                {current.map((r) => (
                  <div key={r.ride_id} className="current-ride live">
                    <div className="head"><b>{money(r.fare_amount)}</b> <span className="meta">{r.ride_type}</span></div>
                    <Stepper status={r.status} />
                    <RouteCar from={r.pickup} to={r.dropoff} status={r.status} distance={r.distance_km} />
                    <Info ride={r} />
                    <div className="row">
                      <motion.button className="gold small" disabled={busy} whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.94 }}
                        onClick={() => act(r, "complete", {}, "Ride completed 🎉", true)}>Complete ride</motion.button>
                      <ConfirmButton label="Cancel" disabled={busy}
                        onConfirm={() => act(r, "cancel", { cancelled_by: "driver", reason: "Cancelled by driver" }, "Ride cancelled")} />
                    </div>
                    {err(r.ride_id)}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ----- open requests in my zone ----- */}
          <FadeIn className="card" i={5}>
            <h2>Requests in my zone {requests && <span className="count">{requests.length}</span>}</h2>
            {requests === null ? <SkeletonList n={2} /> : requests.length === 0 ? (
              <div className="empty">No open requests right now.<br />This page refreshes automatically.</div>
            ) : (
              <AnimatePresence>
                {requests.map((r, i) => (
                  <RideRow key={r.ride_id} ride={r} index={i} defaultOpen>
                    <Info ride={r} />
                    <div className="row">
                      <motion.button className="small" disabled={busy || !available} title={available ? "" : "Finish your current ride first"}
                        whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={() => act(r, "accept", {}, "Ride accepted")}>
                        Accept ride
                      </motion.button>
                    </div>
                    {err(r.ride_id)}
                  </RideRow>
                ))}
              </AnimatePresence>
            )}
          </FadeIn>
        </div>

        {/* ----- history ----- */}
        <FadeIn className="card" i={6}>
          <h2>History {mine && <span className="count">{past.length}</span>}</h2>
          {mine === null ? <SkeletonList n={3} /> : past.length === 0 ? <div className="empty">No rides yet.</div> : (
            <AnimatePresence initial>
              {past.map((r, i) => <RideRow key={r.ride_id} ride={r} index={i}><Info ride={r} /></RideRow>)}
            </AnimatePresence>
          )}
        </FadeIn>
      </div>
    </main>
  );
}
