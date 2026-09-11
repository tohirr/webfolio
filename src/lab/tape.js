/* lab/tape — a heading tape, the strip from a glass cockpit's display: a
   tape of tick marks slides under a fixed centre indicator, every tick a
   detent, one degree of heading, and the numbers loop round the circle
   with N, E, S and W where they fall. under the tape sits the earth seen
   from straight above lagos, drawn as a dot display: a fixed coarse grid
   of dots samples an orthographic hemisphere, land is a lit dot shaded
   toward the limb, sea is a faint one, and the tape turns the whole
   globe so your heading is up, the way a moving map does. drag the tape,
   flick it and it coasts on momentum and settles onto a tick; roll the
   wheel over it; arrow keys step it. every tick crossed is a click (a
   filtered noise burst, pitched by direction) and a short buzz where the
   browser has a motor. the clicks are on by default — a dial that ticks
   is the point — and a small "sound" switch in the corner turns them off
   and remembers that. on a phone, a tap on the globe hands the dial to
   the compass: the sensor's heading becomes the tape's goal and the settle
   spring glides it there tick by tick, so the phone's jitter is smoothed
   by the same detents your finger feels; touching the tape takes it
   back. left alone it flicks itself now and then, silently, drifting off
   north and back. the land mask is natural earth's 110m coastline
   rasterised to 2° cells and packed into a base64 string, ~2.7kb, so
   nothing is fetched. three colours, all borrowed from the other pieces:
   the sea is the heat ramp's blue, the fixed indicator is its red, and
   you at the centre — and the follow button while it holds the dial —
   are the page's green, and the cardinal points, on the tape and on the
   rose round the globe, are its amber. everything else stays ink and
   grey. when the dial rests on a cardinal point — dragged onto it, or
   settled there — the indicator, the readout and the letter at the top
   of the rose turn green, like the level app going green at zero, with
   a lower thunk and a longer buzz on the moment it lands; a flick
   sweeping through the cardinals doesn't count. only the tape band
   itself claims horizontal
   touches — the rest of the cell still scrolls the row. canvas 2d, one
   page-wide AudioContext shared with the other pieces. */

import { wakeAudio as wakeShared } from "./audio.js";
import { unlockAudio } from "./audio-unlock.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;

const GAP = 12; // css px between ticks
const FRICTION = 3.4; // per second, on a flick
const DEG = 1; // degrees of heading per tick
const CELLS = 34; // dots across the picture
const HOME = [6.45, 3.4]; // lagos: lat, lon — the globe is seen from above here
const SEA = "rgb(37,99,235)"; // the heat ramp's blue
const AMBERV = [[245, 158, 11], [217, 119, 6]]; // the ramp's amber; a shade deeper on white
const WINDS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]; // the eight points, for the readout
const ROSE = 21; // css px of ring round the globe for the rose
const rgb = (hex, fb) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? [1, 3, 5].map((i) => parseInt(m[1].slice(i - 1, i + 1), 16)) : fb;
};
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
const REDV = [239, 68, 68];

/* heading wraps: a tick's reading is its angle folded into [0, 360) */
const wrap = (n) => (((n * DEG) % 360) + 360) % 360;
const CARDINAL = { 0: "N", 90: "E", 180: "S", 270: "W" };

/* ---- the land: 180×90 bits, 2° cells, lon -180→180 left to right, lat
   90→-90 top to bottom, msb first ------------------------------------- */
const LAND_W = 180, LAND_H = 90;
const LAND = (() => {
  const s = atob("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf4AP/AAAAAAAAAAAAAAAAAAAAAAAAX/z///+AAAAAAAABAAAAAAAAAAAAAYd8P///wAA+AAAAAA8AAAAAAAAAAAwAnw////4AAIAAAAAAGAAAAAAAAAAADivwAf//wAAAAADAAf/wAHYAAAAAADoi3sAP//gAAAAAMAD///sAAAAgBgACfwz/AD/+gAAAwAEHf///+/8gBAP/7/nJdjwD/+AAAH/AA7f///////f4P//////h8H/gAAAf/6//f////////Mf/////9H4D8AeAA+ev///////////AP/////4A0B4AAAD5/////////////Af3////gHgA4AAAH5///////////LwAHgH///gHkAAAAAH4/////////+CIAABAB///4D+AAAAGCx/////////4A8AAIAAf///n/gAAAOCD/////////wA4AAAAAf///n/wAAAbP///////////AgAAAAAP/////wAAADf//////////9AAAAAAAF////0YAAAB///////////9AAAAAAAD////8EAAAB///////////5AAAAAAAD////2AAAAB/f5fP//////wAAAAAAAD////gAAAAfxnwPP//////jAAAAAAAD////AAAAAPCb3/n/////+CAAAAAAAD///8AAAAAfALf/n////+ECAAAAAAAB///8AAAAAGHQP/n/////mMAAAAAAAA///8AAAAAH+Ai///////E8AAAAAAAAf//wAAAAAP/AA///////BgAAAAAAAAP//gAAAAAf/73///////gAAAAAAAAAD/AQAAAAAf////f/////gAAAAAAAAAF+AQAAAAB///+/n/////AAAAAAAAAAC+AAAAAAB///+f0H////AAAAAAAAAAAeAwAAAAD////f/B///8gAAAAAAAAAAeGEAAAAH////v+B/z/AAAAAAAAAAAAPMAgAAAD////n+A/B+gAAAAAAAAAAAD8AAAAAD////n4AeB/AgAAAAAAAAAAAPAAAAAH////3gAcAfAgAAAAAAAAAAADAAAAAD////6AAcAfggAAAAAAAAAAABDwAAAD////8wAMATAIAAAAAAAAAAAAr/AAAB/////gAKASAAAAAAAAAAAAAAH/gAAA/////gACAAAIAAAAAAAAAAAAH/8AAAaH///AAAAsGAAAAAAAAAAAAAH/+AAAAB//+AAAAUOAAAAAAAAAAAAAP/+AAAAB//8AAAAYegAAAAAAAAAAAAP//gAAAD//4AAAAMeBgAAAAAAAAAAAP//8AAAB//wAAAAGdiuAAAAAAAAAAAf///AAAA//wAAAACAQHgAAAAAAAAAAP///gAAA//wAAAABwAHwgAAAAAAAAAH///AAAA//wAAAAACIDQIAAAAAAAAAH//+AAAAf/wAAAAAAAAAAAAAAAAAAAD//+AAAA//wgAAAAABxAAAAAAAAAAAD//+AAAA//wgAAAAAPxgBAAAAAAAAAA//8AAAA//jgAAAAAf5gAAAAAAAAAAAf/8AAAA//DgAAAAAf/gAAAAAAAAAAAf/8AAAAf/DAAAAAD//4CAAAAAAAAAAf/wAAAAf/DAAAAAH//4AAAAAAAAAAAf/AAAAAf+CAAAAAH//8AAAAAAAAAAAf/AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAH4AAAAAAD//+AAAAAAAAAAA/8AAAAAHwAAAAAADwf8AAAAAAAAAAA/gAAAAAAAAAAAAACAH4AIAAAAAAAAB/wAAAAAAAAAAAAAAAD4AEAAAAAAAAB+AAAAAAAAAAAAAAAAAAAGAAAAAAAAB6AAAAAAAAAAAAAAAAAwAMAAAAAAAAA8AAAAAAAAAAAAAAAAAQAYAAAAAAAAB4AAAAAAAAAAAAAAAAAAAwAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAACAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAeAAIP+f/gAAAAAAAAAAAMAAAAAAABP/+H//////AAAAAAAAAAA+AAAAAf////8////////AAAAAAAOEAPAAAB///////////////gAAAP//T//8AAAH//////////////+AAAH/////4AAAH///////////////8AAE//////4ABw////////////////8AAAD//////gCA////////////////wAAAf/////////////////////////+A/4A///////////////////////////////////////////////////////////////////////////////////////");
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
})();
const land = (lat, lon) => {
  const r = Math.min(LAND_H - 1, Math.max(0, Math.floor((90 - lat) / 2)));
  const c = (((Math.floor((lon + 180) / 2) % LAND_W) + LAND_W) % LAND_W);
  const i = r * LAND_W + c;
  return (LAND[i >> 3] >> (7 - (i & 7))) & 1;
};

/* ---- the globe: brightness at a point on the disc ------------------------
   x right, y up, in units of the globe's radius; the disc is the
   hemisphere around HOME in an orthographic projection. returns -1 off
   the disc, 0 for sea, else a land brightness shaded toward the limb */
const LAT0 = (HOME[0] * Math.PI) / 180, LON0 = (HOME[1] * Math.PI) / 180;
const SIN0 = Math.sin(LAT0), COS0 = Math.cos(LAT0);
const globe = (x, y) => {
  const rho2 = x * x + y * y;
  if (rho2 > 1) return -1;
  const cosc = Math.sqrt(1 - rho2); // cos of the angular distance from home
  const lat = Math.asin(cosc * SIN0 + y * COS0);
  const lon = LON0 + Math.atan2(x, cosc * COS0 - y * SIN0);
  if (!land((lat * 180) / Math.PI, (lon * 180) / Math.PI)) return 0;
  return 0.4 + 0.6 * cosc;
};

export function mount(el) {
  el.innerHTML =
    `<style>
.tp-stage{position:relative;width:100%;height:100%;display:grid;grid-template-rows:minmax(0,1fr) 96px;gap:14px;padding:36px 0 46px;box-sizing:border-box;touch-action:pan-x;user-select:none;-webkit-user-select:none}
.tp-frame{width:100%;height:100%;min-height:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.tp-pic{display:block}
.tp-pic.tap{pointer-events:auto;cursor:pointer;touch-action:pan-x}
.tp-band{width:100%;height:96px;cursor:grab;outline:none;display:block;touch-action:pan-y}
.tp-band:active{cursor:grabbing}
.tp-val{position:absolute;right:14px;bottom:12px;color:var(--dim);font-variant-numeric:tabular-nums;pointer-events:none;min-width:7ch;text-align:right}
.tp-val,.tp-val b{transition:color .18s ease}
.tp-val b{font-weight:700;color:var(--tp-amber)}
.tp-val.on,.tp-val.on b{color:var(--green)}
.tp-band.kb:focus + .tp-val{color:var(--ink);text-decoration:underline;text-underline-offset:4px}
.tp-tag{position:absolute;left:14px;bottom:12px;color:var(--dim);pointer-events:none;user-select:none}
.tp-tag.on{color:var(--green)}
.tp-snd{position:absolute;left:14px;top:12px;color:var(--dim);background:none;border:0;padding:0;margin:0;font:inherit;letter-spacing:inherit;cursor:pointer;touch-action:manipulation}
.tp-snd.off{text-decoration:line-through;text-decoration-thickness:1px}
.tp-snd:focus-visible{outline:1.5px solid var(--ink);outline-offset:3px}
</style>` +
    '<div class="tp-stage">' +
    '<div class="tp-frame"><canvas class="tp-pic" aria-hidden="true"></canvas></div>' +
    '<canvas class="tp-band" role="slider" tabindex="0" aria-label="heading" aria-valuemin="0" aria-valuemax="359" aria-valuenow="0" aria-valuetext="0°"></canvas>' +
    '<span class="tp-val"><b>N</b> 0°</span>' +
    '<span class="tp-tag"></span>' +
    '<button class="tp-snd" type="button" aria-pressed="true">sound</button>' +
    "</div>";

  const stage = el.querySelector(".tp-stage");
  const frame_ = el.querySelector(".tp-frame");
  const pic = el.querySelector(".tp-pic");
  const band = el.querySelector(".tp-band");
  const val = el.querySelector(".tp-val");
  const tag = el.querySelector(".tp-tag");
  const snd = el.querySelector(".tp-snd");
  const canFollow = coarse && "DeviceOrientationEvent" in window;
  const ctx = band.getContext("2d");
  const pctx = pic.getContext("2d");

  /* ---- colours follow the theme ---------------------------------------- */
  let ink = "#fff", fg = "#8f8f8f", dim = "#6e6e6e", green = "#4ade80", greenV = [74, 222, 128], amberV = AMBERV[0], amber = mix(amberV, amberV, 0), font = "monospace";
  const mq = matchMedia("(prefers-color-scheme: light)");
  const readTheme = () => {
    const cs = getComputedStyle(el);
    font = cs.fontFamily || font;
    green = cs.getPropertyValue("--green").trim() || green;
    greenV = rgb(green, greenV);
    amberV = AMBERV[mq.matches ? 1 : 0];
    amber = mix(amberV, amberV, 0);
    el.style.setProperty("--tp-amber", amber);
    ink = cs.getPropertyValue("--ink").trim() || ink;
    fg = cs.getPropertyValue("--fg").trim() || fg;
    dim = cs.getPropertyValue("--dim").trim() || dim;
  };
  readTheme();
  mq.addEventListener("change", readTheme);

  /* ---- sound: on unless the visitor said no ------------------------------ */
  const KEY = "tp-sound";
  let muted = false;
  try { muted = localStorage.getItem(KEY) === "off"; } catch { /* private mode etc. */ }
  const showSound = () => {
    snd.classList.toggle("off", muted);
    snd.setAttribute("aria-pressed", String(!muted));
    snd.setAttribute("aria-label", muted ? "sound off" : "sound on");
  };
  showSound();
  snd.addEventListener("click", () => {
    muted = !muted;
    try { muted ? localStorage.setItem(KEY, "off") : localStorage.removeItem(KEY); } catch { /* fine */ }
    showSound();
    if (!muted) { wakeAudio(); click(1); } // a click back, so you hear it's on
  });

  /* ---- the tick: click + buzz ------------------------------------------- */
  let ac = null, noise = null;
  const wakeAudio = () => {
    unlockAudio(); // iphone: get past the silent switch
    ac = wakeShared();
    if (!ac || noise) return;
    const len = Math.floor(ac.sampleRate * 0.03);
    noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  };
  const click = (dir) => {
    if (muted || !ac || ac.state !== "running" || !noise) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noise;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = dir > 0 ? 2400 : 1800;
    bp.Q.value = 1.6;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.011);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t);
    src.stop(t + 0.03);
  };
  let lastTick = 0;
  const tick = (dir, silent) => {
    if (silent) return;
    const now = performance.now();
    if (now - lastTick < 26) return; // a hard flick is a run of clicks, not a buzz
    lastTick = now;
    click(dir);
    navigator.vibrate?.(15);
  };

  /* landing on a cardinal: a lower, rounder thunk than the tick */
  const thunk = () => {
    if (muted || !ac || ac.state !== "running") return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(360, t + 0.06);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.1);
  };

  /* ---- state ----------------------------------------------------------- */
  let pos = 0; // the tape position, continuous, in ticks
  let locked = false, lockA = 0; // resting on a cardinal, and how green it is
  let notch = 0; // the tick under the indicator
  let vel = 0; // ticks per second, while coasting
  let goal = null; // where a wheel notch, a key or the compass is sending it — it glides there
  let dragging = false, coasting = false, silentRun = false;
  let lastUser = -1e9;

  const setNotch = (n) => {
    if (n === notch) return;
    tick(n > notch ? 1 : -1, silentRun);
    notch = n;
    const w = wrap(n);
    band.setAttribute("aria-valuenow", String(w));
    band.setAttribute("aria-valuetext", `${w}° ${CARDINAL[w] || ""}`.trim());
    val.innerHTML = `<b>${WINDS[Math.round(w / 45) % 8]}</b> ${w}°`;
  };
  const setPos = (p) => {
    pos = p;
    setNotch(Math.round(pos));
  };

  /* ---- the compass: on a phone, the sensor can hold the dial ------------- */
  let following = false, sensorSeen = false, sensorTimer = 0;
  const onOrient = (e) => {
    // ios gives a true compass heading; elsewhere alpha counts the other way
    let h = e.webkitCompassHeading;
    if (h == null) {
      if (e.alpha == null) return;
      h = 360 - e.alpha;
    }
    h = (h + (screen.orientation?.angle || 0) + 360) % 360;
    sensorSeen = true;
    if (!following) return;
    // the shortest way round, from wherever the tape is
    const delta = ((h - wrap(pos) + 540) % 360) - 180;
    if (Math.abs(delta) < 1) return; // the sensor's own jitter
    goal = Math.round(pos + delta);
    vel = 0;
    coasting = true;
  };
  const stopFollow = (label) => {
    following = false;
    goal = null;
    removeEventListener("deviceorientationabsolute", onOrient);
    removeEventListener("deviceorientation", onOrient);
    clearTimeout(sensorTimer);
    tag.classList.remove("on");
    if (canFollow) tag.textContent = label || "tap globe to follow";
  };
  const startFollow = async () => {
    wakeAudio();
    lastUser = performance.now();
    silentRun = false;
    coasting = false;
    vel = 0;
    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      let state = "denied";
      try { state = await DeviceOrientationEvent.requestPermission(); } catch { /* not from a gesture, or refused */ }
      if (state !== "granted") return stopFollow("compass blocked");
    }
    following = true;
    sensorSeen = false;
    tag.classList.add("on");
    tag.textContent = "following — tap to stop";
    // android's plain alpha is relative to wherever the page loaded; the
    // absolute event is the compass. ios only has the plain one, with a
    // heading on it
    addEventListener("ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation", onOrient);
    sensorTimer = setTimeout(() => { if (!sensorSeen) stopFollow("no compass"); }, 1500);
  };
  /* on a phone the globe is the switch: a tap toggles the compass; a real
     drag (the row scrolling) doesn't. no hint anywhere else — the tape
     explains itself */
  if (canFollow) {
    tag.textContent = "tap globe to follow";
    pic.classList.add("tap");
    let tx0 = 0, ty0 = 0;
    pic.addEventListener("pointerdown", (e) => { tx0 = e.clientX; ty0 = e.clientY; });
    pic.addEventListener("pointerup", (e) => {
      if (Math.abs(e.clientX - tx0) + Math.abs(e.clientY - ty0) > 6) return;
      if (following) stopFollow();
      else startFollow();
    });
  }

  /* ---- input ----------------------------------------------------------- */
  let x0 = 0, pos0 = 0;
  const samples = []; // recent (t, pos) for the flick velocity
  band.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    wakeAudio();
    if (following) stopFollow(); // the hand takes it back
    dragging = true;
    coasting = false;
    silentRun = false;
    goal = null;
    vel = 0;
    lastUser = performance.now();
    x0 = e.clientX;
    pos0 = pos;
    samples.length = 0;
    samples.push([performance.now(), pos]);
    band.setPointerCapture(e.pointerId);
    viaPointer = true;
    band.focus({ preventScroll: true });
  });
  band.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    lastUser = performance.now();
    setPos(pos0 - (e.clientX - x0) / GAP); // the tape follows the finger
    samples.push([lastUser, pos]);
    while (samples.length > 6) samples.shift();
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    wakeAudio(); // ios trusts the end of a touch most
    // the flick: velocity from the last few samples, then coast
    const now = performance.now();
    const old = samples.find(([t]) => now - t < 120) || samples[0];
    const dt = (now - old[0]) / 1000;
    vel = dt > 0.004 ? (pos - old[1]) / dt : 0;
    vel = Math.max(-140, Math.min(140, vel));
    coasting = true;
  };
  band.addEventListener("pointerup", release);
  band.addEventListener("pointercancel", release);

  let wheelAcc = 0;
  band.addEventListener("wheel", (e) => {
    e.preventDefault();
    wakeAudio();
    if (following) stopFollow();
    lastUser = performance.now();
    silentRun = false;
    coasting = false;
    wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const steps = Math.trunc(wheelAcc / 24);
    if (!steps) return;
    wheelAcc -= steps * 24;
    goal = (goal ?? Math.round(pos)) + steps;
    vel = 0;
    coasting = true; // the settle spring carries it to the goal, tick by tick
  }, { passive: false });

  let viaPointer = false;
  band.addEventListener("focus", () => {
    band.classList.toggle("kb", !viaPointer);
    viaPointer = false;
  });
  band.addEventListener("keydown", (e) => {
    const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    band.classList.add("kb");
    wakeAudio();
    if (following) stopFollow();
    lastUser = performance.now();
    silentRun = false;
    coasting = false;
    goal = (goal ?? Math.round(pos)) + d * (e.shiftKey ? 5 : 1);
    vel = 0;
    coasting = true;
  });

  /* ---- sizing ---------------------------------------------------------- */
  let W = 0, H = 0, S = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = band.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    band.width = W;
    band.height = H;
    // the picture: a square, as tall as the row allows, no wider than
    // most of the cell
    const f = frame_.getBoundingClientRect();
    const side = Math.max(1, Math.floor(Math.min(f.height, f.width * 0.76)));
    pic.style.width = pic.style.height = `${side}px`;
    S = Math.max(1, Math.round(side * dpr));
    pic.width = pic.height = S;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(band);
  ro.observe(frame_);

  /* ---- ambient: a flick on its own now and then, quietly ---------------- */
  let ambNext = performance.now() + 5000;

  /* ---- the picture ------------------------------------------------------- */
  const drawPic = () => {
    const cell = S / CELLS;
    const cx = S / 2, cy = S / 2;
    const R = S / 2 - ROSE * dpr; // the globe's radius; the rose sits in the ring outside
    if (R <= 0) return; // not laid out yet: the frame had no size when resize() ran
    // heading-up: the map turns the other way from the heading
    const th = (-pos * DEG * Math.PI) / 180;
    const cs = Math.cos(th), sn = Math.sin(th);
    const base = new Path2D();
    const lit = new Path2D();
    const baseR = cell * 0.11;
    for (let y = 0; y < CELLS; y++)
      for (let x = 0; x < CELLS; x++) {
        const px = (x + 0.5) * cell;
        const py = (y + 0.5) * cell;
        // this dot, on the map before it was turned, in globe radii
        const sx = (px - cx) / R, sy = (py - cy) / R;
        const u = sx * cs + sy * sn, v = -sx * sn + sy * cs;
        const l = globe(u, -v);
        if (l < 0) continue;
        if (l > 0) {
          const r = cell * (0.12 + 0.32 * Math.pow(l, 0.8));
          lit.moveTo(px + r, py);
          lit.arc(px, py, r, 0, Math.PI * 2);
        } else {
          base.moveTo(px + baseR, py);
          base.arc(px, py, baseR, 0, Math.PI * 2);
        }
      }
    pctx.clearRect(0, 0, S, S);
    pctx.globalAlpha = 0.6;
    pctx.fillStyle = SEA;
    pctx.fill(base);
    pctx.globalAlpha = 1;
    pctx.fillStyle = ink;
    pctx.fill(lit);

    /* the rim, and the rose turning on it: a grey tick every ten
       degrees, longer every thirty, and the four cardinal points in
       amber with their letters set tangent to the ring, north biggest */
    pctx.globalAlpha = 0.35;
    pctx.strokeStyle = fg;
    pctx.lineWidth = 1 * dpr;
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.stroke();
    pctx.lineCap = "round";
    for (let k = 0; k < 36; k++) {
      if (k % 9 === 0) continue; // the cardinals, below
      const a = th + (k * Math.PI) / 18; // 0 north, clockwise
      const dx = Math.sin(a), dy = -Math.cos(a);
      const len = (k % 3 === 0 ? 5 : 3) * dpr;
      pctx.globalAlpha = k % 3 === 0 ? 0.6 : 0.35;
      pctx.strokeStyle = fg;
      pctx.lineWidth = 1.2 * dpr;
      pctx.beginPath();
      pctx.moveTo(cx + dx * (R + 2 * dpr), cy + dy * (R + 2 * dpr));
      pctx.lineTo(cx + dx * (R + 2 * dpr + len), cy + dy * (R + 2 * dpr + len));
      pctx.stroke();
    }
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    for (let k = 0; k < 4; k++) {
      const a = th + (k * Math.PI) / 2;
      const dx = Math.sin(a), dy = -Math.cos(a);
      const len = (k === 0 ? 7 : 5) * dpr;
      // the one under the indicator lights green when the dial rests on it
      const hit = lockA > 0.01 && wrap(notch) === k * 90;
      const col = hit ? mix(amberV, greenV, lockA) : amber;
      pctx.globalAlpha = 1;
      pctx.strokeStyle = col;
      pctx.lineWidth = 2.2 * dpr;
      pctx.beginPath();
      pctx.moveTo(cx + dx * (R + 1 * dpr), cy + dy * (R + 1 * dpr));
      pctx.lineTo(cx + dx * (R + 1 * dpr + len), cy + dy * (R + 1 * dpr + len));
      pctx.stroke();
      pctx.fillStyle = col;
      pctx.font = `700 ${(k === 0 ? 15 : 13) * dpr}px ${font}`;
      pctx.save();
      pctx.translate(cx + dx * (R + 15 * dpr), cy + dy * (R + 15 * dpr));
      pctx.rotate(a);
      pctx.fillText(CARDINAL[k * 90], 0, 0);
      pctx.restore();
    }

    /* you, fixed at the centre, always facing up */
    pctx.globalAlpha = 1;
    pctx.fillStyle = green;
    pctx.strokeStyle = green;
    pctx.lineWidth = 1.6 * dpr;
    pctx.beginPath();
    pctx.arc(cx, cy, 4 * dpr, 0, Math.PI * 2);
    pctx.fill();
    pctx.beginPath();
    pctx.moveTo(cx, cy - 7 * dpr);
    pctx.lineTo(cx, cy - 13 * dpr);
    pctx.stroke();
  };

  /* ---- frame ------------------------------------------------------------- */
  let raf = 0, last = 0, alive = true;
  const frame = (now) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;

    if (!reduceMotion && !dragging && !following && now - lastUser > 6000 && now > ambNext) {
      ambNext = now + 6000 + Math.random() * 7000;
      silentRun = true;
      goal = null;
      const dir = pos > 0 ? -1 : 1;
      vel = dir * (14 + Math.random() * 22); // a nudge of a few degrees, not a spin
      coasting = true;
    }

    if (coasting && !dragging) {
      if (Math.abs(vel) > 1.2) {
        // coast and slow
        vel *= Math.exp(-FRICTION * dt);
        setPos(pos + vel * dt);
      } else {
        // settle: a spring onto the goal if there is one, else the nearest
        // tick. a long way to go glides faster
        const target = goal ?? Math.round(pos);
        const rate = goal != null ? 10 : 14;
        const k = reduceMotion ? 1 : 1 - Math.exp(-dt * rate);
        setPos(pos + (target - pos) * k);
        vel = 0;
        if (Math.abs(target - pos) < 0.002) { pos = target; goal = null; coasting = false; silentRun = false; }
      }
    }

    /* on a cardinal? only when the dial is resting there or being held
       there — a coast through it doesn't count */
    const resting = dragging || !coasting || (Math.abs(vel) <= 1.2 && Math.abs((goal ?? Math.round(pos)) - pos) < 0.25);
    const on = resting && CARDINAL[wrap(notch)] != null;
    if (on !== locked) {
      locked = on;
      val.classList.toggle("on", on);
      if (on && !silentRun) { thunk(); navigator.vibrate?.(30); }
    }
    lockA += ((on ? 1 : 0) - lockA) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 16));

    drawPic();

    /* draw: the tape is a drum seen from the front. a tick's place on the
       tape becomes an angle round the cylinder and its screen x is the
       sine of that, so the ticks crowd toward the edges and spread at the
       centre; height, weight, label width and alpha all follow the cosine,
       so the middle stands proud and the sides roll away. every fifth
       stands taller, every tenth carries its heading, cardinals in amber
       and bigger, and the fixed indicator sits over the centre */
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2 - 8 * dpr, gap = GAP * dpr;
    const DR = cx * 1.02; // the drum's radius: the edges are ~80° round
    const span = Math.asin(Math.min(1, cx / DR)) * DR / gap; // ticks each side
    const first = Math.ceil(pos - span), lastI = Math.floor(pos + span);
    ctx.lineCap = "round";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = first; i <= lastI; i++) {
      const a = ((i - pos) * gap) / DR; // angle round the drum
      const k = Math.cos(a); // 1 at the centre → 0 at the rim
      if (k <= 0.05) continue;
      const x = cx + DR * Math.sin(a);
      const w = wrap(i);
      const c = CARDINAL[w];
      const h = (c ? 32 : i % 5 === 0 ? 24 : 14) * dpr * (0.4 + 0.75 * k); // 1.15× proud at the centre
      ctx.strokeStyle = c ? amber : fg;
      ctx.globalAlpha = 0.04 + 0.96 * Math.pow(k, 2.2); // all but gone at the rim
      ctx.lineWidth = (c ? 2.4 : i % 5 === 0 ? 2 : 1.6) * dpr * (0.6 + 0.4 * k);
      ctx.beginPath();
      ctx.moveTo(x, cy - h / 2);
      ctx.lineTo(x, cy + h / 2);
      ctx.stroke();
      if (i % 10 === 0) {
        ctx.fillStyle = c ? amber : fg;
        ctx.font = c ? `700 ${15 * dpr}px ${font}` : `${10.5 * dpr}px ${font}`;
        ctx.save();
        ctx.translate(x, cy + 28 * dpr); // clear of the indicator
        ctx.scale(k * (0.85 + 0.3 * k), 0.7 + 0.45 * k); // foreshortened round the drum, 1.15× in the middle
        ctx.fillText(c || String(w), 0, 0);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = mix(REDV, greenV, lockA);
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 24 * dpr);
    ctx.lineTo(cx, cy + 21 * dpr);
    ctx.stroke();

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  /* only spin the loop while the tile is on screen */
  const io = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    last = 0;
    if (e.intersectionRatio >= 0.5) raf = requestAnimationFrame(frame); // half the cell in view before it wakes
  }, { threshold: 0.5 });
  io.observe(stage);

  return () => {
    alive = false;
    stopFollow();
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    mq.removeEventListener("change", readTheme);
  };
}
