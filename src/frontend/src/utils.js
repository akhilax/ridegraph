// utils.js - small formatting helpers
export const money = (n) => "₹" + Number(n || 0).toFixed(2);

export function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
