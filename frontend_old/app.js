// app.js - helpers shared by all pages (plain JavaScript, no frameworks)

// ---- talking to the Flask API ---------------------------------------
// Sends a request and returns the parsed JSON. If the server answers with an
// error status, we throw an Error carrying the server's message.
async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error("Can't connect to the server. Make sure the app is running.");
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ")");
  return data;
}

// ---- login session (kept in the browser's localStorage) --------------
function saveSession(role, user) {
  localStorage.setItem("ridegraph", JSON.stringify({ role, user }));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem("ridegraph")); } catch (e) { return null; }
}
function logout() {
  localStorage.removeItem("ridegraph");
  location.href = "index.html";
}
// Call at the top of a dashboard: redirects to login if the wrong role.
function requireRole(role) {
  const s = getSession();
  if (!s || s.role !== role) { location.href = "index.html"; return null; }
  const who = document.getElementById("who");
  if (who) who.textContent = s.user.name;
  return s.user;
}

// ---- small display helpers -------------------------------------------
// Escape text before putting it in innerHTML so nobody can inject HTML/JS.
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function money(n) { return "₹" + Number(n || 0).toFixed(2); }
function badge(status) { return `<span class="badge b-${esc(status)}">${esc(status)}</span>`; }
function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? esc(iso) : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
function stars(n) { return "★".repeat(n) + "☆".repeat(5 - n); }

// Show an inline message box (used for form errors): type is "error" or "ok".
function showMsg(elId, text, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = text ? `<div class="msg ${type || "error"}">${esc(text)}</div>` : "";
}

// Small pop-up message at the bottom of the screen that fades away.
function toast(text, type) {
  let box = document.getElementById("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = "toast " + (type || "");
  t.textContent = text;
  box.appendChild(t);
  setTimeout(() => { t.style.transition = "opacity .4s"; t.style.opacity = 0; setTimeout(() => t.remove(), 400); }, 3200);
}

// Only touch the page when the HTML really changed. This stops the
// 5-second auto-refresh from restarting animations or closing open sections.
function setIfChanged(el, html) {
  if (typeof el === "string") el = document.getElementById(el);
  if (el._html === html) return;
  el._html = html;
  el.innerHTML = html;
}

// Animate a number from 0 up to its value. fmt turns the number into text.
function countUp(el, target, fmt) {
  fmt = fmt || (v => Math.round(v));
  const start = performance.now(), dur = 900;
  function tick(now) {
    const p = Math.min(1, (now - start) / dur);
    el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Collapsed ride row: route, fare and status. Click it to expand the details.
//   details = HTML shown when expanded;  opts.live = gold pulsing outline
function rideItem(r, details, opts) {
  opts = opts || {};
  return `<details class="ride ${opts.live ? "live" : ""}" ${opts.open ? "open" : ""}>
    <summary>
      <div class="main"><div class="route-line">${esc(r.pickup)} → ${esc(r.dropoff)}</div>
        <div class="when">${fmtDate(r.requested_at)} · ${esc(r.ride_type)} · ${esc(r.distance_km)} km</div></div>
      <span class="amt">${money(r.fare_amount)}</span>${badge(r.status)}
    </summary>
    <div class="body">${details}<div id="msg-${esc(r.ride_id)}"></div></div>
  </details>`;
}
