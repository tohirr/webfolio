/* lab/keycaps — text set as keycaps. type a line and every word becomes a
   cap (or every letter, in letters mode), up to eight caps, laid out in
   rows and shot straight from above so the caps face the screen. pick any
   cap and give it a colour, a finish — matte, gloss, clear resin, metal —
   and a font: mono, sans, serif, or pixel, the legend rasterised on a
   coarse grid and blown up with no smoothing so it reads as pixels in the
   plastic. press a cap and it travels on a stiff spring with a click.
   download renders the plate to a square png for sharing. three.js,
   physical materials, a room environment for the plastic to reflect. */

import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { audio, output } from "./audio.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const MAX = 8;              // caps
const MAX_CHARS = 48;       // characters in the line
/* the shape, in units of the cap's footprint */
const S = {
  pitch: 1.015,      // centre-to-centre spacing
  cap: 1.0,          // footprint
  h: 0.45,           // depth
  top: 0.7,          // the typing surface, as a share of the footprint
  edge: 0.1,         // corner radius of the outline
  topEdge: 0.15,     // corner radius of the typing surface
  lip: 0.035,        // the round where the wall meets the top
  recess: 0,         // depth of a dish in the typing surface — the reference is flat
  recessR: 0.78,     // the dish floor reaches this far across the surface
  recessWall: 0.2,   // how softly the floor rises to the rim
  sag: 0,            // how much the floor dips at the centre
  legend: 0.6,       // legend plate size
};
/* the look: camera and light */
const L = {
  tilt: 4,           // degrees the camera leans toward the viewer
  fov: 6,            // lens: low is long and flat, high is wide and deep
  soft: 2,           // the softbox above and to the left
  key: 2.4,          // the hard light from above and behind, which casts the shadow
  fill: 0.08,        // the low light from the front
  hemi: 0.12,        // sky/ground ambient
  env: 1,            // reflections of the studio
  exposure: 1.0,
  shadow: 0.15,      // the shadow under the caps
  glossRough: 0.2,   // the gloss finish's roughness
  matteRough: 0.35,  // the matte finish's roughness
};
const PRESS = -0.16;        // how far a press travels
const LIFT = 0.1;           // how far the picked cap floats
const SHOT = 1080;          // the download's edge, px

const SWATCHES = ["#f26a1b", "#d9d6d2", "#141414", "#2b8fd6", "#8a2bb8", "#4fd12f", "#e83f5b", "#ffd23f"];
const FINISHES = ["matte", "gloss", "clear", "metal"];
const FONTS = ["mono", "sans", "serif", "pixel"];
const MODES = ["words", "letters"];
const FACES = {
  mono: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace',
  sans: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
};

/* the plate as shipped: the first reference — orange for the two caps
   that carry the punch, warm grey for the rest */
const DEFAULT_LINE = "don\u2019t give up → do it";
const DEFAULT_MODE = "words";
const GREY = { color: "#d6d2cc", finish: "matte", font: "mono" };
const ORANGE = { color: "#f26a1b", finish: "gloss", font: "mono" };
const DEFAULT = [ORANGE, GREY, GREY, ORANGE, GREY, GREY, GREY, GREY];

/* ---- geometry ------------------------------------------------------------- */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* the dish in the typing surface, by q: 0 at the centre, 1 at the rim.
   a flat floor, a soft rise to the rim, a touch of sag in the middle */
const dishDepth = (q) => {
  const inside = 1 - smooth(S.recessR, S.recessR + S.recessWall, q);
  const sag = S.sag * Math.max(0, 1 - (q / S.recessR) ** 2);
  return S.recess * inside + sag * inside;
};

/* a rounded square's outline, hit by a ray from its centre: how far out
   the outline of half-size hs and corner radius r lies at angle a. found
   by bisection on the rounded box's distance field */
const outlineAt = (a, hs, r) => {
  const cx = Math.cos(a), sz = Math.sin(a);
  const inner = Math.max(0, hs - r);
  let lo = 0, hi = hs * 1.5;
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2;
    const px = Math.abs(cx * m) - inner, pz = Math.abs(sz * m) - inner;
    const d = Math.hypot(Math.max(px, 0), Math.max(pz, 0)) + Math.min(Math.max(px, pz), 0) - r;
    if (d < 0) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
};

/* the same the other way: for a point on the typing surface, the scale k
   of the surface's outline that passes through it — 0 at the centre, 1
   at the rim — which is what the dish is measured by */
const surfaceQ = (x, z) => {
  const topHalf = (S.cap * S.top) / 2;
  let lo = 0, hi = 1.5;
  for (let i = 0; i < 20; i++) {
    const k = (lo + hi) / 2;
    const inner = Math.max(0, topHalf * k - S.topEdge * k);
    const px = Math.abs(x) - inner, pz = Math.abs(z) - inner;
    const d = Math.hypot(Math.max(px, 0), Math.max(pz, 0)) + Math.min(Math.max(px, pz), 0) - S.topEdge * k;
    if (d > 0) lo = k; else hi = k;
  }
  return (lo + hi) / 2;
};

/* the cap's profile, bottom to top, as rounded-square rings: half-size,
   height, corner radius. a frustum: the outline at the base, flat walls
   sloping straight up to the typing surface, a small round where they
   meet the top, and the flat surface closing to the centre. no bottom
   face and no round at the base — the base edge is crisp. the corner
   radius eases from the outline's to the surface's up the wall */
function profile() {
  const { cap, h, top, edge, topEdge, lip } = S;
  const base = cap / 2, topHalf = (cap * top) / 2;
  const rings = [];
  /* the wall runs from the base corner toward the top corner; the round
     is a bezier that leaves the wall a little short of the corner and
     lands on the top a little inside it */
  const dx = topHalf - base, dy = h;
  const len = Math.hypot(dx, dy);
  const p0 = { x: topHalf - (dx / len) * lip, y: h - (dy / len) * lip }; // where the round leaves the wall
  const p2 = { x: topHalf - lip, y: h }; // where it lands on the top
  const rAt = (y) => edge + (topEdge - edge) * (y / h);
  const WALL = 10, ROUND = 10, TOP = 16;
  for (let i = 0; i <= WALL; i++) {
    const u = i / WALL;
    const x = base + (p0.x - base) * u, y = p0.y * u;
    rings.push({ hs: x, y, r: rAt(y) });
  }
  for (let i = 1; i <= ROUND; i++) {
    const t = i / ROUND, m = 1 - t;
    const x = m * m * p0.x + 2 * m * t * topHalf + t * t * p2.x;
    const y = m * m * p0.y + 2 * m * t * h + t * t * p2.y;
    rings.push({ hs: x, y, r: rAt(y) });
  }
  for (let i = 1; i <= TOP; i++) {
    const q = (1 - i / TOP) * (p2.x / topHalf); // 1 at the rim, 0 at the centre
    rings.push({ hs: Math.max(1e-4, topHalf * q), y: h - dishDepth(q), r: topEdge * q });
  }
  return rings;
}

/* the cap: the profile's rings lofted into one continuous shell, sampled
   at the same angles on every ring so the mesh runs in clean columns,
   centred on the origin with the surface at +h/2 */
function capGeometry() {
  const rings = profile();
  const N = 144;
  const pos = [];
  for (const { hs, y, r } of rings) {
    for (let j = 0; j < N; j++) {
      const a = (j / N) * Math.PI * 2;
      const d = outlineAt(a, hs, Math.min(r, hs));
      pos.push(Math.cos(a) * d, y - S.h / 2, Math.sin(a) * d);
    }
  }
  const idx = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < N; j++) {
      const a = i * N + j, b = i * N + ((j + 1) % N);
      const c = a + N, d = b + N;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* the legend plate: a fine plane laid onto the dish, a hair above it */
function legendGeometry() {
  const g = new THREE.PlaneGeometry(S.legend, S.legend, 24, 24);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, S.h / 2 - dishDepth(Math.min(1, surfaceQ(x, z))) + 0.003);
  }
  g.computeVertexNormals();
  return g;
}

/* ---- legends ---------------------------------------------------------------- */

const luma = (hex) => {
  const c = new THREE.Color(hex);
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
};

/* draws the legend to a 256² canvas, sized to fit: a letter is big, a
   word shrinks until it spans the cap. the type fonts draw it as set;
   pixel draws it on a grid nine cells tall and scales it up with
   smoothing off, so every stroke lands on a coarse grid */
function legendTexture(text, color, font) {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const ink = luma(color) > 0.6 ? "#111111" : "#f4f4f4";
  const span = S * 0.86; // the widest a legend may run
  if (text) {
    if (font === "pixel") {
      const N = 9;
      const s = document.createElement("canvas");
      const sg = s.getContext("2d");
      sg.font = `bold ${N * 1.05}px ${FACES.mono}`;
      const w = Math.max(N, Math.ceil(sg.measureText(text).width) + 2);
      s.width = w;
      s.height = N;
      sg.font = `bold ${N * 1.05}px ${FACES.mono}`;
      sg.fillStyle = ink;
      sg.textAlign = "center";
      sg.textBaseline = "middle";
      sg.fillText(text, w / 2, N / 2 + 0.5);
      /* threshold the coverage so the grid is hard */
      const im = sg.getImageData(0, 0, w, N);
      for (let i = 3; i < im.data.length; i += 4) im.data[i] = im.data[i] > 90 ? 255 : 0;
      sg.putImageData(im, 0, 0);
      g.imageSmoothingEnabled = false;
      const cell = Math.min((S * 0.8) / N, span / w);
      g.drawImage(s, (S - w * cell) / 2, (S - N * cell) / 2, w * cell, N * cell);
    } else {
      const face = FACES[font] || FACES.mono;
      let size = S * 0.5;
      g.font = `500 ${size}px ${face}`;
      const w = g.measureText(text).width;
      if (w > span) {
        size *= span / w;
        g.font = `500 ${size}px ${face}`;
      }
      g.fillStyle = ink;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, S / 2, S / 2 + size * 0.06);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---- materials ------------------------------------------------------------- */

function applyFinish(mat, color, finish) {
  const c = new THREE.Color(color);
  mat.color.copy(c);
  mat.metalness = 0;
  mat.roughness = 0.5;
  mat.clearcoat = 0;
  mat.clearcoatRoughness = 0.1;
  mat.transmission = 0;
  mat.thickness = 0;
  mat.ior = 1.5;
  mat.envMapIntensity = 0.55;
  mat.sheen = 0;
  if (finish === "gloss") {
    /* semi-gloss plastic: a soft highlight, not a mirror */
    mat.roughness = L.glossRough;
    mat.clearcoat = 0.6;
    mat.clearcoatRoughness = 0.2;
    mat.envMapIntensity = 1;
  } else if (finish === "clear") {
    /* resin: the colour lives in the attenuation, the surface is near white */
    /* translucent resin: part of the light goes through and comes back
       out steeped in the colour */
    mat.color.copy(c).lerp(new THREE.Color(0xffffff), 0.12);
    mat.transmission = 0.65;
    mat.thickness = 0.5;
    mat.roughness = 0.18;
    mat.ior = 1.45;
    mat.attenuationColor = c.clone();
    mat.attenuationDistance = 0.5;
    mat.clearcoat = 0.7;
    mat.clearcoatRoughness = 0.18;
    mat.envMapIntensity = 1;
  } else if (finish === "metal") {
    mat.metalness = 1;
    mat.roughness = 0.32;
    mat.envMapIntensity = 1;
  } else {
    mat.roughness = L.matteRough;
    mat.envMapIntensity = 1;
  }
  mat.needsUpdate = true;
}

/* ---- sound: a short plastic click ------------------------------------------- */

let ac = null;
let noise = null;
function click(down) {
  try {
    ac ??= audio();
    if (!ac) return;
    if (ac.state !== "running") ac.resume().catch(() => {});
    if (!noise) {
      noise = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noise;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = down ? 1900 : 2600;
    bp.Q.value = 1.4;
    const g = ac.createGain();
    g.gain.setValueAtTime(down ? 0.35 : 0.18, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (down ? 0.045 : 0.03));
    src.connect(bp);
    bp.connect(g);
    g.connect(output());
    src.start(t0);
    src.stop(t0 + 0.06);
    if (down) {
      /* the thock under the click */
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(190, t0);
      o.frequency.exponentialRampToValueAtTime(90, t0 + 0.05);
      const og = ac.createGain();
      og.gain.setValueAtTime(0.16, t0);
      og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      o.connect(og);
      og.connect(output());
      o.start(t0);
      o.stop(t0 + 0.08);
    }
  } catch {
    /* silent is fine */
  }
}

/* ---- the line → caps -------------------------------------------------------- */

/* words: every run of non-space is a cap. letters: every character is a
   cap, a space a blank one. eight caps at most either way */
const tokenize = (line, mode) =>
  (mode === "letters" ? [...line].map((ch) => ch.trim()) : line.split(/\s+/).filter(Boolean)).slice(0, MAX);

/* rows of caps the way the references sit: up to four in one row, then
   two rows, never wider than four */
const columnsFor = (n) => (n <= 4 ? n : Math.min(4, Math.ceil(n / 2)));

/* ---- mount ------------------------------------------------------------------ */

/* opts.editor: the workbench on /keycaps/ — one cap to start, and a drag
   orbits the cap instead of leaning it */
export function mount(el, opts = {}) {
  const editor = !!opts.editor;
  const startLine = editor ? "don\u2019t" : DEFAULT_LINE;
  el.innerHTML =
    `<style>
.kc-stage{position:relative;width:100%;max-width:560px;aspect-ratio:1;margin:0 auto;touch-action:none}
.kc-stage canvas{display:block;width:100%;height:100%;outline:none}
.kc-stage:focus-visible{outline:1.5px solid var(--ink);outline-offset:3px;border-radius:12px}
.kc-panel{max-width:560px;margin:1em auto 0;display:grid;gap:.7em}
.kc-line{display:flex;flex-wrap:wrap;align-items:center;gap:.5em .9em}
.kc-line>span:first-child{color:var(--dim);min-width:5ch}
.kc-text{font:inherit;letter-spacing:inherit;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--dim);padding:.2em 0;flex:1 1 14ch;min-width:14ch}
.kc-text:focus{outline:none;border-color:var(--ink)}
.kc-count{color:var(--dim);font-variant-numeric:tabular-nums}
.kc-sw{width:18px;height:18px;border-radius:50%;border:1px solid rgba(128,128,128,.4);padding:0;cursor:pointer;background:var(--c)}
.kc-sw[aria-pressed=true]{outline:1.5px solid var(--ink);outline-offset:2px}
.kc-pick{width:18px;height:18px;padding:0;border:1px solid var(--dim);border-radius:50%;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);cursor:pointer;-webkit-appearance:none;appearance:none;overflow:hidden}
.kc-pick::-webkit-color-swatch-wrapper{padding:0;opacity:0}
.kc-pick::-webkit-color-swatch{border:0}
.kc-seg{display:inline-flex;border:1px solid var(--dim);border-radius:6px;overflow:hidden}
.kc-seg button{font:inherit;letter-spacing:inherit;color:var(--dim);background:transparent;border:0;padding:.25em .7em;cursor:pointer}
.kc-seg button+button{border-left:1px solid var(--dim)}
.kc-seg button[aria-pressed=true]{color:var(--ink);background:var(--sel)}
.kc-btn{font:inherit;letter-spacing:inherit;color:var(--fg);background:transparent;border:1px solid var(--dim);border-radius:6px;padding:.25em .7em;cursor:pointer}
.kc-btn:hover{color:var(--ink);border-color:var(--ink)}
.kc-btn:focus-visible{outline:1.5px solid var(--ink);outline-offset:2px}
.kc-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
</style>` +
    '<div class="kc-stage" tabindex="0" role="application" aria-label="keycap configurator">' +
    "<canvas></canvas></div>" +
    '<div class="kc-panel">' +
    `<div class="kc-line"><span>text</span><input class="kc-text" type="text" maxlength="${MAX_CHARS}" spellcheck="false" autocomplete="off" aria-label="the line, set in keycaps">` +
    `<span class="kc-count"></span></div>` +
    '<div class="kc-line"><span>caps</span><span class="kc-seg" data-seg="mode"></span>' +
    '<button class="kc-btn kc-save" type="button">download png</button></div>' +
    '<div class="kc-line"><span>colour</span><span class="kc-swatches"></span>' +
    '<input class="kc-pick" type="color" aria-label="any colour"></div>' +
    '<div class="kc-line"><span>finish</span><span class="kc-seg" data-seg="finish"></span></div>' +
    '<div class="kc-line"><span>font</span><span class="kc-seg" data-seg="font"></span></div>' +
    '<div class="kc-line"><span></span>' +
    '<button class="kc-btn kc-all" type="button">apply to all</button>' +
    '<button class="kc-btn kc-shuffle" type="button">shuffle</button>' +
    '<button class="kc-btn kc-reset" type="button">reset</button>' +
    (editor ? '<button class="kc-btn kc-view" type="button">reset view</button>' : "") +
    "</div>" +
    "</div>" +
    '<p class="kc-cap">type a line · click a cap to pick it · a word a cap, or a letter a cap</p>';

  const stage = el.querySelector(".kc-stage");
  const canvas = el.querySelector("canvas");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    el.innerHTML = '<p class="kc-cap">webgl unavailable</p>';
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  /* linear: the filmic curves pull bright saturated colour toward white,
     which turned the orange to peach. linear keeps it and lets the lit
     shoulders clip, the way the reference's do */
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = L.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap; // blurs — the shadow is soft

  const scene = new THREE.Scene();
  /* from above, through a long lens, leaned a few degrees toward the
     viewer: the caps face the screen, the outer caps show a sliver of
     their outer walls, and the near walls show a little more. backed off
     so the grid fits the frame, whatever its shape */
  const camera = new THREE.PerspectiveCamera(L.fov, 1, 0.1, 400);
  camera.up.set(0, 0, -1);
  let gridW = 1, gridD = 1;
  const frameCamera = (aspect) => {
    camera.fov = L.fov;
    const tilt = THREE.MathUtils.degToRad(L.tilt);
    const need = Math.max((gridW * 1.3) / aspect, gridD * 1.3 + 0.3, 2.4);
    const dist = need / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(0, dist * Math.cos(tilt), dist * Math.sin(tilt));
    camera.lookAt(0, 0, 0);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  /* the studio the plastic reflects: black all round, a dim grey sky so
     the tops don't go dead, and one broad white panel behind and to the
     left — the softbox — so the gloss carries a wide soft highlight on
     the far shoulders and nothing bright lands on the flat tops. the
     stock room environment has a lit ceiling, which the tops mirrored
     into a white wash */
  const studio = new THREE.Scene();
  const dome = new THREE.SphereGeometry(30, 32, 16);
  const shade = [];
  const dp = dome.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    const v = 0.02 + 0.12 * Math.max(0, dp.getY(i) / 30);
    shade.push(v, v, v);
  }
  dome.setAttribute("color", new THREE.Float32BufferAttribute(shade, 3));
  studio.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 7),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 6), side: THREE.DoubleSide }),
  );
  panel.position.set(-5, 7, -14);
  panel.lookAt(0, 0, 0);
  studio.add(panel);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio, 0.04).texture;
  scene.environmentIntensity = L.env;
  pmrem.dispose();
  dome.dispose();
  panel.geometry.dispose();

  /* a soft box overhead, a touch to the front-left: the top faces sit in
     an even light, the near and right walls fall into shade, and the
     shadow is a soft pool that peeks out below */
  const key = new THREE.DirectionalLight(0xffffff, L.key);
  /* low and from behind: it grazes the top faces, so they keep their
     colour, and lands square on the far shoulders, which blow bright,
     while the near shoulders fall into shadow */
  key.position.set(-1, 5, -6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -4;
  key.shadow.camera.right = key.shadow.camera.top = 4;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.radius = 4;
  key.shadow.blurSamples = 12;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  scene.add(key.target);
  /* the fill comes in low from the front, so the near walls stay lit;
     the hemisphere's ground is bright for the same reason */
  const fill = new THREE.DirectionalLight(0xf2f4f8, L.fill);
  fill.position.set(1, 2.5, 6);
  scene.add(fill);
  /* the softbox: a broad panel above and to the left, so the highlights
     are wide soft shapes rather than points */
  RectAreaLightUniformsLib.init();
  const soft = new THREE.RectAreaLight(0xffffff, L.soft, 6, 3);
  soft.position.set(-1.5, 2.2, -5.5); // low and behind, so it lands on the far shoulders, not the tops
  soft.lookAt(0, 0, 0);
  scene.add(soft);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9a9a9a, L.hemi);
  scene.add(hemi);

  const root = new THREE.Group();
  scene.add(root);

  /* the floor is the page: an invisible plane that only catches shadow */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: L.shadow }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -S.h / 2 - 0.002;
  floor.receiveShadow = true;
  root.add(floor);

  /* ---- the caps ---------------------------------------------------------- */
  let capGeo = capGeometry();
  let legGeo = legendGeometry();
  const caps = [];
  const state = DEFAULT.map((d) => ({ ...d, text: "" }));
  let tokens = []; // one entry per visible cap
  let mode = DEFAULT_MODE;

  for (let i = 0; i < MAX; i++) {
    const mat = new THREE.MeshPhysicalMaterial();
    const mesh = new THREE.Mesh(capGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const legMat = new THREE.MeshStandardMaterial({
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.7,
      envMapIntensity: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const legend = new THREE.Mesh(legGeo, legMat);
    mesh.add(legend);
    const g = new THREE.Group();
    g.add(mesh);
    root.add(g);
    mesh.userData.i = i;
    caps.push({ g, mesh, mat, legend, legMat, y: 0, v: 0, target: 0 });
  }

  const paint = (i) => {
    const s = state[i], c = caps[i];
    applyFinish(c.mat, s.color, s.finish);
    c.legMat.map?.dispose();
    c.legMat.map = legendTexture(s.text, s.color, s.font);
    c.legMat.needsUpdate = true;
  };

  /* lays the visible caps out in rows, centred, the last row centred too */
  const layout = () => {
    const n = Math.max(1, tokens.length);
    const cols = columnsFor(n);
    const rows = Math.ceil(n / cols);
    for (let i = 0; i < MAX; i++) {
      const c = caps[i];
      c.g.visible = i < n;
      const col = i % cols, row = (i / cols) | 0;
      const inRow = row === rows - 1 ? n - row * cols : cols;
      c.g.position.set((col - (inRow - 1) / 2) * S.pitch, c.y, (row - (rows - 1) / 2) * S.pitch);
    }
    gridW = cols * S.pitch;
    gridD = rows * S.pitch;
    frameCamera(camera.aspect);
  };

  const setLine = (v) => {
    tokens = tokenize(v, mode);
    for (let i = 0; i < MAX; i++) {
      const text = tokens[i] || "";
      if (text !== state[i].text) { state[i].text = text; paint(i); }
    }
    layout();
    if (sel >= Math.max(1, tokens.length)) select(Math.max(0, tokens.length - 1));
  };

  /* ---- panel ------------------------------------------------------------- */
  const line = el.querySelector(".kc-text");
  const count = el.querySelector(".kc-count");
  const swatches = el.querySelector(".kc-swatches");
  const pick = el.querySelector(".kc-pick");
  const segs = {
    mode: el.querySelector('[data-seg="mode"]'),
    finish: el.querySelector('[data-seg="finish"]'),
    font: el.querySelector('[data-seg="font"]'),
  };
  let sel = 0;

  swatches.innerHTML = SWATCHES.map(
    (c) => `<button class="kc-sw" type="button" style="--c:${c}" data-c="${c}" aria-label="${c}"></button>`,
  ).join("");
  segs.mode.innerHTML = MODES.map((f) => `<button type="button" data-v="${f}">${f}</button>`).join("");
  segs.finish.innerHTML = FINISHES.map((f) => `<button type="button" data-v="${f}">${f}</button>`).join("");
  segs.font.innerHTML = FONTS.map((f) => `<button type="button" data-v="${f}">${f}</button>`).join("");

  const syncPanel = () => {
    const s = state[sel];
    count.textContent = `${tokens.length}/${MAX}`;
    for (const b of swatches.children) b.setAttribute("aria-pressed", b.dataset.c === s.color);
    pick.value = s.color;
    for (const b of segs.mode.children) b.setAttribute("aria-pressed", b.dataset.v === mode);
    for (const k of ["finish", "font"])
      for (const b of segs[k].children) b.setAttribute("aria-pressed", b.dataset.v === s[k]);
  };

  const select = (i) => {
    caps[sel].target = 0;
    sel = i;
    caps[sel].target = LIFT;
    syncPanel();
    wake();
  };

  const setColor = (c) => { state[sel].color = c; paint(sel); syncPanel(); wake(); };
  swatches.addEventListener("click", (e) => {
    const b = e.target.closest("[data-c]");
    if (b) setColor(b.dataset.c);
  });
  pick.addEventListener("input", () => setColor(pick.value));
  segs.mode.addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    mode = b.dataset.v;
    setLine(line.value);
    syncPanel();
    wake();
  });
  for (const k of ["finish", "font"]) {
    segs[k].addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]");
      if (!b) return;
      state[sel][k] = b.dataset.v;
      paint(sel);
      syncPanel();
      wake();
    });
  }
  line.addEventListener("input", () => {
    setLine(line.value);
    syncPanel();
    wake();
  });
  el.querySelector(".kc-all").addEventListener("click", () => {
    const s = state[sel];
    for (let i = 0; i < MAX; i++) {
      Object.assign(state[i], { color: s.color, finish: s.finish, font: s.font });
      paint(i);
    }
    wake();
  });
  el.querySelector(".kc-shuffle").addEventListener("click", () => {
    const r = (a) => a[(Math.random() * a.length) | 0];
    for (let i = 0; i < MAX; i++) {
      Object.assign(state[i], { color: r(SWATCHES), finish: r(FINISHES), font: r(FONTS) });
      paint(i);
    }
    syncPanel();
    wake();
  });
  el.querySelector(".kc-reset").addEventListener("click", () => {
    for (let i = 0; i < MAX; i++) Object.assign(state[i], DEFAULT[i]);
    mode = DEFAULT_MODE;
    line.value = startLine;
    setLine(startLine);
    for (let i = 0; i < MAX; i++) paint(i);
    syncPanel();
    wake();
  });

  el.querySelector(".kc-view")?.addEventListener("click", () => { yaw.t = 0; pitch.t = 0; wake(); });

  /* ---- download: the caps rendered square, over the page's background --- */
  el.querySelector(".kc-save").addEventListener("click", () => {
    const w = canvas.width, h = canvas.height;
    const dpr = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    renderer.setSize(SHOT, SHOT, false);
    frameCamera(1);
    renderer.render(scene, camera);
    const out = document.createElement("canvas");
    out.width = out.height = SHOT;
    const g = out.getContext("2d");
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#000";
    g.fillRect(0, 0, SHOT, SHOT);
    g.drawImage(canvas, 0, 0); // read before the next composite, so no preserveDrawingBuffer
    renderer.setPixelRatio(dpr);
    renderer.setSize(w / dpr, h / dpr, false);
    frameCamera(w / h);
    wake();
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `keycaps-${tokens.join(" ").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "plate"}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  });

  /* ---- pointer: pick, press, a touch of tilt ------------------------------ */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hit = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(caps.filter((c) => c.g.visible).map((c) => c.mesh), false)[0];
    return h ? h.object.userData.i : -1;
  };

  /* springs: the plate leans a few degrees toward the pointer, caps press
     and lift */
  const sp = (x, k, c) => ({ x, t: x, v: 0, k, c });
  const tiltX = sp(0, 60, 11), tiltZ = sp(0, 60, 11);
  const yaw = sp(0, 80, 14), pitch = sp(0, 80, 14); // the editor's orbit
  let pressing = -1;
  let dragX = 0, dragY = 0, dragging = false, moved = false;

  const aimAt = (e) => {
    if (editor) return; // the workbench holds still unless dragged
    const r = canvas.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width - 0.5;
    const v = (e.clientY - r.top) / r.height - 0.5;
    tiltZ.t = -u * 0.12;
    tiltX.t = v * 0.12;
  };

  /* a tap on a cap is the piece's — it stops here, so a tile doesn't
     open its story. a tap on the empty canvas goes up and does */
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    stage.setPointerCapture(e.pointerId);
    dragging = true;
    moved = false;
    dragX = e.clientX;
    dragY = e.clientY;
    const i = hit(e);
    if (i >= 0) {
      e.stopPropagation();
      pressing = i;
      caps[i].target = PRESS;
      click(true);
    }
    wake();
  });
  stage.addEventListener("pointermove", (e) => {
    if (dragging) {
      if (Math.abs(e.clientX - dragX) + Math.abs(e.clientY - dragY) > 6) moved = true;
      if (editor && moved) {
        /* a drag that began on the cap lets go of the press and orbits */
        if (pressing >= 0) {
          caps[pressing].target = pressing === sel ? LIFT : 0;
          pressing = -1;
        }
        /* a turntable: sideways spins the cap, up and down tips it */
        yaw.t += (e.clientX - dragX) * 0.008;
        pitch.t = clamp(pitch.t + (e.clientY - dragY) * 0.008, -1.2, 1.2);
        dragX = e.clientX;
        dragY = e.clientY;
      }
    } else if (e.pointerType !== "touch") {
      aimAt(e);
      canvas.style.cursor = hit(e) >= 0 ? "pointer" : "";
    }
    wake();
  });
  const up = (e) => {
    if (!dragging) return;
    dragging = false;
    if (pressing >= 0) {
      e.stopPropagation();
      const i = pressing;
      pressing = -1;
      caps[i].target = i === sel ? LIFT : 0;
      click(false);
      if (!moved && e.type === "pointerup") select(i);
    }
    wake();
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("pointerleave", () => {
    if (!dragging) { tiltX.t = 0; tiltZ.t = 0; wake(); }
  });
  /* keyboard on the plate: arrows move the pick */
  stage.addEventListener("keydown", (e) => {
    const n = Math.max(1, tokens.length);
    const cols = columnsFor(n);
    if (e.key === "ArrowRight") select((sel + 1) % n);
    else if (e.key === "ArrowLeft") select((sel + n - 1) % n);
    else if (e.key === "ArrowDown") select(Math.min(n - 1, sel + cols));
    else if (e.key === "ArrowUp") select(Math.max(0, sel - cols));
    else return;
    e.preventDefault();
  });

  /* ---- loop ---------------------------------------------------------------- */
  let raf = 0, last = 0, alive = true, idle = 0;

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      renderer.setSize(w, h, false);
      frameCamera(w / h);
    }
  };

  const frame = (t) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min((t - last) / 1000, 0.032);
    last = t;
    let moving = false;

    for (const s of [tiltX, tiltZ, yaw, pitch]) {
      if (reduceMotion) { s.x = s.t; continue; }
      s.v += (s.k * (s.t - s.x) - s.c * s.v) * dt;
      s.x += s.v * dt;
      if (Math.abs(s.v) > 1e-3 || Math.abs(s.t - s.x) > 1e-3) moving = true;
    }
    root.rotation.set(tiltX.x + pitch.x, yaw.x, tiltZ.x);

    for (const c of caps) {
      /* a stiff press, a soft settle */
      const k = c.target === PRESS ? 900 : 260, d = c.target === PRESS ? 34 : 18;
      c.v += (k * (c.target - c.y) - d * c.v) * dt;
      c.y += c.v * dt;
      if (Math.abs(c.v) > 1e-3 || Math.abs(c.target - c.y) > 1e-3) moving = true;
      c.g.position.y = c.y;
    }

    resize();
    renderer.render(scene, camera);
    idle = moving ? 0 : idle + dt;
    if (idle < 0.25) raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    if (!raf && alive) {
      last = performance.now();
      idle = 0;
      raf = requestAnimationFrame(frame);
    }
  };
  const ro = new ResizeObserver(wake);
  ro.observe(stage);

  line.value = startLine;
  setLine(startLine);
  for (let i = 0; i < MAX; i++) paint(i);
  select(0);
  wake();

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    for (const c of caps) { c.mat.dispose(); c.legMat.map?.dispose(); c.legMat.dispose(); }
    capGeo.dispose();
    legGeo.dispose();
    floor.geometry.dispose();
    floor.material.dispose();
    scene.environment?.dispose();
    renderer.dispose();
  };
}
