// hooks.js - reusable React hooks
import { useEffect, useRef } from "react";

// Runs fn now and then every `ms` milliseconds (used to refresh ride status).
export function usePolling(fn, ms) {
  const latest = useRef(fn);
  // always call the newest version of fn (updated after each render, before the timer runs)
  useEffect(() => { latest.current = fn; });
  useEffect(() => {
    latest.current();
    const t = setInterval(() => latest.current(), ms);
    return () => clearInterval(t);
  }, [ms]);
}
