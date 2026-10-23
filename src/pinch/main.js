/* /pinch/ — the ios photos grid, on the web. the gallaria works sit in a
   square-cropped grid with the fixed zoom levels ios has: one column (each
   photo full width, at its own aspect), three, five, and the fewest
   columns that put every photo in frame, top-aligned. nothing reflows
   while you pinch: the grid just scales like a picture about your fingers.
   between two levels both are drawn at the very same cell size, lined up
   on the photo you're holding, so their cells sit exactly on top of each
   other — one set of grid lines throughout — and each cell crossfades from
   the one level's photo to the other's in step with the zoom. a grid is an
   endless lattice in reading order, so any column can meet the screen's
   edge and the sides are never bare. let go and it zooms on to the next
   level the way you were pinching, about a point chosen so it lands
   square — a pure zoom, never a slide. images come from cloudinary at the
   size each level shows them, and the levels either side of the current
   one are kept loaded and ready. */

import "./pinch.css";
import WORKS from "../lab/gallaria-works.json";

const CLOUD = "https://res.cloudinary.com/dbgxvkfqw/image/upload";
const RUNGS = [128, 320, 800, 1400];
const rungUrl = (it, w) =>
  `${CLOUD}/c_limit,w_${w},f_auto,q_auto/${it.id}.${it.format}`;

const params = new URLSearchParams(location.search);
// forty works makes a short roll: lay the set down a few times over, each
// pass shuffled differently. four passes puts the everything-in-frame level
// around eleven across on a phone — a step on from five, as on ios
const COPIES = Math.max(1, Math.min(20, Number(params.get("copies")) || 4));

// the levels a pinch settles on, as ios has them: one column, three, five,
// and then everything in frame. all odd, so there's always a middle column
// and the photo you pinch at the centre can stay centred
const PINS = [1, 3, 5];
const GAP = 2; // css px between cells
// at one column each photo shows at its own proportions, within these:
// landscape down to 16:9, portrait up to 3:4 (the grid is sized so a 3:4
// photo fits the screen whole)
const AR_MIN = 0.5625;
const AR_MAX = 1.34;
const BAR = 50; // header height
const PAD_BOTTOM = 24;
const IDLE_SNAP_MS = 140; // ctrl-wheel pinches end when the wheel goes quiet
const STIFF = 230;
const DAMP = 30;
// between two levels, the stretch of the zoom (in log) over which each cell
// crossfades from one level's photo to the other's
const FADE_FROM = 0.15;
const FADE_TO = 0.85;
const EDGE = 70; // css px: how far a pinch can drag the roll's ends in
const ALIGN_MS = 420; // after a pinch, the grid easing back square to the screen

/* ---- the roll ------------------------------------------------------------- */
const mulberry = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const items = [];
for (let c = 0; c < COPIES; c++) {
  const order = WORKS.map((_, i) => i);
  if (c > 0) {
    const rnd = mulberry(c * 9973);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  for (const i of order) {
    const [id, format, w, h] = WORKS[i];
    items.push({ id, format, ar: h / w });
  }
}
const N = items.length;

// a photo's shape at one column, and a running sum of how far each strays
// from square — so the height of any run of one-column rows is O(1)
const A = (j) =>
  j >= 0 && j < N ? Math.min(AR_MAX, Math.max(AR_MIN, items[j].ar)) : 1;
const FA = new Float64Array(N + 1);
for (let j = 0; j < N; j++) FA[j + 1] = FA[j] + A(j) - 1;
const F = (j) => FA[Math.min(N, Math.max(0, j))];

/* ---- dom ------------------------------------------------------------------ */
const app = document.getElementById("pinch");
app.innerHTML =
  '<div class="stage"></div>' +
  '<header class="top">' +
  '<a href="/">← tohirr</a>' +
  '<span class="title"><b>pinch</b> · gallaria, the ios photos way</span>' +
  '<span class="level"></span>' +
  '<button type="button" data-d="1" aria-label="more columns">−</button>' +
  '<button type="button" data-d="-1" aria-label="fewer columns">+</button>' +
  "</header>" +
  '<p class="hint">pinch · ctrl-scroll · double-click a photo</p>';
const stage = app.querySelector(".stage");
const levelEl = app.querySelector(".level");
const hintEl = app.querySelector(".hint");

/* ---- levels: each one a layer ------------------------------------------- */
// every level, one column included, is an endless lattice in reading order:
// slot (r, c) holds photo r·n + c for any c, so past the right edge the next
// row's first photos carry on and past the left the row above's last. which
// column meets the screen's left edge is free — the first row is just
// partial — so a pinch can always settle as a pure zoom, never a slide.
// columns are always square-pitched; rows are too, except between three
// across and one, where each row grows toward the shape of the photo it
// holds at one column (see geo)
let vw = 0;
let vh = 0;
let W = 0; // grid width: a one-column photo's width
let offX = 0;
let pins = [1, 3];
let layers = new Map();
const dpr = Math.min(2, devicePixelRatio || 1);

function makeLayer(n) {
  const pitch = (W + GAP) / n;
  const L = { n, pitch, s: pitch - GAP };
  L.el = document.createElement("div");
  L.el.className = "layer";
  L.el.style.display = "none";
  L.cells = new Map(); // slot → cell element, made the first time it's seen
  L.shown = new Set();
  L.on = false;
  L.gkey = "";
  L.ver = 0;
  stage.appendChild(L.el);
  return L;
}

const slotKey = (r, c) => (r + 4096) * 8192 + c + 4096;
const mod = (a, n) => ((a % n) + n) % n;

// the row shapes of a level right now. between three across and one, rows
// stretch from square toward their one-column photo's shape, by how far the
// zoom is into one column (e). three-across rows borrow the shape of the
// one-column row they'll become: lined up on the held photo, three-across
// row r is one-column row r + delta. c is how much a unit of shape is worth
// in this level's own pixels
function geo(L) {
  const { a, t } = bracket(zc());
  const e = a === 1 ? 1 - fadeOf(t) : 0;
  if (!e || L.n > 3) return { c: 0, delta: 0 };
  return { c: (W * e) / L.n, delta: anchor.i - Math.floor(anchor.i / L.n) };
}
const rowTop = (L, r, G) => r * L.pitch + G.c * (F(r + G.delta) - F(G.delta));
const rowH = (L, r, G) => L.s + G.c * (A(r + G.delta) - 1);
function findRow(L, y, G) {
  let r = Math.floor(y / L.pitch);
  while (rowTop(L, r, G) > y) r--;
  while (rowTop(L, r + 1, G) <= y) r++;
  return r;
}

// where photo i lives in a level; i can run past either end of the roll
// (an empty slot) and still have a place
function home(L, i, G = geo(L)) {
  const r = Math.floor(i / L.n);
  return { x: mod(i, L.n) * L.pitch, y: rowTop(L, r, G), w: L.s, h: rowH(L, r, G) };
}

function cellOf(L, key) {
  let el = L.cells.get(key);
  if (el !== undefined) return el;
  const r = Math.floor(key / 8192) - 4096;
  const c = (key % 8192) - 4096;
  const i = r * L.n + c;
  if (i < 0 || i >= N) {
    L.cells.set(key, null);
    return null;
  }
  el = document.createElement("div");
  el.className = "cell";
  el.r = r;
  el.ver = -1;
  el.style.width = `${L.s}px`;
  const img = document.createElement("img");
  img.alt = "";
  img.decoding = "async";
  img.draggable = false;
  img.onload = () => img.classList.add("in");
  // cover-cropped: a wide photo in a square cell needs more than its width;
  // at one column the cell takes the photo's own shape
  const it = items[i];
  const h = L.n === 1 ? L.s * A(i) : L.s;
  const need = Math.max(L.s, h / it.ar) * dpr;
  const rung = RUNGS.find((q) => q >= need * 0.9) ?? RUNGS[RUNGS.length - 1];
  img.src = rungUrl(it, rung);
  el.appendChild(img);
  el.style.left = `${c * L.pitch}px`;
  L.el.appendChild(el);
  L.cells.set(key, el);
  return el;
}

function measure() {
  vw = innerWidth;
  vh = innerHeight;
  const room = vh - BAR - PAD_BOTTOM;
  // a one-column photo is the grid's full width, so the grid is never wider
  // than lets a 3:4 photo fit the screen whole: the whole width on a phone,
  // a centred column on a desktop
  W = Math.floor(Math.min(vw, 1400, room / AR_MAX));
  offX = (vw - W) / 2;
  stage.style.clipPath = offX > 0 ? `inset(0 ${offX}px)` : "";
  stage.textContent = "";
  layers = new Map();
  // the far end: the fewest columns with every photo in frame
  let zMax = 3;
  const fits = (n) => Math.ceil(N / n) * ((W + GAP) / n) - GAP <= room;
  while (zMax < N && !fits(zMax)) zMax += 2; // odd, like the rest
  // the pins below it, dropping any that crowd the last one
  pins = PINS.filter((p) => p < zMax * 0.85);
  pins.push(zMax);
  for (const p of pins) layers.set(p, makeLayer(p));
}
const zMin = () => pins[0];
const zMax = () => pins[pins.length - 1];

/* ---- state ---------------------------------------------------------------- */
// z is a column count, fractional mid-pinch. one level is on screen at a
// time, scaled by pin / z; it hands over to the next pin when z crosses
// halfway (in log) between them
let z = 5;
let active = 5; // the level nearer z: the one the anchor is measured on
// how firmly the grid is held square to the screen, 0–1, across and down
let alignX = 1;
let alignY = 1;
let alignT0 = null; // when it started easing back to 1
let rubberY = false; // mid-pinch: the top and bottom edges resist
let aimed = false; // the release zoom squares it up by itself, across and down
let zTarget = null;
let lzv = 0; // spring velocity, in log z per second
let gesturing = false;
let flingV = 0; // scroll momentum, css px per 16 ms
let dir = 0; // which way the pinch went overall: -1 in, +1 out
let zStart = 5; // the zoom when the fingers came down
// the anchor: a point on one photo (fractions u, v of its cell) and where
// on screen it should be
const anchor = { i: 0, u: 0.5, v: 0.5, fx: 0, fy: 0 };

// the two pins around z, and how far between them (log scale)
function bracket(zc) {
  let a = pins[0];
  let b = pins[0];
  for (let k = 0; k < pins.length; k++) {
    if (pins[k] <= zc) a = pins[k];
    if (pins[k] >= zc) {
      b = pins[k];
      break;
    }
  }
  const t = a === b ? 0 : Math.log(zc / a) / Math.log(b / a);
  return { a, b, t };
}
const zc = () => Math.min(zMax(), Math.max(zMin(), z));

// where a layer sits: scaled by pin / z, the anchor under the focus. at
// rest it's also squared up — a column edge on the screen's edge, and the
// roll's first and last rows kept inside the screen — but not mid-pinch:
// there the grid goes wherever the fingers take it. the squaring eases
// back in after the fingers lift (`alignX`, `alignY`), though by then the release
// zoom has nearly always squared it already. a level being faded out
// takes the same correction as the one replacing it (pass its place as
// `like`), so their cells stay on the same lattice
function place(L, like) {
  const k = L.n / z;
  const G = geo(L);
  const a = home(L, anchor.i, G);
  const rx = anchor.fx - offX - k * (a.x + anchor.u * a.w);
  const ry = anchor.fy - k * (a.y + anchor.v * a.h);
  if (like) return { k, tx: rx + like.dx, ty: ry + like.dy, dx: like.dx, dy: like.dy };
  const kp = k * L.pitch;
  // the far level stays phase 0: that's the one where every photo fits; so
  // does one column, whose row shapes are its own column's photos
  const m = L.n === zMax() || L.n === 1 ? 0 : Math.round(-rx / kp);
  const cx = -m * kp;
  // with column m at the left edge, the rows that hold any photo at all
  const rTop = Math.ceil(-(m + L.n - 1) / L.n);
  const rBot = Math.floor((N - 1 - m) / L.n);
  const top = rowTop(L, rTop, G);
  const bottom = rowTop(L, rBot, G) + rowH(L, rBot, G);
  const room = vh - BAR - PAD_BOTTOM;
  const h = k * (bottom - top);
  // a roll that fits sits at the top, like the far level on ios
  const cy = h > room ? Math.min(BAR - k * top, Math.max(vh - PAD_BOTTOM - k * bottom, ry)) : BAR - k * top;
  // the overview's columns are fixed (it starts at the first photo), so
  // mid-pinch its push across is taken in full — blended in by shown(),
  // in step with the crossfade — rather than left to a slide on release
  const dx = (cx - rx) * (rubberY && L.n === zMax() ? 1 : alignX);
  // mid-pinch the roll's first and last rows don't come away from the
  // screen's edges freely: past them it's a rubber band
  const over = cy - ry;
  const dy = rubberY ? over - Math.sign(over) * rubber(Math.abs(over), EDGE) : over * alignY;
  return { k, tx: rx + dx, ty: ry + dy, dx, dy };
}

const lead = () => layers.get(active);

// where a level is drawn: every level on screen takes the squaring of one
// reference — the level a release is heading for, else the nearer one —
// so all of them share one lattice
// mid-pinch the reference is a blend of the two levels' own pushes, in step
// with the crossfade — taking either one alone would jump the grid the
// moment the nearer level changed hands (most of all at the far level,
// whose push to the top can be the whole roll)
function shown(L) {
  if (rubberY) {
    const { a, b, t } = bracket(zc());
    const f = fadeOf(t);
    const pa = place(layers.get(a));
    const pb = b === a ? pa : place(layers.get(b));
    return place(L, { dx: pa.dx + (pb.dx - pa.dx) * f, dy: pa.dy + (pb.dy - pa.dy) * f });
  }
  const ref = layers.get(zTarget ?? active);
  return L === ref ? place(L) : place(L, place(ref));
}

// pick the point under the screen point (fx, fy) as the anchor: the slot
// there, and where in it
function setAnchor(fx, fy) {
  const L = lead();
  const { k, tx, ty } = shown(L);
  const G = geo(L);
  const px = (fx - offX - tx) / k;
  const py = (fy - ty) / k;
  const c = Math.floor(px / L.pitch);
  const r = findRow(L, py, G);
  anchor.i = r * L.n + c;
  anchor.u = (px - c * L.pitch) / L.s;
  anchor.v = (py - rowTop(L, r, G)) / rowH(L, r, G);
  anchor.fx = fx;
  anchor.fy = fy;
}
// after the edges have pushed the lead layer about, move the focus to where
// the anchor actually ended up, so scrolling never builds up slack
function settleAnchor() {
  const L = lead();
  const { k, tx, ty } = shown(L);
  const a = home(L, anchor.i);
  const fx = offX + tx + k * (a.x + anchor.u * a.w);
  const fy = ty + k * (a.y + anchor.v * a.h);
  const slack = Math.abs(fy - anchor.fy);
  anchor.fx = fx;
  anchor.fy = fy;
  return slack;
}

// choose the point to zoom about on release. the photo under the fingers
// keeps the column it's over: at the target level it lands in that column,
// square to the screen, and the zoom point is wherever makes that one pure
// zoom — down as well as across, so nothing slides. a pinch at the centre of an odd level stays in the middle column,
// so the centre photo stays the centre photo level after level
function aim(target) {
  const L = layers.get(target);
  const was = alignX;
  alignX = 0;
  const { k, tx } = place(L);
  alignX = was;
  aimed = Math.abs(k - 1) >= 0.01;
  if (!aimed) return; // as good as there: easing `alignX` does the rest
  const a = home(L, anchor.i);
  const X0 = offX + tx + k * (a.x + anchor.u * a.w); // the held point, now
  let xf = offX + a.x + anchor.u * a.w; // …and at rest: its own column
  if (L.n !== zMax() && L.n !== 1) {
    // the far level keeps phase 0, so all of the roll fits; the rest let
    // the held photo stay over the column it's in now
    const mid = X0 + (0.5 - anchor.u) * a.w * k;
    const c = Math.min(L.n - 1, Math.max(0, Math.floor((mid - offX) / L.pitch)));
    xf = offX + c * L.pitch + anchor.u * a.w;
  }
  // and down: the held point keeps its height, unless that would pull the
  // roll's first or last row into the screen — then wherever squaring at
  // rest would put it. try the rest pose, read off the push, put it back
  const Y0 = anchor.fy;
  const saved = { ...anchor, z, alignY };
  z = target;
  anchor.fx = xf;
  alignY = 1;
  const yf = Y0 + place(L).dy;
  ({ z, alignY } = saved);
  Object.assign(anchor, { i: saved.i, u: saved.u, v: saved.v, fx: saved.fx, fy: saved.fy });
  // one zoom point that takes both there at once
  setAnchor((k * xf - X0) / (k - 1), (k * yf - Y0) / (k - 1));
}

// pushing past either end gives a little, then springs back
const rubber = (x, span) => (span * x) / (span + x);
function zFromRaw(raw) {
  if (raw < zMin()) return zMin() / (1 + rubber(zMin() / raw - 1, 0.5));
  if (raw > zMax()) return zMax() * (1 + rubber(raw / zMax() - 1, 0.4));
  return raw;
}
// let go of the rubber band without the picture moving: re-pin the anchor
// where the band left it
function unband() {
  if (!rubberY) return;
  const L = lead();
  const { k, tx, ty } = shown(L);
  const a = home(L, anchor.i);
  anchor.fx = offX + tx + k * (a.x + anchor.u * a.w);
  anchor.fy = ty + k * (a.y + anchor.v * a.h);
  rubberY = false;
}
function snapTo(target) {
  unband();
  zTarget = Math.min(zMax(), Math.max(zMin(), target));
  aim(zTarget);
  if (alignY < 1 || alignX < 1) alignT0 = performance.now();
  kick();
}
// on release: zooming in settles on the next level in, zooming out on the
// next level out; a pinch that barely moved goes back where it was
function snapNearest() {
  const near = pins.find((p) => Math.abs(Math.log(z / p)) < 0.05);
  if (near !== undefined || !dir) {
    const { a, b, t } = bracket(zc());
    snapTo(near ?? (t < 0.5 ? a : b));
  } else if (dir < 0) snapTo([...pins].reverse().find((p) => p < z) ?? zMin());
  else snapTo(pins.find((p) => p > z) ?? zMax());
}

/* ---- drawing -------------------------------------------------------------- */
let raf = 0;
let last = 0;
const kick = () => {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
};

function frame(now) {
  raf = 0;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  let moving = false;

  if (zTarget !== null) {
    // spring in log z, so a step in is as quick as a step out
    const lz = Math.log(z);
    const lt = Math.log(zTarget);
    lzv += (STIFF * (lt - lz) - DAMP * lzv) * dt;
    z = Math.exp(lz + lzv * dt);
    if (Math.abs(lt - Math.log(z)) < 1e-4 && Math.abs(lzv) < 1e-3) {
      z = zTarget;
      lzv = 0;
      zTarget = null;
    } else moving = true;
  }

  if (flingV) {
    anchor.fy += flingV * dt * 60;
    flingV *= Math.pow(0.95, dt * 60);
    if (Math.abs(flingV) < 0.05) flingV = 0;
    else moving = true;
  }

  if (alignT0 !== null) {
    const t = Math.min(1, (now - alignT0) / ALIGN_MS);
    if (!aimed) alignX = alignY = 1 - Math.pow(1 - t, 3);
    if (t >= 1 && zTarget === null) {
      // an aimed zoom has landed square; take up the last fraction of a px
      alignT0 = null;
      alignX = alignY = 1;
    } else moving = true;
  }

  if (!gesturing && zTarget === null && alignT0 === null) {
    if (settleAnchor() > 0.5) flingV = 0;
    // at rest the anchor is whatever's mid-screen, so the levels laid out
    // unseen either side are lined up on the rows a pinch will reach for
    setAnchor(vw / 2, (vh + BAR) / 2);
  }
  draw();
  if (moving) kick();
}

const smooth = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

// the two levels around z, drawn on one lattice and crossfaded by the zoom
// — so each cell's fade from one photo to the other tracks the fingers,
// and runs back if they do. the levels either side are laid out unseen —
// decoded and ready, so a pinch fades into photos that are already there
const fadeOf = (t) => smooth((t - FADE_FROM) / (FADE_TO - FADE_FROM));

function draw() {
  const { a, b, t } = bracket(zc());
  active = t < 0.5 ? a : b;
  const f = fadeOf(t);
  // a true crossfade, each level at its own weight, added together (the
  // layers blend plus-lighter): where both have a photo the two sum to
  // full strength, so nothing dims midway; where only one does — below the
  // overview's last row, say — it fades in and out with its level
  const plan = new Map([[a, [b === a ? 1 : 1 - f, 1]]]);
  if (b !== a) plan.set(b, [f, 2]);
  for (const q of [pins[pins.indexOf(a) - 1], pins[pins.indexOf(b) + 1]])
    if (q && !plan.has(q)) plan.set(q, [0, 0]);
  for (const [n, L] of layers) {
    const p = plan.get(n);
    if (!p) {
      if (L.on) {
        L.el.style.display = "none";
        L.on = false;
      }
      continue;
    }
    if (!L.on) {
      L.el.style.display = "";
      L.on = true;
    }
    const { k, tx, ty } = shown(L);
    L.el.style.zIndex = p[1];
    L.el.style.opacity = p[0];
    L.el.style.transform = `translate3d(${offX + tx}px,${ty}px,0) scale(${k})`;
    cull(L, k, tx, ty, geo(L));
  }
  levelEl.textContent = `${active} across`;
}

// the slots of a layer that land on screen
function inView(L, k, tx, ty, G) {
  const r0 = findRow(L, (BAR - 20 - ty) / k, G);
  const r1 = findRow(L, (vh - ty) / k, G);
  const c0 = Math.floor(-tx / k / L.pitch);
  const c1 = Math.floor((W - tx) / k / L.pitch);
  const out = new Set();
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const i = r * L.n + c;
      if (i >= 0 && i < N) out.add(slotKey(r, c));
    }
  return out;
}

// show only those, each at its row's place and height — which only move
// while rows are changing shape
function cull(L, k, tx, ty, G) {
  const gkey = `${G.c}|${G.delta}`;
  if (gkey !== L.gkey) {
    L.gkey = gkey;
    L.ver++;
  }
  const next = inView(L, k, tx, ty, G);
  for (const key of L.shown) if (!next.has(key)) L.cells.get(key)?.style.setProperty("visibility", "hidden");
  for (const key of next) {
    const el = cellOf(L, key);
    if (!el) continue;
    if (!L.shown.has(key)) el.style.visibility = "";
    if (el.ver !== L.ver) {
      el.ver = L.ver;
      el.style.top = `${rowTop(L, el.r, G)}px`;
      el.style.height = `${rowH(L, el.r, G)}px`;
    }
  }
  L.shown = next;
}

/* ---- input ---------------------------------------------------------------- */
let raw = z; // the zoom the gesture asks for, before the ends push back
let hinted = false;
const touched = () => {
  if (!hinted) {
    hinted = true;
    setTimeout(() => hintEl.classList.add("gone"), 1200);
  }
};
function beginZoom(fx, fy) {
  gesturing = true;
  if (zTarget !== null) {
    zTarget = null;
    lzv = 0;
  }
  flingV = 0;
  dir = 0;
  const overview = Math.abs(Math.log(z / zMax())) < 0.02;
  zStart = z;
  raw = z;
  // from the everything-in-frame level a pinch grows the grid from its top
  // left corner, as ios does — the roll's start stays put and its end runs
  // on down the screen. anywhere else it zooms about the fingers
  if (overview) setAnchor(offX + 0.5, BAR + 0.5);
  else setAnchor(fx, fy);
  // let go of the edges: from here the grid goes where the fingers take it
  alignX = alignY = 0;
  alignT0 = null;
  rubberY = true;
  touched();
}
function zoomTo(next) {
  raw = Math.min(zMax() * 2, Math.max(zMin() / 2, next));
  z = zFromRaw(raw);
  kick();
}
function endZoom() {
  gesturing = false;
  dir = z < zStart * 0.99 ? -1 : z > zStart * 1.01 ? 1 : 0;
  snapNearest();
}

// trackpad pinch (chrome, firefox) and ctrl/⌘-scroll arrive as wheel
let wheelZooming = false;
let wheelTimer = 0;
let safariPinch = false;
app.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1;
    if (e.ctrlKey || e.metaKey) {
      if (safariPinch) return;
      if (!wheelZooming) {
        wheelZooming = true;
        beginZoom(e.clientX, e.clientY);
      }
      zoomTo(raw * Math.exp(e.deltaY * unit * 0.01));
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelZooming = false;
        endZoom();
      }, IDLE_SNAP_MS);
      return;
    }
    if (gesturing || zTarget !== null) return;
    flingV = 0;
    anchor.fy -= e.deltaY * unit;
    touched();
    kick();
  },
  { passive: false }
);

// safari's trackpad pinch
let gz0 = 1;
app.addEventListener("gesturestart", (e) => {
  e.preventDefault();
  safariPinch = true;
  beginZoom(e.clientX, e.clientY);
  gz0 = raw;
});
app.addEventListener("gesturechange", (e) => {
  e.preventDefault();
  zoomTo(gz0 / e.scale);
});
app.addEventListener("gestureend", (e) => {
  e.preventDefault();
  safariPinch = false;
  endZoom();
});

// touch: one finger scrolls with momentum, two pinch
const pointers = new Map();
let pinch = null;
let drag = null;
const mid = () => {
  const [a, b] = [...pointers.values()];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
};
app.addEventListener("pointerdown", (e) => {
  if (e.target.closest("header")) return;
  try {
    app.setPointerCapture(e.pointerId);
  } catch {
    /* not a live pointer */
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    drag = null;
    const m = mid();
    beginZoom(m.x, m.y);
    pinch = { d0: Math.max(m.d, 1), z0: raw, x: m.x, y: m.y };
  } else if (pointers.size === 1) {
    flingV = 0;
    drag = { y: e.clientY, t: performance.now(), v: 0 };
    app.classList.add("dragging");
    touched();
  }
});
app.addEventListener("pointermove", (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX;
  p.y = e.clientY;
  if (pinch && pointers.size >= 2) {
    const m = mid();
    // the fingers moving together pan the layers along with them
    anchor.fx += m.x - pinch.x;
    anchor.fy += m.y - pinch.y;
    pinch.x = m.x;
    pinch.y = m.y;
    zoomTo((pinch.z0 * pinch.d0) / Math.max(m.d, 1));
  } else if (drag && zTarget === null) {
    const now = performance.now();
    const dy = e.clientY - drag.y;
    anchor.fy += dy;
    const dtm = Math.max(1, now - drag.t);
    drag.v = 0.7 * drag.v + 0.3 * ((dy / dtm) * 16);
    drag.y = e.clientY;
    drag.t = now;
    kick();
  }
});
const lift = (e) => {
  if (!pointers.delete(e.pointerId)) return;
  if (pinch && pointers.size < 2) {
    pinch = null;
    endZoom();
    // the finger left behind shouldn't jerk the roll
    drag = null;
  } else if (drag && pointers.size === 0) {
    if (performance.now() - drag.t < 80) flingV = drag.v;
    drag = null;
    kick();
  }
  if (!pointers.size) app.classList.remove("dragging");
};
app.addEventListener("pointerup", lift);
app.addEventListener("pointercancel", lift);

// double-click a photo: one column on it, or back out to the grid
app.addEventListener("dblclick", (e) => {
  if (e.target.closest("header")) return;
  beginZoom(e.clientX, e.clientY);
  gesturing = false;
  const near = pins.find((p) => p >= 5) ?? zMax();
  snapTo(zc() > 1.5 ? 1 : near);
});

// keys and buttons step one pin, anchored on the middle of the screen
function step(d) {
  const from = zTarget ?? zc();
  let i = pins.findIndex((p) => p >= from - 1e-6);
  if (pins[i] > from + 1e-6 && d < 0) i--; // between pins: the next one each way
  i = Math.max(0, Math.min(pins.length - 1, i + d));
  if (zTarget === null) setAnchor(vw / 2, (vh + BAR) / 2);
  alignX = alignY = 0; // the step's own zoom squares it up
  snapTo(pins[i]);
  touched();
}
app.querySelectorAll(".top button").forEach((b) =>
  b.addEventListener("click", () => step(Number(b.dataset.d)))
);
addEventListener("keydown", (e) => {
  if (e.key === "+" || e.key === "=") step(-1);
  else if (e.key === "-" || e.key === "_") step(1);
  else return;
  e.preventDefault(); // ⌘± zooms the grid, not the page
});

/* ---- go ------------------------------------------------------------------- */
measure();
z = raw = active = pins.includes(5) ? 5 : pins[Math.min(1, pins.length - 1)];
anchor.i = 0;
anchor.u = anchor.v = 0;
anchor.fx = offX;
anchor.fy = BAR;
draw();
settleAnchor();
addEventListener("resize", () => {
  const keep = { ...anchor };
  const pin = active;
  measure();
  z = raw = active = pins.reduce((p, q) => (Math.abs(q - pin) < Math.abs(p - pin) ? q : p));
  Object.assign(anchor, keep);
  draw();
  settleAnchor();
});
