// spirals behind the page: a rock-paper-scissors automaton. every cell
// holds one of three colonies, and each colony is eaten by the next one
// round. left alone the board winds itself into slowly turning spirals
// that never settle. almost none of it is shown: only the front where one
// colony takes ground, in a faint grey, and only near a few spiral cores,
// so the page stays mostly plain with a couple of quiet arms turning.

const PITCH = 6; // css px per cell, gap included
const GAP = 1;
const STEPS = 12; // steps a second
const WARM = 160; // steps run before the first frame, past the noisy start
const LEVELS = 4; // brightness steps, so it stays on the grid

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// a small fast generator: the rule draws a number per cell per step
let seed = (Math.random() * 2 ** 32) >>> 0 || 1;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
};

const theme = () => {
  const s = getComputedStyle(document.documentElement);
  const light = matchMedia("(prefers-color-scheme: light)").matches;
  const v = (name, fall) => s.getPropertyValue(name).trim() || fall;
  return {
    ink: v("--fg", "#8f8f8f"),
    alpha: light ? 0.3 : 0.26,
  };
};

export function mount(host = document.body) {
  const canvas = document.createElement("canvas");
  canvas.className = "backdrop";
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const scheme = matchMedia("(prefers-color-scheme: light)");

  let cols = 0, rows = 0, dpr = 1;
  let cur, next, fresh, dim, glow;
  let centres = [];
  let colors = theme();
  let covered = false; // the tiles fill the screen, so there's nothing to watch

  const layout = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    cols = Math.ceil(innerWidth / PITCH);
    rows = Math.ceil(innerHeight / PITCH);
    const n = cols * rows;
    cur = new Uint8Array(n);
    next = new Uint8Array(n);
    fresh = new Float32Array(n); // how recently each cell changed hands
    dim = new Float32Array(n).fill(1);
    // seed pinwheels: three colour wedges round a few centres, each turning
    // its own way. the rule winds every one into a big clean spiral, where
    // plain noise only makes a crowd of small ones
    // the cores go where they'll be seen: in open background, clear of the
    // tiles and the intro, and apart from each other
    const reach = Math.min(cols, rows) * 0.28;
    const busy = [...document.querySelectorAll(".tile, .intro")].map((el) => {
      const r = el.getBoundingClientRect();
      return { x0: r.left / PITCH, x1: r.right / PITCH, y0: r.top / PITCH, y1: r.bottom / PITCH };
    });
    const clear = (x, y, gap) =>
      busy.every((b) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1)) > gap);
    centres = [];
    const want = clamp(Math.round(n / 12000), 2, 4);
    for (let tries = 0; centres.length < want && tries < 400; tries++) {
      // loosen the rules as the tries run out, so a cramped screen still gets some
      const strict = 1 - tries / 400;
      const x = (0.06 + rnd() * 0.88) * cols, y = (0.06 + rnd() * 0.88) * rows;
      if (!clear(x, y, reach * 0.35 * strict)) continue;
      if (centres.some((c) => Math.hypot(c.x - x, c.y - y) < reach * 1.4 * strict)) continue;
      centres.push({ x, y, turn: rnd() < 0.5 ? 1 : -1 });
    }
    if (!centres.length) centres.push({ x: cols / 2, y: rows / 2, turn: 1 });
    for (let i = 0; i < n; i++) {
      const x = i % cols, y = (i / cols) | 0;
      let c = centres[0], bd = Infinity;
      for (const k of centres) {
        const d = (x - k.x) ** 2 + (y - k.y) ** 2;
        if (d < bd) { bd = d; c = k; }
      }
      const a = (Math.atan2(y - c.y, x - c.x) * c.turn) / (Math.PI * 2) + 1;
      cur[i] = rnd() < 0.04 ? (rnd() * 3) | 0 : Math.floor(a * 3) % 3;
    }
    for (let k = 0; k < WARM; k++) step();
    // each spiral shows only round its core, fading to nothing well before
    // it meets the next one; everywhere else stays plain
    glow = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i % cols, y = (i / cols) | 0;
      let g = 0;
      for (const c of centres) g = Math.max(g, 1 - smooth(reach * 0.25, reach, Math.hypot(x - c.x, y - c.y)));
      glow[i] = g;
    }
    measure();
  };

  // the text keeps a quiet patch; the tiles decide whether to run at all
  const measure = () => {
    if (!dim) return;
    dim.fill(1);
    const pad = 4 * PITCH;
    for (const el of document.querySelectorAll(".intro p, figcaption")) {
      const r = el.getBoundingClientRect();
      if (!r.width || r.bottom < -pad || r.top > innerHeight + pad) continue;
      const x0 = Math.max(0, Math.floor((r.left - pad) / PITCH));
      const x1 = Math.min(cols - 1, Math.floor((r.right + pad) / PITCH));
      const y0 = Math.max(0, Math.floor((r.top - pad) / PITCH));
      const y1 = Math.min(rows - 1, Math.floor((r.bottom + pad) / PITCH));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const cx = x * PITCH + PITCH / 2, cy = y * PITCH + PITCH / 2;
          const d = Math.hypot(Math.max(r.left - cx, 0, cx - r.right), Math.max(r.top - cy, 0, cy - r.bottom));
          const i = y * cols + x;
          dim[i] = Math.min(dim[i], 0.12 + 0.88 * smooth(0, pad, d));
        }
      }
    }
    let hid = 0;
    for (const el of document.querySelectorAll(".tile")) {
      const r = el.getBoundingClientRect();
      const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      if (w > 0 && h > 0) hid += w * h;
    }
    covered = hid > innerWidth * innerHeight * 0.75;
  };

  // one step: a cell falls to its predator once enough of its eight
  // neighbours belong to it. the bar wobbles a little per cell, which is
  // what breaks the board's symmetry and lets the spirals wind up
  const step = () => {
    let changed = 0;
    for (let y = 0; y < rows; y++) {
      const up = ((y + rows - 1) % rows) * cols;
      const row = y * cols;
      const down = ((y + 1) % rows) * cols;
      for (let x = 0; x < cols; x++) {
        const l = (x + cols - 1) % cols, r = (x + 1) % cols;
        const i = row + x;
        const s = cur[i];
        const p = s === 2 ? 0 : s + 1; // whoever eats this colony
        const n =
          (cur[up + l] === p) + (cur[up + x] === p) + (cur[up + r] === p) +
          (cur[row + l] === p) + (cur[row + r] === p) +
          (cur[down + l] === p) + (cur[down + x] === p) + (cur[down + r] === p);
        if (n > 2 + rnd() * 2) {
          next[i] = p;
          fresh[i] = 1;
          changed++;
        } else {
          next[i] = s;
          fresh[i] *= 0.6;
        }
      }
    }
    [cur, next] = [next, cur];
    // if one colony ever takes the whole board, scatter a little noise so
    // the others get a foothold again
    if (changed < cols * rows * 0.002) {
      const cx = (rnd() * cols) | 0, cy = (rnd() * rows) | 0;
      for (let y = cy - 8; y <= cy + 8; y++) {
        for (let x = cx - 8; x <= cx + 8; x++) {
          cur[((y + rows) % rows) * cols + ((x + cols) % cols)] = (rnd() * 3) | 0;
        }
      }
    }
  };

  // one front of the three: cells that just fell to colony 0. bucketed by
  // brightness so the fill is set once and alpha only a few times
  const buckets = Array.from({ length: LEVELS + 1 }, () => []);
  const draw = () => {
    for (const b of buckets) b.length = 0;
    for (let i = 0; i < cur.length; i++) {
      if (cur[i] !== 0 || !glow[i]) continue;
      const v = fresh[i] * glow[i];
      if (v < 0.12) continue;
      buckets[Math.ceil(v * LEVELS)].push(i);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const size = PITCH - GAP;
    ctx.fillStyle = colors.ink;
    for (let l = 1; l <= LEVELS; l++) {
      const alpha = (l / LEVELS) * colors.alpha;
      for (const i of buckets[l]) {
        ctx.globalAlpha = alpha * dim[i];
        ctx.fillRect((i % cols) * PITCH, ((i / cols) | 0) * PITCH, size, size);
      }
    }
    ctx.globalAlpha = 1;
  };

  let raf = 0, last = 0, acc = 0, frames = 0, running = false;
  const frame = (now) => {
    if (covered) {
      // nothing on show: clear the gaps and stop until a scroll uncovers it
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    raf = requestAnimationFrame(frame);
    acc += clamp((now - last) / 1000, 0, 0.25);
    last = now;
    // only a new step needs a redraw, so most frames do nothing
    if (acc < 1 / STEPS) return;
    acc = 0;
    step();
    if (++frames % 10 === 0) measure();
    draw();
  };

  const run = () => {
    if (running || covered || still.matches) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    cancelAnimationFrame(raf);
    running = false;
    draw();
    run();
  };

  const onScroll = () => {
    measure();
    run();
  };
  const onResize = () => {
    layout();
    start();
  };
  const recolor = () => {
    colors = theme();
    draw();
  };

  layout();
  start();
  addEventListener("resize", onResize);
  addEventListener("scroll", onScroll, { passive: true, capture: true });
  scheme.addEventListener("change", recolor);
  still.addEventListener("change", start);

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("resize", onResize);
    removeEventListener("scroll", onScroll, { capture: true });
    scheme.removeEventListener("change", recolor);
    still.removeEventListener("change", start);
    canvas.remove();
  };
}
