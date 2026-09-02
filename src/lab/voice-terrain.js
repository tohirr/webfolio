/* lab/voice-terrain — a scrolling spectrogram terrain built from voxel
   blocks. the mic feeds an analyser; every ~75ms the newest spectrum row
   rises at the front edge and marches away into the fog, so a second of
   speech leaves a mountain range behind it. columns are stacks of square
   blocks on a heat ramp — quiet blue at the ground, red at the peaks —
   faded by depth. runs on a synthetic "quiet room" signal until the
   visitor taps the mic on; a tap toggles it back off. hover tilts the
   camera a little. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const NZ = 22; // rows of history
const NY = 10; // max voxels per column
const PUSH_MS = 75; // one new spectrum row per push
const UY = 0.085; // world height of one voxel
const STEP = 0.11; // world depth of one row
const Z0 = 1.0; // front edge
const BASE = -0.52; // ground plane
const D = 3.1; // camera distance
const FOC = 2.6; // focal length
const PITCH = 0.45; // downward look
const FFT = 1024;

/* heat ramp: warm blue → teal → amber → red, one color per voxel level */
const STOPS = [
  [37, 99, 235],
  [20, 184, 166],
  [245, 158, 11],
  [239, 68, 68],
];
const heat = (t) => {
  const x = Math.min(0.999, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.floor(x), f = x - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(
    a[1] + (b[1] - a[1]) * f,
  )},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
};
const LEVEL = Array.from({ length: NY + 1 }, (_, k) =>
  heat(k <= 1 ? 0 : (k - 1) / (NY - 1)),
);

export function mount(el) {
  el.innerHTML =
    `<style>
.vt-stage{position:relative;width:100%;max-width:420px;aspect-ratio:1;margin:0 auto;touch-action:pan-y;cursor:pointer}
.vt-stage canvas{width:100%;height:100%;display:block}
.vt-tag{position:absolute;left:14px;bottom:10px;color:var(--dim);pointer-events:none;user-select:none}
.vt-row{display:flex;flex-wrap:wrap;gap:.5em 1.2em;align-items:center;justify-content:center;margin-top:1em}
.vt-row label{display:flex;align-items:center;gap:.5em;color:var(--dim)}
.vt-row input[type=range]{width:90px;accent-color:var(--green)}
.vt-row output{color:var(--fg);min-width:3ch;font-variant-numeric:tabular-nums}
.vt-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
</style>` +
    '<div class="vt-stage"><canvas></canvas><span class="vt-tag">tap → mic</span></div>' +
    '<div class="vt-row">' +
    '<label>bins <input type="range" min="12" max="36" value="24" data-p="bins"><output>24</output></label>' +
    '<label>gain <input type="range" min="60" max="260" value="140" data-p="gain"><output>140</output></label>' +
    "</div>" +
    '<p class="vt-cap">speak — the terrain remembers. tap toggles the mic.</p>';

  const stage = el.querySelector(".vt-stage");
  const canvas = el.querySelector("canvas");
  const tag = el.querySelector(".vt-tag");
  const ctx = canvas.getContext("2d");

  const params = { bins: 24, gain: 140 };
  let rows = []; // rows[0] is the newest, at the front edge
  const blank = () => new Float32Array(params.bins);
  const resetRows = () => {
    rows = Array.from({ length: NZ }, blank);
  };
  resetRows();

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

  for (const input of el.querySelectorAll("[data-p]"))
    input.addEventListener("input", () => {
      params[input.dataset.p] = +input.value;
      input.nextElementSibling.textContent = input.value;
      if (input.dataset.p === "bins") resetRows();
    });

  /* ---- signal: quiet-room noise until the mic is granted ----------------- */

  let audio = null; // { ac, analyser, stream, freq }
  let edges = [];

  // log-spaced bin edges over ~0–8khz, where the voice lives
  const rebin = () => {
    if (!audio) return;
    const limit = Math.min(186, audio.analyser.frequencyBinCount);
    edges = [];
    for (let i = 0; i <= params.bins; i++)
      edges.push(1 + Math.floor(Math.pow(i / params.bins, 1.7) * (limit - 1)));
  };

  const micRow = () => {
    const { analyser, freq } = audio;
    analyser.getByteFrequencyData(freq);
    if (edges.length !== params.bins + 1) rebin();
    const row = blank();
    for (let x = 0; x < params.bins; x++) {
      const lo = edges[x];
      const hi = Math.max(lo + 1, edges[x + 1]);
      let sum = 0;
      for (let k = lo; k < hi; k++) sum += freq[k];
      const v = Math.pow(sum / (hi - lo) / 255, 1.6) * (params.gain / 100);
      row[x] = Math.min(NY, Math.round(v * NY));
    }
    return row;
  };

  const idleRow = (t) => {
    const row = blank();
    const n = params.bins;
    const wander = n * (0.5 + Math.sin(t * 0.33) * 0.3);
    for (let x = 0; x < n; x++) {
      const swell =
        0.5 + 0.5 * Math.sin(x * 0.55 + t * 1.1) * Math.sin(x * 0.23 - t * 0.7 + 2.1);
      const bump = Math.exp(-((x - wander) ** 2) / 18);
      row[x] = Math.round(swell * 1.5 + bump * 2.2 + Math.random() * 0.5);
    }
    return row;
  };

  const setTag = () => {
    tag.textContent = audio ? "listening" : "tap → mic";
  };

  const disableMic = () => {
    if (!audio) return;
    for (const t of audio.stream.getTracks()) t.stop();
    audio.ac.close();
    audio = null;
    setTag();
  };

  const enableMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = new AudioContext();
      const analyser = ac.createAnalyser();
      analyser.fftSize = FFT;
      analyser.smoothingTimeConstant = 0.55;
      ac.createMediaStreamSource(stream).connect(analyser);
      audio = { ac, analyser, stream, freq: new Uint8Array(analyser.frequencyBinCount) };
      rebin();
      setTag();
    } catch {
      tag.textContent = "mic blocked";
    }
  };

  /* tap toggles the mic; a real drag (scroll on touch) doesn't */
  let px0 = 0, py0 = 0;
  stage.addEventListener("pointerdown", (e) => {
    px0 = e.clientX;
    py0 = e.clientY;
  });
  stage.addEventListener("pointerup", (e) => {
    if (Math.abs(e.clientX - px0) + Math.abs(e.clientY - py0) > 6) return;
    if (audio) disableMic();
    else enableMic();
  });

  /* ---- hover parallax ----------------------------------------------------- */

  let yaw = 0, pitchOff = 0, yawT = 0, pitchT = 0;
  stage.addEventListener("pointermove", (e) => {
    if (reduceMotion) return;
    const r = stage.getBoundingClientRect();
    yawT = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
    pitchT = ((e.clientY - r.top) / r.height - 0.5) * 0.22;
  });
  stage.addEventListener("pointerleave", () => {
    yawT = 0;
    pitchT = 0;
  });

  /* ---- render ------------------------------------------------------------- */

  const render = (frac) => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);

    const S = Math.min(w, h) * 0.38;
    const cx = w * 0.5;
    const cy = h * 0.56;
    const cp = Math.cos(PITCH + pitchOff), sp = Math.sin(PITCH + pitchOff);
    const cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const n = params.bins;
    const sx = 2 / n;
    const side = Math.min(sx, UY) * 0.72; // world block size, gaps both ways

    // painter's order: farthest row first, front row last
    for (let i = NZ - 1; i >= 0; i--) {
      const zRow = Z0 - (i + frac) * STEP;
      const fog = Math.max(0, 1 - ((i + frac) / NZ) * 0.92);
      const ground = new Path2D();
      const levels = []; // one path per voxel level → one fill per heat color
      const row = rows[i];
      // the newest row rises into place at the front edge
      const grow = i === 0 ? frac : 1;
      for (let x = 0; x < n; x++) {
        const wx = -1 + (x + 0.5) * sx;
        const hCol = Math.round(row[x] * grow);
        for (let k = 0; k <= hCol; k++) {
          const wy = BASE + k * UY;
          // yaw then pitch, then perspective
          const x1 = wx * cyw + zRow * syw;
          const z1 = -wx * syw + zRow * cyw;
          const y2 = wy * cp - z1 * sp;
          const z2 = wy * sp + z1 * cp;
          const pers = FOC / (D - z2);
          const gx = cx + x1 * pers * S;
          const gy = cy - y2 * pers * S;
          const r = (k === 0 ? side * 0.2 : side * 0.5) * pers * S;
          const path = k === 0 ? ground : (levels[k] ??= new Path2D());
          path.roundRect(gx - r, gy - r, r * 2, r * 2, r * 0.4);
        }
      }
      ctx.fillStyle = dim;
      ctx.globalAlpha = 0.4 * fog + 0.06;
      ctx.fill(ground);
      ctx.globalAlpha = 0.6 * fog + 0.08; // translucent — stacks glow through
      for (let k = 1; k < levels.length; k++)
        if (levels[k]) {
          ctx.fillStyle = LEVEL[k];
          ctx.fill(levels[k]);
        }
    }
    ctx.globalAlpha = 1;
  };

  /* ---- loop ---------------------------------------------------------------- */

  let raf = 0;
  let last = 0;
  let lastPush = 0;
  let alive = true;

  const frame = (t) => {
    if (!alive) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    if (t - lastPush >= PUSH_MS) {
      // after a background stall, restart the clock instead of spiraling
      if (t - lastPush > PUSH_MS * 4) lastPush = t - PUSH_MS;
      lastPush += PUSH_MS;
      rows.pop();
      rows.unshift(audio ? micRow() : idleRow(t / 1000));
    }

    const ease = Math.min(1, dt * 7);
    yaw += (yawT - yaw) * ease;
    pitchOff += (pitchT - pitchOff) * ease;

    render(Math.min(1, (t - lastPush) / PUSH_MS));
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    disableMic();
    mq.removeEventListener("change", readColors);
  };
}
