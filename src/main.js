import "./index.css";

/* ---- blocks ------------------------------------------------------------
   the work row: live pieces mounted right in their tile, plus placeholders
   for what's coming. each live module exports mount(el) → optional cleanup */

const FELDY_URL = "https://feldy.ai";
const FELDY_APP_STORE = "https://apps.apple.com/us/app/feldy-ai/id6780327228";
const FELDY_PLAY_STORE = "https://play.google.com/store/apps/details?id=com.feldy.app";

/* where "feldy" goes: the store on a phone, the site everywhere else.
   ipad safari calls itself a mac, so touch points break the tie */
const feldyHref = () => {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 0);
  if (ios) return FELDY_APP_STORE;
  if (/Android/.test(ua)) return FELDY_PLAY_STORE;
  return FELDY_URL;
};

const blocks = [
  {
    name: "facet-card",
    sub: "pixel holo foil · webgl",
    kind: "touch",
    load: () => import("./lab/facet-card.js"),
  },
  {
    name: "pulse-sphere",
    sub: "surface-pulsing dot sphere · generative audio",
    kind: "touch",
    load: () => import("./lab/pulse-sphere.js"),
  },
  {
    name: "tape",
    sub: "heading tape over a dot globe · detents, momentum, phone compass",
    kind: "touch",
    load: () => import("./lab/tape.js"),
  },
  { name: "coffee", coffee: true },
];

/* ---- details: what opens when a tile is tapped. a block with `detail: true`
   looks up its name here — { title, sub, body, links, media? } ---------- */

const details = {};

const EMAIL = "tohirr.dev@gmail.com";

const SPONSOR_URL = "https://github.com/sponsors/tohirr";

/* google calendar appointment-schedule booking page */
const CAL_URL = "https://calendar.app.google/6M3QwajrfAX85EaC8";

/* app-style icon buttons up top — each one is a single svg drawn twice:
   the light drawing (the real app icon, or its white inverse for the
   apps whose icon is black) and the dark one (the ios dark treatment: a
   graphite sheen with the glyph on it). css shows one per theme. gradients live in a hidden svg so the three icons share them */
const SQUIRCLE =
  "M12 0C2.54 0 0 2.54 0 12c0 9.46 2.54 12 12 12s12-2.54 12-12C24 2.54 21.46 0 12 0z";

const ICON_DEFS =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
  '<linearGradient id="icon-dk" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#3c3c3e"/><stop offset="1" stop-color="#1c1c1e"/>' +
  "</linearGradient>" +
  '<linearGradient id="icon-lt" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e9e9eb"/>' +
  "</linearGradient>" +
  '<linearGradient id="icon-sheen" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#fff" stop-opacity=".14"/>' +
  '<stop offset=".55" stop-color="#fff" stop-opacity="0"/>' +
  "</linearGradient>" +
  '<linearGradient id="mail-bg" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#1d63f0"/><stop offset="1" stop-color="#1ad5fd"/>' +
  "</linearGradient>" +
  '<linearGradient id="mail-glyph" x1="30" y1="16.33" x2="30" y2="43.67" gradientUnits="userSpaceOnUse">' +
  '<stop stop-color="#1a6ae7"/><stop offset="1" stop-color="#20c2f4"/>' +
  "</linearGradient>" +
  "</defs></svg>";

/* the light inverse of the dark treatment: white at the top falling to a
   pale grey, so it is lit the same way — a white sheen would be invisible
   on white, so the gradient carries the light on its own */
const WHITE_BG = `<path d="${SQUIRCLE}" fill="url(#icon-lt)"/>`;
const DARK_BG =
  `<path d="${SQUIRCLE}" fill="url(#icon-dk)"/>` +
  `<path d="${SQUIRCLE}" fill="url(#icon-sheen)"/>`;

const appIcon = (light, dark) =>
  '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">' +
  `<g class="lt">${light}</g><g class="dk">${dark}</g>` +
  `<path d="${SQUIRCLE}" fill="none" stroke="currentColor" stroke-opacity=".28" stroke-width=".6"/>` +
  "</svg>";

/* official marks (github.com/logos, x.com/brand) — 24-unit paths, white,
   scaled to sit on the ios icon grid */
const GH_MARK =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 " +
  "0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 " +
  "17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 " +
  "1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 " +
  "0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 " +
  "1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 " +
  "2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 " +
  "2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 " +
  "12.297c0-6.627-5.373-12-12-12";

const X_MARK =
  "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318" +
  "L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z";

const GH_GLYPH = (fill) =>
  `<path d="${GH_MARK}" fill="${fill}" transform="translate(4.8 4.8) scale(.6)"/>`;
const X_GLYPH = (fill) =>
  `<path d="${X_MARK}" fill="${fill}" transform="translate(6.5 6.5) scale(.458)"/>`;

/* both apps ship a black icon, which reads as unchanged next to the dark
   treatment — so in light mode they get the inverse: a white squircle with
   the mark in black, the way ios tints icons in its light style */
const GH_ICON = appIcon(WHITE_BG + GH_GLYPH("#000"), DARK_BG + GH_GLYPH("#fff"));
const X_ICON = appIcon(WHITE_BG + X_GLYPH("#000"), DARK_BG + X_GLYPH("#fff"));

/* apple mail, light: the icon art from aroundsketch.com/Apple-App-Icons — the
   blue-to-cyan gradient and the envelope, drawn on a 1024 grid, rounded by
   the same clip the original masks it with */
const MAIL_ENVELOPE =
  "M726.43,480.76 C725.2,480.76 722.73,482 721.5,482 L18.5,482 C17.26,482 14.8,482 13.56,480.76 " +
  "L233.1,261.02 L279.96,309.17 C330.53,361.01 410.7,361.01 461.26,309.17 L508.13,261.02 " +
  "L726.43,480.76 Z M740,457.31 L740,21.53 C740,19.06 740,16.59 738.76,15.36 C737.53,17.83 " +
  "520.46,242.50 520.46,242.50 L740,462.24 L740,457.31 Z M0,458.54 L0,24.00 C0,21.53 0,19.06 " +
  "1.23,17.83 C2.46,20.30 219.53,244.97 219.53,244.97 L1.23,463.48 C0,462.24 0,459.77 0,458.54 Z " +
  "M447.7,286.95 C404.53,330.15 335.46,330.15 293.53,286.95 L13.56,0.54 C12.33,-0.68 727.66,0.54 " +
  "727.66,0.54 L447.7,286.95 Z";
const MAIL_ENVELOPE_CLIP =
  "M74.35,0 L665.64,0 C691.50,0 700.87,2.69 710.32,7.74 C719.78,12.80 727.19,20.21 732.25,29.67 " +
  "C737.30,39.12 740,48.49 740,74.35 L740,407.64 C740,433.50 737.30,442.87 732.25,452.32 " +
  "C727.19,461.78 719.78,469.19 710.32,474.25 C700.87,479.30 691.50,482 665.64,482 L74.35,482 " +
  "C48.49,482 39.12,479.30 29.67,474.25 C20.21,469.19 12.80,461.78 7.74,452.32 C2.69,442.87 " +
  "0,433.50 0,407.64 L0,74.35 C0,48.49 2.69,39.12 7.74,29.67 C12.80,20.21 20.21,12.80 29.67,7.74 " +
  "C39.12,2.69 48.49,0 74.35,0 Z";

/* apple mail, dark: the tinted envelope glyph (~/Downloads/Mail.svg, a 60 grid) */
const MAIL_DARK_GLYPH =
  "M25.05 33.65L22.37 30.98L10.12 43.23C10.18 43.27 10.24 43.30 10.30 43.33C10.94 43.66 11.78 43.66 " +
  "13.46 43.66H46.53C48.21 43.66 49.05 43.66 49.69 43.33C49.75 43.30 49.81 43.27 49.87 43.23L37.62 " +
  "30.98L34.94 33.65C34.10 34.50 33.09 35.08 32.03 35.41C31.36 35.61 30.68 35.71 29.99 35.71C28.20 " +
  "35.71 26.41 35.02 25.05 33.65ZM50.90 42.21C50.94 42.15 50.97 42.09 51.00 42.02C51.33 41.38 51.33 " +
  "40.54 51.33 38.86V21.13C51.33 19.45 51.33 18.61 51.00 17.97C50.96 17.89 50.92 17.81 50.87 " +
  "17.73L38.65 29.95L50.90 42.21ZM49.93 16.79L34.00 32.71C33.17 33.54 32.15 34.06 31.08 34.27C30.34 " +
  "34.41 29.59 34.41 28.86 34.26C27.81 34.04 26.80 33.53 25.99 32.71L10.06 16.79C10.14 16.74 10.22 " +
  "16.70 10.30 16.66C10.94 16.33 11.78 16.33 13.46 16.33H46.53C48.21 16.33 49.05 16.33 49.69 " +
  "16.66C49.77 16.70 49.85 16.74 49.93 16.79ZM9.12 17.73C9.07 17.81 9.03 17.89 8.99 17.97C8.66 " +
  "18.61 8.66 19.45 8.66 21.13V38.86C8.66 40.54 8.66 41.38 8.99 42.02C9.02 42.09 9.05 42.15 9.09 " +
  "42.21L21.34 29.95L9.12 17.73Z";

const MAIL_ICON = appIcon(
  `<clipPath id="mail-env"><path d="${MAIL_ENVELOPE_CLIP}"/></clipPath>` +
    `<path d="${SQUIRCLE}" fill="url(#mail-bg)"/>` +
    '<g transform="scale(.0234375) translate(142 271)">' +
    `<path d="${MAIL_ENVELOPE}" fill="#fff" clip-path="url(#mail-env)"/></g>`,
  DARK_BG +
    '<g transform="scale(.4)">' +
    `<path d="${MAIL_DARK_GLYPH}" fill="url(#mail-glyph)" fill-rule="evenodd"/></g>`,
);

const nav = [
  { label: "GitHub", href: "https://github.com/tohirr", icon: GH_ICON },
  { label: "X (Twitter)", href: "https://x.com/_tohirr", icon: X_ICON },
  { label: "Email", href: `mailto:${EMAIL}`, icon: MAIL_ICON },
];

/* the mark in a cell's corner says what kind of cell it is: leaves the
   site, opens a drawer, or is a live piece you can touch. a cell that is
   only there to look at gets none */
const KIND = {
  link:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 12 12 4M6 4h6v6"/></svg>',
  more:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
  touch:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="8" cy="8" r="1.8" fill="currentColor" stroke="none"/>' +
    '<path d="M4.4 4.4a5.1 5.1 0 0 0 0 7.2M11.6 4.4a5.1 5.1 0 0 1 0 7.2"/></svg>',
};

/* on a phone nobody clicks — the intro says what the hand actually does */
const VERB = matchMedia("(pointer: coarse)").matches ? "touch" : "click";

/* ---- page -------------------------------------------------------------- */

const ext = 'target="_blank" rel="noreferrer"';

const tile = (b) =>
  `<figure class="block" aria-label="${b.name}">` +
  (b.coffee
    ? `<a class="tile coffee" href="${SPONSOR_URL}" ${ext}>` +
      `<span class="c-line">interfaces run on caffeine</span>` +
      `<span class="c-cta">sponsor me →</span></a>`
    : b.detail
      ? `<a class="tile mark" href="#${b.name}" aria-label="${b.name}" data-mount="${b.name}"></a>`
      : b.href
        ? `<a class="tile mark" href="${b.href}" ${ext} aria-label="${b.name}" data-mount="${b.name}"></a>`
      : `<div class="tile" data-mount="${b.name}"></div>`) +
  (KIND[b.kind] ? `<span class="kind" title="${b.kind}">${KIND[b.kind]}</span>` : "") +
  `</figure>`;

document.getElementById("app").innerHTML =
  `<nav class="topnav" aria-label="social">` +
  ICON_DEFS +
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
  `<p>I’m Tohir, a design engineer building interfaces you ${VERB} ` +
  `just to feel them. Currently @ <a class="feldy" href="${feldyHref()}" ${ext}>` +
  `<img class="app-icon" src="/media/feldy-app-icon.png" alt="F" width="16" height="16" />eldy</a>.</p>` +
  `<p>Open to design engineer roles — <a href="${CAL_URL}" ${ext}>let’s talk</a>.</p>` +
  `</section>` +
  `<div class="bars" aria-hidden="true">` +
  blocks.map(() => `<i></i>`).join("") +
  `</div>` +
  `<section class="blocks" aria-label="work">` +
  blocks.map(tile).join("") +
  `</section>`;

/* ---- the drawer ---------------------------------------------------------- */

import("./drawer.js").then((mod) => mod.mountDrawer(details));

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
