// auth.jsx - who is logged in (shared by every page through React context)
import { createContext, useContext, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { loadSession, storeSession, clearSession } from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession());   // {role, user} or null

  const signIn = useCallback((role, user) => {
    const s = { role, user };
    storeSession(s);
    setSession(s);
  }, []);
  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>;
}

// Wrap a page in <RequireRole role="rider"> so only that role can open it.
export function RequireRole({ role, children }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== role) return <Navigate to={`/${session.role}`} replace />;
  return children;
}
