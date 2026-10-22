// Login.jsx - login / register screen (landing page)
// Layout: on phones a single column with the form; on large screens a brand/hero
// panel on the left and the form on the right.
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import {
  Activity, Car, CircleAlert, Eye, EyeOff, IndianRupee, Loader2, MapPin, ShieldCheck, UserRound,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import { ThemeToggle } from "../theme";
import { BrandMark } from "@/components/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLES = ["rider", "driver", "admin"];
const ROLE_ICONS = { rider: UserRound, driver: Car, admin: ShieldCheck };
// Demo accounts (same as in the README). Clicking one fills in the form.
const DEMO = {
  rider: { id: "akhil@example.com", pw: "rider123", name: "Akhil" },
  driver: { id: "9876500011", pw: "driver123", name: "Praveen" },
  admin: { id: "prakash", pw: "admin123", name: "Prakash" },
};
const EMPTY = { identifier: "", password: "", name: "", phone: "", license: "", zone: "", plate: "", model: "", color: "" };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const EASE = [0.22, 1, 0.36, 1];

// ---------------------------------------------------------------------------
// Hero panel (large screens only): brand, short pitch and an example route card
// ---------------------------------------------------------------------------
const FEATURES = [
  [MapPin, "Drivers in your zone, best rated first"],
  [IndianRupee, "Upfront fares, promo codes applied instantly"],
  [Activity, "Live status from request to drop-off"],
];

const ROUTE = "M10 55 C 90 55, 110 15, 170 20 S 260 50, 310 15";

function RoutePreview() {
  const reduce = useReducedMotion();
  return (
    // a small "map overlay" style glass card showing what a booked route looks like
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md">
      <div className="flex items-center justify-between text-xs font-medium text-white/70">
        <span>Example trip</span>
        <span className="rounded-full bg-success/20 px-2.5 py-1 text-[#86EFAC]">Driver on the way</span>
      </div>
      <svg viewBox="0 0 320 70" className="mt-4 h-16 w-full" aria-hidden="true">
        {/* faint dotted street underneath, then the gold route draws itself once on load */}
        <path d={ROUTE} fill="none" style={{ stroke: "rgb(255 255 255 / 0.2)" }} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 8" />
        <motion.path d={ROUTE} fill="none" style={{ stroke: "var(--gold)" }} strokeWidth="3" strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.4 }} />
        <circle cx="10" cy="55" r="6" fill="#4ADE80" />
        <circle cx="310" cy="15" r="6" fill="#F87171" />
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div><div className="text-white/60">Pickup</div><div className="font-semibold text-white">Pondy Bazaar</div></div>
        <div className="text-right"><div className="text-white/60">Drop-off</div><div className="font-semibold text-white">Kapaleeshwarar Temple</div></div>
      </div>
      <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
        <span className="text-sm text-white/70">Economy · 3.96 km</span>
        <span className="text-xl font-bold text-white">₹87.52</span>
      </div>
    </div>
  );
}

function Hero() {
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } };
  return (
    <aside className="relative hidden overflow-hidden bg-navy p-10 text-white lg:flex lg:flex-col xl:p-14">
      {/* soft brand glow + faint street grid, purely decorative */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0
        bg-[radial-gradient(60%_50%_at_15%_10%,rgb(107_30_60/0.55),transparent_70%),radial-gradient(45%_40%_at_90%_85%,rgb(184_134_11/0.22),transparent_70%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]
        [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />

      <motion.div className="relative flex flex-1 flex-col" initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
        <motion.div variants={item}><BrandMark inverted className="text-white" /></motion.div>
        <div className="my-auto max-w-md py-12">
          <motion.h2 variants={item} className="text-4xl leading-tight font-bold tracking-tight text-balance xl:text-5xl">
            Your city, one tap away.
          </motion.h2>
          <motion.p variants={item} className="mt-4 text-lg leading-relaxed text-white/75">
            Book a ride across Chennai, see the fare before you go, and follow your driver live.
          </motion.p>
          <motion.ul variants={item} className="mt-8 space-y-3">
            {FEATURES.map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <span className="inline-flex size-9 items-center justify-center rounded-md bg-white/10">
                  <Icon className="size-4 text-gold" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </motion.ul>
          <motion.div variants={item} className="mt-10"><RoutePreview /></motion.div>
        </div>
        <motion.p variants={item} className="text-sm text-white/55">Matched in real time by a Neo4j graph database.</motion.p>
      </motion.div>
    </aside>
  );
}

// label + control + spacing, so every field looks the same
function Field({ id, label, children }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

// fields that only appear in "create account" mode fade in (no height animation)
function Reveal({ show, children }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div className="grid gap-4" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.22, ease: EASE }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
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
  const [showPw, setShowPw] = useState(false);
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
      shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
      setBusy(false);
      setTimeout(() => passwordRef.current?.focus(), 0);
    }
  }

  const idLabel = role === "driver" ? "Phone number" : role === "admin" ? "Username" : "Email";
  const idPlaceholder = role === "driver" ? "98765 00011" : role === "admin" ? "prakash" : "you@example.com";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <Hero />

      <main className="flex flex-col px-4 py-5 sm:px-8">
        {/* top row: brand (phones only, the hero shows it on large screens) + theme toggle */}
        <div className="flex items-center justify-between">
          <BrandMark className="lg:invisible" />
          <ThemeToggle />
        </div>

        <motion.div className="mx-auto my-auto w-full max-w-sm py-8"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{register ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1.5 text-muted-foreground">
            {register ? "Join as a rider or a driver in a minute." : "Sign in to book a ride, drive, or manage RideGraph."}
          </p>

          <motion.div animate={shake} className="mt-6">
            <Tabs value={role} onValueChange={pickRole}>
              <TabsList className="grid h-auto w-full grid-cols-3" aria-label="I am a">
                {ROLES.map((r) => {
                  const Icon = ROLE_ICONS[r];
                  return (
                    <TabsTrigger key={r} value={r} className="min-h-11 gap-1.5">
                      <Icon aria-hidden="true" />{cap(r)}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value={role} className="mt-4">
                <form onSubmit={submit} noValidate className="grid gap-4">
                  <Reveal show={register}>
                    <Field id="name" label="Full name">
                      <Input id="name" value={form.name} onChange={set("name")} autoComplete="name" placeholder="Your name" />
                    </Field>
                  </Reveal>

                  <Field id="identifier" label={idLabel}>
                    <Input id="identifier" value={form.identifier} onChange={set("identifier")} autoComplete="username"
                      type={role === "driver" ? "tel" : role === "rider" ? "email" : "text"} inputMode={role === "driver" ? "tel" : undefined}
                      placeholder={idPlaceholder} aria-invalid={!!error || undefined} />
                  </Field>

                  <Reveal show={register && role === "rider"}>
                    <Field id="phone" label="Phone">
                      <Input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
                    </Field>
                  </Reveal>

                  <Reveal show={register && role === "driver"}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id="license" label="Licence no.">
                        <Input id="license" value={form.license} onChange={set("license")} />
                      </Field>
                      <Field id="zone" label="Home zone">
                        <NativeSelect id="zone" className="w-full" value={form.zone} onChange={set("zone")}>
                          {zones.length === 0 && <NativeSelectOption value="">Zones unavailable right now</NativeSelectOption>}
                          {zones.map((z) => <NativeSelectOption key={z.zone_id} value={z.zone_id}>{z.zone_name}</NativeSelectOption>)}
                        </NativeSelect>
                      </Field>
                      <Field id="plate" label="Plate number">
                        <Input id="plate" value={form.plate} onChange={set("plate")} />
                      </Field>
                      <Field id="model" label="Vehicle model">
                        <Input id="model" value={form.model} onChange={set("model")} />
                      </Field>
                    </div>
                    <Field id="color" label="Vehicle colour">
                      <Input id="color" value={form.color} onChange={set("color")} />
                    </Field>
                  </Reveal>

                  <Field id="password" label="Password">
                    <div className="relative">
                      <Input id="password" ref={passwordRef} type={showPw ? "text" : "password"} value={form.password}
                        onChange={set("password")} autoComplete={register ? "new-password" : "current-password"}
                        className="pr-12" aria-invalid={!!error || undefined} aria-describedby={error ? "login-error" : undefined} />
                      <button type="button" onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw}
                        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-sm text-muted-foreground transition-colors hover:text-foreground">
                        {showPw ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </Field>

                  {/* error box, directly above the button */}
                  <AnimatePresence>
                    {error && (
                      <motion.div key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.2 }}>
                        <Alert variant="destructive" id="login-error" role="alert" className="border-destructive/30 bg-danger-soft">
                          <CircleAlert aria-hidden="true" />
                          <AlertDescription className="text-destructive">{error}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button type="submit" size="lg" className="mt-1 w-full" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
                    {busy ? (register ? "Creating account..." : "Logging in...") : register ? "Create account" : "Login"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </motion.div>

          {role !== "admin" && (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {register ? "Already have an account? " : "New here? "}
              <Button type="button" variant="link" className="h-auto min-h-11 px-1 font-semibold"
                onClick={() => { setMode(register ? "login" : "register"); setError(""); }}>
                {register ? "Login" : "Create an account"}
              </Button>
            </p>
          )}

          {/* demo accounts: one tap fills in the form */}
          <div className="mt-8">
            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <Separator className="flex-1" /> Try a demo account <Separator className="flex-1" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <motion.button key={r} type="button" onClick={() => fillDemo(r)}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}
                  aria-label={`Fill in the ${r} demo account (${DEMO[r].name})`}
                  className="flex min-h-11 flex-col items-center gap-1.5 rounded-md border bg-card px-2 py-3 text-sm shadow-card transition-colors hover:border-primary/40 hover:bg-accent">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {DEMO[r].name[0]}
                  </span>
                  <span className="font-semibold">{DEMO[r].name}</span>
                  <span className="text-xs text-muted-foreground">{cap(r)}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
