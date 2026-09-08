/* lab/feldy-capture — the loop from feldy's field app, as a toy: walk
   around a property, take guided photos, get a 3d model back. the house
   is a cloud of ~850 pixels hovering near their true positions; a ring on
   the ground is split into eight capture segments and the walk (a slow
   orbit — drag to steer with a mouse) brings each one round to face you.
   tapping snaps the shutter: the segment fills, and the pixels on that
   side of the house fly home. eight snaps and the wireframe draws itself
   over the cloud with a few measurements, like the report coming back.
   left alone it captures on its own so the payoff still shows; a tap
   takes over. everything is projected by hand onto a 2d canvas. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const APP_URL = "https://apps.apple.com/us/app/feldy-ai/id6780327228";

const SEG = 8; // capture segments around the ring
const D = 4.6; // camera distance
const FOC = 2.7; // focal length
const PITCH = 0.42; // camera looks down this much
const LAP = 18; // seconds per orbit
const RING_R = 1.55;
const Y0 = 0.72; // vertical pivot — keeps the house centred on screen

/* ---- the house: a box with a gable roof, a door, a window ------------- */

const HW = 0.8, HD = 0.6, HH = 0.9, RIDGE = 1.45;
const V = [
  [-HW, 0, -HD], [HW, 0, -HD], [HW, 0, HD], [-HW, 0, HD], // 0-3 base
  [-HW, HH, -HD], [HW, HH, -HD], [HW, HH, HD], [-HW, HH, HD], // 4-7 eaves
  [-HW, RIDGE, 0], [HW, RIDGE, 0], // 8-9 ridge
  [-0.14, 0, HD], [0.14, 0, HD], [0.14, 0.58, HD], [-0.14, 0.58, HD], // 10-13 door
  [0.32, 0.32, HD], [0.62, 0.32, HD], [0.62, 0.62, HD], [0.32, 0.62, HD], // 14-17 window
];
const E = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [0, 4], [1, 5], [2, 6], [3, 7],
  [4, 5], [6, 7], [4, 7], [5, 6],
  [4, 8], [7, 8], [5, 9], [6, 9], [8, 9],
  [10, 13], [13, 12], [12, 11],
  [14, 15], [15, 16], [16, 17], [17, 14],
];
/* faces as (corner, edge u, edge v) — dots are sprinkled over them so the
   cloud has some body, not just outlines */
const F = [
  [[-HW, 0, HD], [2 * HW, 0, 0], [0, HH, 0], 30], // front wall
  [[-HW, 0, -HD], [2 * HW, 0, 0], [0, HH, 0], 30], // back wall
  [[HW, 0, -HD], [0, 0, 2 * HD], [0, HH, 0], 22], // right wall
  [[-HW, 0, -HD], [0, 0, 2 * HD], [0, HH, 0], 22], // left wall
  [[-HW, HH, HD], [2 * HW, 0, 0], [0, RIDGE - HH, -HD], 44], // front slope
  [[-HW, HH, -HD], [2 * HW, 0, 0], [0, RIDGE - HH, HD], 44], // back slope
];

const LABELS = [
  { at: [0, RIDGE, 0], text: "ridge 32 ft", dx: 10, dy: -12 },
  { at: [0.42, (HH + RIDGE) / 2, HD / 2], text: "pitch 6/12", dx: 10, dy: 4 },
  { at: [0, 0, HD], text: "1,240 sq ft", dx: 0, dy: 16, center: true },
];

const TAU = Math.PI * 2;
const wedge = (a) => Math.floor((((a % TAU) + TAU) % TAU) / (TAU / SEG) + 0.5) % SEG;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function mount(el) {
  el.innerHTML =
    `<style>
.fd-stage{position:relative;width:100%;height:100%;touch-action:pan-x;user-select:none;-webkit-user-select:none;cursor:crosshair}
.fd-stage canvas{width:100%;height:100%;display:block}
.fd-flash{position:absolute;inset:0;background:var(--ink);opacity:0;pointer-events:none}
.fd-tag{position:absolute;left:14px;bottom:12px;color:var(--dim);text-decoration:none;z-index:1}
.fd-tag:hover{color:var(--ink);text-decoration:underline;text-underline-offset:3px}
.fd-hint{position:absolute;right:14px;bottom:12px;color:var(--dim);pointer-events:none;font-variant-numeric:tabular-nums;white-space:nowrap}
.fd-shutter{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);width:30px;height:30px;padding:0;border-radius:50%;border:1.5px solid var(--fg);background:transparent;cursor:pointer;display:grid;place-items:center;transition:transform .12s ease}
.fd-shutter::after{content:"";width:18px;height:18px;border-radius:50%;background:var(--ink);transition:transform .12s ease,background .2s ease}
.fd-shutter:active{transform:translateX(-50%) scale(.92)}
.fd-shutter:active::after{transform:scale(.82)}
.fd-shutter.done::after{background:var(--green)}
.fd-shutter:focus-visible{outline:1.5px solid var(--ink);outline-offset:3px}
</style>` +
    '<div class="fd-stage"><canvas></canvas><div class="fd-flash"></div>' +
    `<a class="fd-tag" href="${APP_URL}" target="_blank" rel="noreferrer">feldy ↗</a>` +
    '<button class="fd-shutter" type="button" aria-label="capture"></button>' +
    '<span class="fd-hint"></span></div>';

  const stage = el.querySelector(".fd-stage");
  const canvas = el.querySelector("canvas");
  const flash = el.querySelector(".fd-flash");
  const shutter = el.querySelector(".fd-shutter");
  const hint = el.querySelector(".fd-hint");
  const ctx = canvas.getContext("2d");

  /* ---- colours follow the theme ---------------------------------------- */
  let ink = "#fff", dim = "#6e6e6e", fg = "#8f8f8f", green = "#4ade80", font = "";
  const readTheme = () => {
    const cs = getComputedStyle(el);
    ink = cs.getPropertyValue("--ink").trim() || ink;
    dim = cs.getPropertyValue("--dim").trim() || dim;
    fg = cs.getPropertyValue("--fg").trim() || fg;
    green = cs.getPropertyValue("--green").trim() || green;
    font = `11px ${cs.fontFamily}`;
  };
  readTheme();
  const mq = matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", readTheme);

  /* ---- the cloud --------------------------------------------------------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const dots = []; // { h: home xyz, s: scattered offset, w: wedge, k, kT, ph, glow, delay }
  const addDot = (x, y, z) => {
    const m = rnd(0.1, 0.38);
    const t = rnd(0, TAU), p = rnd(-1, 1);
    const r = Math.sqrt(1 - p * p);
    const az = Math.atan2(x + rnd(-0.02, 0.02), z + rnd(-0.02, 0.02));
    dots.push({
      h: [x, y, z],
      s: [r * Math.cos(t) * m, p * m, r * Math.sin(t) * m],
      w: wedge(az),
      k: 0, kT: 0, ph: rnd(0, TAU), glow: 0, delay: 0,
    });
  };
  for (const [a, b] of E) {
    const A = V[a], B = V[b];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    const n = Math.max(3, Math.round(len * 26));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      addDot(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
    }
  }
  for (const [o, u, v, n] of F) {
    for (let i = 0; i < n; i++) {
      const a = Math.random(), b = Math.random();
      addDot(o[0] + u[0] * a + v[0] * b, o[1] + u[1] * a + v[1] * b, o[2] + u[2] * a + v[2] * b);
    }
  }

  /* ---- state --------------------------------------------------------------- */
  const filled = new Array(SEG).fill(false);
  let count = 0;
  let done = false; // all eight captured; model revealed
  let reveal = 0; // 0→1 wireframe draw-on
  let yaw = 0.35, yawV = 0;
  let dragging = false, dragX = 0, lastInput = -1e9;
  let autoNext = performance.now() + 4000; // when the idle capture next fires
  let doneAt = 0;

  const setHint = () => {
    hint.textContent = done
      ? "tap to reset"
      : count === 0
        ? "tap to capture"
        : `${count}/${SEG} captured`;
    shutter.classList.toggle("done", done);
  };
  setHint();

  const blink = () => {
    // a finite animation, so a paused tab can never leave the veil up
    flash.animate([{ opacity: 0.22 }, { opacity: 0 }], { duration: 280, easing: "ease-out" });
  };

  const snap = (now) => {
    const w = wedge(yaw);
    blink();
    if (filled[w]) return;
    filled[w] = true;
    count++;
    for (const d of dots) {
      if (d.w !== w) continue;
      d.kT = 1;
      d.glow = 1;
      d.delay = now + Math.random() * 260;
    }
    if (count === SEG) {
      done = true;
      doneAt = now;
    }
    setHint();
  };

  const reset = () => {
    filled.fill(false);
    count = 0;
    done = false;
    for (const d of dots) {
      d.kT = 0;
      d.glow = 0;
      d.delay = 0;
    }
    setHint();
  };

  const act = (now) => {
    lastInput = now;
    autoNext = now + 7000;
    if (done) reset();
    else snap(now);
  };

  /* ---- input: tap = shutter, mouse drag = steer the walk ----------------- */
  let downX = 0, downY = 0, downT = 0, moved = false;
  stage.addEventListener("pointerdown", (e) => {
    if (e.target === shutter || e.target.closest(".fd-tag")) return;
    downX = e.clientX;
    downY = e.clientY;
    downT = e.timeStamp;
    moved = false;
    if (e.pointerType === "mouse") {
      dragging = true;
      dragX = e.clientX;
      stage.setPointerCapture(e.pointerId);
    }
  });
  stage.addEventListener("pointermove", (e) => {
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) moved = true;
    if (!dragging) return;
    const dx = e.clientX - dragX;
    dragX = e.clientX;
    yaw -= dx * 0.008;
    yawV = -dx * 0.008;
    lastInput = e.timeStamp;
    autoNext = e.timeStamp + 7000;
  });
  const up = (e) => {
    const wasDrag = dragging;
    dragging = false;
    if (e.target === shutter || e.target.closest(".fd-tag")) return;
    if (moved || e.timeStamp - downT > 500) return;
    if (wasDrag && Math.abs(e.clientX - downX) > 6) return;
    act(e.timeStamp);
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", () => (dragging = false));
  shutter.addEventListener("click", (e) => act(e.timeStamp));

  /* ---- sizing ---------------------------------------------------------- */
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    const r = stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W;
    canvas.height = H;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  /* ---- projection ------------------------------------------------------- */
  const sp = Math.sin(PITCH), cp = Math.cos(PITCH);
  let cy = 0, sy = 0, S = 1, CX = 0, CY = 0;
  const out = [0, 0, 0];
  const project = (x, y, z) => {
    const y1 = y - Y0;
    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    const y2 = y1 * cp - z1 * sp;
    const z2 = y1 * sp + z1 * cp;
    const depth = D - z2;
    const f = (FOC / depth) * S;
    out[0] = CX + x1 * f;
    out[1] = CY - y2 * f;
    out[2] = depth;
    return out;
  };

  /* ---- frame ------------------------------------------------------------- */
  let raf = 0, last = 0, alive = true;
  if (reduceMotion) {
    // no walk, no scatter: the finished model, still
    filled.fill(true);
    count = SEG;
    done = true;
    reveal = 1;
    for (const d of dots) d.k = d.kT = 1;
    setHint();
  }

  const frame = (now) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const t = now / 1000;

    /* the walk: a slow orbit, paused while the mouse steers, resumed after
       a beat of stillness. a fling carries a little momentum */
    if (!dragging) {
      if (Math.abs(yawV) > 1e-4) {
        yaw += yawV;
        yawV *= 0.9;
      } else if (!reduceMotion && now - lastInput > 2500) {
        yaw += (TAU / LAP) * dt;
      }
    }
    cy = Math.cos(yaw);
    sy = Math.sin(yaw);
    S = Math.min(W, H * 0.9) * 0.43;
    CX = W / 2;
    CY = H * 0.5;

    /* the idle showcase: capture on its own once nobody's touched it */
    if (!reduceMotion && now - lastInput > 7000) {
      if (done) {
        if (now - doneAt > 9000 && now > autoNext) {
          reset();
          autoNext = now + 1800;
        }
      } else if (now > autoNext && !filled[wedge(yaw)]) {
        snap(now);
        autoNext = now + 1200;
      }
    }

    reveal += ((done ? 1 : 0) - reveal) * Math.min(1, dt * (done ? 1.6 : 6));
    if (done && reveal > 0.995) reveal = 1;

    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";

    /* the capture ring, on the ground, eight arcs */
    const gap = 0.05;
    for (let i = 0; i < SEG; i++) {
      const a0 = (i - 0.5) * (TAU / SEG) + gap;
      const a1 = (i + 0.5) * (TAU / SEG) - gap;
      const cur = i === wedge(yaw);
      ctx.beginPath();
      for (let j = 0; j <= 10; j++) {
        const a = a0 + ((a1 - a0) * j) / 10;
        const p = project(RING_R * Math.sin(a), 0, RING_R * Math.cos(a));
        j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      if (filled[i]) {
        ctx.strokeStyle = green;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2 * dpr;
      } else {
        ctx.strokeStyle = cur ? ink : dim;
        ctx.globalAlpha = cur && !done ? 0.55 + 0.25 * Math.sin(t * 5) : 0.3;
        ctx.lineWidth = (cur ? 2 : 1.2) * dpr;
      }
      ctx.stroke();
    }

    /* the cloud */
    const size = Math.max(1.8 * dpr, S * 0.011);
    for (const d of dots) {
      if (d.kT > d.k && now >= d.delay) d.k += (d.kT - d.k) * Math.min(1, dt * 7);
      else if (d.kT < d.k) d.k += (d.kT - d.k) * Math.min(1, dt * 4);
      if (d.glow > 0) d.glow = Math.max(0, d.glow - dt * 1.3);
      const k = easeOut(Math.min(1, Math.max(0, d.k)));
      const j = (1 - k) * 0.06;
      const x = d.h[0] + d.s[0] * (1 - k) + Math.sin(t * 0.9 + d.ph) * j;
      const y = d.h[1] + d.s[1] * (1 - k) + Math.sin(t * 1.1 + d.ph * 1.7) * j;
      const z = d.h[2] + d.s[2] * (1 - k) + Math.cos(t * 0.8 + d.ph) * j;
      const p = project(x, y, z);
      const near = (D + 1.2 - p[2]) / 2.4; // 0 far → 1 near
      const px = size * (0.7 + near * 0.6);
      // settled pixels hand over to the wireframe once it's drawn
      const settled = k > 0.98 ? 1 - reveal * 0.55 : 1;
      ctx.globalAlpha = (0.5 + k * 0.45) * (0.55 + near * 0.45) * settled;
      ctx.fillStyle = d.glow > 0 ? green : k > 0.5 ? ink : dim;
      if (d.glow > 0 && d.glow < 1) ctx.globalAlpha = Math.max(ctx.globalAlpha, d.glow);
      ctx.fillRect(p[0] - px / 2, p[1] - px / 2, px, px);
    }

    /* the wireframe, drawn edge by edge once the capture is complete */
    if (reveal > 0.001) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.2 * dpr;
      E.forEach(([a, b], i) => {
        const p = Math.min(1, Math.max(0, (reveal * (E.length + 6) - i) / 6));
        if (p <= 0) return;
        const A = V[a], B = V[b];
        const pa = project(A[0], A[1], A[2]);
        const ax = pa[0], ay = pa[1], ad = pa[2];
        const pb = project(B[0], B[1], B[2]);
        ctx.globalAlpha = 0.85 * (0.6 + ((D + 1.2 - (ad + pb[2]) / 2) / 2.4) * 0.4);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + (pb[0] - ax) * p, ay + (pb[1] - ay) * p);
        ctx.stroke();
      });
    }

    /* the measurements, after the lines land */
    const la = Math.max(0, (reveal - 0.8) / 0.2);
    if (la > 0) {
      ctx.font = font.replace("11px", `${Math.round(11 * dpr)}px`);
      ctx.textBaseline = "middle";
      for (const L of LABELS) {
        const p = project(L.at[0], L.at[1], L.at[2]);
        ctx.globalAlpha = la;
        ctx.fillStyle = green;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2 * dpr, 0, TAU);
        ctx.fill();
        ctx.fillStyle = fg;
        ctx.textAlign = L.center ? "center" : "left";
        ctx.fillText(L.text, p[0] + L.dx * dpr, p[1] + L.dy * dpr);
      }
    }
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    mq.removeEventListener("change", readTheme);
  };
}
