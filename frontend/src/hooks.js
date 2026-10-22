// hooks.js - reusable React hooks
import { useEffect, useRef } from "react";

// Runs fn now and then every `ms` milliseconds (used to refresh ride status).
export function usePolling(fn, ms) {
  const latest = useRef(fn);
  latest.current = fn;                       // always call the newest version of fn
  useEffect(() => {
    latest.current();
    const t = setInterval(() => latest.current(), ms);
    return () => clearInterval(t);
  }, [ms]);
}
