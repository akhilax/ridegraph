// api.js - talks to the Flask API and keeps the login session in localStorage.

// Sends a request and returns the parsed JSON. If the server answers with an
// error status we throw an Error carrying the server's message.
export async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't connect to the server. Make sure the app is running.");
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty / non-JSON body */ }
  if (!res.ok) {
    // The dev proxy answers with an empty 5xx when Flask is not running at all.
    if (!data.error && res.status >= 500) throw new Error("Can't connect to the server. Make sure the app is running.");
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

const KEY = "ridegraph";
export function loadSession() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
export function storeSession(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
export function clearSession() { localStorage.removeItem(KEY); }
