/* lab/dot-raster — a software 3d pipeline whose framebuffer is a coarse
   dot grid. meshes are rotated, flat-shaded and rasterized in plain js at
   ~40×48 cells; every cell becomes a dot whose radius carries the light,
   like a hardware dot display. three taps of the pipeline are exposed:
   shaded dots, hidden-line wireframe (faces fill the depth buffer, edges
   draw with a bias), and 1-bit ordered dither. drag to spin, click to
   step the pipeline. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- camera + light ------------------------------------------------------ */

const D = 4.0; // camera distance
const FOC = 3.3; // focal length
const RESUME_MS = 3000; // idle time before the ambient tumble returns
const WIRE_BIAS = 0.08; // pulls edges off the faces they sit on

// light from upper-left-front, in view space
const LLEN = Math.hypot(0.5, 0.65, 0.9);
const LX = -0.5 / LLEN, LY = 0.65 / LLEN, LZ = 0.9 / LLEN;

// bayer 4×4 thresholds for the 1-bit tap
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/* ---- meshes -------------------------------------------------------------- */

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* windings vary by construction, so each mesh ships an "outward" hint and
   triangles are flipped until cross(b-a, c-a) agrees with it — the shader
   normal is then trustworthy without hand-checking 500 index triples */
function buildMesh(verts, tris, outwardAt) {
  for (const t of tris) {
    const a = verts[t[0]], b = verts[t[1]], c = verts[t[2]];
    const n = cross3(sub3(b, a), sub3(c, a));
    const ctr = [
      (a[0] + b[0] + c[0]) / 3,
      (a[1] + b[1] + c[1]) / 3,
      (a[2] + b[2] + c[2]) / 3,
    ];
    if (dot3(n, outwardAt(ctr)) < 0) {
      const k = t[1];
      t[1] = t[2];
      t[2] = k;
    }
  }
  const seen = new Set();
  const edges = [];
  for (const [a, b, c] of tris)
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const key = i < j ? i * 4096 + j : j * 4096 + i;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([i, j]);
      }
    }
  return {
    verts,
    tris,
    edges,
    rv: new Float32Array(verts.length * 3), // rotated view space
    pv: new Float32Array(verts.length * 3), // projected grid space + depth
  };
}

function torus() {
  // coarse on purpose: at ~30 cells across, a fine mesh reads as noise
  const R = 0.78, r = 0.34, NU = 18, NV = 10;
  const verts = [];
  for (let iu = 0; iu < NU; iu++)
    for (let iv = 0; iv < NV; iv++) {
      const u = (iu / NU) * Math.PI * 2;
      const v = (iv / NV) * Math.PI * 2;
      const w = R + r * Math.cos(v);
      verts.push([w * Math.cos(u), r * Math.sin(v), w * Math.sin(u)]);
    }
  const tris = [];
  const at = (iu, iv) => (iu % NU) * NV + (iv % NV);
  for (let iu = 0; iu < NU; iu++)
    for (let iv = 0; iv < NV; iv++) {
      const a = at(iu, iv), b = at(iu + 1, iv);
      const c = at(iu + 1, iv + 1), d = at(iu, iv + 1);
      tris.push([a, b, c], [a, c, d]);
    }
  // outward = away from the tube's ring, not the origin
  return buildMesh(verts, tris, (p) => {
    const m = Math.hypot(p[0], p[2]) || 1;
    return [p[0] - (R * p[0]) / m, p[1], p[2] - (R * p[2]) / m];
  });
}

function cube() {
  const h = 0.62;
  const verts = [];
  for (let i = 0; i < 8; i++)
    verts.push([i & 1 ? h : -h, i & 2 ? h : -h, i & 4 ? h : -h]);
  const quads = [
    [0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4],
    [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6],
  ];
  const tris = [];
  for (const [a, b, c, d] of quads) tris.push([a, b, c], [a, c, d]);
  return buildMesh(verts, tris, (p) => p);
}

function icosa() {
  const t = (1 + Math.sqrt(5)) / 2;
  const s = 1.0 / Math.hypot(1, t);
  const verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((v) => [v[0] * s, v[1] * s, v[2] * s]);
  const tris = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  return buildMesh(verts, tris, (p) => p);
}

/* ---- module -------------------------------------------------------------- */

const MODES = ["dots", "wire", "1bit"];

export function mount(el) {
  el.innerHTML =
    `<style>
.dr-stage{width:100%;max-width:420px;aspect-ratio:1;margin:0 auto;touch-action:none;cursor:grab}
.dr-stage:active{cursor:grabbing}
.dr-stage canvas{width:100%;height:100%;display:block}
.dr-row{display:flex;flex-wrap:wrap;gap:.5em 1.2em;align-items:center;justify-content:center;margin-top:1em}
.dr-row button{font:inherit;letter-spacing:inherit;color:var(--dim);background:transparent;border:1px solid var(--dim);padding:.25em .7em;cursor:pointer}
.dr-row button:hover{color:var(--fg)}
.dr-row button.on{color:var(--ink);border-color:var(--green)}
.dr-row label{display:flex;align-items:center;gap:.5em;color:var(--dim)}
.dr-row input[type=range]{width:90px;accent-color:var(--green)}
.dr-row output{color:var(--fg);min-width:2.5ch;font-variant-numeric:tabular-nums}
.dr-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
</style>` +
    '<div class="dr-stage"><canvas></canvas></div>' +
    '<div class="dr-row">' +
    '<span>' +
    MODES.map((m, i) =>
      `<button data-mode="${m}"${i === 0 ? ' class="on"' : ""}>${m}</button>`,
    ).join("") +
    "</span>" +
    "<span>" +
    ["torus", "cube", "gem"]
      .map((m, i) => `<button data-mesh="${i}"${i === 0 ? ' class="on"' : ""}>${m}</button>`)
      .join("") +
    "</span>" +
    '<label>px <input type="range" min="6" max="22" value="11" data-p="px"><output>11</output></label>' +
    "</div>" +
    '<p class="dr-cap">drag to spin · click to step the pipeline: dots → wire → 1-bit</p>';

  const stage = el.querySelector(".dr-stage");
  const canvas = el.querySelector("canvas");
  const ctx = canvas.getContext("2d");

  const meshes = [torus(), cube(), icosa()];
  let mesh = meshes[0];
  let mode = "dots";
  const params = { px: 11 };

  /* theme colors resolved from the css vars, refreshed on scheme flips */
  let ink = "#fff", dim = "#777";
  const readColors = () => {
    const cs = getComputedStyle(el);
    ink = cs.getPropertyValue("--ink").trim() || ink;
    dim = cs.getPropertyValue("--dim").trim() || dim;
  };
  readColors();
  const mq = matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", readColors);

  /* ---- controls ---------------------------------------------------------- */

  const syncButtons = () => {
    for (const b of el.querySelectorAll("[data-mode]"))
      b.classList.toggle("on", b.dataset.mode === mode);
    for (const b of el.querySelectorAll("[data-mesh]"))
      b.classList.toggle("on", meshes[+b.dataset.mesh] === mesh);
  };
  el.querySelector(".dr-row").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.mode) mode = b.dataset.mode;
    if (b.dataset.mesh) mesh = meshes[+b.dataset.mesh];
    syncButtons();
  });
  const slider = el.querySelector("[data-p=px]");
  slider.addEventListener("input", () => {
    params.px = +slider.value;
    slider.nextElementSibling.textContent = slider.value;
  });

  /* ---- spin: drag + inertia + ambient tumble ----------------------------- */

  let rx = 0.55, ry = -0.6;
  let vrx = 0, vry = 0;
  let dragging = false, moved = 0, lx = 0, ly = 0, lt = 0;
  let lastUser = -1e9;
  let amb = 0;

  stage.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = 0;
    lx = e.clientX;
    ly = e.clientY;
    lt = e.timeStamp;
    vrx = vry = 0;
    lastUser = performance.now();
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    moved += Math.abs(dx) + Math.abs(dy);
    ry += dx * 0.009;
    rx += dy * 0.009;
    const dt = Math.max((e.timeStamp - lt) / 1000, 0.008);
    vry = (dx * 0.009) / dt;
    vrx = (dy * 0.009) / dt;
    lx = e.clientX;
    ly = e.clientY;
    lt = e.timeStamp;
    lastUser = performance.now();
  });
  stage.addEventListener("pointerup", () => {
    dragging = false;
    lastUser = performance.now();
    if (moved < 6) {
      // a clean tap steps the pipeline
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      syncButtons();
      vrx = vry = 0;
    } else if (reduceMotion) {
      vrx = vry = 0;
    }
  });
  stage.addEventListener("pointercancel", () => {
    dragging = false;
  });

  /* ---- rasterizer --------------------------------------------------------- */

  let gw = 0, gh = 0;
  let depthB = new Float32Array(0);
  let lumB = new Float32Array(0);

  const fillTri = (i0, i1, i2, lum, writeLum) => {
    const ax = mesh.pv[i0 * 3], ay = mesh.pv[i0 * 3 + 1], az = mesh.pv[i0 * 3 + 2];
    const bx = mesh.pv[i1 * 3], by = mesh.pv[i1 * 3 + 1], bz = mesh.pv[i1 * 3 + 2];
    const cx = mesh.pv[i2 * 3], cy = mesh.pv[i2 * 3 + 1], cz = mesh.pv[i2 * 3 + 2];
    let area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-6) return;
    const s = area > 0 ? 1 : -1;
    area *= s;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const x1 = Math.min(gw - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const y1 = Math.min(gh - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const w0 = ((cx - bx) * (y - by) - (cy - by) * (x - bx)) * s;
        if (w0 < 0) continue;
        const w1 = ((ax - cx) * (y - cy) - (ay - cy) * (x - cx)) * s;
        if (w1 < 0) continue;
        const w2 = area - w0 - w1;
        if (w2 < 0) continue;
        const z = (w0 * az + w1 * bz + w2 * cz) / area;
        const idx = y * gw + x;
        if (z < depthB[idx]) {
          depthB[idx] = z;
          if (writeLum) lumB[idx] = lum;
        }
      }
  };

  // depth-fogged edge: nearer segments draw brighter
  const fog = (z) => Math.max(0.15, Math.min(1, 0.25 + ((D + 1.2 - z) / 2.4) * 0.75));

  const line = (i0, i1) => {
    const ax = mesh.pv[i0 * 3], ay = mesh.pv[i0 * 3 + 1], az = mesh.pv[i0 * 3 + 2];
    const bx = mesh.pv[i1 * 3], by = mesh.pv[i1 * 3 + 1], bz = mesh.pv[i1 * 3 + 2];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1) | 0;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const x = Math.round(ax + (bx - ax) * t);
      const y = Math.round(ay + (by - ay) * t);
      if (x < 0 || x >= gw || y < 0 || y >= gh) continue;
      const z = az + (bz - az) * t - WIRE_BIAS;
      const idx = y * gw + x;
      if (z <= depthB[idx]) {
        const l = fog(z);
        if (l > lumB[idx]) lumB[idx] = l;
      }
    }
  };

  const render = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const cell = params.px * dpr;
    gw = Math.max(2, Math.floor(w / cell));
    gh = Math.max(2, Math.floor(h / cell));
    if (depthB.length !== gw * gh) {
      depthB = new Float32Array(gw * gh);
      lumB = new Float32Array(gw * gh);
    }
    depthB.fill(1e9);
    lumB.fill(-1);

    /* transform + project every vertex */
    const cxr = Math.cos(rx), sxr = Math.sin(rx);
    const cyr = Math.cos(ry), syr = Math.sin(ry);
    const SC = Math.min(gw, gh) * 0.42;
    const { verts, rv, pv } = mesh;
    for (let i = 0; i < verts.length; i++) {
      const [x, y, z] = verts[i];
      const x1 = x * cyr + z * syr;
      const z1 = -x * syr + z * cyr;
      const y2 = y * cxr - z1 * sxr;
      const z2 = y * sxr + z1 * cxr;
      rv[i * 3] = x1;
      rv[i * 3 + 1] = y2;
      rv[i * 3 + 2] = z2;
      const pers = FOC / (D - z2);
      pv[i * 3] = gw * 0.5 + x1 * pers * SC;
      pv[i * 3 + 1] = gh * 0.5 - y2 * pers * SC;
      pv[i * 3 + 2] = D - z2;
    }

    /* faces: shaded in dots/1bit, depth-only in wire (hidden-line removal) */
    const wire = mode === "wire";
    for (const [a, b, c] of mesh.tris) {
      let lum = 0;
      if (!wire) {
        const e1x = rv[b * 3] - rv[a * 3];
        const e1y = rv[b * 3 + 1] - rv[a * 3 + 1];
        const e1z = rv[b * 3 + 2] - rv[a * 3 + 2];
        const e2x = rv[c * 3] - rv[a * 3];
        const e2y = rv[c * 3 + 1] - rv[a * 3 + 1];
        const e2z = rv[c * 3 + 2] - rv[a * 3 + 2];
        const nx = e1y * e2z - e1z * e2y;
        const ny = e1z * e2x - e1x * e2z;
        const nz = e1x * e2y - e1y * e2x;
        const nl = Math.hypot(nx, ny, nz) || 1;
        const ndl = (nx * LX + ny * LY + nz * LZ) / nl;
        lum = 0.1 + 0.9 * Math.max(0, ndl);
      }
      fillTri(a, b, c, lum, !wire);
    }
    if (wire) for (const [a, b] of mesh.edges) line(a, b);

    /* the framebuffer becomes dots — one path per color pass */
    ctx.clearRect(0, 0, w, h);
    const ox = (w - gw * cell) / 2;
    const oy = (h - gh * cell) / 2;
    const base = new Path2D();
    const lit = new Path2D();
    const baseR = cell * 0.09;
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const l = lumB[y * gw + x];
        const px = ox + (x + 0.5) * cell;
        const py = oy + (y + 0.5) * cell;
        let r = 0;
        if (mode === "1bit") {
          if (l > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16) r = cell * 0.3;
        } else if (l >= 0) {
          r = mode === "wire"
            ? cell * (0.1 + 0.22 * l) // finer, so edges read as lines
            : cell * (0.12 + 0.32 * Math.pow(l, 0.75));
        }
        if (r > 0) {
          lit.moveTo(px + r, py);
          lit.arc(px, py, r, 0, Math.PI * 2);
        } else {
          base.moveTo(px + baseR, py);
          base.arc(px, py, baseR, 0, Math.PI * 2);
        }
      }
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = dim;
    ctx.fill(base);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ink;
    ctx.fill(lit);
  };

  /* ---- loop --------------------------------------------------------------- */

  let raf = 0;
  let last = 0;
  let alive = true;

  const frame = (t) => {
    if (!alive) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    if (!dragging) {
      rx += vrx * dt;
      ry += vry * dt;
      const damp = Math.exp(-2.6 * dt);
      vrx *= damp;
      vry *= damp;
    }
    // ambient tumble swells back in after the visitor lets go
    if (!reduceMotion && !dragging && t - lastUser > RESUME_MS) {
      amb = Math.min(1, amb + dt / 2.5);
    } else {
      amb = 0;
    }
    ry += 0.42 * amb * dt;
    rx += 0.17 * amb * dt;

    render();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    mq.removeEventListener("change", readColors);
  };
}
