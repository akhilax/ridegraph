// App.jsx - the page layout + routes, with animated page transitions
import { AnimatePresence, motion } from "motion/react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RequireRole, useAuth } from "./auth";
import { lazy, Suspense } from "react";
import Login from "./pages/Login";
// dashboards are loaded only when opened, so the login screen downloads less
const Rider = lazy(() => import("./pages/Rider"));
const Driver = lazy(() => import("./pages/Driver"));
const Admin = lazy(() => import("./pages/Admin"));

// shown for a moment while a dashboard's code is downloading
function PageLoading() {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto grid max-w-5xl gap-4 p-4 sm:p-6">
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

// Every page fades and slides in/out when the route changes (exit is faster than enter).
// `legacy` = page not redesigned yet: it keeps its old look via the .legacy styles.
function PageTransition({ children, legacy = false }) {
  return (
    <motion.div className={legacy ? "legacy min-h-dvh" : undefined}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.16, ease: "easeIn" } }}>
      {children}
    </motion.div>
  );
}

function Topbar() {
  const { session, signOut } = useAuth();
  if (!session) return null;
  return (
    <div className="legacy">
    <motion.header className="topbar" initial={{ y: -60 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
      <div className="brand">Ride<span>Graph</span><small>{session.role}</small></div>
      <div className="who">
        <span>Hi, <b>{session.user.name}</b></span>
        <motion.button className="ghost" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} onClick={signOut}>Logout</motion.button>
      </div>
    </motion.header>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { session } = useAuth();
  return (
    <>
      <Topbar />
      <Suspense fallback={<PageLoading />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to={session ? `/${session.role}` : "/login"} replace />} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/rider" element={<RequireRole role="rider"><PageTransition legacy><Rider /></PageTransition></RequireRole>} />
          <Route path="/driver" element={<RequireRole role="driver"><PageTransition legacy><Driver /></PageTransition></RequireRole>} />
          <Route path="/admin" element={<RequireRole role="admin"><PageTransition legacy><Admin /></PageTransition></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      </Suspense>
    </>
  );
}
