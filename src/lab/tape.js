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
   browser has a motor. on a phone, "follow" hands the dial to the
   compass: the sensor's heading becomes the tape's goal and the settle
   spring glides it there tick by tick, so the phone's jitter is smoothed
   by the same detents your finger feels; touching the tape takes it
   back. left alone it flicks itself now and then, silently, drifting off
   north and back. the land mask is natural earth's 110m coastline
   rasterised to 2° cells and packed into a base64 string, ~2.7kb, so
   nothing is fetched. only the tape band itself claims horizontal
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
.tp-band{width:100%;height:96px;cursor:grab;outline:none;display:block;touch-action:pan-y}
.tp-band:active{cursor:grabbing}
.tp-val{position:absolute;right:14px;bottom:12px;color:var(--dim);font-variant-numeric:tabular-nums;pointer-events:none;min-width:4ch;text-align:right}
.tp-band.kb:focus + .tp-val{color:var(--ink);text-decoration:underline;text-underline-offset:4px}
.tp-tag{position:absolute;left:14px;bottom:12px;color:var(--dim);pointer-events:none}
.tp-follow{position:absolute;left:14px;top:12px;display:none;color:var(--dim);background:none;border:0;padding:0;margin:0;font:inherit;letter-spacing:inherit;cursor:pointer;touch-action:manipulation}
.tp-follow.show{display:block}
.tp-follow.on{color:var(--ink)}
.tp-follow:focus-visible{outline:1.5px solid var(--ink);outline-offset:3px}
</style>` +
    '<div class="tp-stage">' +
    '<div class="tp-frame"><canvas class="tp-pic" aria-hidden="true"></canvas></div>' +
    '<canvas class="tp-band" role="slider" tabindex="0" aria-label="heading" aria-valuemin="0" aria-valuemax="359" aria-valuenow="0" aria-valuetext="0°"></canvas>' +
    '<span class="tp-val">0°</span>' +
    '<span class="tp-tag">drag · flick · scroll · ←→</span>' +
    '<button class="tp-follow" type="button" aria-pressed="false">follow phone</button>' +
    "</div>";

  const stage = el.querySelector(".tp-stage");
  const frame_ = el.querySelector(".tp-frame");
  const pic = el.querySelector(".tp-pic");
  const band = el.querySelector(".tp-band");
  const val = el.querySelector(".tp-val");
  const followBtn = el.querySelector(".tp-follow");
  const ctx = band.getContext("2d");
  const pctx = pic.getContext("2d");

  /* ---- colours follow the theme ---------------------------------------- */
  let ink = "#fff", fg = "#8f8f8f", dim = "#6e6e6e", font = "monospace";
  const readTheme = () => {
    const cs = getComputedStyle(el);
    font = cs.fontFamily || font;
    ink = cs.getPropertyValue("--ink").trim() || ink;
    fg = cs.getPropertyValue("--fg").trim() || fg;
    dim = cs.getPropertyValue("--dim").trim() || dim;
  };
  readTheme();
  const mq = matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", readTheme);

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
    if (!ac || ac.state !== "running" || !noise) return;
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

  /* ---- state ----------------------------------------------------------- */
  let pos = 0; // the tape position, continuous, in ticks
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
    val.textContent = `${w}°`;
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
    followBtn.classList.remove("on");
    followBtn.setAttribute("aria-pressed", "false");
    followBtn.textContent = label || "follow phone";
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
    followBtn.classList.add("on");
    followBtn.setAttribute("aria-pressed", "true");
    followBtn.textContent = "following";
    // android's plain alpha is relative to wherever the page loaded; the
    // absolute event is the compass. ios only has the plain one, with a
    // heading on it
    addEventListener("ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation", onOrient);
    sensorTimer = setTimeout(() => { if (!sensorSeen) stopFollow("no compass"); }, 1500);
  };
  if (coarse && "DeviceOrientationEvent" in window) followBtn.classList.add("show");
  followBtn.addEventListener("click", () => (following ? stopFollow() : startFollow()));

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
    const side = Math.max(1, Math.floor(Math.min(f.height, f.width * 0.7)));
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
    const R = S / 2 - 3 * dpr; // the globe's radius
    // heading-up: the map turns the other way from the heading
    const th = (-pos * DEG * Math.PI) / 180;
    const cs = Math.cos(th), sn = Math.sin(th);
    const base = new Path2D();
    const lit = new Path2D();
    const baseR = cell * 0.09;
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
    pctx.globalAlpha = 0.45;
    pctx.fillStyle = dim;
    pctx.fill(base);
    pctx.globalAlpha = 1;
    pctx.fillStyle = ink;
    pctx.fill(lit);

    /* the rim, with the four cardinal points turning on it */
    pctx.globalAlpha = 0.35;
    pctx.strokeStyle = fg;
    pctx.lineWidth = 1 * dpr;
    pctx.beginPath();
    pctx.arc(cx, cy, R, 0, Math.PI * 2);
    pctx.stroke();
    pctx.lineCap = "round";
    for (let k = 0; k < 4; k++) {
      const a = th + (k * Math.PI) / 2; // 0 north, clockwise
      const dx = Math.sin(a), dy = -Math.cos(a);
      const len = (k === 0 ? 9 : 5) * dpr;
      pctx.globalAlpha = k === 0 ? 1 : 0.6;
      pctx.strokeStyle = k === 0 ? ink : fg;
      pctx.lineWidth = (k === 0 ? 2.2 : 1.4) * dpr;
      pctx.beginPath();
      pctx.moveTo(cx + dx * R, cy + dy * R);
      pctx.lineTo(cx + dx * (R - len), cy + dy * (R - len));
      pctx.stroke();
    }

    /* you, fixed at the centre, always facing up */
    pctx.globalAlpha = 1;
    pctx.strokeStyle = ink;
    pctx.lineWidth = 1.6 * dpr;
    pctx.beginPath();
    pctx.arc(cx, cy, 4 * dpr, 0, Math.PI * 2);
    pctx.stroke();
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

    drawPic();

    /* draw: ticks fade toward the edges, every fifth stands taller, every
       tenth carries its heading — cardinals as letters — north taller
       still, and the fixed indicator sits over the centre */
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2 - 8 * dpr, gap = GAP * dpr;
    const first = Math.ceil(pos - cx / gap), lastI = Math.floor(pos + cx / gap);
    ctx.lineCap = "round";
    ctx.font = `${10 * dpr}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = first; i <= lastI; i++) {
      const x = cx + (i - pos) * gap;
      const u = Math.abs(x - cx) / cx; // 0 centre → 1 edge
      const fade = Math.pow(1 - u, 1.6);
      const w = wrap(i);
      const north = w === 0;
      const h = (north ? 32 : i % 5 === 0 ? 24 : 14) * dpr;
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.3 + 0.7 * fade;
      ctx.lineWidth = (i % 5 === 0 ? 2 : 1.6) * dpr;
      ctx.beginPath();
      ctx.moveTo(x, cy - h / 2);
      ctx.lineTo(x, cy + h / 2);
      ctx.stroke();
      if (i % 10 === 0) {
        const c = CARDINAL[w];
        ctx.fillStyle = c ? ink : fg;
        ctx.globalAlpha = 0.25 + 0.75 * fade;
        ctx.fillText(c || String(w), x, cy + 26 * dpr); // clear of the indicator
      }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 24 * dpr);
    ctx.lineTo(cx, cy + 24 * dpr);
    ctx.stroke();

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  /* only spin the loop while the tile is on screen */
  const io = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    last = 0;
    if (e.isIntersecting) raf = requestAnimationFrame(frame);
  });
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
