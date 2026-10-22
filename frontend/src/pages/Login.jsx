// Login.jsx - animated login / register screen
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../auth";

const ROLES = ["rider", "driver", "admin"];
// Demo accounts (same as in the README). Clicking one fills in the form.
const DEMO = {
  rider: { id: "akhil@example.com", pw: "rider123", name: "Akhil" },
  driver: { id: "9876500011", pw: "driver123", name: "Praveen" },
  admin: { id: "prakash", pw: "admin123", name: "Prakash" },
};
const EMPTY = { identifier: "", password: "", name: "", phone: "", license: "", zone: "", plate: "", model: "", color: "" };

// Floating gradient shapes + a car driving along a road, behind the form
function Backdrop() {
  const reduce = useReducedMotion();
  return (
    <div className="backdrop" aria-hidden="true">
      <motion.div className="blob b1" animate={{ x: [0, 60, -20, 0], y: [0, 40, 80, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="blob b2" animate={{ x: [0, -70, 30, 0], y: [0, -50, 20, 0], scale: [1, 0.9, 1.2, 1] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="blob b3" animate={{ x: [0, 40, -40, 0], y: [0, -30, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <div className="road"><div className="road-dash" /></div>
      <motion.div className="road-car" style={reduce ? { left: "45%" } : undefined}
        initial={{ x: "-20vw" }} animate={reduce ? { x: 0 } : { x: "120vw" }}
        transition={{ duration: 11, repeat: Infinity, ease: "linear" }}>
        <span style={{ display: "inline-block", transform: "scaleX(-1)" }}>🚖</span>
      </motion.div>
    </div>
  );
}

export default function Login() {
  const { session, signIn } = useAuth();
  const [role, setRole] = useState("rider");
  const [mode, setMode] = useState("login");           // login | register
  const [form, setForm] = useState(EMPTY);
  const [zones, setZones] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null);
  const shake = useAnimationControls();
  const register = mode === "register";

  useEffect(() => {
    api("GET", "/api/zones").then((z) => { setZones(z); setForm((f) => ({ ...f, zone: z[0]?.zone_id || "" })); }).catch(() => {});
  }, []);

  if (session) return <Navigate to={`/${session.role}`} replace />;

  // Typing in any field hides the error again.
  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setError(""); };
  const pickRole = (r) => { setRole(r); if (r === "admin") setMode("login"); setError(""); };
  const fillDemo = (r) => { setRole(r); setMode("login"); setError(""); setForm((f) => ({ ...f, identifier: DEMO[r].id, password: DEMO[r].pw })); };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let res;
      if (!register) {
        res = await api("POST", "/api/login", { role, identifier: form.identifier, password: form.password });
      } else if (role === "rider") {
        res = await api("POST", "/api/register", { role, name: form.name, email: form.identifier, phone: form.phone, password: form.password });
      } else {
        res = await api("POST", "/api/register", {
          role, name: form.name, phone: form.identifier, license_number: form.license, password: form.password,
          zone_id: form.zone, plate_number: form.plate, model: form.model, color: form.color });
      }
      signIn(res.role, res.user);                    // the router then moves us to the dashboard
    } catch (err) {
      // Stay on this page: red box, shake, keep the username, clear ONLY the password, refocus it.
      setError(err.message);
      setForm((f) => ({ ...f, password: "" }));
      shake.start({ x: [0, -14, 14, -10, 10, -5, 5, 0], transition: { duration: 0.5 } });
      setBusy(false);
      setTimeout(() => passwordRef.current?.focus(), 0);
    }
  }

  const idLabel = role === "driver" ? "Phone number" : role === "admin" ? "Username" : "Email";

  return (
    <div className="login-page">
      <Backdrop />
      <div className="login-wrap">
        <motion.div className="hero" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <motion.div className="logo" animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>🚖</motion.div>
          <h1>Ride<span>Graph</span></h1>
          <p>Ride-hailing powered by a Neo4j graph</p>
        </motion.div>

        <motion.div animate={shake}>
          <motion.div className="card login-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div className="tabs" role="tablist">
              {ROLES.map((r) => (
                <button key={r} type="button" role="tab" aria-selected={role === r} className={role === r ? "active" : ""} onClick={() => pickRole(r)}>
                  {role === r && <motion.span layoutId="tab-pill" className="pill" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                  <span className="tab-label">{r[0].toUpperCase() + r.slice(1)}</span>
                </button>
              ))}
            </div>

            <form onSubmit={submit} noValidate>
              <AnimatePresence initial={false}>
                {register && (
                  <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="collapse">
                    <label htmlFor="name">Full name</label>
                    <input id="name" value={form.name} onChange={set("name")} autoComplete="name" />
                  </motion.div>
                )}
              </AnimatePresence>

              <label htmlFor="identifier">{idLabel}</label>
              <input id="identifier" value={form.identifier} onChange={set("identifier")} autoComplete="username"
                type={role === "driver" ? "tel" : "text"} />

              <AnimatePresence initial={false}>
                {register && role === "rider" && (
                  <motion.div key="phone" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="collapse">
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" value={form.phone} onChange={set("phone")} autoComplete="tel" />
                  </motion.div>
                )}
                {register && role === "driver" && (
                  <motion.div key="driver" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="collapse">
                    <div className="split">
                      <div><label htmlFor="license">Licence no.</label><input id="license" value={form.license} onChange={set("license")} /></div>
                      <div><label htmlFor="zone">Home zone</label>
                        <select id="zone" value={form.zone} onChange={set("zone")}>
                          {zones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                        </select></div>
                    </div>
                    <div className="split">
                      <div><label htmlFor="plate">Plate number</label><input id="plate" value={form.plate} onChange={set("plate")} /></div>
                      <div><label htmlFor="model">Vehicle model</label><input id="model" value={form.model} onChange={set("model")} /></div>
                    </div>
                    <label htmlFor="color">Vehicle colour</label>
                    <input id="color" value={form.color} onChange={set("color")} />
                  </motion.div>
                )}
              </AnimatePresence>

              <label htmlFor="password">Password</label>
              <input id="password" ref={passwordRef} type="password" value={form.password} onChange={set("password")}
                autoComplete={register ? "new-password" : "current-password"} />

              {/* red error box, directly above the button */}
              <AnimatePresence>
                {error && (
                  <motion.div key="err" className="msg error" role="alert" initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 14 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button type="submit" className="big" disabled={busy} whileHover={busy ? undefined : { y: -2, scale: 1.01 }} whileTap={busy ? undefined : { scale: 0.97 }}>
                {busy ? (register ? "Creating account..." : "Logging in...") : register ? "Create account" : "Login"}
              </motion.button>
            </form>

            {role !== "admin" && (
              <p className="switch">
                {register ? "Already have an account? " : "New here? "}
                <a href="#switch" onClick={(e) => { e.preventDefault(); setMode(register ? "login" : "register"); setError(""); }}>
                  {register ? "Login" : "Create an account"}
                </a>
              </p>
            )}
          </motion.div>
        </motion.div>

        <motion.div className="card demo-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
          <div className="meta">Demo accounts - click one to fill in the form</div>
          <div className="chips">
            {ROLES.map((r) => (
              <motion.button key={r} type="button" className="chip" whileHover={{ y: -3, scale: 1.05 }} whileTap={{ scale: 0.93 }} onClick={() => fillDemo(r)}>
                {DEMO[r].name} · {r[0].toUpperCase() + r.slice(1)}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
