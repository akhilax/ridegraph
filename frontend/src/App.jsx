// App.jsx - the page layout + routes, with animated page transitions
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RequireRole, useAuth } from "./auth";
import Login from "./pages/Login";
import Rider from "./pages/Rider";
import Driver from "./pages/Driver";
import Admin from "./pages/Admin";

// Every page fades and slides in/out when the route changes.
function PageTransition({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

function Topbar() {
  const { session, signOut } = useAuth();
  if (!session) return null;
  return (
    <motion.header className="topbar" initial={{ y: -60 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
      <div className="brand">Ride<span>Graph</span><small>{session.role}</small></div>
      <div className="who">
        <span>Hi, <b>{session.user.name}</b></span>
        <motion.button className="ghost" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} onClick={signOut}>Logout</motion.button>
      </div>
    </motion.header>
  );
}

export default function App() {
  const location = useLocation();
  const { session } = useAuth();
  return (
    <>
      <Topbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to={session ? `/${session.role}` : "/login"} replace />} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/rider" element={<RequireRole role="rider"><PageTransition><Rider /></PageTransition></RequireRole>} />
          <Route path="/driver" element={<RequireRole role="driver"><PageTransition><Driver /></PageTransition></RequireRole>} />
          <Route path="/admin" element={<RequireRole role="admin"><PageTransition><Admin /></PageTransition></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
