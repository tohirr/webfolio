import "./index.css";

/* ---- blocks ------------------------------------------------------------
   the work row: live pieces mounted right in their tile, plus placeholders
   for what's coming. each live module exports mount(el) → optional cleanup */

const blocks = [
  {
    name: "glass-block",
    sub: "camera through pattern glass · webgl",
    load: () => import("./lab/glass-block.js"),
  },
  {
    name: "facet-card",
    sub: "pixel holo foil · webgl",
    load: () => import("./lab/facet-card.js"),
  },
  {
    name: "pulse-sphere",
    sub: "surface-pulsing dot sphere · generative audio",
    load: () => import("./lab/pulse-sphere.js"),
  },
  { name: "coffee", coffee: true },
];

const EMAIL = "tohirr.dev@gmail.com";

const SPONSOR_URL = "https://github.com/sponsors/tohirr";

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

/* ---- page -------------------------------------------------------------- */

const ext = 'target="_blank" rel="noreferrer"';

const tile = (b) =>
  `<figure class="block" aria-label="${b.name}">` +
  (b.coffee
    ? `<a class="tile coffee" href="${SPONSOR_URL}" ${ext}>` +
      `<span class="c-line">interfaces run on caffeine</span>` +
      `<span class="c-cta">sponsor me →</span></a>`
    : `<div class="tile" data-mount="${b.name}"></div>`) +
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
  `<img class="avatar" src="/favicon.svg" alt="pixel portrait of tohir" width="52" height="52" />` +
  `<p class="ink">Hi there,</p>` +
  `<p>I’m Tohir, a design engineer building interfaces where the ` +
  `details carry the feel.</p>` +
  `<p>Open to design engineer roles — <a href="${CAL_URL}" ${ext}>let’s talk</a>.</p>` +
  `</section>` +
  `<div class="bars" aria-hidden="true">` +
  blocks.map(() => `<i></i>`).join("") +
  `</div>` +
  `<section class="blocks" aria-label="work">` +
  blocks.map(tile).join("") +
  `</section>`;

/* ---- avatar: pixel-scatter hover ---------------------------------------- */

import("./avatar.js")
  .then((mod) => mod.mount(document.querySelector(".avatar")))
  .catch(() => {});

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

/* theme follows the system for now — no toggle */

/* ---- indicator: one bar per stage, thick while its stage is in view ----- */

const barEls = [...document.querySelector(".bars").children];
const blockEls = [...document.querySelectorAll(".block")];
const scroller = document.querySelector(".blocks");

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const bar = barEls[blockEls.indexOf(e.target)];
      if (bar) bar.classList.toggle("on", e.intersectionRatio >= 0.6);
    }
  },
  { root: scroller, threshold: [0.6] },
);
blockEls.forEach((el) => io.observe(el));
