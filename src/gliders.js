// a sparse life board behind the page. small things are scattered about —
// blocks, beehives, boats, blinkers, toads, beacons — and gliders and small
// spaceships wander through. when one runs into something the rules take
// over: it shatters, flares, leaves debris, sometimes throws off a new
// glider. each kind has its colour, and a cell born takes the colour most
// of its parents carry, so a collision mixes them. anything that has stood
// still for a long while fades away, and new things get scattered in, so
// the board stays sparse and keeps changing.

const PITCH = 6; // css px per cell, gap included
const GAP = 1;
const GENS = 12; // generations a second
const MARGIN = 8; // cells simulated past each edge, so ships enter whole
const STALE = 900; // a cell alive this many generations (~75s) is old debris, and goes
const LEVELS = 4; // brightness steps, so it stays on the grid

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[(Math.random() * list.length) | 0];
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// colours, by kind: 0 still lifes, 1 oscillators, 2 gliders, 3 spaceships
const STILL = [
  [[0, 0], [1, 0], [0, 1], [1, 1]], // block
  [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [2, 2]], // beehive
  [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [3, 2], [2, 3]], // loaf
  [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2]], // boat
  [[1, 0], [0, 1], [2, 1], [1, 2]], // tub
];
const OSC = [
  [[0, 0], [1, 0], [2, 0]], // blinker
  [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1]], // toad
  [[0, 0], [1, 0], [0, 1], [3, 2], [2, 3], [3, 3]], // beacon
];
// a glider heading down and right, and a lightweight spaceship heading right
const GLIDER = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
const SHIP = [[1, 0], [4, 0], [0, 1], [0, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3]];

// one of the eight turns and mirrors of a pattern
const orient = (cells) => {
  const swap = Math.random() < 0.5, fx = Math.random() < 0.5, fy = Math.random() < 0.5;
  const w = Math.max(...cells.map(([x, y]) => (swap ? y : x)));
  const h = Math.max(...cells.map(([x, y]) => (swap ? x : y)));
  return cells.map(([x, y]) => {
    let [a, b] = swap ? [y, x] : [x, y];
    if (fx) a = w - a;
    if (fy) b = h - b;
    return [a, b];
  });
};

const theme = () => {
  const s = getComputedStyle(document.documentElement);
  const light = matchMedia("(prefers-color-scheme: light)").matches;
  const v = (name, fall) => s.getPropertyValue(name).trim() || fall;
  return {
    kinds: [v("--fg", "#8f8f8f"), v("--blue", "#60a5fa"), v("--green", "#4ade80"), v("--amber", "#f59e0b")],
    alpha: light ? 0.5 : 0.48,
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

  // the board is the screen plus a margin all round; its outer ring stays
  // dead, so whatever drifts off simply leaves
  let cols = 0, rows = 0, W = 0, H = 0, dpr = 1;
  let cur, next, hue, nextHue, age, ghost, dim;
  let colors = theme();
  let covered = false; // the tiles fill the screen, so there's nothing to watch
  let pop = 0, clock = 0, nextLaunch = 0, nextScatter = 0;

  const put = (x, y, h) => {
    const bx = x + MARGIN, by = y + MARGIN;
    if (bx < 1 || by < 1 || bx >= W - 1 || by >= H - 1) return;
    const i = by * W + bx;
    cur[i] = 1;
    hue[i] = h;
    age[i] = 0;
  };

  // room for a pattern here: nothing alive within a couple of cells of it
  const room = (x, y, cells) => {
    for (const [cx, cy] of cells) {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const bx = x + cx + dx + MARGIN, by = y + cy + dy + MARGIN;
          if (bx < 0 || by < 0 || bx >= W || by >= H) return false;
          if (cur[by * W + bx]) return false;
        }
      }
    }
    return true;
  };

  // drop one thing somewhere empty on screen
  const scatter = () => {
    const r = Math.random();
    const [cells, h] =
      r < 0.5 ? [orient(pick(STILL)), 0] :
      r < 0.8 ? [orient(pick(OSC)), 1] :
      r < 0.95 ? [orient(GLIDER), 2] : [orient(SHIP), 3];
    for (let tries = 0; tries < 12; tries++) {
      const x = (rand(0.04, 0.96) * cols) | 0, y = (rand(0.04, 0.96) * rows) | 0;
      if (!room(x, y, cells)) continue;
      for (const [cx, cy] of cells) put(x + cx, y + cy, h);
      return;
    }
  };

  // send a ship in from just past an edge, pointed across the screen
  const launch = () => {
    if (Math.random() < 0.75) {
      const sx = Math.random() < 0.5 ? 1 : -1, sy = Math.random() < 0.5 ? 1 : -1;
      let ox, oy;
      if (Math.random() < 0.5) {
        ox = rand(0.1, 0.9) * cols;
        oy = sy > 0 ? -4 : rows + 1;
      } else {
        ox = sx > 0 ? -4 : cols + 1;
        oy = rand(0.1, 0.9) * rows;
      }
      for (const [x, y] of GLIDER) put((ox | 0) + (sx > 0 ? x : 2 - x), (oy | 0) + (sy > 0 ? y : 2 - y), 2);
    } else {
      const way = (Math.random() * 4) | 0; // right, left, down, up
      const along = (way < 2 ? rand(0.1, 0.9) * rows : rand(0.1, 0.9) * cols) | 0;
      for (const [x, y] of SHIP) {
        if (way === 0) put(-6 + x, along + y, 3);
        else if (way === 1) put(cols + 1 + (4 - x), along + y, 3);
        else if (way === 2) put(along + y, -6 + x, 3);
        else put(along + y, rows + 1 + (4 - x), 3);
      }
    }
  };

  const layout = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    cols = Math.ceil(innerWidth / PITCH);
    rows = Math.ceil(innerHeight / PITCH);
    W = cols + MARGIN * 2;
    H = rows + MARGIN * 2;
    const n = W * H;
    cur = new Uint8Array(n);
    next = new Uint8Array(n);
    hue = new Uint8Array(n);
    nextHue = new Uint8Array(n);
    age = new Uint16Array(n);
    ghost = new Float32Array(n);
    dim = new Float32Array(cols * rows).fill(1);
    // a sparse scatter to begin with: roughly one thing per 40×40 cells
    const count = clamp(Math.round((cols * rows) / 1600), 8, 40);
    for (let k = 0; k < count; k++) scatter();
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

  const counts = [0, 0, 0, 0];
  const step = () => {
    pop = 0;
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        const n =
          cur[i - W - 1] + cur[i - W] + cur[i - W + 1] +
          cur[i - 1] + cur[i + 1] +
          cur[i + W - 1] + cur[i + W] + cur[i + W + 1];
        if (cur[i] && (n === 2 || n === 3) && age[i] < STALE) {
          next[i] = 1;
          nextHue[i] = hue[i];
          age[i]++;
          pop++;
        } else if (!cur[i] && n === 3) {
          // born to the colour most of its parents carry; a tie goes to
          // whichever wins the toss
          counts[0] = counts[1] = counts[2] = counts[3] = 0;
          for (const j of [i - W - 1, i - W, i - W + 1, i - 1, i + 1, i + W - 1, i + W, i + W + 1]) {
            if (cur[j]) counts[hue[j]]++;
          }
          const top = Math.max(counts[0], counts[1], counts[2], counts[3]);
          let h;
          do h = (Math.random() * 4) | 0; while (counts[h] !== top);
          next[i] = 1;
          nextHue[i] = h;
          age[i] = 0;
          pop++;
        } else {
          next[i] = 0;
          nextHue[i] = hue[i]; // a ghost keeps its colour
          if (cur[i]) ghost[i] = 1;
          else if (ghost[i]) ghost[i] = ghost[i] < 0.05 ? 0 : ghost[i] * 0.55;
          age[i] = 0;
        }
      }
    }
    [cur, next] = [next, cur];
    [hue, nextHue] = [nextHue, hue];
  };

  // only what's on screen is drawn: live cells full, ghosts faint. bucketed
  // by colour and brightness so the fill changes a handful of times a frame
  const buckets = Array.from({ length: 4 * (LEVELS + 1) }, () => []);
  const draw = () => {
    for (const b of buckets) b.length = 0;
    for (let y = 0; y < rows; y++) {
      const row = (y + MARGIN) * W + MARGIN;
      for (let x = 0; x < cols; x++) {
        const i = row + x;
        const v = cur[i] ? 1 : ghost[i] * 0.45;
        if (v < 0.1) continue;
        buckets[hue[i] * (LEVELS + 1) + Math.ceil(v * LEVELS)].push(y * cols + x);
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const size = PITCH - GAP;
    for (let h = 0; h < 4; h++) {
      ctx.fillStyle = colors.kinds[h];
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
    const dt = clamp((now - last) / 1000, 0, 0.25);
    acc += dt;
    clock += dt;
    last = now;
    // only a new generation needs a redraw, so most frames do nothing
    if (acc < 1 / GENS) return;
    acc = 0;
    // traffic from the edges, and fresh things scattered in as old ones go
    if (clock > nextLaunch) {
      launch();
      nextLaunch = clock + rand(2, 4);
    }
    if (clock > nextScatter) {
      if (pop < cols * rows * 0.012) scatter();
      nextScatter = clock + rand(3, 6);
    }
    step();
    if (++frames % 12 === 0) measure();
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
