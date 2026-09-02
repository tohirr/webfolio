import "./index.css";

/* ---- blocks ------------------------------------------------------------
   the work row: live pieces mounted right in their tile, plus placeholders
   for what's coming. each live module exports mount(el) → optional cleanup */

const blocks = [
  {
    name: "facet-card",
    sub: "pixel holo foil · webgl",
    load: () => import("./lab/facet-card.js"),
  },
  { name: "dot-bars", sub: "soon" },
  { name: "spring-toggle", sub: "soon" },
  { name: "more", sub: "soon" },
];

const EMAIL = "tohirr.dev@gmail.com";

/* google calendar appointment-schedule booking page */
const CAL_URL = "https://calendar.app.google/6M3QwajrfAX85EaC8";

/* round icon buttons up top — github + x for now */
const GH_ICON =
  '<svg viewBox="0 0 16 16" width="19" height="19" fill="currentColor" aria-hidden="true">' +
  '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 ' +
  "0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 " +
  "1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 " +
  "0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 " +
  "2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 " +
  "3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 " +
  '8c0-4.42-3.58-8-8-8z"/></svg>';

const X_ICON =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">' +
  '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 ' +
  '21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';

const MAIL_ICON =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/>' +
  '<path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>';

const nav = [
  { label: "GitHub", href: "https://github.com/tohirr", icon: GH_ICON },
  { label: "X (Twitter)", href: "https://x.com/_tohirr", icon: X_ICON },
  { label: "Email", href: `mailto:${EMAIL}`, icon: MAIL_ICON },
];

// home timezone shown in the footer
const TIME_ZONE = "Africa/Lagos";
const TIME_ZONE_LABEL = "GMT+1";

/* ---- page -------------------------------------------------------------- */

const ext = 'target="_blank" rel="noreferrer"';

const tile = (b) =>
  `<figure class="block">` +
  (b.load
    ? `<div class="tile" data-mount="${b.name}"></div>`
    : `<div class="tile ph" aria-hidden="true"><span>+</span></div>`) +
  `<figcaption><span class="t-name">${b.name}</span>` +
  `<span class="t-sub">${b.sub}</span></figcaption>` +
  `</figure>`;

document.getElementById("app").innerHTML =
  `<nav class="topnav" aria-label="social">` +
  nav
    .map(
      (n) =>
        `<a class="icon-btn" href="${n.href}" ${ext} aria-label="${n.label}">${n.icon}</a>`,
    )
    .join("") +
  `</nav>` +
  `<section class="intro">` +
  `<img class="avatar" src="/favicon.svg" alt="pixel portrait of tohir" width="40" height="40" />` +
  `<p class="ink">Dear visitor,</p>` +
  `<p>I’m Tohir, a design engineer building interfaces where the ` +
  `details carry the feel.</p>` +
  `<p>Open to design engineer roles — <a href="${CAL_URL}" ${ext}>let’s talk</a>.</p>` +
  `</section>` +
  `<section class="blocks" aria-label="work">` +
  blocks.map(tile).join("") +
  `</section>` +
  `<footer class="foot">` +
  `<span>${TIME_ZONE_LABEL} <time id="clock"></time></span>` +
  `</footer>`;

/* ---- live tiles -------------------------------------------------------- */

for (const b of blocks) {
  if (!b.load) continue;
  const el = document.querySelector(`[data-mount="${b.name}"]`);
  b.load()
    .then((mod) => mod.mount(el))
    .catch(() => {
      el.innerHTML = '<span class="tile-err">failed to load</span>';
    });
}

/* ---- clock ------------------------------------------------------------- */

const clockEl = document.getElementById("clock");
const clockFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function tickClock() {
  clockEl.textContent = clockFmt.format(new Date());
}
tickClock();
setInterval(tickClock, 1000);

/* theme follows the system for now — no toggle */

/* ---- scroll: nav fade + soft stage snap -------------------------------- */

const topnav = document.querySelector(".topnav");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  .matches;
const mobile = window.matchMedia("(max-width: 640px)");

let lastY = window.scrollY;
let settleTimer = 0;
let settleEndTimer = 0;
let touching = false;
let settling = false; // our own smooth glide — not the visitor scrolling

/* ease the nearest stage to the viewport center once scrolling rests.
   smooth scrollBy is native and interruptible — a new flick cancels it */
function settle() {
  if (!mobile.matches || reduceMotion || touching) return;
  const mid = window.innerHeight / 2;
  let best = 0;
  let bestDelta = Infinity;
  for (const b of document.querySelectorAll(".block")) {
    const r = b.getBoundingClientRect();
    const delta = r.top + r.height / 2 - mid;
    if (Math.abs(delta) < Math.abs(bestDelta)) bestDelta = delta;
  }
  best = bestDelta;
  // pull radius covers the whole feed (stages are ~82svh apart) but leaves
  // the intro and footer free — proximity, not force
  if (Math.abs(best) > 2 && Math.abs(best) < window.innerHeight * 0.45) {
    settling = true;
    clearTimeout(settleEndTimer);
    settleEndTimer = setTimeout(() => {
      settling = false;
    }, 800);
    window.scrollBy({ top: best, behavior: "smooth" });
  }
}

// real input immediately reclaims the scroll from a glide
const reclaim = () => {
  settling = false;
};
window.addEventListener("wheel", reclaim, { passive: true });

window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY;
    if (!settling) {
      if (y > lastY + 4 && y > 60) topnav.classList.add("hide");
      else if (y < lastY - 4 || y <= 60) topnav.classList.remove("hide");
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 150);
    }
    lastY = y;
  },
  { passive: true },
);

window.addEventListener("touchstart", () => {
  touching = true;
  settling = false;
  clearTimeout(settleTimer);
}, { passive: true });

window.addEventListener("touchend", () => {
  touching = false;
  clearTimeout(settleTimer);
  settleTimer = setTimeout(settle, 150);
}, { passive: true });
