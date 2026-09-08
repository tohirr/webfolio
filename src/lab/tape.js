/* lab/tape — the ruler scrubber from photos' adjust tools, as a piece: a
   tape of tick marks slides under a fixed centre indicator, every tick a
   detent. drag it, flick it and it coasts on momentum and settles onto a
   tick; roll the wheel over it; arrow keys step it. every tick crossed is a
   click (a filtered noise burst, pitched by direction) and a short buzz
   where the browser has a motor. it has no ends, but it gets heavier the
   further out you go, so flicks stop shorter. left alone it
   flicks itself now and then, silently. only the tape band itself claims
   horizontal touches — the rest of the cell still scrolls the row. canvas
   2d, one page-wide AudioContext shared with the other pieces. */

import { wakeAudio as wakeShared } from "./audio.js";
import { unlockAudio } from "./audio-unlock.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const GAP = 12; // css px between ticks
const FRICTION = 3.4; // per second, on a flick, at zero
const HEAVY = 120; // ticks out at which the friction has doubled
/* the tape is endless. it gets heavier the further out you are: the
   friction on a flick grows with the number, so near zero a flick sails
   and out in the hundreds it stops short — the far reaches resist */
const friction = (p) => FRICTION * (1 + Math.abs(p) / HEAVY);

export function mount(el) {
  el.innerHTML =
    `<style>
.tp-stage{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;touch-action:pan-x;user-select:none;-webkit-user-select:none}
.tp-band{width:100%;height:96px;cursor:grab;outline:none;display:block;touch-action:pan-y}
.tp-band:active{cursor:grabbing}
.tp-val{color:var(--ink);font-size:22px;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.02em;pointer-events:none;min-width:3ch;text-align:center}
.tp-band.kb:focus + .tp-val{text-decoration:underline;text-underline-offset:6px}
.tp-tag{position:absolute;left:14px;bottom:12px;color:var(--dim);pointer-events:none}
</style>` +
    '<div class="tp-stage">' +
    '<canvas class="tp-band" role="slider" tabindex="0" aria-label="tape" aria-valuenow="0"></canvas>' +
    '<span class="tp-val">0</span>' +
    '<span class="tp-tag">drag · flick · scroll · ←→</span>' +
    "</div>";

  const stage = el.querySelector(".tp-stage");
  const band = el.querySelector(".tp-band");
  const val = el.querySelector(".tp-val");
  const ctx = band.getContext("2d");

  /* ---- colours follow the theme ---------------------------------------- */
  let ink = "#fff", fg = "#8f8f8f";
  const readTheme = () => {
    const cs = getComputedStyle(el);
    ink = cs.getPropertyValue("--ink").trim() || ink;
    fg = cs.getPropertyValue("--fg").trim() || fg;
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
  let goal = null; // where a wheel notch or a key is sending it — it glides there
  let dragging = false, coasting = false, silentRun = false;
  let lastUser = -1e9;

  const setNotch = (n) => {
    if (n === notch) return;
    tick(n > notch ? 1 : -1, silentRun);
    notch = n;
    band.setAttribute("aria-valuenow", String(n));
    val.textContent = n > 0 ? `+${n}` : String(n);
  };
  const setPos = (p) => {
    pos = p;
    setNotch(Math.round(pos));
  };

  /* ---- input ----------------------------------------------------------- */
  let x0 = 0, pos0 = 0;
  const samples = []; // recent (t, pos) for the flick velocity
  band.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    wakeAudio();
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
    lastUser = performance.now();
    silentRun = false;
    coasting = false;
    goal = (goal ?? Math.round(pos)) + d * (e.shiftKey ? 5 : 1);
    vel = 0;
    coasting = true;
  });

  /* ---- sizing ---------------------------------------------------------- */
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    const r = band.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    band.width = W;
    band.height = H;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(band);

  /* ---- ambient: a flick on its own now and then, quietly ---------------- */
  let ambNext = performance.now() + 5000;

  /* ---- frame ------------------------------------------------------------- */
  let raf = 0, last = 0, alive = true;
  const frame = (now) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;

    if (!reduceMotion && !dragging && now - lastUser > 6000 && now > ambNext) {
      ambNext = now + 6000 + Math.random() * 7000;
      silentRun = true;
      goal = null;
      const dir = pos > 0 ? -1 : 1;
      vel = dir * (28 + Math.random() * 40);
      coasting = true;
    }

    if (coasting && !dragging) {
      if (Math.abs(vel) > 1.2) {
        // coast and slow — heavier the further out
        vel *= Math.exp(-friction(pos) * dt);
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

    /* draw: ticks fade toward the edges, every fifth stands taller, the
       zero mark taller still, and the fixed indicator sits over the centre */
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, gap = GAP * dpr;
    const first = Math.ceil(pos - cx / gap), lastI = Math.floor(pos + cx / gap);
    ctx.lineCap = "round";
    for (let i = first; i <= lastI; i++) {
      const x = cx + (i - pos) * gap;
      const u = Math.abs(x - cx) / cx; // 0 centre → 1 edge
      const fade = Math.pow(1 - u, 1.6);
      const h = (i === 0 ? 32 : i % 5 === 0 ? 24 : 14) * dpr;
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.3 + 0.7 * fade;
      ctx.lineWidth = (i % 5 === 0 ? 2 : 1.6) * dpr;
      ctx.beginPath();
      ctx.moveTo(x, cy - h / 2);
      ctx.lineTo(x, cy + h / 2);
      ctx.stroke();
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
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    mq.removeEventListener("change", readTheme);
  };
}
