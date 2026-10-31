// adire behind the page: the cloth is a grid of panels, each drawn in
// starch resist — circles, seeds, stripes, a cross. at rest only the paste
// shows, faintly. a click is a drop of indigo: it soaks outward with a
// ragged edge, the ground goes blue, and the pasted lines stay pale, the
// way the cloth comes out of the vat. then the dye slowly lets go.

const PITCH = 10; // css px per cell, gap included
const GAP = 1;
const PANEL = 13; // cells per panel side, the border line included
const LEVELS = 6; // dye steps, so the soak stays on the grid
const LIFE = 22; // seconds a drop holds before it has faded

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const hash = (x, y, s = 0) => {
  let h = Math.imul(x | 0, 0x27d4eb2f) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s, 0x55fdc781);
  h = Math.imul(h ^ (h >>> 13), 0x4bf19f61);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// each motif answers one question: is the paste on this cell? u and v run
// across the inside of the panel, 0..n-1, with c the centre
const MOTIFS = [
  // olokun: rings around a dot
  (u, v, c) => {
    const r = Math.round(Math.hypot(u - c, v - c));
    return r === 0 || r === 3 || (r === 5 && (u + v) % 2 === 0);
  },
  // seeds: a loose field of dots
  (u, v) => u % 3 === 1 && v % 3 === 1,
  // stripes running corner to corner
  (u, v) => (u + v) % 4 === 0,
  // a cross with a seed in each quarter
  (u, v, c) => u === c || v === c || (Math.abs(u - c) === 3 && Math.abs(v - c) === 3),
  // zigzag rows
  (u, v) => v % 4 === Math.abs((u % 6) - 3) % 4,
  // a diamond inside a diamond
  (u, v, c) => {
    const d = Math.abs(u - c) + Math.abs(v - c);
    return d === 2 || d === 5;
  },
];

const theme = () => {
  const s = getComputedStyle(document.documentElement);
  const light = matchMedia("(prefers-color-scheme: light)").matches;
  const v = (name, fall) => s.getPropertyValue(name).trim() || fall;
  return {
    light,
    dye: v("--indigo", light ? "#1f2f7a" : "#4b5fd6"),
    // undyed cotton in the dark; in the light the page already is the cloth
    paste: light ? v("--fg", "#9a9a9a") : "#ece6d9",
    // how far the dye goes, and how loud the paste is where it hasn't
    dyeMax: light ? 0.62 : 0.62,
    pasteRest: light ? 0.07 : 0.045,
    pasteLit: light ? 0 : 0.62,
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
  let paste, jitter, dye, wet, dim;
  let colors = theme();
  const drops = [];
  const pointer = { x: 0, y: 0, on: false };

  const layout = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    cols = Math.ceil(innerWidth / PITCH);
    rows = Math.ceil(innerHeight / PITCH);
    const n = cols * rows;
    paste = new Uint8Array(n);
    jitter = new Float32Array(n);
    dye = new Float32Array(n);
    wet = new Float32Array(n); // the cursor's damp trail
    dim = new Float32Array(n).fill(1);
    // centre the panel grid, so the cut edges match on both sides
    const ox = Math.floor(((cols % PANEL) - PANEL) / 2);
    const oy = Math.floor(((rows % PANEL) - PANEL) / 2);
    const inner = PANEL - 1, c = (inner - 1) / 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const gx = x - ox, gy = y - oy;
        const px = Math.floor(gx / PANEL), py = Math.floor(gy / PANEL);
        const u = gx - px * PANEL, v = gy - py * PANEL;
        const i = y * cols + x;
        // smooth value noise would be nicer; per-cell jitter is what makes
        // the soak's edge look like it bled into the weave
        jitter[i] = hash(x, y, 7);
        if (u === inner || v === inner) {
          // the panel borders, dashed where the paste ran thin
          paste[i] = hash(x, y, 3) > 0.12 ? 1 : 0;
          continue;
        }
        const motif = MOTIFS[Math.floor(hash(px, py, 11) * MOTIFS.length)];
        paste[i] = motif(u, v, c) ? 1 : 0;
      }
    }
    measure();
  };

  // the text keeps its own patch of plain cloth: dye and paste both fade
  // to almost nothing near it, so nothing ever sits loud behind a word
  const measure = () => {
    if (!dim) return;
    dim.fill(1);
    const pad = 3 * PITCH;
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
          const d = Math.hypot(
            Math.max(r.left - cx, 0, cx - r.right),
            Math.max(r.top - cy, 0, cy - r.bottom),
          );
          const i = y * cols + x;
          dim[i] = Math.min(dim[i], 0.12 + 0.88 * smooth(0, pad, d));
        }
      }
    }
  };

  const soak = (t) => {
    dye.fill(0);
    for (let k = drops.length - 1; k >= 0; k--) {
      const d = drops[k];
      const age = t - d.born;
      if (age > LIFE) {
        drops.splice(k, 1);
        continue;
      }
      // fast at first, then the cloth slows it down
      const r = still.matches ? d.reach : d.reach * (1 - Math.exp(-age * 1.3));
      const fade = still.matches ? 1 : 1 - smooth(LIFE - 8, LIFE, age);
      const span = d.reach + 3;
      const x0 = Math.max(0, Math.floor(d.x - span)), x1 = Math.min(cols - 1, Math.ceil(d.x + span));
      const y0 = Math.max(0, Math.floor(d.y - span)), y1 = Math.min(rows - 1, Math.ceil(d.y + span));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = y * cols + x;
          // the weave pulls dye further one way than the other
          const dist = Math.hypot((x + 0.5 - d.x) * d.sx, (y + 0.5 - d.y) * d.sy);
          const edge = r - dist + (jitter[i] - 0.5) * 3.2;
          if (edge <= 0) continue;
          // a darker tide line where the wet front has just arrived
          const tide = edge < 1.4 && r < d.reach * 0.97 ? 1.18 : 1;
          const v = d.strength * Math.min(1, edge / 1.2) * tide * fade;
          if (v > dye[i]) dye[i] = v;
        }
      }
    }
    // the cursor's damp trail: deposit, then let it dry
    if (pointer.on) {
      const px = Math.floor(pointer.x), py = Math.floor(pointer.y);
      for (let y = py - 1; y <= py + 1; y++) {
        for (let x = px - 1; x <= px + 1; x++) {
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
          const i = y * cols + x;
          wet[i] = Math.min(0.32, wet[i] + 0.05);
        }
      }
    }
  };

  // bucket by colour and dye level, so fillStyle changes a dozen times a
  // frame instead of once a cell
  const buckets = Array.from({ length: (LEVELS + 1) * 2 }, () => []);
  const draw = () => {
    for (const b of buckets) b.length = 0;
    for (let i = 0; i < dye.length; i++) {
      const v = Math.max(dye[i], wet[i]);
      const level = v < 0.03 ? 0 : Math.min(LEVELS, Math.ceil(v * LEVELS));
      if (paste[i]) buckets[LEVELS + 1 + level].push(i);
      else if (level) buckets[level].push(i);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const size = PITCH - GAP;
    const fill = (list, alpha) => {
      for (const i of list) {
        ctx.globalAlpha = alpha * dim[i];
        ctx.fillRect((i % cols) * PITCH, ((i / cols) | 0) * PITCH, size, size);
      }
    };
    // the dyed ground
    ctx.fillStyle = colors.dye;
    for (let l = 1; l <= LEVELS; l++) fill(buckets[l], (l / LEVELS) * colors.dyeMax);
    // the paste: faint at rest, and in the dark it lifts pale out of the dye.
    // in the light the cloth is already pale, so the paste just stays clear
    ctx.fillStyle = colors.paste;
    for (let l = 0; l <= LEVELS; l++) {
      const lift = (l / LEVELS) * colors.pasteLit;
      fill(buckets[LEVELS + 1 + l], Math.max(colors.pasteRest * (1 - l / LEVELS), lift));
    }
    ctx.globalAlpha = 1;
  };

  const drop = (x, y, t, strength = 1) => {
    const reach = 8 + Math.random() * 9;
    const lean = 0.85 + Math.random() * 0.3;
    drops.push({ x, y, born: t, reach, strength, sx: lean, sy: 2 - lean });
    if (drops.length > 10) drops.shift();
  };

  let raf = 0, last = 0, clock = 0, nextDrip = 3, frames = 0;
  const frame = (now) => {
    const dt = clamp((now - last) / 1000, 0, 0.05) || 0.016;
    last = now;
    clock += dt;
    // a drip now and then, so the cloth isn't dead before anyone clicks
    if (clock > nextDrip) {
      drop(Math.random() * cols, Math.random() * rows, clock, 0.55);
      nextDrip = clock + 7 + Math.random() * 7;
    }
    const dry = Math.exp(-dt * 1.4);
    for (let i = 0; i < wet.length; i++) wet[i] *= dry;
    if (++frames % 20 === 0) measure();
    soak(clock);
    draw();
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    cancelAnimationFrame(raf);
    wet.fill(0);
    soak(clock);
    draw();
    if (still.matches) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  // a click on bare page drops dye; links, buttons and tiles keep theirs
  const onClick = (e) => {
    if (e.target.closest("a, button, input, textarea, select, label, figure, nav, dialog, [role=button]")) return;
    if (getSelection()?.toString()) return;
    drop(e.clientX / PITCH, e.clientY / PITCH, clock);
    if (still.matches) start();
  };
  const onMove = (e) => {
    pointer.x = e.clientX / PITCH;
    pointer.y = e.clientY / PITCH;
    pointer.on = e.pointerType === "mouse";
  };
  const onLeave = () => { pointer.on = false; };
  const onScroll = () => measure();
  const onResize = () => {
    layout();
    start();
  };
  const recolor = () => {
    colors = theme();
    if (still.matches) draw();
  };

  layout();
  start();
  addEventListener("resize", onResize);
  addEventListener("click", onClick);
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("blur", onLeave);
  document.documentElement.addEventListener("pointerleave", onLeave);
  // the page scrolls in #app as well as the window; either moves the text
  addEventListener("scroll", onScroll, { passive: true, capture: true });
  scheme.addEventListener("change", recolor);
  still.addEventListener("change", start);

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("resize", onResize);
    removeEventListener("click", onClick);
    removeEventListener("pointermove", onMove);
    removeEventListener("blur", onLeave);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    removeEventListener("scroll", onScroll, { capture: true });
    scheme.removeEventListener("change", recolor);
    still.removeEventListener("change", start);
    canvas.remove();
  };
}
