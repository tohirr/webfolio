// an arcade cabinet's attract mode behind the page: a small ship hunts a
// loose swarm of aliens, dodging what they spit back. it plays itself; move
// the mouse and it becomes a crosshair: the ship fires where you point and
// keeps flying (and dodging) on its own. everything
// sits on one grid of cells, sprites included, so it reads as pixels.

const PITCH = 5; // css px per cell, gap included
const GAP = 1;
const TAU = Math.PI * 2;
// the game moves in ticks, like a cabinet: everything jumps a cell at a
// time a dozen times a second instead of gliding, and the whole world runs
// slower than real time. it's also a fraction of the drawing work
const TICK = 1 / 12; // seconds between ticks
const PACE = 0.6; // game seconds per real second

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// sprites as strings, # for a lit cell. the ship points up and is turned
// by sampling, the aliens stay upright and flap between two frames
const sprite = (rows) => {
  const cells = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => c === "#" && cells.push([x, y])));
  return { cells, w: rows[0].length, h: rows.length };
};

const SHIP = sprite([
  "...#...",
  "..###..",
  "..#.#..",
  ".#####.",
  "###.###",
  "#.#.#.#",
]);

const ALIENS = [
  // jelly: a dome trailing tendrils
  [
    sprite(["..###..", ".#####.", "##.#.##", "#######", ".#.#.#.", "#.#.#.#"]),
    sprite(["..###..", ".#####.", "##.#.##", "#######", "#.#.#.#", ".#.#.#."]),
  ],
  // mite: a body on spindly legs
  [
    sprite(["#.....#", ".#.#.#.", "..###..", ".##.##.", "..###..", ".#...#."]),
    sprite([".#...#.", ".#.#.#.", "..###..", ".##.##.", "..###..", "#.....#"]),
  ],
  // eye: a ring that looks around
  [
    sprite(["..###..", ".#...#.", "#..#..#", "#.###.#", "#..#..#", ".#...#.", "..###.."]),
    sprite(["..###..", ".#...#.", "#...#.#", "#..####", "#...#.#", ".#...#.", "..###.."]),
  ],
];
const POINTS = [10, 20, 30];

const theme = () => {
  const s = getComputedStyle(document.documentElement);
  const light = matchMedia("(prefers-color-scheme: light)").matches;
  const v = (name, fall) => s.getPropertyValue(name).trim() || fall;
  return {
    ship: v("--ink", light ? "#000" : "#fff"),
    star: v("--fg", "#8f8f8f"),
    aliens: [v("--green", "#4ade80"), v("--amber", "#f59e0b"), v("--blue", "#60a5fa")],
    shot: v("--amber", "#f59e0b"),
    alpha: light ? 0.5 : 0.55,
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

  let cols = 0, rows = 0, dpr = 1, dim;
  let colors = theme();
  let stars = [], aliens = [], shots = [], spit = [], debris = [];
  let score = 0, clock = 0;
  let blocked = []; // the tiles, in cells: opaque, so the fight keeps off them
  let covered = false; // the tiles fill the screen, so there's nothing to watch
  const ship = { x: 0, y: 0, vx: 0, vy: 0, a: -Math.PI / 2, cool: 0, dead: 0, safe: 0, orbit: 0 };
  const pointer = { x: 0, y: 0, at: -Infinity };

  const open = (x, y) => !blocked.some((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);
  // somewhere in the open, away from the tiles
  const spot = () => {
    let x = 0, y = 0;
    for (let i = 0; i < 12; i++) {
      x = rand(0.06, 0.94) * cols;
      y = rand(0.06, 0.94) * rows;
      if (open(x, y)) break;
    }
    return [x, y];
  };

  const spawnAlien = (inside = false) => {
    const kind = Math.floor(Math.random() * 3);
    const [hx, hy] = spot();
    let x = hx, y = hy;
    if (!inside) {
      // enter from a random edge, a little outside it
      const side = Math.floor(Math.random() * 4);
      x = side === 0 ? -6 : side === 1 ? cols + 6 : rand(0, cols);
      y = side === 2 ? -6 : side === 3 ? rows + 6 : rand(0, rows);
    }
    aliens.push({
      kind, x, y, vx: 0, vy: 0, hx, hy,
      seed: rand(0, 100),
      fire: rand(1.5, 4),
      // each wanders around a home point it gives up now and then
      move: rand(5, 10),
    });
  };

  const want = () => clamp(Math.round((innerWidth * innerHeight) / 80000), 6, 14);

  const layout = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    cols = Math.ceil(innerWidth / PITCH);
    rows = Math.ceil(innerHeight / PITCH);
    dim = new Float32Array(cols * rows).fill(1);
    stars = Array.from({ length: Math.round((cols * rows) / 260) }, () => ({
      x: rand(0, cols), y: rand(0, rows), z: rand(0.2, 1),
    }));
    measure();
    if (!aliens.length) {
      [ship.x, ship.y] = spot();
      for (let i = 0; i < want(); i++) spawnAlien(i % 2 === 0);
    }
  };

  // the text keeps a quiet patch: anything flying behind a word fades down
  const measure = () => {
    if (!dim) return;
    dim.fill(1);
    blocked = [...document.querySelectorAll(".tile")].map((el) => {
      const r = el.getBoundingClientRect();
      return { x0: r.left / PITCH - 4, x1: r.right / PITCH + 4, y0: r.top / PITCH - 4, y1: r.bottom / PITCH + 4 };
    }).filter((b) => b.x1 > 0 && b.x0 < cols && b.y1 > 0 && b.y0 < rows);
    // how much of the screen the tiles hide; on a phone's card feed it's
    // nearly all of it, and the game stops until the page scrolls back
    let hid = 0;
    for (const el of document.querySelectorAll(".tile")) {
      const r = el.getBoundingClientRect();
      const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      if (w > 0 && h > 0) hid += w * h;
    }
    covered = hid > innerWidth * innerHeight * 0.75;
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
          dim[i] = Math.min(dim[i], 0.15 + 0.85 * smooth(0, pad, d));
        }
      }
    }
  };

  const burst = (x, y, cells, color, power) => {
    for (const [cx, cy] of cells) {
      const a = Math.atan2(cy, cx) + rand(-0.5, 0.5);
      const s = rand(4, 14) * power;
      debris.push({ x: x + cx, y: y + cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.5, 1.1), age: 0, color });
    }
  };

  const nearest = () => {
    let best = null, bd = Infinity;
    for (const al of aliens) {
      const d = Math.hypot(al.x - ship.x, al.y - ship.y);
      if (d < bd && al.x > 0 && al.x < cols && al.y > 0 && al.y < rows) { bd = d; best = al; }
    }
    return best;
  };

  const step = (dt) => {
    clock += dt;
    for (const s of stars) {
      s.y += s.z * 1.5 * dt;
      if (s.y > rows) { s.y = 0; s.x = rand(0, cols); }
    }

    // ---- the swarm
    for (const al of aliens) {
      const t = clock + al.seed;
      al.move -= dt;
      if (al.move <= 0) {
        [al.hx, al.hy] = spot();
        al.move = rand(6, 12);
      }
      const hx = al.hx + Math.sin(t * 0.23) * 10;
      const hy = al.hy + Math.cos(t * 0.19) * 6;
      al.vx += ((hx - al.x) * 0.25 + Math.sin(t * 1.3) * 3 - al.vx) * Math.min(1, dt * 1.5);
      al.vy += ((hy - al.y) * 0.25 + Math.cos(t * 1.1) * 2 - al.vy) * Math.min(1, dt * 1.5);
      const sp = Math.hypot(al.vx, al.vy), max = 9;
      if (sp > max) { al.vx *= max / sp; al.vy *= max / sp; }
      al.x += al.vx * dt;
      al.y += al.vy * dt;
      al.fire -= dt;
      if (al.fire <= 0 && !ship.dead) {
        al.fire = rand(2.5, 6);
        const d = Math.hypot(ship.x - al.x, ship.y - al.y);
        if (d < 90) {
          const a = Math.atan2(ship.y - al.y, ship.x - al.x) + rand(-0.12, 0.12);
          spit.push({ x: al.x, y: al.y, vx: Math.cos(a) * 16, vy: Math.sin(a) * 16, age: 0 });
        }
      }
    }
    if (aliens.length < want() && Math.random() < dt * 0.9) spawnAlien();

    // ---- the ship
    if (ship.dead) {
      ship.dead -= dt;
      if (ship.dead <= 0) {
        ship.dead = 0;
        [ship.x, ship.y] = spot();
        ship.vx = 0;
        ship.vy = 0;
        ship.safe = 2;
      }
    } else {
      ship.safe = Math.max(0, ship.safe - dt);
      const target = nearest();
      const manned = clock - pointer.at < 2.5;
      let gx, gy;
      if (manned) {
        // someone's aiming: hold a firing distance from the crosshair,
        // drifting round it so the ship never sits still in the line of fire
        const dx = ship.x - pointer.x, dy = ship.y - pointer.y;
        const d = Math.hypot(dx, dy) || 1;
        const r = 30;
        gx = pointer.x + (dx / d) * r - (dy / d) * 6;
        gy = pointer.y + (dy / d) * r + (dx / d) * 6;
        if (!open(gx, gy)) {
          gx = pointer.x - (dx / d) * r;
          gy = pointer.y - (dy / d) * r;
        }
      } else if (target) {
        // circle the target at a respectful range, on whichever side is open
        ship.orbit += dt * 0.5;
        const r = 24;
        for (let k = 0; k < 4; k++) {
          const a = ship.orbit + (k * Math.PI) / 2;
          gx = target.x + Math.cos(a) * r;
          gy = target.y + Math.sin(a) * r;
          if (open(gx, gy)) break;
        }
      } else {
        gx = cols / 2;
        gy = rows * 0.7;
      }
      let ax = (gx - ship.x) * 1.6 - ship.vx * 1.4;
      let ay = (gy - ship.y) * 1.6 - ship.vy * 1.4;
      // dodge: sidestep anything headed this way
      for (const b of spit) {
        const dx = ship.x - b.x, dy = ship.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d > 14 || dx * b.vx + dy * b.vy < 0) continue;
        const side = b.vx * dy - b.vy * dx > 0 ? 1 : -1;
        const push = (1 - d / 14) * 180;
        ax += (-b.vy / 16) * side * push;
        ay += (b.vx / 16) * side * push;
      }
      ship.vx += ax * dt;
      ship.vy += ay * dt;
      const sp = Math.hypot(ship.vx, ship.vy), max = 30;
      if (sp > max) { ship.vx *= max / sp; ship.vy *= max / sp; }
      ship.x = clamp(ship.x + ship.vx * dt, 2, cols - 2);
      ship.y = clamp(ship.y + ship.vy * dt, 2, rows - 2);

      // what to shoot at: the crosshair when someone's aiming, with a nudge
      // onto any alien close to it; otherwise the nearest alien
      let mark = null;
      if (manned) {
        mark = { x: pointer.x, y: pointer.y, vx: 0, vy: 0 };
        let bd = 9;
        for (const al of aliens) {
          const d = Math.hypot(al.x - pointer.x, al.y - pointer.y);
          if (d < bd) { bd = d; mark = al; }
        }
      } else if (target) {
        mark = target;
      }
      ship.cool -= dt;
      if (mark) {
        const lead = Math.hypot(mark.x - ship.x, mark.y - ship.y) / 60;
        const aim = Math.atan2(mark.y + mark.vy * lead - ship.y, mark.x + mark.vx * lead - ship.x);
        const turn = (manned ? 12 : 5) * dt;
        ship.a += clamp(wrap(aim - ship.a), -turn, turn);
        // aiming fires steadily; the autopilot waits until it's lined up
        const lined = Math.abs(wrap(aim - ship.a)) < (manned ? 0.3 : 0.12);
        const near = manned || Math.hypot(mark.x - ship.x, mark.y - ship.y) < 70;
        if (ship.cool <= 0 && lined && near) {
          ship.cool = manned ? 0.18 : 0.28;
          shots.push({ x: ship.x + Math.cos(ship.a) * 4, y: ship.y + Math.sin(ship.a) * 4, vx: Math.cos(ship.a) * 60, vy: Math.sin(ship.a) * 60, age: 0 });
        }
      }
    }

    // ---- shots
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.age += dt;
      let hit = false;
      for (let k = aliens.length - 1; k >= 0; k--) {
        const al = aliens[k];
        if (Math.abs(s.x - al.x) < 3.6 && Math.abs(s.y - al.y) < 3.6) {
          const spr = ALIENS[al.kind][0];
          burst(al.x, al.y, spr.cells.map(([x, y]) => [x - spr.w / 2, y - spr.h / 2]), colors.aliens[al.kind], 1);
          score += POINTS[al.kind];
          aliens.splice(k, 1);
          hit = true;
          break;
        }
      }
      if (hit || s.age > 1.4) shots.splice(i, 1);
    }
    for (let i = spit.length - 1; i >= 0; i--) {
      const b = spit[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.age += dt;
      if (!ship.dead && !ship.safe && Math.hypot(b.x - ship.x, b.y - ship.y) < 2.4) {
        burst(ship.x, ship.y, SHIP.cells.map(([x, y]) => [x - 3, y - 3]), colors.ship, 1.4);
        ship.dead = 2.5;
        spit.splice(i, 1);
        continue;
      }
      if (b.age > 6) spit.splice(i, 1);
    }
    for (let i = debris.length - 1; i >= 0; i--) {
      const p = debris[i];
      p.age += dt;
      p.vx *= Math.exp(-dt * 2.5);
      p.vy *= Math.exp(-dt * 2.5);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age > p.life) debris.splice(i, 1);
    }
  };

  // ---- drawing: every mark is one cell, faded near the text
  const size = PITCH - GAP;
  const cell = (x, y, alpha) => {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
    ctx.globalAlpha = alpha * dim[cy * cols + cx];
    ctx.fillRect(cx * PITCH, cy * PITCH, size, size);
  };

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const A = colors.alpha;

    ctx.fillStyle = colors.star;
    for (const s of stars) cell(s.x, s.y, A * 0.35 * s.z);

    const frame = Math.floor(clock * 2.5) % 2;
    for (const al of aliens) {
      const spr = ALIENS[al.kind][frame];
      const ox = Math.round(al.x - spr.w / 2), oy = Math.round(al.y - spr.h / 2);
      ctx.fillStyle = colors.aliens[al.kind];
      for (const [x, y] of spr.cells) cell(ox + x, oy + y, A);
    }

    if (!ship.dead && !(ship.safe && Math.floor(clock * 10) % 2)) {
      // turn the sprite in 16 steps, sampling back into it cell by cell
      const r = Math.round((ship.a + Math.PI / 2) / (TAU / 16)) * (TAU / 16);
      const c = Math.cos(-r), s = Math.sin(-r);
      const cx = Math.round(ship.x), cy = Math.round(ship.y);
      ctx.fillStyle = colors.ship;
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const sx = Math.round(dx * c - dy * s + 3);
          const sy = Math.round(dx * s + dy * c + 3);
          if (sy < 0 || sy >= SHIP.h || sx < 0 || sx >= SHIP.w) continue;
          if (SHIP_ROWS[sy][sx]) cell(cx + dx, cy + dy, A * 1.1);
        }
      }
      // a flicker of thrust behind
      if (Math.random() < 0.7) {
        ctx.fillStyle = colors.shot;
        cell(ship.x - Math.cos(ship.a) * 5, ship.y - Math.sin(ship.a) * 5, A * 0.8);
      }
    }

    ctx.fillStyle = colors.ship;
    for (const sh of shots) {
      cell(sh.x, sh.y, A * 1.2);
      cell(sh.x - sh.vx / 60, sh.y - sh.vy / 60, A * 0.6);
    }
    ctx.fillStyle = colors.shot;
    for (const b of spit) cell(b.x, b.y, A * (Math.floor(b.age * 8) % 2 ? 1.2 : 0.7));

    for (const p of debris) {
      ctx.fillStyle = p.color;
      cell(p.x, p.y, A * (1 - p.age / p.life));
    }

    // the crosshair: four cells round a gap, only while someone's aiming
    const idle = clock - pointer.at;
    if (idle < 2.5 && !ship.dead) {
      const fade = 1 - smooth(1.8, 2.5, idle);
      const px = Math.floor(pointer.x), py = Math.floor(pointer.y);
      ctx.fillStyle = colors.ship;
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-3, 0], [3, 0], [0, -3], [0, 3]]) {
        const cx = px + dx, cy = py + dy;
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
        // full strength even over text: it's the viewer's own pointer
        ctx.globalAlpha = A * 0.9 * fade;
        ctx.fillRect(cx * PITCH, cy * PITCH, size, size);
      }
    }

    // the score, quiet in the bottom corner
    ctx.globalAlpha = A * 0.7;
    ctx.fillStyle = colors.star;
    ctx.font = "500 11px ui-monospace, 'SF Mono', Menlo, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`score ${String(score).padStart(6, "0")}`, innerWidth - 16, innerHeight - 14);
    ctx.globalAlpha = 1;
  };

  let raf = 0, last = 0, acc = 0, ticks = 0, running = false, recheck = 0;
  const frame = (now) => {
    if (covered) {
      // nothing on show: clear the last frame out of the gaps, stop, and
      // look again in a moment (a scroll looks straight away)
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      clearTimeout(recheck);
      recheck = setTimeout(() => { measure(); run(); }, 500);
      return;
    }
    raf = requestAnimationFrame(frame);
    acc += clamp((now - last) / 1000, 0, 0.25);
    last = now;
    if (acc < TICK) return;
    // one tick per frame at most; a stall is skipped, not caught up
    acc = acc > TICK * 3 ? 0 : acc - TICK;
    step(TICK * PACE);
    if (++ticks % 6 === 0) measure();
    draw();
  };

  const run = () => {
    if (running || covered || still.matches) return;
    running = true;
    last = performance.now();
    acc = TICK; // draw on the first frame
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    cancelAnimationFrame(raf);
    running = false;
    if (still.matches) {
      // one still from a few seconds in, so there's a scene to look at
      if (clock < 3) for (let i = 0; i < 36; i++) step(TICK * PACE);
      draw();
      return;
    }
    run();
  };

  const onMove = (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = e.clientX / PITCH;
    pointer.y = e.clientY / PITCH;
    pointer.at = clock;
  };
  const onLeave = () => { pointer.at = -Infinity; };
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
    if (still.matches) draw();
  };

  layout();
  start();
  addEventListener("resize", onResize);
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("blur", onLeave);
  document.documentElement.addEventListener("pointerleave", onLeave);
  addEventListener("scroll", onScroll, { passive: true, capture: true });
  scheme.addEventListener("change", recolor);
  still.addEventListener("change", start);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(recheck);
    removeEventListener("resize", onResize);
    removeEventListener("pointermove", onMove);
    removeEventListener("blur", onLeave);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    removeEventListener("scroll", onScroll, { capture: true });
    scheme.removeEventListener("change", recolor);
    still.removeEventListener("change", start);
    canvas.remove();
  };
}

// the ship's cells as a lookup, for the turned sampling
const SHIP_ROWS = Array.from({ length: SHIP.h }, (_, y) =>
  Array.from({ length: SHIP.w }, (_, x) => SHIP.cells.some(([cx, cy]) => cx === x && cy === y)),
);
