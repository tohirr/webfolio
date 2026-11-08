/* copied from ~/Developer/dotix/src/lib/board — swap for the package once it ships */
/* board — a dot-matrix text display on a fixed, always-visible lattice.
   two transitions:
   - "cycle" (default, the classic board): a wave runs left to right, each
     cell scrambles forward through the board's character order and lands
     on its letter, so the left side resolves first.
   - "travel": the lit dots of each old glyph spring to the nearest dots of
     the new one; extras shrink away, missing dots split off a neighbour.

   const b = createBoard(el, { cols: 18, rows: 5 });
   b.set("06:28 LOS ANGELES\n09:28 NEW YORK");
   b.set([[{ text: "BA117 " }, { text: "BOARDING", color: "var(--up)" }]]);

   a line is a string or an array of { text, color } segments. color is
   any css color, var() included, resolved against the board's element.
   the real text lives in a visually hidden aria-live span.

   bare space: `voids: [5]` removes column 5's cell on every line (no grey
   dots, just space), and "_" in the text does the same for one cell. */

import { GW, GH, glyph } from "./glyphs.js";

const CSS = `
.dx-board { position: relative; }
.dx-board > canvas { display: block; width: 100%; }
.dx-board-sr {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: pre; border: 0;
}
.dx-board-probe { position: absolute; visibility: hidden; pointer-events: none; }
`;

function injectStyle() {
  if (document.getElementById("dx-board-style")) return;
  const s = document.createElement("style");
  s.id = "dx-board-style";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createBoard(el, options = {}) {
  const o = {
    cols: 16,
    rows: 1,
    gapX: 1.1, // empty space between glyph cells, in dot pitches (no dots drawn there)
    gapY: 1.6, // empty space between lines, in dot pitches
    align: "left",
    voids: [], // column indices that are bare space on every line (no cell, no dots)
    voidChar: "_", // in text, this character makes that one cell bare space; null to disable
    still: [], // column indices that never animate: they swap in place, and the wave skips them
    onFlip: null, // cycle: called (col, row, landed) each time a cell flips — for sound
    dot: 0.74, // dot diameter as a fraction of the pitch
    transition: "cycle", // "cycle": scramble through characters, left first · "travel": dots move
    stagger: 0.04, // seconds between neighbouring cells
    rowLag: 2, // how many cells' worth of delay each line adds (the wave's slope)
    flips: 9, // cycle: at most this many characters before landing
    flipRate: 0.05, // cycle: seconds per flip
    stiffness: 240,
    damping: 21, // ≈0.68 damping ratio: one soft overshoot, then settle
    ink: "var(--ink)",
    grid: "var(--grid)",
    ...options,
  };

  const CW = GW + o.gapX;
  const CH = GH + o.gapY;
  const W = o.cols * CW - o.gapX; // lattice size in dots
  const H = o.rows * CH - o.gapY;
  const N = o.cols * o.rows;

  injectStyle();
  el.classList.add("dx-board");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const sr = document.createElement("span");
  sr.className = "dx-board-sr";
  sr.setAttribute("aria-live", "polite");
  const probe = document.createElement("span");
  probe.className = "dx-board-probe";
  el.append(canvas, sr, probe);
  const ctx = canvas.getContext("2d");

  /* ---- color: css (var() ok) → [r,g,b], via computed style + 1px paint
     so oklch/color-mix tokens come back as plain rgb ---- */
  const px = document.createElement("canvas");
  px.width = px.height = 1;
  const pctx = px.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  function rgb(css) {
    let c = cache.get(css);
    if (c) return c;
    probe.style.color = "";
    probe.style.color = css;
    pctx.clearRect(0, 0, 1, 1);
    pctx.fillStyle = "#000";
    pctx.fillStyle = getComputedStyle(probe).color;
    pctx.fillRect(0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data;
    c = [d[0], d[1], d[2]];
    cache.set(css, c);
    return c;
  }

  /* ---- state ---- */
  const voidCols = new Set(o.voids);
  const stillCols = new Set(o.still);
  // each column's place in the wave, counting only columns that animate,
  // so a still or bare column doesn't leave a pause in the wave
  const waveCol = [];
  for (let c = 0, k = 0; c < o.cols; c++) {
    waveCol[c] = k;
    if (!stillCols.has(c) && !voidCols.has(c)) k++;
  }
  const bare = new Array(N).fill(false); // cells drawn as plain space
  const keys = new Array(N).fill(null); // what each cell will settle on
  const shown = new Array(N).fill(" "); // what each cell shows right now
  const queues = new Array(N).fill(null); // cycle: pending flips per cell
  const owned = Array.from({ length: N }, () => []); // live dots per cell
  let dying = []; // dots shrinking away
  let pitch = 0;
  let dpr = 1;
  let lattice = null; // cached unlit grid
  let clock = 0;
  let raf = 0;
  let last = 0;
  let current = "";

  function layout(value) {
    const lines = Array.isArray(value) ? value : String(value).split("\n");
    const cells = [];
    const text = [];
    for (let r = 0; r < o.rows; r++) {
      const line = lines[r] ?? "";
      const segs = typeof line === "string" ? [{ text: line }] : line;
      const chars = [];
      for (const s of segs)
        for (const ch of String(s.text ?? "")) chars.push({ ch, color: s.color });
      text.push(chars.map((c) => (c.ch === o.voidChar ? " " : c.ch)).join(""));
      const len = Math.min(chars.length, o.cols);
      const off =
        o.align === "right" ? o.cols - len : o.align === "center" ? (o.cols - len) >> 1 : 0;
      for (let c = 0; c < o.cols; c++) {
        const cell = chars[c - off] ?? { ch: " " };
        const bare = voidCols.has(c) || (o.voidChar != null && cell.ch === o.voidChar);
        cells.push(bare ? { ch: " ", bare } : cell);
      }
    }
    return { cells, text: text.join("\n").trimEnd() };
  }

  /* greedy nearest pairing — cheap (≤35×35 per cell) and it keeps dots
     that don't need to move exactly where they are */
  function match(from, to) {
    const pairs = [];
    for (let a = 0; a < from.length; a++)
      for (let b = 0; b < to.length; b++) {
        const dx = from[a].tx - to[b][0];
        const dy = from[a].ty - to[b][1];
        pairs.push(dx * dx + dy * dy, a, b);
      }
    const order = [];
    for (let i = 0; i < pairs.length; i += 3) order.push(i);
    order.sort((i, j) => pairs[i] - pairs[j]);
    const fromTo = new Array(from.length).fill(-1);
    const toFrom = new Array(to.length).fill(-1);
    for (const i of order) {
      const a = pairs[i + 1];
      const b = pairs[i + 2];
      if (fromTo[a] < 0 && toFrom[b] < 0) {
        fromTo[a] = b;
        toFrom[b] = a;
      }
    }
    return { fromTo, toFrom };
  }

  /* the classic board order — a flipping cell walks forward through this
     ring until it reaches its character. punctuation isn't on the ring: a
     cell bound for ":" or "→" churns through the digits, then lands */
  const CYCLE = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // the last `flips` steps before `to` in board order, ending on `to`.
  // from === to walks the whole ring, so a forced flip still churns
  function cyclePath(from, to) {
    const L = CYCLE.length;
    const onRing = CYCLE.includes(to);
    const b = onRing ? CYCLE.indexOf(to) : L; // off-ring: a slot just past "9"
    const a = CYCLE.indexOf(from);
    const d = from === to ? L : a < 0 ? L : (b - a + L) % L || L;
    const n = Math.min(d, o.flips);
    const out = [];
    for (let k = n - 1; k >= 1; k--) out.push(CYCLE[(((b - k) % L) + L) % L]);
    out.push(to);
    return out;
  }

  /* set(value, { all: true }) flips every cell, unchanged and blank ones
     included, so the whole board turns over as one wave */
  function set(value, { all = false } = {}) {
    const { cells, text } = layout(value);
    if (text !== current) sr.textContent = current = text;
    const instant = reduced();
    let latticeDirty = false;
    for (let i = 0; i < N; i++)
      if (bare[i] !== !!cells[i].bare) (bare[i] = !!cells[i].bare), (latticeDirty = true);
    if (latticeDirty && pitch) buildLattice();

    for (let i = 0; i < N; i++) {
      const ch = cells[i].ch.toUpperCase();
      const css = cells[i].color ?? o.ink;
      const key = ch + "|" + css;
      if (keys[i] === key && !all) continue;
      keys[i] = key;

      const col = i % o.cols;
      const row = (i / o.cols) | 0;
      // a diagonal wave: top left starts first, bottom right last
      const start = clock + (waveCol[col] + row * o.rowLag) * o.stagger;
      if (stillCols.has(col)) {
        queues[i] = null;
        applyCell(i, ch, css, clock, true);
      } else if (o.transition === "cycle" && !instant && !cells[i].bare) {
        // each cell starts a beat after its neighbour and scrambles
        // through its run of characters, landing on the real one
        const path = shown[i] === ch && !all ? [ch] : cyclePath(shown[i], ch);
        queues[i] = path.map((c, k) => ({ at: start + k * o.flipRate, ch: c, css }));
      } else {
        queues[i] = null;
        applyCell(i, ch, css, start, false);
      }
    }

    if (instant) {
      for (const cell of owned)
        for (const p of cell) {
          p.x = p.tx;
          p.y = p.ty;
          p.vx = p.vy = 0;
          p.s = 1;
          p.c = p.tc.slice();
        }
      dying = [];
      draw();
    } else kick();
  }

  /* point cell i at a glyph. travel: matched dots spring to their new
     spots. snap (a cycle flip): dots switch in place, on and off quickly */
  function applyCell(i, ch, css, start, snap) {
    shown[i] = ch;
    const ox = (i % o.cols) * CW;
    const oy = ((i / o.cols) | 0) * CH;
    const targets = glyph(ch).map(([x, y]) => [ox + x, oy + y]);
    const tc = rgb(css);
    const old = owned[i];
    const { fromTo, toFrom } = match(old, targets);
    const next = [];
    const rate = snap ? 45 : 14;

    old.forEach((p, a) => {
      p.start = start;
      p.css = css;
      p.tc = tc;
      p.rate = rate;
      if (fromTo[a] >= 0 && (!snap || (p.tx === targets[fromTo[a]][0] && p.ty === targets[fromTo[a]][1]))) {
        [p.tx, p.ty] = targets[fromTo[a]];
        if (snap) p.c = tc.slice();
        next.push(p);
      } else {
        if (snap && fromTo[a] >= 0) toFrom[fromTo[a]] = -1; // snap: a moved dot is an off + an on
        p.ts = 0;
        dying.push(p);
      }
    });

    targets.forEach(([tx, ty], b) => {
      if (toFrom[b] >= 0) return;
      // travel: split off the nearest surviving dot. snap: pop in place
      let parent = null;
      if (!snap) {
        let best = Infinity;
        for (const p of next) {
          const d = (p.x - tx) ** 2 + (p.y - ty) ** 2;
          if (d < best) (best = d), (parent = p);
        }
      }
      next.push({
        x: parent ? parent.x : tx,
        y: parent ? parent.y : ty,
        vx: 0,
        vy: 0,
        tx,
        ty,
        s: parent ? parent.s : snap ? 0.45 : 0,
        ts: 1,
        c: parent ? parent.c.slice() : tc.slice(),
        tc,
        css,
        start,
        rate,
      });
    });
    owned[i] = next;
  }

  /* ---- simulation ---- */
  function step(dt) {
    clock += dt;
    let busy = false;
    const k = o.stiffness;
    const c = o.damping;
    const fc = 1 - Math.exp(-dt * 9);
    for (let i = 0; i < N; i++) {
      const q = queues[i];
      if (!q) continue;
      busy = true;
      while (q.length && q[0].at <= clock) {
        const f = q.shift();
        applyCell(i, f.ch, f.css, clock, true);
        if (o.onFlip) o.onFlip(i % o.cols, (i / o.cols) | 0, q.length === 0);
      }
      if (!q.length) queues[i] = null;
    }
    const advance = (p) => {
      if (clock < p.start) return (busy = true);
      const fs = 1 - Math.exp(-dt * (p.rate ?? 14));
      const ax = k * (p.tx - p.x) - c * p.vx;
      const ay = k * (p.ty - p.y) - c * p.vy;
      p.vx += ax * dt;
      p.vy += ay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.s += (p.ts - p.s) * fs;
      for (let j = 0; j < 3; j++) p.c[j] += (p.tc[j] - p.c[j]) * fc;
      const still =
        Math.abs(p.tx - p.x) < 0.003 &&
        Math.abs(p.ty - p.y) < 0.003 &&
        Math.abs(p.vx) + Math.abs(p.vy) < 0.02 &&
        Math.abs(p.ts - p.s) < 0.004 &&
        Math.abs(p.tc[0] - p.c[0]) + Math.abs(p.tc[1] - p.c[1]) + Math.abs(p.tc[2] - p.c[2]) < 1;
      if (still) {
        p.x = p.tx;
        p.y = p.ty;
        p.vx = p.vy = 0;
        p.s = p.ts;
        p.c = p.tc.slice();
      } else busy = true;
    };
    for (const cell of owned) cell.forEach(advance);
    dying.forEach(advance);
    dying = dying.filter((p) => p.s > 0.02);
    return busy;
  }

  function frame(t) {
    const dt = last ? Math.min(Math.max((t - last) / 1000, 0), 1 / 30) : 1 / 60;
    last = t;
    const busy = step(dt);
    draw();
    raf = busy ? requestAnimationFrame(frame) : 0;
    if (!busy) last = 0;
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* ---- render ---- */
  function buildLattice() {
    lattice = document.createElement("canvas");
    lattice.width = canvas.width;
    lattice.height = canvas.height;
    const g = lattice.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [r, gg, b] = rgb(o.grid);
    g.fillStyle = `rgb(${r},${gg},${b})`;
    const rad = (pitch * o.dot) / 2;
    g.beginPath();
    // dots only inside each glyph cell; the gaps between cells stay bare
    for (let row = 0; row < o.rows; row++)
      for (let col = 0; col < o.cols; col++) {
        if (bare[row * o.cols + col]) continue;
        for (let y = 0; y < GH; y++)
          for (let x = 0; x < GW; x++) {
            const cx = (col * CW + x + 0.5) * pitch;
            const cy = (row * CH + y + 0.5) * pitch;
            g.moveTo(cx + rad, cy);
            g.arc(cx, cy, rad, 0, Math.PI * 2);
          }
      }
    g.fill();
  }

  function draw() {
    if (!pitch) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(lattice, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rad = (pitch * o.dot) / 2;
    const dot = (p) => {
      if (p.s < 0.02) return;
      ctx.fillStyle = `rgb(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0})`;
      ctx.beginPath();
      ctx.arc((p.x + 0.5) * pitch, (p.y + 0.5) * pitch, rad * Math.min(p.s, 1.15), 0, Math.PI * 2);
      ctx.fill();
    };
    dying.forEach(dot);
    for (const cell of owned) cell.forEach(dot);
  }

  function resize() {
    const w = el.clientWidth;
    if (!w) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    pitch = w / W;
    const h = H * pitch;
    canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    buildLattice();
    draw();
  }

  function retheme() {
    cache.clear();
    for (const cell of owned)
      for (const p of cell) p.c = (p.tc = rgb(p.css)).slice();
    dying = [];
    if (pitch) buildLattice();
    draw();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(el);
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", retheme);
  const mo = new MutationObserver(retheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
  resize();

  if (options.value != null) set(options.value);

  return {
    set,
    retheme,
    // live-tweak motion options (transition, stagger, flips, flipRate, stiffness, damping)
    configure(patch) {
      for (const k of ["transition", "stagger", "rowLag", "flips", "flipRate", "stiffness", "damping"])
        if (k in patch) o[k] = patch[k];
    },
    get text() {
      return current;
    },
    // the line nearest a viewport y (clicks, taps); -1 outside the board
    rowAt(clientY) {
      const r = canvas.getBoundingClientRect();
      if (!pitch || clientY < r.top || clientY > r.bottom) return -1;
      const y = (clientY - r.top) / pitch + o.gapY / 2; // a gap splits between its lines
      return Math.min(Math.max(Math.floor(y / CH), 0), o.rows - 1);
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", retheme);
      canvas.remove();
      sr.remove();
      probe.remove();
      el.classList.remove("dx-board");
    },
  };
}
