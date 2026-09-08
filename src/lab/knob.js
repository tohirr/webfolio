/* lab/knob — a rotary knob with real detents. twenty-four notches over a
   270° sweep; the dial sticks a little at each one and snaps in, so it
   reads as mechanical even with the sound off. every notch crossed is a
   tick: a synthesized click (a filtered noise burst, pitched by direction),
   and a short buzz where the browser has a motor (android; iphones have
   no vibration api for the web). a ring of pixels
   outside the dial lights up to the level, one per notch. drag round the
   dial, roll the wheel over it, or use the arrow keys. left alone, it
   turns itself a few notches now and then — silently. */

import { wakeAudio as wakeShared } from "./audio.js";
import { unlockAudio } from "./audio-unlock.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const N = 24; // notches
const SWEEP = 270; // degrees, end to end
const STEP = SWEEP / N; // degrees per notch
const R = 30; // dial radius in svg units (viewBox 100)
const RING = 43; // pixel ring radius

export function mount(el) {
  const ids = [...Array(N + 1).keys()];
  const dotAt = (i) => {
    const a = ((-SWEEP / 2 + i * STEP - 90) * Math.PI) / 180;
    return [50 + RING * Math.cos(a), 50 + RING * Math.sin(a)];
  };
  el.innerHTML =
    `<style>
.kn-stage{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none}
.kn-svg{width:78%;aspect-ratio:1;display:block;overflow:visible;outline:none;cursor:grab}
.kn-svg:active{cursor:grabbing}
.kn-svg.kb:focus .kn-dial{stroke:var(--ink)}
.kn-dial{fill:color-mix(in srgb,var(--tile) 88%,var(--ink) 12%);stroke:color-mix(in srgb,var(--ink) 14%,transparent);stroke-width:.8}
.kn-face{fill:color-mix(in srgb,var(--tile) 94%,var(--ink) 6%)}
.kn-mark{stroke:var(--ink);stroke-width:2.6;stroke-linecap:round}
.kn-dot{fill:var(--dim);opacity:.35;transition:opacity .12s ease,fill .12s ease}
.kn-dot.on{fill:var(--ink);opacity:1}
.kn-tag{position:absolute;left:14px;bottom:12px;color:var(--dim);pointer-events:none}
.kn-val{position:absolute;right:14px;bottom:12px;color:var(--dim);pointer-events:none;font-variant-numeric:tabular-nums}
</style>` +
    '<div class="kn-stage">' +
    '<svg class="kn-svg" viewBox="0 0 100 100" role="slider" tabindex="0" aria-label="knob" ' +
    `aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="0">` +
    ids.map((i) => { const [x, y] = dotAt(i); return `<rect class="kn-dot" x="${(x - 1.4).toFixed(2)}" y="${(y - 1.4).toFixed(2)}" width="2.8" height="2.8"/>`; }).join("") +
    `<g class="kn-rot"><circle class="kn-dial" cx="50" cy="50" r="${R}"/>` +
    `<circle class="kn-face" cx="50" cy="50" r="${R - 6}"/>` +
    `<line class="kn-mark" x1="50" y1="${50 - R + 4}" x2="50" y2="${50 - R + 13}"/></g>` +
    "</svg>" +
    '<span class="kn-tag">drag · scroll · ←→</span>' +
    '<span class="kn-val"></span>' +
    "</div>";

  const stage = el.querySelector(".kn-stage");
  const svg = el.querySelector(".kn-svg");
  const rot = el.querySelector(".kn-rot");
  const dots = [...el.querySelectorAll(".kn-dot")];
  const val = el.querySelector(".kn-val");

  /* ---- the tick: click, buzz, tap ------------------------------------- */
  let ac = null, noise = null;
  const wakeAudio = () => {
    unlockAudio(); // iphone: get past the silent switch
    ac = wakeShared(); // the page's shared context, resumed in this gesture
    if (!ac || noise) return;
    const len = Math.floor(ac.sampleRate * 0.03);
    noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  };
  const click = (dir) => {
    if (!ac || ac.state !== "running") return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noise;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = dir > 0 ? 2300 : 1700;
    bp.Q.value = 1.4;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t);
    src.stop(t + 0.03);
  };
  let lastTick = 0;
  const tick = (dir, silent) => {
    if (silent) return;
    const now = performance.now();
    if (now - lastTick < 28) return; // a fast spin is one buzz, not a machine gun
    lastTick = now;
    click(dir);
    navigator.vibrate?.(15); // shorter than this and most motors don't bother
  };

  /* ---- state ----------------------------------------------------------- */
  let raw = 7; // where the finger has it, in notches (continuous)
  let notch = 7; // the notch it's in
  let shown = 7; // what's drawn, chasing the detent-shaped raw
  let vel = 0;
  let dragging = false;
  let lastUser = -1e9;

  const clamp = (v) => Math.max(0, Math.min(N, v));
  const setRaw = (v, silent) => {
    raw = clamp(v);
    const n = Math.round(raw);
    if (n !== notch) {
      tick(n > notch ? 1 : -1, silent);
      notch = n;
      svg.setAttribute("aria-valuenow", String(n));
      val.textContent = `${String(n).padStart(2, "0")} / ${N}`;
      dots.forEach((d, i) => d.classList.toggle("on", i <= n));
    }
  };
  val.textContent = `${String(notch).padStart(2, "0")} / ${N}`;
  svg.setAttribute("aria-valuenow", String(notch));
  dots.forEach((d, i) => d.classList.toggle("on", i <= notch));

  /* the detent shape: near a notch the dial lags the finger, then catches
     up fast past halfway — a spring into the notch, not a linear follow */
  const detented = (v) => {
    const n = Math.round(v), f = v - n;
    return n + 2 * f * Math.abs(f);
  };

  /* ---- input ----------------------------------------------------------- */
  const angleOf = (e) => {
    const r = svg.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  let a0 = 0, raw0 = 0, viaPointer = false;
  svg.addEventListener("focus", () => {
    svg.classList.toggle("kb", !viaPointer); // tabbed in: show the ring
    viaPointer = false;
  });
  svg.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    wakeAudio();
    dragging = true;
    lastUser = performance.now();
    a0 = angleOf(e);
    raw0 = raw;
    svg.setPointerCapture(e.pointerId);
    viaPointer = true; // the ring is for keyboard hands only
    svg.focus({ preventScroll: true });
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    lastUser = performance.now();
    let da = angleOf(e) - a0;
    // the shortest way round, so crossing the bottom doesn't spin it
    if (da > 180) da -= 360;
    if (da < -180) da += 360;
    setRaw(raw0 + da / STEP);
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    setRaw(Math.round(raw)); // let go: it settles into the notch
  };
  svg.addEventListener("pointerup", (e) => {
    // ios trusts the end of a touch more than its start for audio
    wakeAudio();
    release(e);
  });
  svg.addEventListener("pointercancel", release);

  let wheelAcc = 0;
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    wakeAudio();
    lastUser = performance.now();
    wheelAcc += e.deltaY;
    const steps = Math.trunc(wheelAcc / 40);
    if (!steps) return;
    wheelAcc -= steps * 40;
    setRaw(Math.round(raw) - steps);
  }, { passive: false });

  svg.addEventListener("keydown", (e) => {
    const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    svg.classList.add("kb");
    wakeAudio();
    lastUser = performance.now();
    setRaw(Math.round(raw) + d);
  });

  /* ---- ambient: a few notches on its own now and then, quietly ---------- */
  let ambNext = performance.now() + 5000;
  let ambTarget = null, ambAt = 0;

  /* ---- frame ------------------------------------------------------------- */
  let raf = 0, alive = true;
  const frame = (now) => {
    if (!alive) return;
    if (!reduceMotion && now - lastUser > 6000) {
      if (ambTarget == null && now > ambNext) {
        const dir = notch > N / 2 ? -1 : 1;
        ambTarget = clamp(notch + dir * (3 + Math.floor(Math.random() * 4)));
        ambAt = now;
      }
      if (ambTarget != null && now - ambAt > 85) {
        ambAt = now;
        const n = Math.round(raw);
        if (n === ambTarget) {
          ambTarget = null;
          ambNext = now + 5000 + Math.random() * 6000;
        } else setRaw(n + Math.sign(ambTarget - n), true);
      }
    } else {
      ambTarget = null;
      ambNext = now + 5000;
    }

    // a stiff spring so the snap into the notch has a little overshoot
    const target = dragging ? detented(raw) : Math.round(raw);
    const k = reduceMotion ? 1 : 0.32, damp = 0.62;
    vel = (vel + (target - shown) * k) * damp;
    shown += vel;
    if (Math.abs(target - shown) < 0.0005 && Math.abs(vel) < 0.0005) { shown = target; vel = 0; }
    rot.setAttribute("transform", `rotate(${(-SWEEP / 2 + shown * STEP).toFixed(3)} 50 50)`);

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  /* only spin the loop while the tile is on screen */
  const io = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    if (e.isIntersecting) raf = requestAnimationFrame(frame);
  });
  io.observe(stage);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    io.disconnect();
  };
}
