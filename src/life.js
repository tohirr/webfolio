// life behind the page: conway's rules on a wrapping grid, with three
// colonies in the accent colours. a cell born takes the colour most of its
// parents carry, so the colonies push into each other's ground. the dead
// leave a fading ghost, and fresh soup drops in now and then so the board
// never dies out or freezes. nothing to touch; it's there to watch.

const PITCH = 6; // css px per cell, gap included
const GAP = 1;
const GENS = 10; // generations a second
const LEVELS = 4; // brightness steps, so it stays on the grid

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const theme = () => {
  const s = getComputedStyle(document.documentElement);
  const light = matchMedia("(prefers-color-scheme: light)").matches;
  const v = (name, fall) => s.getPropertyValue(name).trim() || fall;
  return {
    colonies: [v("--green", "#4ade80"), v("--amber", "#f59e0b"), v("--blue", "#60a5fa")],
    alpha: light ? 0.28 : 0.32,
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
  let cur, next, hue, nextHue, age, ghost, dim;
  let colors = theme();
  let covered = false; // the tiles fill the screen, so there's nothing to watch
  let gen = 0, lastPop = 0, flat = 0;

  // a patch of random soup in one colony's colour
  const soup = (cx, cy, r, density, h) => {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (Math.random() > density || Math.hypot(x - cx, y - cy) > r) continue;
        const i = ((y + rows) % rows) * cols + ((x + cols) % cols);
        cur[i] = 1;
        hue[i] = h;
        age[i] = 0;
      }
    }
  };

  const layout = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    cols = Math.ceil(innerWidth / PITCH);
    rows = Math.ceil(innerHeight / PITCH);
    const n = cols * rows;
    cur = new Uint8Array(n);
    next = new Uint8Array(n);
    hue = new Uint8Array(n);
    nextHue = new Uint8Array(n);
    age = new Uint8Array(n);
    ghost = new Float32Array(n);
    dim = new Float32Array(n).fill(1);
    // three home grounds, so the colonies start apart and meet in the middle
    const homes = [0, 1, 2].map((k) => [
      (cols * (0.2 + 0.3 * k)) | 0,
      (rows * (0.3 + 0.4 * Math.random())) | 0,
    ]);
    for (let i = 0; i < n; i++) {
      if (Math.random() > 0.2) continue;
      const x = i % cols, y = (i / cols) | 0;
      let h = 0, bd = Infinity;
      homes.forEach(([hx, hy], k) => {
        const d = Math.hypot(x - hx, y - hy);
        if (d < bd) { bd = d; h = k; }
      });
      cur[i] = 1;
      hue[i] = h;
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

  const step = () => {
    gen++;
    let pop = 0;
    const counts = [0, 0, 0];
    for (let y = 0; y < rows; y++) {
      const up = ((y + rows - 1) % rows) * cols;
      const row = y * cols;
      const down = ((y + 1) % rows) * cols;
      for (let x = 0; x < cols; x++) {
        const l = (x + cols - 1) % cols, r = (x + 1) % cols;
        let n = 0;
        counts[0] = counts[1] = counts[2] = 0;
        // the eight neighbours, written out: no array per cell per generation
        let j;
        if (cur[(j = up + l)]) { n++; counts[hue[j]]++; }
        if (cur[(j = up + x)]) { n++; counts[hue[j]]++; }
        if (cur[(j = up + r)]) { n++; counts[hue[j]]++; }
        if (cur[(j = row + l)]) { n++; counts[hue[j]]++; }
        if (cur[(j = row + r)]) { n++; counts[hue[j]]++; }
        if (cur[(j = down + l)]) { n++; counts[hue[j]]++; }
        if (cur[(j = down + x)]) { n++; counts[hue[j]]++; }
        if (cur[(j = down + r)]) { n++; counts[hue[j]]++; }
        const i = row + x;
        if (cur[i]) {
          if (n === 2 || n === 3) {
            next[i] = 1;
            nextHue[i] = hue[i];
            age[i] = Math.min(255, age[i] + 1);
            pop++;
          } else {
            next[i] = 0;
            nextHue[i] = hue[i]; // the ghost keeps its colony's colour
            ghost[i] = 1; // just died: leave a ghost
          }
        } else if (n === 3) {
          // born to the colour most of its three parents carry; a three-way
          // split goes to whichever colony wins the toss
          const top = Math.max(counts[0], counts[1], counts[2]);
          let h;
          do h = (Math.random() * 3) | 0; while (counts[h] !== top);
          next[i] = 1;
          nextHue[i] = h;
          age[i] = 0;
          pop++;
        } else {
          next[i] = 0;
          nextHue[i] = hue[i];
        }
        if (!next[i] && ghost[i]) ghost[i] *= 0.82;
      }
    }
    [cur, next] = [next, cur];
    [hue, nextHue] = [nextHue, hue];

    // keep it alive: soup when the board thins out or settles into
    // still lifes and blinkers, plus a stray patch every few seconds
    flat = Math.abs(pop - lastPop) < cols * rows * 0.0005 ? flat + 1 : 0;
    lastPop = pop;
    const thin = pop < cols * rows * 0.015;
    if (thin || flat > 40 || gen % (GENS * 4) === 0) {
      const r = 6 + ((Math.random() * 6) | 0);
      soup((Math.random() * cols) | 0, (Math.random() * rows) | 0, r, 0.4, (Math.random() * 3) | 0);
      flat = 0;
    }
  };

  // bucket by colony and brightness, so fillStyle changes a dozen times a
  // frame instead of once a cell
  const buckets = Array.from({ length: 3 * (LEVELS + 1) }, () => []);
  const draw = () => {
    for (const b of buckets) b.length = 0;
    for (let i = 0; i < cur.length; i++) {
      let v = 0;
      if (cur[i]) {
        // newborns flare, then settle as they age
        v = 0.55 + 0.45 * Math.max(0, 1 - age[i] / 8);
      } else if (ghost[i] > 0.08) {
        v = ghost[i] * 0.35;
      } else continue;
      buckets[hue[i] * (LEVELS + 1) + Math.ceil(v * LEVELS)].push(i);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const size = PITCH - GAP;
    for (let h = 0; h < 3; h++) {
      ctx.fillStyle = colors.colonies[h];
      for (let l = 1; l <= LEVELS; l++) {
        const alpha = (l / LEVELS) * colors.alpha;
        for (const i of buckets[h * (LEVELS + 1) + l]) {
          ctx.globalAlpha = alpha * dim[i];
          ctx.fillRect((i % cols) * PITCH, ((i / cols) | 0) * PITCH, size, size);
        }
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
    // only a new generation needs a redraw, so most frames do nothing
    if (acc < 1 / GENS) return;
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
    if (still.matches) {
      // one still from a little way in, once the soup has found its shapes
      for (let i = 0; i < 40; i++) step();
      draw();
      return;
    }
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
