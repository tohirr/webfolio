/* lab/gallaria — a window onto gallaria (gallaria.vercel.app), the infinite
   canvas of art by african artists. forty of the works are scattered over
   one tile of world space with the same seeded blue-noise placement the
   site uses, and the tile repeats in both axes so the field has no edges:
   drag it and it keeps going. every work climbs the site's resolution
   ladder in miniature — a 16 px rung first, nearest-filtered so the pixels
   are honest, then 64 px, then a rung at the screen's own resolution (192
   or 256 px, by zoom and pixel ratio), each dissolving in through an 8×8
   bayer threshold in the fragment shader, block by block, the way the real
   thing loads. the works are rigid cards on a shallow dome pinned to the
   cell, so the centre is magnified a touch and the edges lean away, and
   the picture is sharp at the centre and softens toward the rim — a
   radial blur in the fragment shader, a ring of taps whose radius grows
   with distance from the middle, like a lens. flick it and it coasts;
   left alone it drifts slowly on its own and pauses the moment you touch
   it. the snapshot of works is baked in (gallaria-works.json, ~2 kb), the
   rungs come from cloudinary: ~30 kb for the small ones, ~90 kb for the
   64s once the cell is on screen, and the sharp rung (~12–18 kb each)
   streams in only for the works near the viewport. a tap opens the story
   card; a drag never does. behind the card the same field carries on:
   the card asks for a second mount in scene mode — no chrome, no input —
   at the tile's own camera, zoomed
   so the tile's picture covers the screen: the very works that were in
   the cell, blown up, still drifting — and hands the camera back to the
   tile when it closes, so it reads as one field the card was lifted off. webgl2, one context per
   mount, one program. */

import WORKS from "./gallaria-works.json";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const CLOUD = "https://res.cloudinary.com/dbgxvkfqw/image/upload";
// the tiny rungs are fixed jpg (pre-generated on the site's upload); the
// sharp one lets cloudinary pick webp per browser
const rungUrl = (w, width) =>
  `${CLOUD}/c_limit,w_${width},${width <= 64 ? "f_jpg" : "f_auto"},q_auto/${w.id}.${w.format}`;

/* ---- world: units are css px at zoom 1 ------------------------------------ */
const COL_W = 96; // every work is this wide
const GAP = 56; // typical breathing room round a work
const MIN_GAP = GAP / 2;
const FILL = 0.62;
const CANDIDATES = 40;
const MAX_TRIES = 400;
const BLOCK = 4; // world units per dissolve block
const BULGE = 0.05;
const CENTER_SCALE = 1 / (1 - BULGE);

const FRICTION = 0.92; // velocity kept per 16 ms after a flick
const TAP_SLOP = 5;
const DISSOLVE_MS = 520;
const BLUR_PX = 9; // css px of blur at the rim: frosted glass at the edge, clear in the middle
const STREAM_MS = 320; // how often the sharp rung is offered to the works in view
const DRIFT = 0.16; // css px per 16 ms, on its own
const IDLE_MS = 2600; // the rest before the drift resumes

/* fnv-1a: a stable seed from a string */
const hash = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};
/* mulberry32 */
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const mod = (a, n) => ((a % n) + n) % n;
const wrapDist = (a, b, n) => {
  const d = Math.abs(a - b) % n;
  return Math.min(d, n - d);
};

/* best-candidate scatter across one wrapping tile, seeded per work so the
   arrangement is the same on every visit */
function layout(items) {
  const sized = items.map((item) => ({ item, w: COL_W, h: Math.round(COL_W / item.ratio) }));
  sized.sort((a, b) => b.w * b.h - a.w * a.h || a.item.id.localeCompare(b.item.id));
  const padded = sized.reduce((s, e) => s + (e.w + GAP) * (e.h + GAP), 0);
  let tile = Math.ceil(Math.sqrt(padded / FILL));
  for (;;) {
    const placed = [];
    let ok = true;
    for (const e of sized) {
      const next = rng(hash(e.item.id));
      let best = null, bestClear = -Infinity;
      for (let i = 0; i < MAX_TRIES; i++) {
        const cx = next() * tile, cy = next() * tile;
        let clear = Infinity;
        for (const o of placed) {
          const gx = wrapDist(cx, o.cx, tile) - (e.w + o.w) / 2;
          const gy = wrapDist(cy, o.cy, tile) - (e.h + o.h) / 2;
          clear = Math.min(clear, Math.max(gx, gy));
          if (clear < MIN_GAP) break;
        }
        if (clear >= MIN_GAP && clear > bestClear) {
          best = { cx, cy };
          bestClear = clear;
        }
        if (best && i >= CANDIDATES - 1) break;
      }
      if (!best) { ok = false; break; }
      placed.push({ ...best, w: e.w, h: e.h, e });
    }
    if (ok) {
      for (const p of placed) p.e.item.rect = { x: Math.round(p.cx - p.w / 2), y: Math.round(p.cy - p.h / 2), w: p.w, h: p.h };
      return tile;
    }
    tile = Math.ceil(tile * 1.08);
  }
}

/* ---- gl ------------------------------------------------------------------ */
const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

/* one quad per draw, its corners from gl_VertexID; a rigid card on the
   plane tangent to a shallow dome at the card's centre, so it tilts away
   toward the edges but its edges stay straight (see camera.js on the site) */
const VS = `#version 300 es
uniform vec4 uRect;
uniform vec2 uCam;
uniform float uZoom;
uniform vec2 uView;
uniform float uBulge;
out vec2 vUv;
out float vShade;
void main() {
  int c = gl_VertexID;
  vec2 p = vec2(float(c == 1 || c == 2 || c == 4), float(c == 2 || c == 4 || c == 5));
  vUv = p;
  vec2 screen = (uRect.xy + p * uRect.zw - uCam) * uZoom + uView * 0.5;
  vec2 n = screen / uView * 2.0 - 1.0;
  vec2 cs = (uRect.xy + 0.5 * uRect.zw - uCam) * uZoom + uView * 0.5;
  vec2 cn = cs / uView * 2.0 - 1.0;
  float cc = dot(cn, cn);
  float z = cc < 4.0 ? uBulge * (1.0 + cc - 2.0 * dot(cn, n)) : uBulge * -3.0;
  z = min(z, 0.5);
  vShade = mix(1.0, 0.88, smoothstep(0.0, 2.2, min(cc, 4.0)));
  gl_Position = vec4(n.x, -n.y, 0.0, 1.0 - z);
}`;

const FS = `#version 300 es
precision mediump float;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform sampler2D uBayer;
uniform float uT;
uniform vec2 uBlocks;
in vec2 vUv;
in float vShade;
out vec4 o;
void main() {
  vec2 b = mod(floor(vUv * uBlocks), 8.0);
  float th = texture(uBayer, (b + 0.5) / 8.0).r;
  vec3 col = th < uT ? texture(uTexB, vUv).rgb : texture(uTexA, vUv).rgb;
  o = vec4(col * vShade, 1.0);
}`;

/* the frost: the cards are drawn into a texture of the cell, and this pass
   puts it on screen through a blur whose radius grows from nothing at the
   centre to BLUR_PX at the edge midpoints — the whole picture, silhouettes
   included, the way glass does it. a ring of taps over a mip-biased sample
   keeps a wide radius smooth */
const FROST_VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID & 1) << 2), float((gl_VertexID & 2) << 1));
  vUv = p * 0.5;
  gl_Position = vec4(p - 1.0, 0.0, 1.0);
}`;

const FROST_FS = `#version 300 es
precision mediump float;
uniform sampler2D uScene;
uniform vec2 uView;   // css px
uniform float uDpr;
uniform vec3 uBg;     // the cell's colour, for the rim to sink into
in vec2 vUv;
out vec4 o;
float bias;
vec3 tap(vec2 uv) { return texture(uScene, uv, bias).rgb; }
void main() {
  vec2 n = vUv * 2.0 - 1.0;
  // r² is 1 at the edge midpoints and 2 in the corners: full frost from the
  // edge outward, tapering in toward a clear centre
  float amt = smoothstep(0.45, 1.15, dot(n, n));
  float radPx = amt * ${BLUR_PX.toFixed(1)};
  bias = log2(max(1.0, radPx * uDpr * 0.6));
  vec2 r = radPx / uView;
  vec3 col = tap(vUv) * 2.0;
  float wsum = 2.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 d = vec2(cos(a), sin(a));
    col += tap(vUv + d * r) * 0.85;
    col += tap(vUv + d * r * 0.5 + vec2(-d.y, d.x) * r * 0.2) * 1.0;
    wsum += 1.85;
  }
  col /= wsum;
  // the frosted rim goes milky: sinks a little toward the cell's own colour
  o = vec4(mix(col, uBg, 0.22 * amt), 1.0);
}`;

function program(gl, vs, fs, names) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  for (const n of names) u[n] = gl.getUniformLocation(p, n);
  return { p, u };
}

const rgb = (hex, fb) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? [1, 3, 5].map((i) => parseInt(m[1].slice(i - 1, i + 1), 16) / 255) : fb;
};

/* each mounted cell's camera, by its element, so the story card can pick
   the field up where the tile left it and put it back */
export const handles = new WeakMap();

/* ---- the piece ------------------------------------------------------------ */
/* opts.scene: a backdrop — no labels, no input; opts.from:
   { x, y, zoom } to start from another cell's camera */
export function mount(el, { scene = false, from = null } = {}) {
  el.innerHTML =
    "<style>" +
    ".ga-stage{position:relative;width:100%;height:100%;user-select:none;-webkit-user-select:none}" +
    ".ga-canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:pan-y}" +
    ".ga-canvas.dragging{cursor:grabbing}" +
    ".ga-tag,.ga-hint{position:absolute;bottom:10px;padding:2px 7px;border-radius:7px;color:var(--dim);background:color-mix(in srgb,var(--tile) 84%,transparent);pointer-events:none}"
    +
    ".ga-tag{left:10px}" +
    ".ga-hint{right:10px;transition:opacity .4s ease}" +
    ".ga-hint.off{opacity:0}" +
    ".ga-err{color:var(--dim)}" +
    "</style>" +
    '<div class="ga-stage">' +
    (scene
      ? '<canvas class="ga-canvas" style="pointer-events:none;cursor:default" aria-hidden="true"></canvas>'
      : '<canvas class="ga-canvas" aria-label="a wrapping field of artworks; drag to pan"></canvas>' +
        '<span class="ga-tag">gallaria</span>' +
        '<span class="ga-hint">drag</span>') +
    "</div>";
  const stage = el.querySelector(".ga-stage");
  const canvas = el.querySelector(".ga-canvas");
  const hint = el.querySelector(".ga-hint");

  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true, // the story card clones the cell as it opens
  });
  if (!gl) {
    el.innerHTML = '<p class="ga-err">webgl2 unavailable</p>';
    return;
  }

  /* ---- world ------------------------------------------------------------- */
  const items = WORKS.map(([id, format, w, h]) => ({ id, format, ratio: w / h }));
  const TILE = layout(items);
  let alive = true;
  let dirty = true; // a frame is owed

  /* per-item gpu state: the rungs held, the two being dissolved between */
  const state = new Map(items.map((it) => [it, { tex: new Map(), a: null, b: null, tier: 0, t: 1 }]));
  let dissolving = 0;

  const quad = program(gl, VS, FS, ["uRect", "uCam", "uZoom", "uView", "uBulge", "uTexA", "uTexB", "uBayer", "uT", "uBlocks"]);
  const frost = program(gl, FROST_VS, FROST_FS, ["uScene", "uView", "uDpr", "uBg"]);
  gl.useProgram(frost.p);
  gl.uniform1i(frost.u.uScene, 3);

  /* the cell as a texture: the cards render into a multisampled buffer (the
     context's own antialiasing only covers the screen, not a texture), which
     resolves into this texture; the frost pass then puts it on screen. it
     needs the full mip chain each frame for the wide blur */
  const sceneTex = gl.createTexture();
  const fbo = gl.createFramebuffer();
  const msaa = gl.createRenderbuffer();
  const msFbo = gl.createFramebuffer();
  const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
  gl.bindRenderbuffer(gl.RENDERBUFFER, msaa); // a renderbuffer must be bound once before it can be attached
  gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msaa);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(quad.p);
  gl.uniform1i(quad.u.uTexA, 0);
  gl.uniform1i(quad.u.uTexB, 1);
  gl.uniform1i(quad.u.uBayer, 2);
  gl.uniform1f(quad.u.uBulge, BULGE);
  const bayer = gl.createTexture();
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, bayer);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 8, 8, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(BAYER_8.map((v) => v * 4)));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.bindVertexArray(gl.createVertexArray());

  /* the cell's own colour behind the works, so the field sits in the tile */
  const mq = matchMedia("(prefers-color-scheme: light)");
  const readTheme = () => {
    const [r, g, b] = rgb(getComputedStyle(el).getPropertyValue("--tile"), [0.09, 0.09, 0.09]);
    gl.clearColor(r, g, b, 1);
    gl.useProgram(frost.p);
    gl.uniform3f(frost.u.uBg, r, g, b);
    dirty = true;
  };
  mq.addEventListener("change", readTheme);

  /* ---- textures ---------------------------------------------------------- */
  const upload = (img, tier) => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    // the small rungs stay blocky when magnified — the pixels are the point;
    // the sharp one is drawn at its own size and filtered
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, tier <= 64 ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };
  const present = (s, tier) => {
    const tex = s.tex.get(tier);
    if (!tex || s.b === tex) return;
    if (s.t < 1) dissolving -= 1;
    s.a = s.b || tex;
    s.b = tex;
    s.tier = tier;
    if (!reduceMotion && s.a !== s.b) {
      s.t = 0;
      dissolving += 1;
    } else s.t = 1;
    dirty = true;
  };
  const fetched = new Set();
  const ensure = (item, tier) => {
    const key = item.id + tier;
    if (fetched.has(key)) return;
    fetched.add(key);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = rungUrl(item, tier);
    img
      .decode()
      .then(() => {
        if (!alive) return;
        const s = state.get(item);
        s.tex.set(tier, upload(img, tier));
        if (tier > s.tier) present(s, tier);
      })
      .catch(() => {}); // a missing rung just means we stay on the one before
  };
  /* the small rungs straight away; the large ones once the cell is on screen */
  items.forEach((it) => ensure(it, 16));
  let wantBig = false;

  /* ---- camera ------------------------------------------------------------ */
  const cam = { x: from?.x ?? TILE * 0.37, y: from?.y ?? TILE * 0.61, zoom: 1, vw: 1, vh: 1 };
  handles.set(el, {
    get cam() {
      return { x: cam.x, y: cam.y, zoom: cam.zoom };
    },
    set cam(v) {
      cam.x = mod(v.x, TILE);
      cam.y = mod(v.y, TILE);
      dirty = true;
    },
    /* draw now, not at the next frame: for a copy taken right after a move */
    render() {
      dirty = false;
      draw();
    },
  });
  let dpr = 1;
  let hiTier = 192; // the rung that matches a work's size on this screen
  const panByScreen = (dx, dy) => {
    cam.x = mod(cam.x - dx / (cam.zoom * CENTER_SCALE), TILE);
    cam.y = mod(cam.y - dy / (cam.zoom * CENTER_SCALE), TILE);
    dirty = true;
  };
  const resize = () => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    cam.vw = r.width;
    cam.vh = r.height;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, msaa);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, canvas.width, canvas.height);
    gl.useProgram(frost.p);
    gl.uniform1f(frost.u.uDpr, dpr);
    gl.uniform2f(frost.u.uView, r.width, r.height);
    /* about six works across whatever the cell's width — or the zoom of
       the cell this one continues, so the works stay the same size */
    cam.zoom = from?.zoom || r.width / (6 * (COL_W + GAP));
    const px = COL_W * cam.zoom * dpr;
    hiTier = px <= 192 ? 192 : px <= 256 ? 256 : 512; // 512 only when blown up behind the story card
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();
  readTheme();

  /* ---- input: drag, flick, tap ----------------------------------------- */
  let drag = null; // { x, y, moved, vx, vy, last }
  let vx = 0, vy = 0;
  let lastUser = -Infinity;
  let suppressClick = false;
  const touch = (now) => {
    lastUser = now;
    vx = vy = 0;
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    canvas.setPointerCapture(e.pointerId);
    const now = performance.now();
    touch(now);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, moved: false, vx: 0, vy: 0, last: now };
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    const dt = Math.max(1, now - drag.last);
    drag.last = now;
    const dx = e.clientX - drag.px, dy = e.clientY - drag.py;
    drag.px = e.clientX;
    drag.py = e.clientY;
    /* exponential average keeps the fling velocity from spiking on the last event */
    drag.vx = 0.7 * drag.vx + 0.3 * (dx / dt) * 16;
    drag.vy = 0.7 * drag.vy + 0.3 * (dy / dt) * 16;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > TAP_SLOP) {
      drag.moved = true;
      hint?.classList.add("off");
    }
    panByScreen(dx, dy);
    lastUser = now;
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    canvas.classList.remove("dragging");
    suppressClick = drag.moved;
    if (drag.moved && !reduceMotion && performance.now() - drag.last < 80) {
      vx = drag.vx;
      vy = drag.vy;
    }
    lastUser = performance.now();
    drag = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  /* the cell is a link to the story card: a mouse drag inside a link would
     start the browser's own link-drag and cancel the pointer stream a few
     px in, so native dragging is off; and a drag must not open the card */
  el.setAttribute("draggable", "false");
  canvas.draggable = false;
  const onDragStart = (e) => e.preventDefault();
  el.addEventListener("dragstart", onDragStart);
  const onClick = (e) => {
    if (suppressClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
      suppressClick = false;
    }
  };
  el.addEventListener("click", onClick, true);

  /* ---- draw: the cards into the scene, the scene through the frost ------- */
  const draw = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(quad.p);
    gl.uniform2f(quad.u.uCam, cam.x, cam.y);
    gl.uniform1f(quad.u.uZoom, cam.zoom);
    gl.uniform2f(quad.u.uView, cam.vw, cam.vh);
    const hw = ((1 + BULGE) * cam.vw) / (2 * cam.zoom);
    const hh = ((1 + BULGE) * cam.vh) / (2 * cam.zoom);
    const x0 = cam.x - hw, x1 = cam.x + hw, y0 = cam.y - hh, y1 = cam.y + hh;
    for (const item of items) {
      const s = state.get(item);
      if (!s.b) continue;
      const { x, y, w, h } = item.rect;
      const kx0 = Math.ceil((x0 - x - w) / TILE), kx1 = Math.floor((x1 - x) / TILE);
      if (kx1 < kx0) continue;
      const ky0 = Math.ceil((y0 - y - h) / TILE), ky1 = Math.floor((y1 - y) / TILE);
      if (ky1 < ky0) continue;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, s.a || s.b);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, s.b);
      gl.uniform1f(quad.u.uT, s.t);
      gl.uniform2f(quad.u.uBlocks, w / BLOCK, h / BLOCK);
      for (let ky = ky0; ky <= ky1; ky++) {
        for (let kx = kx0; kx <= kx1; kx++) {
          gl.uniform4f(quad.u.uRect, x + kx * TILE, y + ky * TILE, w, h);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
    }
    /* resolve the samples into the texture, then the frost */
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo);
    gl.blitFramebuffer(0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.useProgram(frost.p);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /* ---- frame ------------------------------------------------------------- */
  let raf = 0;
  let last = 0;
  let lastStream = 0;
  const frame = (now) => {
    if (!alive) return;
    const dt = last ? Math.min(32, now - last) : 16;
    last = now;

    /* coast after a flick */
    if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
      const k = dt / 16;
      panByScreen(vx * k, vy * k);
      const decay = Math.pow(FRICTION, k);
      vx *= decay;
      vy *= decay;
    } else if (!reduceMotion && !drag && now - lastUser > IDLE_MS) {
      /* on its own: a slow diagonal wander, eased in from rest */
      const ease = Math.min(1, (now - lastUser - IDLE_MS) / 1800);
      const a = now * 0.00011;
      panByScreen(-DRIFT * ease * (dt / 16) * (1 + 0.35 * Math.sin(a)), -DRIFT * 0.55 * ease * (dt / 16) * Math.cos(a * 0.7));
    }

    /* the sharp rung, for whatever is in or near view, on a slow tick */
    if (wantBig && now - lastStream > STREAM_MS) {
      lastStream = now;
      const mx = (0.8 * cam.vw) / cam.zoom, my = (0.8 * cam.vh) / cam.zoom;
      for (const item of items) {
        const { x, y, w, h } = item.rect;
        let dx = x + w / 2 - cam.x, dy = y + h / 2 - cam.y;
        dx -= Math.round(dx / TILE) * TILE;
        dy -= Math.round(dy / TILE) * TILE;
        if (Math.abs(dx) < mx && Math.abs(dy) < my) ensure(item, hiTier);
      }
    }

    /* advance dissolves */
    if (dissolving > 0) {
      for (const s of state.values()) {
        if (s.t < 1) {
          s.t = Math.min(1, s.t + dt / DISSOLVE_MS);
          if (s.t >= 1) dissolving -= 1;
        }
      }
      dirty = true;
    }

    if (dirty) {
      dirty = false;
      draw();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  /* only spin while the cell is on screen; the large rungs wait for it too */
  const io = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    last = 0;
    if (e.intersectionRatio >= 0.5) {
      if (!wantBig) {
        wantBig = true;
        items.forEach((it) => ensure(it, 64));
      }
      raf = requestAnimationFrame(frame);
    }
  }, { threshold: 0.5 });
  io.observe(stage);

  return () => {
    alive = false;
    handles.delete(el);
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    mq.removeEventListener("change", readTheme);
    el.removeEventListener("click", onClick, true);
    el.removeEventListener("dragstart", onDragStart);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
