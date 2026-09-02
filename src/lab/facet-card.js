/* lab/facet-card — a trading card with a pixel holo foil. the shine recipe
   comes from real tcg card css (simeydotme's trainer-gallery-holo): rainbow
   gradient, contrast crush, hard-light + overlay glare — rebuilt per-facet
   in a webgl fragment shader so the foil reads as a grid of tiny pixels.
   springs use svelte-motion constants; click pulls a random card off the
   pokemontcg image cdn. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const VS = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FS = `
precision highp float;
uniform vec2  uRes;
uniform float uCellPx;
uniform vec2  uTilt;
uniform float uSharp;
uniform float uFire;
uniform sampler2D uTex;
uniform float uHasTex;
uniform sampler2D uTexB;
uniform float uHasTexB;
uniform float uReach;
uniform vec3  uWave;
uniform float uFlip;
uniform float uOpacity;
uniform float uRainbow;
uniform vec2  uPointer;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec3 rotX(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(v.x, c*v.y - s*v.z, s*v.y + c*v.z);
}
vec3 rotY(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c*v.x + s*v.z, v.y, -s*v.x + c*v.z);
}
vec3 gradA(vec2 p) {
  float g = clamp(p.y * 0.85 + p.x * 0.35, 0.0, 1.0);
  vec3 c = mix(vec3(0.035, 0.04, 0.12), vec3(0.17, 0.11, 0.42), g);
  return mix(c, vec3(0.42, 0.18, 0.5), smoothstep(0.8, 1.25, g + p.x * 0.2));
}
vec3 gradB(vec2 p) {
  float g = clamp(p.y * 0.85 + p.x * 0.35, 0.0, 1.0);
  vec3 c = mix(vec3(0.03, 0.085, 0.075), vec3(0.05, 0.3, 0.25), g);
  return mix(c, vec3(0.12, 0.48, 0.33), smoothstep(0.8, 1.25, g + p.x * 0.2));
}
/* the 7-stop trainer-gallery-holo palette */
vec3 pal(float t) {
  float x = fract(t) * 6.0;
  float i = floor(x), f = fract(x);
  vec3 a, b;
  if      (i < 0.5) { a = vec3(0.685, 0.404, 0.796); b = vec3(0.893, 0.307, 0.287); }
  else if (i < 1.5) { a = vec3(0.893, 0.307, 0.287); b = vec3(0.845, 0.771, 0.215); }
  else if (i < 2.5) { a = vec3(0.845, 0.771, 0.215); b = vec3(0.493, 0.789, 0.251); }
  else if (i < 3.5) { a = vec3(0.493, 0.789, 0.251); b = vec3(0.310, 0.690, 0.665); }
  else if (i < 4.5) { a = vec3(0.310, 0.690, 0.665); b = vec3(0.540, 0.632, 1.000); }
  else              { a = vec3(0.540, 0.632, 1.000); b = vec3(0.685, 0.404, 0.796); }
  return mix(a, b, f);
}
/* css filter: brightness() contrast() saturate() */
vec3 bcs(vec3 c, float br, float con, float sat) {
  c *= br;
  c = clamp((c - 0.5) * con + 0.5, 0.0, 4.0);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return clamp(mix(vec3(l), c, sat), 0.0, 4.0);
}
vec3 blendHardLight(vec3 b, vec3 s) {
  return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, s));
}
vec3 artAt(vec2 p, float sel) {
  vec3 a = mix(gradA(p), texture2D(uTex,  p).rgb * 0.92, uHasTex);
  vec3 b = mix(gradB(p), texture2D(uTexB, p).rgb * 0.92, uHasTexB);
  return mix(a, b, sel);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 gv = gl_FragCoord.xy / uCellPx;
  vec2 id = floor(gv);

  float h1 = hash(id + 0.13);
  float h2 = hash(id + 7.31);
  float h3 = hash(id + 3.77);
  float h4 = hash(id + 9.19);

  vec3 n = vec3((h1 - 0.5) * 0.55, (h2 - 0.5) * 0.55, 0.0);
  vec3 N = normalize(vec3(n.xy, 1.0));
  N = rotY(rotX(N, uTilt.x), uTilt.y);
  vec3 L = normalize(vec3(0.35, 0.55, 0.85));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float diff = clamp(dot(N, L), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-L, N), V), 0.0, 1.0), uSharp);

  vec2 asp = vec2(1.0, uRes.y / uRes.x);
  vec2 glare = uPointer;
  float d = distance(uv * asp, glare * asp);
  float reveal = smoothstep(uReach, uReach * 0.12, d);
  reveal *= reveal;

  /* radiating pixel swap: facets flip artwork as the wave crosses them */
  vec2 cuv = (id + 0.5) * uCellPx / uRes;
  float cellDist = distance(cuv * asp, uWave.xy * asp);
  float jit = (h2 - 0.5) * 0.16;
  float crossed = step(cellDist + jit, uWave.z);
  float sel = abs(uFlip - crossed);

  vec2 pt = clamp(glare, 0.0, 1.0);
  float fromCenter = clamp(distance(pt, vec2(0.5)) * 2.0, 0.0, 1.0);
  float spot = 1.0 - smoothstep(0.0, uReach * 1.6, d);

  /* the artwork stays crisp — only the foil layers are pixelated */
  vec3 art = artAt(uv, sel);

  /* shine: rainbow on a 300%x400% canvas sliding with the pointer */
  vec2 bg = mix(vec2(0.37, 0.33), vec2(0.63, 0.67), pt);
  vec2 imgUV = (cuv + vec2(2.0, 3.0) * bg) / vec2(3.0, 4.0);
  float phase = dot(imgUV, vec2(0.927, -0.375)) / 0.35 + (h1 - 0.5) * 0.1;
  vec3 shine = pal(phase);
  shine *= 0.82 + 0.36 * pow(clamp(dot(reflect(-L, N), V), 0.0, 1.0), 2.0);
  shine = bcs(shine, 0.48 + 0.24 * fromCenter, 1.2 + uRainbow * 1.4, 1.0);

  /* fine wavy vertical grooves, anchored to the card; two incommensurate
     frequencies keep the comb irregular */
  float wob = sin(cuv.y * 24.0 + cuv.x * 9.0) * 2.4
            + sin(cuv.y * 61.0 - cuv.x * 17.0) * 0.9;
  float ridge = pow(0.5 + 0.5 * (0.65 * sin(cuv.x * 170.0 + wob)
                               + 0.35 * sin(cuv.x * 293.0 - wob * 0.7)), 3.0);
  shine *= 0.35 + 1.35 * ridge;

  /* hard-light ellipse at half-pointer suppresses the rainbow off-light */
  vec2 ptA = pt * 0.5 + 0.25;
  float tA = clamp(distance(uv * asp, ptA * asp) / 0.9, 0.0, 1.0);
  vec3 cA = mix(vec3(1.0), vec3(0.15), smoothstep(0.05, 0.4, tA));
  cA = mix(cA, vec3(0.22), smoothstep(0.4, 1.0, tA));
  float aA = mix(1.0, 0.6, smoothstep(0.05, 0.4, tA));
  aA = mix(aA, 1.0, smoothstep(0.4, 1.0, tA));
  cA = bcs(cA, 0.55 + 0.25 * fromCenter, 0.9, 1.0);
  shine = mix(shine, blendHardLight(shine, cA), aA);

  /* color-dodge onto the art, concentrated in the light */
  vec3 dodged = min(art / max(vec3(1.0) - min(shine, vec3(0.96)), vec3(0.04)), vec3(3.0));
  vec3 col = mix(art, dodged, (0.4 + 0.6 * spot) * 0.75 * uFire);

  /* overlay glare: bright core, dark far side */
  float tG = clamp(distance(uv * asp, pt * asp) / 0.9, 0.0, 1.0);
  vec3 cG = mix(vec3(1.0), vec3(0.12), smoothstep(0.2, 1.0, tG));
  float aG = mix(0.62, 0.5, smoothstep(0.1, 0.2, tG));
  aG = mix(aG, 0.26, smoothstep(0.2, 0.9, tG));
  vec3 ovr = mix(2.0 * col * cG, 1.0 - 2.0 * (1.0 - col) * (1.0 - cG), step(0.5, col));
  col = mix(col, ovr, aG * uFire);

  /* saturation lift + embossed groove shading inside the light */
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.0 + 0.4 * spot * uFire);
  col *= 1.0 + (ridge - 0.5) * (0.05 + 0.32 * spot) * uFire;

  /* facet relief + discrete sparkle */
  col *= mix(1.0, 0.82 + 0.28 * diff, reveal);
  col += vec3(1.0) * spec * mix(0.08, 1.4, pow(h3, 3.0)) * spot * uFire;

  col = mix(art, col, uOpacity);

  /* rainbow ring riding the swap wavefront, over an image-colored flash */
  float front = (uWave.z > 0.0 ? 1.0 : 0.0)
              * (1.0 - smoothstep(0.0, 0.11, abs(cellDist + jit - uWave.z)));
  vec3 inc = artAt(cuv, 1.0 - uFlip);
  vec3 ring = pal(cellDist * 2.2 - uWave.z * 1.3 + (h4 - 0.5) * 0.2);
  col += (inc * inc * 2.6 + ring * 0.85) * front * mix(0.4, 1.0, h3);

  gl_FragColor = vec4(sqrt(clamp(col, 0.0, 1.0)), 1.0);
}
`;

/* modern sets (2020+): crisp digital renders on the pokemontcg cdn */
const SETS = [
  ["swsh1", 202], ["swsh6", 198], ["swsh7", 203], ["swsh9", 172],
  ["swsh10", 189], ["sv1", 198], ["sv2", 193], ["sv3", 197],
  ["sv3pt5", 165], ["sv4", 182],
];
const FACE_A = "https://images.pokemontcg.io/swsh6/196_hires.png"; // peonia

const randomCardURL = () => {
  const [s, n] = SETS[(Math.random() * SETS.length) | 0];
  return `https://images.pokemontcg.io/${s}/${1 + ((Math.random() * n) | 0)}_hires.png`;
};

/* the wave-flip sound: a bell-tree glissando of glitter grains over a
   thin high sheen, with pentatonic chimes riding the same accelerating
   curve. four flavors rotate in a shuffled cycle so flips don't tire —
   rising tree (the classic), falling tree, sparse crystal, fine fast
   dust — and every flip is transposed and stretched a little besides.
   built lazily on the first flip — that's a click, so the context runs */
let sac = null;
let noiseBuf = null;
const GLITTER = [1760, 2093, 2637, 3136, 3520, 4186, 5274, 6272];
const VARIANTS = [
  // grains, gliss span (s), ladder start/ratio, jitter, grain decay,
  // chime count, sheen level and sweep — see the flavor names above
  { grains: 44, span: 0.6, lo: 2500, ratio: 3.4, jit: 0.06, dec: 0.02, dvar: 0.035, chimes: 12, sheen: 0.07, s0: 2400, s1: 8200 },
  { grains: 40, span: 0.6, lo: 8200, ratio: 1 / 3.2, jit: 0.06, dec: 0.025, dvar: 0.04, chimes: 10, sheen: 0.06, s0: 7800, s1: 2600 },
  { grains: 15, span: 0.55, lo: 2800, ratio: 2.8, jit: 0.03, dec: 0.09, dvar: 0.1, chimes: 8, sheen: 0.03, s0: 3000, s1: 6500 },
  { grains: 60, span: 0.42, lo: 3600, ratio: 2.6, jit: 0.09, dec: 0.012, dvar: 0.018, chimes: 6, sheen: 0.05, s0: 3200, s1: 9000 },
];
let bag = [];
let lastV = -1;

function sweepSound() {
  try {
    sac ??= new AudioContext();
    if (sac.state !== "running") sac.resume().catch(() => {});
    if (!noiseBuf) {
      noiseBuf = sac.createBuffer(1, sac.sampleRate * 0.8, sac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    // shuffled cycle, never the same flavor twice in a row
    if (!bag.length) bag = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    if (bag[bag.length - 1] === lastV && bag.length > 1) bag.unshift(bag.pop());
    lastV = bag.pop();
    const V = VARIANTS[lastV];
    const mul = 0.88 + Math.random() * 0.28; // per-flip transposition
    const span = V.span * (0.92 + Math.random() * 0.16);
    const t0 = sac.currentTime + 0.02;

    // the thin "tsss" sheen — air above the bells
    const src = sac.createBufferSource();
    src.buffer = noiseBuf;
    const bp = sac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.6;
    bp.frequency.setValueAtTime(V.s0 * mul, t0);
    bp.frequency.exponentialRampToValueAtTime(V.s1 * mul, t0 + span + 0.04);
    const g = sac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(V.sheen * 0.3, t0 + span * 0.5);
    g.gain.exponentialRampToValueAtTime(V.sheen, t0 + span * 0.95);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + span + 0.16);
    src.connect(bp);
    bp.connect(g);
    g.connect(sac.destination);
    src.start(t0);
    src.stop(t0 + span + 0.2);

    // the bell tree: an ordered glissando of grains on the accelerating
    // curve — fewer grains ring louder so every flavor carries
    const loud = Math.pow(44 / V.grains, 0.4);
    for (let i = 0; i < V.grains; i++) {
      const u = i / V.grains;
      const t = t0 + Math.pow(u, 0.55) * span + Math.random() * 0.02;
      const f = V.lo * mul * Math.pow(V.ratio, u) * (1 + (Math.random() - 0.5) * V.jit);
      const osc = sac.createOscillator();
      osc.frequency.value = f;
      const og = sac.createGain();
      const peak = (0.007 + Math.random() * 0.013) * (0.5 + 0.9 * u) * loud;
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(peak, t + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0001, t + V.dec + Math.random() * V.dvar);
      const pan = sac.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 1.4;
      osc.connect(og);
      og.connect(pan);
      pan.connect(sac.destination);
      osc.start(t);
      osc.stop(t + V.dec + V.dvar + 0.05);
    }

    // pentatonic chimes as accents riding the same curve
    for (let i = 0; i < V.chimes; i++) {
      const u = i / V.chimes;
      const t = t0 + Math.pow(u, 0.55) * span * 0.97 + Math.random() * 0.025;
      const rung = Math.min(GLITTER.length - 1, (Math.random() * 4 + u * 4) | 0);
      const f = GLITTER[rung] * mul * (1 + (Math.random() - 0.5) * 0.02);
      const osc = sac.createOscillator();
      osc.frequency.value = f;
      const og = sac.createGain();
      const peak = (0.014 + Math.random() * 0.018) * (0.6 + 0.7 * u);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(peak, t + 0.006);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1 + Math.random() * 0.12);
      const pan = sac.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 1.2;
      osc.connect(og);
      og.connect(pan);
      pan.connect(sac.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  } catch {
    /* no audio — the flip still flips */
  }
}

export function mount(el) {
  el.innerHTML =
    `<style>
.fc-scene{perspective:1000px;display:flex;justify-content:center;padding:.5em 0 1em}
.fc-card{position:relative;width:min(280px,72vw);aspect-ratio:3/4.2;border-radius:14px;transform-style:preserve-3d;will-change:transform;box-shadow:0 24px 48px -16px rgba(0,0,0,.6),0 8px 18px -8px rgba(0,0,0,.45);touch-action:none}
.fc-card canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:14px;display:block}
.fc-rim{position:absolute;inset:0;border-radius:14px;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.fc-row{display:flex;flex-wrap:wrap;gap:.5em 1.4em;align-items:center;justify-content:center}
.fc-row label{display:flex;align-items:center;gap:.5em;color:var(--dim)}
.fc-row input[type=range]{width:90px;accent-color:var(--green)}
.fc-row output{color:var(--fg);min-width:2.5ch;font-variant-numeric:tabular-nums}
.fc-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
.fc-gyro{font:inherit;color:var(--fg);background:transparent;border:1px solid var(--dim);padding:.3em .8em;cursor:pointer}
.fc-gyro:hover{border-color:var(--green)}
</style>` +
    '<div class="fc-scene"><div class="fc-card">' +
    '<canvas></canvas><div class="fc-rim"></div></div></div>' +
    '<div class="fc-row">' +
    '<label>px <input type="range" min="2" max="24" value="9" data-p="px"><output>9</output></label>' +
    '<label>holo <input type="range" min="0" max="100" value="60" data-p="fire"><output>60</output></label>' +
    '<label>rainbow <input type="range" min="0" max="100" value="45" data-p="rainbow"><output>45</output></label>' +
    "</div>" +
    '<p class="fc-cap">hover to catch the light · click for a random card</p>';

  const card = el.querySelector(".fc-card");
  const canvas = el.querySelector("canvas");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) {
    el.innerHTML = '<p class="fc-cap">webgl unavailable</p>';
    return;
  }

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
  for (const u of ["uRes", "uCellPx", "uTilt", "uSharp", "uFire", "uTex", "uHasTex",
    "uTexB", "uHasTexB", "uReach", "uWave", "uFlip", "uOpacity", "uRainbow", "uPointer"])
    U[u] = gl.getUniformLocation(prog, u);

  /* ---- textures (A unit 0, B unit 1) ------------------------------------ */
  const makeTex = (unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]));
    for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]])
      gl.texParameteri(gl.TEXTURE_2D, k, v);
  };
  makeTex(1);
  makeTex(0);
  gl.uniform1i(U.uTex, 0);
  gl.uniform1i(U.uTexB, 1);
  const hasTex = { a: 0, b: 0 };

  const useImage = (img, slot) => {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return false;
    const W = 720, H = 1008;
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const s = Math.max(W / iw, H / ih);
    off.getContext("2d").drawImage(img, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
    gl.activeTexture(slot === "b" ? gl.TEXTURE1 : gl.TEXTURE0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
    } catch {
      gl.activeTexture(gl.TEXTURE0);
      return false;
    }
    gl.activeTexture(gl.TEXTURE0);
    hasTex[slot] = 1;
    return true;
  };

  const fetchInto = (url, slot, ok) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => { if (useImage(im, slot) && ok) ok(); };
    im.src = url;
  };
  fetchInto(FACE_A, "a");

  /* prefetch queue so a click flips instantly */
  const queue = [];
  let filling = 0;
  const prefetch = (tries) => {
    filling++;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => { filling--; queue.push(im); };
    im.onerror = () => { filling--; if (tries > 0) prefetch(tries - 1); };
    im.src = randomCardURL();
  };
  const fillQueue = () => { while (queue.length + filling < 3) prefetch(3); };
  fillQueue();

  /* ---- springs (svelte-motion constants) -------------------------------- */
  const INTERACT = [0.066, 0.25], SNAP = [0.01, 0.06];
  const spring = (x) => ({ x, t: x, v: 0, s: INTERACT[0], d: INTERACT[1] });
  const sRotX = spring(0), sRotY = spring(0);
  const sPtX = spring(0.5), sPtY = spring(0.5);
  const sOpa = spring(0), sScale = spring(1);
  const springs = [sRotX, sRotY, sPtX, sPtY, sOpa, sScale];
  const DEG = Math.PI / 180;
  let endTimer = 0;
  /* ambient drift: the card sways and catches the light on its own,
     pausing while the visitor drives it (pointer or gyro) */
  const AMBIENT = !reduceMotion;
  const RESUME_MS = 3000;
  let ambT = 0;
  let ambActive = false;
  let lastUser = -1e9;

  const interact = (u, v) => {
    clearTimeout(endTimer);
    for (const s of springs) { s.s = INTERACT[0]; s.d = INTERACT[1]; }
    sRotY.t = -((u * 100 - 50) / 3.5) * DEG;
    sRotX.t = ((v * 100 - 50) / 3.5) * DEG;
    sPtX.t = u;
    sPtY.t = v;
    sOpa.t = 1;
  };
  const interactEnd = (delay = 500) => {
    clearTimeout(endTimer);
    endTimer = setTimeout(() => {
      for (const s of springs) { s.s = SNAP[0]; s.d = SNAP[1]; }
      sRotX.t = 0; sRotY.t = 0;
      sPtX.t = 0.5; sPtY.t = 0.5;
      sOpa.t = 0;
    }, delay);
  };

  const onMove = (e) => {
    lastUser = performance.now();
    const r = card.getBoundingClientRect();
    interact((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerleave", () => interactEnd());

  /* ---- click: elastic press + wave-flip to a random card ---------------- */
  let flip = 0, waveActive = false, waveR = 0, waveCX = 0.5, waveCY = 0.5;
  card.addEventListener("pointerdown", (e) => {
    lastUser = performance.now();
    sScale.s = INTERACT[0]; sScale.d = INTERACT[1];
    sScale.v -= 0.045;
    if (waveActive) return;
    const r = card.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    const v = 1 - (e.clientY - r.top) / r.height;
    const ready = queue.shift();
    fillQueue();
    if (ready && useImage(ready, flip === 0 ? "b" : "a")) {
      waveCX = u; waveCY = v; waveR = 0; waveActive = true;
      sweepSound();
    }
  });

  /* device tilt — works on a top-level https page; ios wants a tap first */
  let lastB = null;
  let lastG = null;
  const onOrient = (e) => {
    if (e.beta == null || e.gamma == null) return;
    // a resting device streams near-identical readings — let ambient run
    const delta = lastB == null ? 99 : Math.abs(e.beta - lastB) + Math.abs(e.gamma - lastG);
    lastB = e.beta;
    lastG = e.gamma;
    if (delta < 1.2) {
      if (performance.now() - lastUser > 1200) return;
    } else {
      lastUser = performance.now();
    }
    interact(
      Math.max(0, Math.min(1, e.gamma / 60 + 0.5)),
      Math.max(0, Math.min(1, (e.beta - 45) / 60 + 0.5))
    );
  };
  const needsPermission = typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function";
  if (needsPermission) {
    const btn = document.createElement("button");
    btn.className = "fc-gyro";
    btn.textContent = "enable tilt";
    el.querySelector(".fc-row").appendChild(btn);
    btn.addEventListener("click", async () => {
      try {
        if ((await DeviceOrientationEvent.requestPermission()) === "granted") {
          addEventListener("deviceorientation", onOrient);
          btn.remove();
        }
      } catch { /* denied — drag still works */ }
    });
  } else if (matchMedia("(pointer: coarse)").matches) {
    addEventListener("deviceorientation", onOrient);
  }

  /* ---- controls --------------------------------------------------------- */
  const params = { px: 9, fire: 60, rainbow: 45 };
  for (const input of el.querySelectorAll("[data-p]")) {
    input.addEventListener("input", () => {
      params[input.dataset.p] = +input.value;
      input.nextElementSibling.textContent = input.value;
    });
  }

  /* ---- render loop ------------------------------------------------------ */
  let raf = 0;
  let last = 0;
  let alive = true;

  const frame = (t) => {
    if (!alive) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    /* clientWidth ignores the 3d transform — sizing off the projected
       bounding rect re-grids the facets every frame while tilting */
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    const dt = Math.min((t - last) / 1000, 0.032);
    last = t;

    if (waveActive) {
      waveR += dt * 1.7;
      const far = Math.hypot(Math.max(waveCX, 1 - waveCX),
        Math.max(waveCY, 1 - waveCY) * (h / (w || 1)));
      if (waveR > far + 0.2) { waveActive = false; flip = 1 - flip; waveR = 0; }
    }

    if (AMBIENT && t - lastUser > RESUME_MS) {
      // the drift always restarts from the neutral pose and swells outward —
      // never a jump into the middle of the sweep
      if (!ambActive) {
        ambActive = true;
        ambT = 0;
      }
      ambT += dt;
      const ramp = Math.min(1, ambT / 2.5);
      // slow incommensurate sweep — the glare never settles into a loop
      interact(
        0.5 + Math.sin(ambT * 0.6) * 0.38 * ramp,
        0.5 + Math.sin(ambT * 0.47) * 0.34 * ramp
      );
    } else {
      ambActive = false;
    }

    for (const s of springs) {
      s.v += s.s * (s.t - s.x) - s.d * s.v;
      s.x += s.v;
    }
    card.style.transform =
      `rotateY(${(sRotY.x / DEG).toFixed(3)}deg) rotateX(${(sRotX.x / DEG).toFixed(3)}deg)` +
      ` scale(${Math.max(0.85, sScale.x).toFixed(4)})`;

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uCellPx, params.px * dpr);
    gl.uniform2f(U.uTilt, -sRotX.x, sRotY.x);
    gl.uniform1f(U.uSharp, 180);
    gl.uniform1f(U.uFire, params.fire / 100);
    gl.uniform1f(U.uHasTex, hasTex.a);
    gl.uniform1f(U.uHasTexB, hasTex.b);
    gl.uniform1f(U.uReach, 0.455);
    gl.uniform3f(U.uWave, waveCX, waveCY, waveActive ? waveR : -1);
    gl.uniform1f(U.uFlip, flip);
    gl.uniform1f(U.uOpacity, Math.max(0, Math.min(1, sOpa.x)));
    gl.uniform2f(U.uPointer, sPtX.x, 1.0 - sPtY.x);
    gl.uniform1f(U.uRainbow, params.rainbow / 100);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    clearTimeout(endTimer);
    removeEventListener("deviceorientation", onOrient);
  };
}
