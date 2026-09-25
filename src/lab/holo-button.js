/* lab/holo-button — a button whose press ripple is holographic foil. the
   ripple is material-ui's: it starts where you press and grows to cover
   the button, holds while you hold, and fades when you let go. here the
   wave is a foil sticker instead of a translucent disc: quantised to a
   grid of facets, each facet lit by its own hashed normal, with a brighter
   wavefront riding the edge — the foil recipe, cooked in a fragment
   shader on a canvas under the label, but in one colour: the foil is the
   button's own lavender, screened over the purple, so every shade it makes
   is a shade of the button. moving the pointer tilts the light, so the
   foil shifts while it is charged. a spring squashes the button on the
   press. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const MAX_RIP = 6; // concurrent ripples — a drum roll of clicks keeps six alive
const GROW_S = 0.5; // seconds for the wave to cross the button
const FADE_S = 0.5; // seconds for the charge to cool after release

const VS = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FS = `
precision highp float;
uniform vec2  uRes;
uniform float uCellPx;
uniform vec2  uPointer;   // 0..1, y up
uniform float uHover;
uniform float uFire;
uniform float uTime;
uniform vec3  uTint;      // the button's highlight colour — the foil is shades of it
uniform vec4  uRip[${MAX_RIP}]; // cx, cy (0..1, y up) · radius (height units) · charge

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 id = floor(gl_FragCoord.xy / uCellPx);
  vec2 cuv = (id + 0.5) * uCellPx / uRes; // the facet's centre, 0..1
  vec2 cp = cuv * asp;                     // the same in height units

  float h1 = hash(id + 0.13);
  float h2 = hash(id + 7.31);
  float h3 = hash(id + 3.77);
  float jit = (h2 - 0.5) * 0.09; // ragged wavefront, one facet either way

  /* every facet has its own tilt; the light hangs off the pointer, so
     moving the pointer over a charged button rolls the foil */
  vec3 N = normalize(vec3((h1 - 0.5) * 0.8, (h2 - 0.5) * 0.8, 1.0));
  vec3 L = normalize(vec3((uPointer - cuv) * 1.6, 0.9));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float diff = clamp(dot(N, L), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-L, N), V), 0.0, 1.0), 90.0);

  /* where the foil is: a soft glare under a hovering pointer, plus every
     live ripple — a hard, facet-quantised disc for the charge and a ring
     riding its edge for the wave */
  float dp = distance(cp, uPointer * asp);
  float mask = uHover * (1.0 - smoothstep(0.0, 0.95, dp)) * 0.4;
  float front = 0.0;
  for (int i = 0; i < ${MAX_RIP}; i++) {
    vec4 R = uRip[i];
    if (R.z <= 0.0) continue;
    float d = distance(cp, R.xy * asp) + jit;
    mask += (1.0 - step(R.z, d)) * R.w * 0.9;
    front += 1.0 - smoothstep(0.0, 0.14, abs(d - R.z));
  }
  mask = clamp(mask, 0.0, 1.0);
  front = clamp(front, 0.0, 1.0);
  float a = clamp(mask + front, 0.0, 1.0) * uFire;
  if (a <= 0.002) { gl_FragColor = vec4(0.0); return; }

  /* where the rainbow used to slide, bands of light and shade slide
     instead — the same movement with the pointer and the same drift, in
     the one colour */
  float phase = dot(cp, vec2(0.927, -0.375)) * 0.9
              - uPointer.x * 0.7 + uPointer.y * 0.45
              + uTime * 0.05 + (h1 - 0.5) * 0.12;
  float bands = 0.5 + 0.5 * sin(phase * 6.2832);
  vec3 shine = uTint * (0.35 + 0.65 * bands);

  /* fine wavy grooves, two incommensurate frequencies so the comb never repeats */
  float wob = sin(cp.y * 24.0 + cp.x * 9.0) * 2.4 + sin(cp.y * 61.0 - cp.x * 17.0) * 0.9;
  float ridge = pow(0.5 + 0.5 * (0.65 * sin(cp.x * 80.0 + wob) + 0.35 * sin(cp.x * 141.0 - wob * 0.7)), 2.0);
  shine *= 0.55 + 0.9 * ridge;
  shine *= 0.55 + 0.65 * diff;
  shine += mix(uTint, vec3(1.0), 0.6) * spec * mix(0.1, 1.5, pow(h3, 3.0)); // discrete sparkle

  /* the wavefront: tighter bands, paler and brighter, with its own glitter */
  float fbands = 0.5 + 0.5 * sin(phase * 13.8 + uTime * 1.6);
  vec3 ring = mix(uTint, vec3(1.0), 0.3) * (0.85 + 0.5 * fbands) + uTint * 0.35 * pow(h3, 2.0);

  vec3 col = (shine * mask + ring * front) / max(mask + front, 0.001);
  col = sqrt(clamp(col, 0.0, 1.0)); // a gamma lift, so the screen reads as light
  gl_FragColor = vec4(col * a, a); // premultiplied
}
`;

export function mount(el) {
  el.innerHTML =
    `<style>
.hb-stage{display:flex;justify-content:center;padding:.6em 0 .2em}
.hb-btn{--hb-hi:#a98bff;--hb-mid:#7c3aed;--hb-lo:#5b21b6;position:relative;isolation:isolate;overflow:hidden;font:inherit;letter-spacing:inherit;font-size:1.3em;font-weight:500;color:#fff;background:linear-gradient(180deg,var(--hb-hi) 0%,var(--hb-mid) 48%,var(--hb-lo) 100%);border:0;border-radius:999px;padding:.9em 2.1em;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;will-change:transform;user-select:none;-webkit-user-select:none;text-shadow:0 1px 1px rgba(30,10,70,.35);transition:box-shadow .35s ease;
  /* rim inside, a soft ring just outside, then the glow — no hard outline,
     so the foil's screen blend reads as light coming off the button */
  box-shadow:inset 0 1px 0 rgba(255,255,255,.42),inset 0 -1px 0 rgba(20,0,60,.25),inset 0 0 0 1px rgba(255,255,255,.16),0 0 0 3px rgba(124,58,237,.18),0 0 0 4px rgba(169,139,255,.28),0 4px 22px rgba(139,92,246,.42),0 0 64px rgba(124,58,237,.34)}
.hb-btn:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(20,0,60,.25),inset 0 0 0 1px rgba(255,255,255,.2),0 0 0 3px rgba(124,58,237,.22),0 0 0 4px rgba(169,139,255,.38),0 6px 28px rgba(139,92,246,.55),0 0 90px rgba(124,58,237,.45)}
.hb-btn:focus-visible{outline:1.5px solid var(--hb-hi);outline-offset:6px}
.hb-btn canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;mix-blend-mode:screen;border-radius:inherit}
.hb-btn .hb-label{position:relative;z-index:1;display:inline-flex;align-items:center;gap:.5em}
.hb-btn .hb-star{font-size:.85em;line-height:1;filter:drop-shadow(0 0 6px rgba(255,255,255,.8))}
.hb-row{display:flex;flex-wrap:wrap;gap:.5em 1.4em;align-items:center;justify-content:center;margin-top:1.4em}
.hb-row label{display:flex;align-items:center;gap:.5em;color:var(--dim)}
.hb-row input[type=range]{width:90px}
.hb-row output{color:var(--fg);min-width:2.5ch;font-variant-numeric:tabular-nums}
.hb-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
</style>` +
    '<div class="hb-stage"><button class="hb-btn" type="button" data-act>' +
    '<canvas aria-hidden="true"></canvas><span class="hb-label"><span class="hb-star" aria-hidden="true">✦</span>ship it</span>' +
    "</button></div>" +
    '<div class="hb-row">' +
    '<label>px <input type="range" min="2" max="16" value="6" data-p="px"><output>6</output></label>' +
    '<label>holo <input type="range" min="0" max="100" value="60" data-p="fire"><output>60</output></label>' +
    "</div>" +
    '<p class="hb-cap">click — the ripple is foil. hold it, and roll the light.</p>';

  const btn = el.querySelector(".hb-btn");
  const canvas = el.querySelector("canvas");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) {
    canvas.remove(); // a plain button is still a button
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
  for (const u of ["uRes", "uCellPx", "uPointer", "uHover", "uFire", "uTime", "uTint", "uRip"])
    U[u] = gl.getUniformLocation(prog, u);
  gl.clearColor(0, 0, 0, 0);

  /* the foil's colour is the button's own highlight, read off its css var
     so a restyle carries the foil with it */
  const tint = [0.66, 0.55, 1];
  const readTint = () => {
    const v = getComputedStyle(btn).getPropertyValue("--hb-hi").trim();
    const m = /^#([0-9a-f]{6})$/i.exec(v);
    if (!m) return;
    const n = parseInt(m[1], 16);
    tint[0] = (n >> 16) / 255;
    tint[1] = ((n >> 8) & 255) / 255;
    tint[2] = (n & 255) / 255;
  };

  /* ---- springs (svelte-motion constants) -------------------------------- */
  const spring = (x, s, d) => ({ x, t: x, v: 0, s, d });
  const sPtX = spring(0.5, 0.066, 0.25), sPtY = spring(0.5, 0.066, 0.25);
  const sHover = spring(0, 0.05, 0.3);
  const sScale = spring(1, 0.12, 0.28); // stiffer — a press should snap
  const springs = [sPtX, sPtY, sHover, sScale];
  const settled = (s) => Math.abs(s.t - s.x) < 0.0015 && Math.abs(s.v) < 0.0015;

  /* ---- ripples ---------------------------------------------------------- */
  const rips = [];
  const ripData = new Float32Array(MAX_RIP * 4);
  let held = null; // the ripple under the pressed pointer or key

  const aspect = () => (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
  const press = (u, v) => {
    const ax = aspect();
    // how far the wave has to travel to clear the last corner
    const far = Math.hypot(Math.max(u, 1 - u) * ax, Math.max(v, 1 - v)) + 0.25;
    const rip = { x: u, y: v, r: reduceMotion ? far : 0.02, far, speed: far / GROW_S, charge: 1, on: true };
    if (rips.length >= MAX_RIP) rips.shift();
    rips.push(rip);
    held = rip;
    sScale.t = 0.96;
    start();
  };
  const release = () => {
    if (held) held.on = false;
    held = null;
    sScale.t = 1;
    start();
  };

  const at = (e) => {
    const r = btn.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)),
    ];
  };
  const onMove = (e) => {
    const [u, v] = at(e);
    sPtX.t = u;
    sPtY.t = v;
    if (e.pointerType !== "touch") sHover.t = 1;
    start();
  };
  btn.addEventListener("pointermove", onMove);
  btn.addEventListener("pointerenter", onMove);
  btn.addEventListener("pointerleave", () => {
    sHover.t = 0;
    sPtX.t = 0.5;
    sPtY.t = 0.5;
    release();
  });
  btn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const [u, v] = at(e);
    sPtX.t = u;
    sPtY.t = v;
    if (e.pointerType === "touch") { sPtX.x = u; sPtY.x = v; }
    press(u, v);
  });
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointercancel", release);

  /* the keyboard presses from the middle, the way material does it */
  let keyDown = false;
  btn.addEventListener("keydown", (e) => {
    if ((e.key !== " " && e.key !== "Enter") || keyDown) return;
    keyDown = true;
    press(0.5, 0.5);
  });
  btn.addEventListener("keyup", (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    keyDown = false;
    release();
  });
  btn.addEventListener("blur", () => { keyDown = false; release(); });

  /* ---- controls --------------------------------------------------------- */
  const params = { px: 6, fire: 60 };
  for (const input of el.querySelectorAll("[data-p]")) {
    input.addEventListener("input", () => {
      params[input.dataset.p] = +input.value;
      input.nextElementSibling.textContent = input.value;
      start();
    });
  }

  /* ---- render loop: runs only while something moves ---------------------- */
  let raf = 0;
  let last = 0;
  let clock = 0;
  let alive = true;
  let idleFor = 0;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    return dpr;
  };

  const frame = (t) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min((t - last) / 1000, 0.032);
    last = t;
    clock += dt;

    let moving = false;
    for (const s of springs) {
      s.v += s.s * (s.t - s.x) - s.d * s.v;
      s.x += s.v;
      if (!settled(s)) moving = true;
    }
    btn.style.transform = `scale(${sScale.x.toFixed(4)})`;

    for (let i = rips.length - 1; i >= 0; i--) {
      const R = rips[i];
      R.r += dt * R.speed;
      if (!R.on) R.charge = Math.max(0, R.charge - dt / FADE_S);
      if (R.r > R.far && R.charge <= 0) rips.splice(i, 1);
    }
    ripData.fill(0);
    rips.forEach((R, i) => ripData.set([R.x, R.y, R.r, R.charge], i * 4));
    if (rips.length) moving = true;
    if (sHover.x > 0.002) moving = true;

    const dpr = resize();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uCellPx, params.px * dpr);
    gl.uniform2f(U.uPointer, sPtX.x, sPtY.x);
    gl.uniform1f(U.uHover, Math.max(0, Math.min(1, sHover.x)));
    gl.uniform1f(U.uFire, params.fire / 100);
    gl.uniform1f(U.uTime, clock);
    gl.uniform3fv(U.uTint, tint);
    gl.uniform4fv(U.uRip, ripData);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* a beat of stillness before the loop sleeps, so a settling spring's
       last pixel lands */
    idleFor = moving ? 0 : idleFor + dt;
    if (idleFor < 0.2) raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (!raf && alive) {
      readTint();
      last = performance.now();
      idleFor = 0;
      raf = requestAnimationFrame(frame);
    }
  };
  /* the canvas keeps its size in step with the button, and the host's
     width goes into a css var so a tile can scale the button to itself */
  const ro = new ResizeObserver(() => {
    el.style.setProperty("--hb-w", `${el.clientWidth}px`);
    start();
  });
  ro.observe(btn);
  ro.observe(el);
  start();

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
