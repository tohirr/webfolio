/* lab/eyes — the smallest thing that can hold your attention: two eyes and
   two brows on a coarse grid, and nothing else. a face feels alive because
   of its timing, not its drawing, so the timing is all that is here. it
   only notices the pointer after it has been around for a beat. it follows
   with a spring that snaps on a big move and drifts on a small one. it
   loses interest when you stop moving and starts glancing about on its
   own. it blinks on a random clock, and again whenever the gaze turns
   hard. left alone long enough, it dozes off, and comes round with a
   start. underneath, every value is continuous — springs, clocks, two
   incommensurate sines for the breath — and every one of them is snapped
   to a cell at draw, so it moves in steps without ever jittering.

   the pointer is tracked on the window rather than the canvas, so the eyes
   follow you across the whole page and the cell watches the cursor go by
   on its way somewhere else. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* the face in cells, at the reference resolution — every measurement is
   multiplied by the resolution actually in use, so raising the cell count
   draws the same face in finer cells instead of a smaller one */
const REF = 30; // reference columns
/* an iris about half the eye's width: smaller and the eye is a brick with
   a chip in it, larger and the white it swims in breaks up into crumbs */
const EW = 9.4; // eye width
const EH = 10.8; // eye height
const GAP = 3.4; // between the eyes
const IRIS = 5.8; // the iris — an iris does not change size
/* the pupil in the middle of it, as a share of the iris: wide while it
   dozes, a pinprick when something startles it */
const CORE = { idle: 0.3, curious: 0.26, surprised: 0.18, sleepy: 0.44 };
const LIFT = 1.7; // the brow's rest gap above the eye
const BROW_W = 0.86; // the brow, as a share of the eye's width
const DROP = 1.1; // the eyes sit this far below the middle, so the brows
                  // do not push the whole face up the cell

const NOTICE = 0.3; // the pointer has to be about this long before it is seen
const BORED = 2.6; // ... and this long without moving before interest goes

/* "#f59e0b" → [245,158,11]. anything it cannot read comes back null and the
   colour is used exactly as the stylesheet wrote it */
const rgb = (v) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

export function mount(el) {

  el.innerHTML =
    `<style>
.ey-stage{position:relative;width:100%;max-width:30rem;margin:0 auto;aspect-ratio:4/3;touch-action:pan-y}
.ey-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ey-row{display:flex;flex-wrap:wrap;gap:.5em 1.4em;align-items:center;justify-content:center;margin-top:1.4em}
.ey-row label{display:flex;align-items:center;gap:.5em;color:var(--dim)}
.ey-row input[type=range]{width:90px}
.ey-row output{color:var(--fg);min-width:3ch;font-variant-numeric:tabular-nums}
.ey-gyro{font:inherit;letter-spacing:inherit;color:var(--fg);background:transparent;border:1px solid var(--dim);border-radius:6px;padding:.3em .8em;cursor:pointer}
.ey-gyro:hover{color:var(--ink);border-color:var(--ink)}
.ey-gyro:focus-visible{outline:1.5px solid var(--ink);outline-offset:2px}
.ey-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
.ey-cap b{color:var(--ink);font-weight:500}
</style>` +
    '<div class="ey-stage" role="img" aria-label="two pixel eyes that follow the pointer">' +
    "<canvas></canvas></div>" +
    '<div class="ey-row">' +
    '<label>cells <input type="range" min="20" max="48" value="36" data-p="cells" data-act><output>36</output></label>' +
    '<label>patience <input type="range" min="4" max="40" value="18" data-p="patience" data-act><output>18s</output></label>' +
    "</div>" +
    '<p class="ey-cap">it looks where you are, and gets bored — <b class="ey-state">idle</b></p>';

  const stage = el.querySelector(".ey-stage");
  const canvas = stage.querySelector("canvas");
  const stateEl = el.querySelector(".ey-state");
  const ctx = canvas.getContext("2d");

  const params = { cells: 36, patience: 18 };
  for (const input of el.querySelectorAll("[data-p]")) {
    input.addEventListener("input", () => {
      params[input.dataset.p] = +input.value;
      input.nextElementSibling.textContent =
        input.dataset.p === "patience" ? `${input.value}s` : input.value;
      if (input.dataset.p === "cells") layout();
    });
  }

  /* ---- springs ----------------------------------------------------------
     all in reference cells; the draw scales them. the gaze spring stiffens
     with its own error, so a long look across the face lands like a
     saccade while a small correction stays a drift */
  const spring = (v, k, c) => ({ v, t: v, vel: 0, k, c });
  const step = (s, dt) => {
    const a = -s.k * (s.v - s.t) - s.c * s.vel;
    s.vel += a * dt;
    s.v += s.vel * dt;
  };
  const gx = spring(0, 150, 21);
  const gy = spring(0, 150, 21);
  const brow = spring(0, 120, 16); // + is raised
  const tilt = spring(0, 120, 16); // + drops the inner end
  const open = spring(1, 140, 18); // a multiplier on the eye's height
  const iris = spring(IRIS, 200, 22);
  const core = spring(IRIS * CORE.idle, 200, 22); // the pupil
  const springs = [gx, gy, brow, tilt, open, iris, core];

  let warm = 1; // 1 is the iris's own colour, 0 is the grey it fades toward
  let lidU = 0; // upper lid at rest, 0..1 of the eye's height
  let lidL = 0;
  let blink = 0; // 0..1 through one blink
  let blinkDur = 0.24;
  let nextBlink = rnd(1.5, 3);

  /* ---- attention --------------------------------------------------------- */
  let mood = "idle";
  let moodT = 0;
  let t = 0;
  let ptr = null; // client coords, wherever on the page
  let aim = null; // a phone's tilt, as the same -1..1 the pointer gives
  let src = "ptr"; // which source last had something to say
  let anyInput = false; // has anything at all happened yet
  let lastMove = -1e9;
  let firstSeen = -1e9;
  let noticed = false;
  let surprise = 0;
  let idle = { x: 0, y: 0 };
  let hold = 0;

  const setMood = (m) => {
    if (mood === m) return;
    mood = m;
    moodT = 0;
    if (stateEl) stateEl.textContent = m;
  };

  /* mostly small glances, a good share of them straight ahead, now and
     then a hard look away — a face that only ever looks at things reads
     as a machine following a cursor */
  const glance = () => {
    const r = Math.random();
    if (r < 0.35) idle = { x: 0, y: 0 };
    else if (r < 0.85) idle = { x: rnd(-1, 1) * 0.7, y: rnd(-0.7, 0.7) };
    else idle = { x: Math.sign(rnd(-1, 1)), y: rnd(-0.3, 0.3) };
    hold = rnd(1.4, 4.2);
  };
  glance();

  const onMove = (e) => {
    /* a pointer that went quiet and came back counts as arriving again, so
       it has to linger another beat before the eyes pick it up */
    if (t - lastMove > BORED) firstSeen = t;
    ptr = { x: e.clientX, y: e.clientY };
    src = "ptr";
    anyInput = true;
    lastMove = t;
    if (mood === "sleepy") surprise = surprise || 0.001; // woken with a start
    wake();
  };
  const onDown = (e) => {
    onMove(e);
    const r = canvas.getBoundingClientRect();
    const on =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (on) surprise = surprise || 0.001;
  };
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("pointerdown", onDown, { passive: true });

  /* ---- tilt ---------------------------------------------------------------
     a phone has no cursor to follow, so the phone is the cursor: the iris
     rolls the way you tip it, like a ball in a socket. the reading is taken
     against however the phone was being held when it first arrived, so any
     posture is neutral, and it is delta-gated — a phone lying still on a
     table is not attention, and the face goes on to doze off */
  let baseB = null, baseG = null, lastB = null, lastG = null;
  const onOrient = (e) => {
    const { beta, gamma } = e;
    if (beta == null || gamma == null) return;
    if (baseB == null) { baseB = beta; baseG = gamma; }
    const move = lastB == null ? 99 : Math.abs(beta - lastB) + Math.abs(gamma - lastG);
    lastB = beta;
    lastG = gamma;
    aim = { x: clamp((gamma - baseG) / 26, -1, 1), y: clamp((beta - baseB) / 26, -1, 1) };
    if (move < 1.2) return; // resting jitter, not a hand
    if (t - lastMove > BORED) firstSeen = t;
    lastMove = t;
    src = "tilt";
    anyInput = true;
    if (mood === "sleepy") {
      surprise = surprise || 0.001;
      baseB = beta; // woken in a new posture: that one is now neutral
      baseG = gamma;
    }
    wake();
  };

  /* ---- scrolling ----------------------------------------------------------
     the source every phone has, sensors or not: while the page moves under
     it the face watches the middle of the screen, which is where the reader
     is. carried past on a feed, it looks up at you and then down after you.
     on a desktop the pointer says all this already */
  const coarse = matchMedia("(pointer: coarse)").matches;
  const onScroll = () => {
    if (!coarse) return;
    if (t - lastMove > BORED) firstSeen = t;
    lastMove = t;
    src = "scroll";
    anyInput = true;
    wake();
  };
  addEventListener("scroll", onScroll, { passive: true, capture: true });

  /* ios hands the motion sensor over only after a tap, so the story card
     carries a button to buy it — the cell has no room to ask. desktop safari
     carries requestPermission too and a mac has nothing to tilt, so touch
     points are what tell the two apart */
  const needsTiltPermission =
    navigator.maxTouchPoints > 0 &&
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function";
  if (needsTiltPermission) {
    const btn = document.createElement("button");
    btn.className = "ey-gyro";
    btn.type = "button";
    btn.dataset.act = "";
    btn.textContent = "enable tilt";
    el.querySelector(".ey-row").appendChild(btn);
    btn.addEventListener("click", async () => {
      try {
        if ((await DeviceOrientationEvent.requestPermission()) === "granted") {
          addEventListener("deviceorientation", onOrient);
          btn.remove();
        }
      } catch { /* refused — touch still works */ }
    });
  } else if (coarse) {
    addEventListener("deviceorientation", onOrient);
  }

  /* ---- layout ------------------------------------------------------------
     square cells, as many columns as the slider asks for; the rows fall out
     of the cell's height. the face is centred in whatever grid that makes,
     so a tall cell and a wide card both get the same face */
  let cols = 30, rows = 24, cell = 10, ox = 0, oy = 0, u = 1, dpr = 1;
  let ink = "#fff", dim = "#6e6e6e";
  /* the one colour on the face: the palette's own blue, so a restyle
     carries the eye with it. it is mixed toward the grid's grey as the
     face gets sleepy, which is the only thing colour is asked to say */
  let accent = "#60a5fa", accentRGB = null, dimRGB = null;

  const readTheme = () => {
    const cs = getComputedStyle(el);
    ink = cs.getPropertyValue("--ink").trim() || "#fff";
    dim = cs.getPropertyValue("--dim").trim() || "#6e6e6e";
    accent = cs.getPropertyValue("--blue").trim() || "#60a5fa";
    accentRGB = rgb(accent);
    dimRGB = rgb(dim);
  };

  const irisFill = () => {
    if (!accentRGB || !dimRGB) return accent;
    const c = (i) => Math.round(lerp(dimRGB[i], accentRGB[i], warm));
    return `rgb(${c(0)},${c(1)},${c(2)})`;
  };

  const layout = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    cols = params.cells;
    cell = w / cols;
    rows = Math.max(6, Math.floor(h / cell));
    ox = 0;
    oy = (h - rows * cell) / 2;
    u = cols / REF;
    readTheme();
  };

  /* ---- update ------------------------------------------------------------ */
  const update = (dt) => {
    t += dt;
    moodT += dt;
    const since = t - lastMove;

    /* noticing takes a beat — reacting the instant the pointer arrives is
       the tell that nothing is home */
    const active = anyInput && since < BORED;
    if (active && !noticed && t - firstSeen > NOTICE) {
      noticed = true;
      if (!surprise) setMood("curious");
    }
    if (noticed && !active) {
      noticed = false;
      glance();
      setMood("idle");
    }
    if (since > params.patience && !surprise) setMood("sleepy");

    if (surprise > 0) {
      surprise += dt;
      setMood("surprised");
      if (surprise > 0.55) {
        surprise = 0;
        setMood(noticed ? "curious" : "idle");
      }
    }

    /* where to look: at you, or at whatever it is looking at instead */
    let tx, ty;
    if (noticed && active && src === "tilt" && aim) {
      tx = aim.x;
      ty = aim.y;
    } else if (noticed && active && (ptr || src === "scroll")) {
      /* the pointer, or the middle of the screen while the page is moving */
      const at = src === "scroll" ? { x: innerWidth / 2, y: innerHeight / 2 } : ptr;
      const r = canvas.getBoundingClientRect();
      tx = clamp((at.x - (r.left + r.width / 2)) / (r.width * 0.95), -1, 1);
      ty = clamp((at.y - (r.top + r.height / 2)) / (r.height * 0.95), -1, 1);
    } else {
      /* with reduced motion there are no glances of its own — it holds
         still and looks straight ahead until you move */
      if (!reduceMotion) {
        hold -= dt;
        if (hold <= 0) glance();
      }
      tx = reduceMotion ? 0 : idle.x;
      ty = reduceMotion ? 0 : idle.y;
      if (mood === "sleepy") {
        tx *= 0.3;
        ty = 0.35;
      }
    }

    /* the iris always keeps a cell of white around it, so it never bites
       the rim and turns the eye into a horseshoe */
    const reach = EW / 2 - iris.v / 2 - 0.85;
    gx.t = tx * reach;
    gy.t = ty * (EH / 2 - iris.v / 2 - 0.85) * 0.9;
    if (!reduceMotion) {
      // the small wander of an eye that is holding still
      gx.t += Math.sin(t * 1.7) * 0.12 + Math.sin(t * 0.43) * 0.1;
      gy.t += Math.cos(t * 1.3) * 0.1;
    }

    /* a long look lands like a saccade, a short one stays a drift */
    for (const s of [gx, gy]) {
      const far = Math.abs(s.t - s.v) > 1.1;
      s.k = far ? 420 : 150;
      s.c = far ? 34 : 21;
    }

    // the face the mood wears
    const pop = mood === "curious" && moodT < 0.7 ? 1 - moodT / 0.7 : 0;
    brow.t =
      (mood === "surprised" ? 2.4 : mood === "sleepy" ? -0.7 : 0) + pop * 1.3;
    tilt.t = mood === "sleepy" ? 0.15 : mood === "curious" ? -0.55 : 0;
    open.t = mood === "surprised" ? 1.16 : 1;
    iris.t = IRIS; // the iris holds still; what dilates is the pupil in it
    core.t = IRIS * (CORE[mood] ?? CORE.idle);
    // the colour drains as it dozes and comes back when it wakes
    warm = lerp(warm, mood === "sleepy" ? 0.25 : 1, 1 - Math.exp(-dt * 3));

    // a squint on a hard look away, lids low while it dozes
    const down = clamp(gy.t / 1.5, 0, 1) * 0.07; // the lid follows the eye down
    const rest = mood === "sleepy" ? 0.34 : mood === "idle" && hold < 0.6 && idle.x !== 0 ? 0.12 : 0;
    const k = 1 - Math.exp(-dt * 6);
    lidU = lerp(lidU, rest + down, k);
    lidL = lerp(lidL, mood === "sleepy" ? 0.15 : 0, k);

    if (!reduceMotion) {
      // breathing, about twelve a minute, never a clean sine
      const breath = Math.sin(t * 1.25) * 0.5 + Math.sin(t * 0.37 + 1) * 0.2;
      open.t *= 1 + breath * 0.035 * (mood === "sleepy" ? 2 : 1);

      // blinks: a random clock, one on a hard turn, none mid-surprise
      nextBlink -= dt;
      const turning = Math.abs(gx.vel) > 8;
      if (blink === 0 && mood !== "surprised" && (nextBlink <= 0 || (turning && nextBlink < 1.5))) {
        blink = 0.001;
        blinkDur = mood === "sleepy" ? 0.5 : 0.24;
        nextBlink = mood === "sleepy" ? rnd(3, 7) : rnd(2.2, 6);
        if (Math.random() < 0.15) nextBlink = 0.45; // the second of a double blink
      }
      if (blink > 0) {
        blink += dt / blinkDur;
        if (blink >= 1) blink = 0;
      }
    }

    for (const s of springs) {
      if (reduceMotion) {
        s.v = s.t;
        s.vel = 0;
      } else step(s, dt);
    }
  };

  /* ---- draw ---------------------------------------------------------------
     the display is a field of dots that is always there, and the face is
     not cells switching on: it is the dots under it growing. each cell asks
     how far it is from the eye's shape, in cells, and grows by how deep
     inside it lands — so an edge is a row of half-grown dots, the iris is
     where they shrink back, and a blink is the whole eye sinking into the
     grid instead of snapping off it. */

  /* signed distance to a rounded box, in cells — negative inside */
  const boxSDF = (x, y, cx, cy, w, h, r) => {
    const qx = Math.abs(x - cx) - (w / 2 - r);
    const qy = Math.abs(y - cy) - (h / 2 - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };

  /* what one eye is this frame — the numbers the field is measured against */
  const shape = (ex, ey, side) => {
    const h = EH * u * open.v;
    const look = gx.v * u;
    /* the far eye narrows a little on a hard look sideways — the cheapest
       way to say the head turned with the gaze */
    const away = clamp(side * gx.v * 0.16, 0, 0.14);
    const w = EW * u * (1 - away);
    const cx = ex + look * 0.36; // the whole eye carries some of the turn
    const bl = Math.sin(blink * Math.PI);
    const top = ey - h / 2;
    const px = cx + look; // the iris rides the gaze
    const py = ey + gy.v * u;
    const pr = (iris.v * u) / 2;
    const cr = (core.v * u) / 2; // the pupil in the middle of it
    /* the catch-light sits on the iris's upper shoulder, between the pupil
       and the rim, where a window would land in a real eye */
    const go = (pr + cr) / 2 / Math.SQRT2;
    return {
      cx, cy: ey, w, h, side,
      rad: Math.min(w, h) * 0.42,
      lidT: top + Math.max(lidU, bl * 0.62) * h,
      lidB: ey + h / 2 - Math.max(lidL, bl * 0.42) * h,
      px, py, pr, cr,
      lx: px - go, ly: py - go, lr: pr * 0.15, // the catch-light
      bw: w * BROW_W, // the brow
      by: top - (LIFT + brow.v) * u,
      bt: 0.5 * u, // half its thickness
    };
  };

  /* one eye measured at one cell, as two depths: how deep the cell sits in
     the white, and how deep in the iris. the white is the eye's box cut by
     the lids with the iris taken out of it and the catch-light put back;
     the iris is that same cut box narrowed to the iris disc, with the
     pupil left out of its middle and the catch-light off its shoulder. the
     pupil is nothing at all — the grid shows through it */
  const field = (x, y, e, out) => {
    let d = boxSDF(x, y, e.cx, e.cy, e.w, e.h, e.rad);
    d = Math.max(d, e.lidT - y, y - e.lidB);
    const dp = Math.hypot(x - e.px, y - e.py);
    const dl = Math.hypot(x - e.lx, y - e.ly) - e.lr;
    out[0] = Math.min(Math.max(d, -(dp - e.pr)), dl);
    out[1] = Math.max(Math.max(d, dp - e.pr), -(dp - e.cr), -dl);
  };

  /* the brow: a bar bent over the eye, its inner end carrying the mood and
     its ends falling away, measured as a capsule so it has rounded ends */
  const browSDF = (x, y, e) => {
    const bx = clamp(x, e.cx - e.bw / 2, e.cx + e.bw / 2);
    const p = (bx - e.cx) / (e.bw / 2);
    const by = e.by + tilt.v * u * (e.side * p) * 1.4 - (1 - p * p) * 0.9 * u;
    return Math.hypot(x - bx, y - by) - e.bt;
  };

  const fL = [0, 0], fR = [0, 0]; // scratch: one pair of depths per eye

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const fy = rows / 2 + DROP * u;
    const fx = (GAP * u) / 2 + (EW * u) / 2;
    const L = shape(cols / 2 - fx, fy, 1);
    const R = shape(cols / 2 + fx, fy, -1);

    /* only the cells around the face are worth measuring — the rest of the
       display is at rest */
    const pad = 2 * u;
    const x0 = L.cx - L.w / 2 - pad, x1 = R.cx + R.w / 2 + pad;
    const y0 = Math.min(L.by, R.by) - 2 * u;
    const y1 = Math.max(L.cy + L.h / 2, R.cy + R.h / 2) + pad;

    const baseR = Math.max(0.4, cell * 0.095);
    const base = new Path2D();
    const lit = new Path2D(); // the white of the eye
    const irisP = new Path2D(); // the iris
    const brows = new Path2D();

    for (let cy = 0; cy < rows; cy++) {
      const y = cy + 0.5;
      const py = oy + cy * cell + cell / 2;
      const near = y > y0 && y < y1;
      for (let cx = 0; cx < cols; cx++) {
        const x = cx + 0.5;
        const px = ox + cx * cell + cell / 2;
        let lw = 0, li = 0, lb = 0;
        if (near && x > x0 && x < x1) {
          field(x, y, L, fL);
          field(x, y, R, fR);
          /* the ramp is a little over a cell wide and reaches full a little
             inside the edge, so the body of the eye is solid dots and only
             its outline is caught mid-grow */
          lw = clamp(0.62 - 0.85 * Math.min(fL[0], fR[0]), 0, 1);
          /* the iris gets a steeper ramp than the white around it: it is a
             narrow band, and on a gentle ramp every one of its dots would
             be an edge dot, so the disc would never fill in */
          li = clamp(0.85 - 1.2 * Math.min(fL[1], fR[1]), 0, 1);
          lb = clamp(0.62 - 0.85 * Math.min(browSDF(x, y, L), browSDF(x, y, R)), 0, 1);
        }
        if (lw > 0.04) {
          const r = cell * (0.12 + 0.34 * Math.pow(lw, 0.7));
          lit.moveTo(px + r, py);
          lit.arc(px, py, r, 0, 6.2832);
        } else if (li > 0.04) {
          /* the iris's dots are the size of the white's — it is a disc of
             colour in the eye, not a sparser patch of it */
          const r = cell * (0.12 + 0.34 * Math.pow(li, 0.7));
          irisP.moveTo(px + r, py);
          irisP.arc(px, py, r, 0, 6.2832);
        } else if (lb > 0.04) {
          const r = cell * (0.11 + 0.26 * Math.pow(lb, 0.7));
          brows.moveTo(px + r, py);
          brows.arc(px, py, r, 0, 6.2832);
        } else {
          base.moveTo(px + baseR, py);
          base.arc(px, py, baseR, 0, 6.2832);
        }
      }
    }

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = dim;
    ctx.fill(base);
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = ink;
    ctx.fill(brows);
    ctx.globalAlpha = 1;
    ctx.fillStyle = irisFill();
    ctx.fill(irisP);
    ctx.fillStyle = ink;
    ctx.fill(lit);
  };

  /* ---- loop -------------------------------------------------------------- */
  let raf = 0;
  let last = 0;
  let alive = true;
  let onScreen = true;

  const frame = (now) => {
    raf = 0;
    if (!alive) return;
    const dt = last ? Math.min((now - last) / 1000, 0.032) : 0.016;
    last = now;
    update(dt);
    draw();
    if (onScreen) raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    /* no document.hidden check: a backgrounded tab stops calling rAF on its
       own, and some hosts report hidden while still drawing the page — which
       would leave the face frozen on screen */
    if (!raf && alive && onScreen) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  };

  const ro = new ResizeObserver(() => {
    layout();
    wake();
  });
  ro.observe(stage);

  /* the loop only runs while the cell is on screen — the row scrolls past
     several of these and a sleeping face costs nothing */
  const io = new IntersectionObserver(
    ([e]) => {
      onScreen = e.intersectionRatio >= 0.3;
      if (onScreen) wake();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    { threshold: [0, 0.3] },
  );
  io.observe(stage);

  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => {
    layout();
    wake();
  };
  scheme.addEventListener("change", onScheme);

  layout();
  wake();

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    removeEventListener("pointermove", onMove);
    removeEventListener("pointerdown", onDown);
    removeEventListener("deviceorientation", onOrient);
    removeEventListener("scroll", onScroll, { capture: true });
    scheme.removeEventListener("change", onScheme);
  };
}
