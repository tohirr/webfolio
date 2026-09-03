/* lab/glass-render — a camera seen through a wall of square glass blocks,
   as one reusable webgl pass. modeled on a phone clip of a dog behind
   pattern glass: every block is a small convex lens, so a far-off scene
   collapses into one flat colour per block and the world turns into a
   mosaic of soft pixels. the lens is flat in the middle and bends hard at
   the rim, so a ghost of the neighbouring block bleeds in at every edge;
   faint vertical reeding runs inside each block; the seams are thin dark
   grout with a bright bevel along the top. the grid is regular — real
   glass block is — and square on screen, with partial blocks at the top
   edge like a real wall. a wipe blends between the plain feed and the
   glass, so the effect can be swapped in and out like a camera filter.

   createGlass(canvas, opts) → { draw(source, state), params, clear, destroy }
   source is a <video> or <canvas>; draw() cover-crops it into the view. */

const VS = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FS = `
precision highp float;
uniform vec2  uRes;
uniform sampler2D uSrc;   /* the scene, small and soft — what the lenses magnify */
uniform sampler2D uFull;  /* the scene at full size — the plain view */
uniform sampler2D uCell;  /* per block: look offset xy, brightness z, reed phase w */
uniform vec2  uCellRes;
uniform vec2  uGrid;      /* blocks across, blocks up — fractional, so the wall runs off the top */
uniform vec2  uCover;     /* cover-crop of the full texture into the view */
uniform float uMirror;
uniform float uMag;       /* how much of its own footprint a block shows — small = flat */
uniform float uBend;      /* how hard the rim of the lens bends */
uniform float uReed;      /* vertical ripple inside each block */
uniform float uShine;     /* grout and bevel strength */
uniform float uWipe;      /* glass where p.x < uWipe; <0 plain, >1 all glass */
uniform vec2  uLook;

vec2 fullUV(vec2 p) {
  vec2 uv = (p - 0.5) * uCover + 0.5;
  uv.x = mix(uv.x, 1.0 - uv.x, uMirror);
  return uv;
}

void main() {
  vec2 p = gl_FragCoord.xy / uRes;
  vec3 plain = texture2D(uFull, fullUV(p)).rgb;

  /* which block, and where inside it */
  vec2 g = p * uGrid;
  vec2 id = floor(g);
  vec2 l = g - id;
  vec2 ts = 1.0 / uGrid;
  vec4 cd = texture2D(uCell, (mod(id, uCellRes) + 0.5) / uCellRes);

  /* the lens: a small patch around the block's centre, blown up to fill
     it. flat through the middle, then a hard turn at the rim — per axis,
     so the block stays a square and not a bubble */
  vec2 c = (id + 0.5) * ts + (cd.xy - 0.5) * ts * 0.06 + uLook;
  float mag = uMag * (0.85 + 0.3 * cd.z);
  vec2 q = l - 0.5;
  vec2 a = abs(q) * 2.0;                       /* 0 centre → 1 edge, per axis */
  vec2 bend = 1.0 + uBend * a * a * a * a;
  vec2 uv = c + q * ts * mag * bend;
  vec3 col = texture2D(uSrc, uv).rgb;

  /* the rim: through the bevel you see a strip of the neighbour — that
     is the ghosting on every edge in the clip. sideways more than up */
  vec2 rim = smoothstep(0.6, 1.0, a);
  vec3 gx = texture2D(uSrc, c + vec2(sign(q.x) * ts.x * 0.8, 0.0)).rgb;
  vec3 gy = texture2D(uSrc, c + vec2(0.0, sign(q.y) * ts.y * 0.8)).rgb;
  col = mix(col, gx, rim.x * 0.45);
  col = mix(col, gy, rim.y * 0.28);

  /* reeding: soft vertical ribs inside the block */
  col *= 1.0 + uReed * 0.022 * sin(l.x * 18.85 + cd.w * 6.2832);

  /* seams, in pixels — thin dark grout, a bright bevel on the top and a
     fainter one on the left, so the wall reads as lit from above */
  vec2 px = l * uRes / uGrid;
  vec2 pxr = (1.0 - l) * uRes / uGrid;
  float eV = min(px.x, pxr.x), eH = min(px.y, pxr.y);
  float grout = 0.32 * exp(-eV * eV * 0.8) + 0.22 * exp(-eH * eH * 0.8);
  float bevel = 0.28 * exp(-pow(pxr.y - 1.6, 2.0) * 0.25)
              + 0.10 * exp(-pow(px.x - 1.6, 2.0) * 0.25);

  /* glass: a green cast, a little milk, less contrast, each block its
     own shade, and the top of every block catching the light */
  col *= vec3(0.955, 1.0, 0.985);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 0.92);
  col = (col - 0.5) * 0.96 + 0.5;
  col = mix(col, vec3(0.74, 0.8, 0.79), 0.05);
  col *= 0.97 + 0.06 * cd.z;
  col += 0.04 * smoothstep(0.55, 1.0, l.y) * uShine;
  col *= 1.0 - grout * (0.4 + 0.6 * uShine);
  col += vec3(0.9, 0.94, 0.95) * bevel * uShine;

  /* the wipe: glass on the left of the edge, a hairline on the edge */
  float k = 1.0 - smoothstep(uWipe - 0.008, uWipe + 0.008, p.x);
  float line = exp(-pow((p.x - uWipe) * uRes.x * 0.5, 2.0))
             * step(0.0, uWipe) * step(uWipe, 1.0);
  gl_FragColor = vec4(mix(plain, col, k) + line * 0.35, 1.0);
}
`;

/* small seeded rng so the wall is the same wall on every load */
const mulberry = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CELL = 64; // the per-block noise tiles every 64 blocks — nobody will notice
const SRC_PER_CELL = 14; // source pixels per block — the softness comes from here

export const DEFAULTS = { cells: 14, mag: 0.3, bend: 1.4, reed: 0.6, shine: 0.75 };

export function createGlass(canvas, opts = {}) {
  const gl = canvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: !!opts.preserve,
  });
  if (!gl) return null;

  const params = { ...DEFAULTS, ...(opts.params || {}) };
  const maxDpr = opts.dpr ?? 1.5;

  /* ---- program ---------------------------------------------------------- */
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const u of ["uRes", "uSrc", "uFull", "uCell", "uCellRes", "uGrid", "uCover",
    "uMirror", "uMag", "uBend", "uReed", "uShine", "uWipe", "uLook"])
    U[u] = gl.getUniformLocation(prog, u);

  /* ---- textures: soft source on 0, full source on 1, block noise on 2 --- */
  const makeTex = (unit, filter) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([20, 20, 22, 255]));
    for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_MIN_FILTER, filter], [gl.TEXTURE_MAG_FILTER, filter]])
      gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  };
  makeTex(2, gl.NEAREST);
  makeTex(1, gl.LINEAR);
  makeTex(0, gl.LINEAR);
  gl.uniform1i(U.uSrc, 0);
  gl.uniform1i(U.uFull, 1);
  gl.uniform1i(U.uCell, 2);

  const rnd = mulberry(opts.seed ?? 7);
  const noise = new Uint8Array(CELL * CELL * 4);
  for (let i = 0; i < noise.length; i++) noise[i] = rnd() * 255;
  gl.activeTexture(gl.TEXTURE2);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CELL, CELL, 0, gl.RGBA, gl.UNSIGNED_BYTE, noise);
  gl.uniform2f(U.uCellRes, CELL, CELL);

  /* ---- the soft source: the scene cover-cropped into a tiny canvas ------- */
  const src = document.createElement("canvas");
  const sctx = src.getContext("2d");

  const fit = () => {
    const dpr = Math.min(devicePixelRatio || 1, maxDpr);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return null;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    return { w, h };
  };

  const clear = () => {
    if (!fit()) return;
    gl.clearColor(0.06, 0.06, 0.07, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  /* draw one frame. source: <video> or <canvas>. state: mirror, wipe, look */
  const draw = (source, state = {}) => {
    const size = fit();
    if (!size) return false;
    const { w, h } = size;
    const sw = source?.videoWidth ?? source?.width ?? 0;
    const shh = source?.videoHeight ?? source?.height ?? 0;
    if (!sw || !shh) {
      clear();
      return false;
    }
    const mirror = state.mirror ? 1 : 0;
    const wipe = state.wipe ?? 1.1;
    const look = state.look || [0, 0];

    // square blocks, `cells` of them along the short side; the long side
    // gets a fractional count so the wall runs off the edge
    const cells = Math.max(4, params.cells);
    const cols = w >= h ? (cells * w) / h : cells;
    const rows = w >= h ? cells : (cells * h) / w;

    // the soft source, cover-cropped and mirrored the same way the view is
    const tw = Math.round(cols * SRC_PER_CELL);
    const th = Math.round(rows * SRC_PER_CELL);
    if (src.width !== tw || src.height !== th) {
      src.width = tw;
      src.height = th;
    }
    const s = Math.max(tw / sw, th / shh);
    sctx.save();
    if (mirror) {
      sctx.translate(tw, 0);
      sctx.scale(-1, 1);
    }
    sctx.drawImage(source, (tw - sw * s) / 2, (th - shh * s) / 2, sw * s, shh * s);
    sctx.restore();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    // the full-size source only matters while any of the plain view shows
    if (wipe < 1.02) {
      gl.activeTexture(gl.TEXTURE1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    const va = sw / shh, ca = w / h;
    gl.uniform2f(U.uCover, va > ca ? ca / va : 1, va > ca ? 1 : va / ca);

    gl.uniform2f(U.uRes, w, h);
    gl.uniform2f(U.uGrid, cols, rows);
    gl.uniform1f(U.uMirror, mirror);
    gl.uniform1f(U.uMag, params.mag);
    gl.uniform1f(U.uBend, params.bend);
    gl.uniform1f(U.uReed, params.reed);
    gl.uniform1f(U.uShine, params.shine);
    gl.uniform1f(U.uWipe, wipe);
    gl.uniform2f(U.uLook, look[0], look[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  };

  const destroy = () => {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };

  return { gl, canvas, params, draw, clear, destroy };
}

/* an eased wipe between plain (0) and glass (1) — shared by tile and page */
export function makeWipe(initial = 1) {
  let from = initial, to = initial, t0 = 0, dur = 450;
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  return {
    get target() { return to; },
    set(on, now, ms = 450) {
      from = this.value(now);
      to = on ? 1 : 0;
      t0 = now;
      dur = ms;
    },
    value(now) {
      const k = dur > 0 ? Math.min(1, Math.max(0, (now - t0) / dur)) : 1;
      return from + (to - from) * easeInOut(k);
    },
    /* the shader's edge: glass where p.x < wipe, so run a little past both ends */
    edge(now) { return -0.05 + this.value(now) * 1.1; },
  };
}
