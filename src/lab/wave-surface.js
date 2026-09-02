/* lab/wave-surface — a pulsing waveform surface. one rounded block per
   cell, floating as a flexible sheet: a generative music loop (soft kick,
   drone, pentatonic arpeggio — synthesized, nothing shipped) plays from
   load with its output muted, and its time-domain waveform is injected
   along the center line every frame; a damped wave equation carries it
   outward as ripples while the whole sheet swells on the beat. a tap
   unmutes so the track can play out; another tap mutes it again. block
   color rides a heat ramp on displacement — calm blue, red where the
   wave is violent — faded by depth. until the browser lets audio run
   (first interaction), the pond just drips. hover tilts the camera. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const NZ = 40; // rows of the sheet
const WX = 1.25; // world half-width of the disc
const WZR = 1.05; // world half-depth of the disc
const ZC = 0.15; // where the disc's center sits in depth
const REST = -0.16; // resting height of the sheet
const AMP = 0.38; // world height of a full-scale wave
const SWELL = 0.16; // the resting surface is already a rolling wave
const D = 3.1; // camera distance
const FOC = 2.6; // focal length
const PITCH = 0.36; // grazing look, out across the water
const FFT = 1024;

// wave equation, tuned soft: ripples cross the sheet in ~a second and die
const SIM_H = 1 / 240;
const C = 0.3;
const DAMP = 0.992;
const VISC = 0.16; // velocity diffusion — cell-scale chatter dies, swells live

// 72bpm, sixteenth-note grid; a-minor pentatonic
const TICK_S = 60 / 72 / 4;
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440];

/* heat ramp: warm blue → teal → amber → red, indexed by |displacement| */
const STOPS = [
  [37, 99, 235],
  [20, 184, 166],
  [245, 158, 11],
  [239, 68, 68],
];
const NLVL = 16;
const heat = (t) => {
  const x = Math.min(0.999, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.floor(x), f = x - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(
    a[1] + (b[1] - a[1]) * f,
  )},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
};
const LEVEL = Array.from({ length: NLVL }, (_, k) => heat(k / (NLVL - 1)));

/* the band: everything routes through mix → analyser → master, so the
   analyser keeps hearing the track while the master sits muted at 0 */
function buildMusic() {
  const ac = new AudioContext();
  const mix = ac.createGain();
  const analyser = ac.createAnalyser();
  analyser.fftSize = FFT;
  const master = ac.createGain();
  master.gain.value = 0;
  mix.connect(analyser);
  analyser.connect(master);
  master.connect(ac.destination);

  // drone: root + octave, barely there
  for (const [f, g] of [[55, 0.05], [110, 0.035]]) {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    const og = ac.createGain();
    og.gain.value = g;
    osc.connect(og);
    og.connect(mix);
    osc.start();
  }

  // arpeggio bus: lowpass + feedback delay for the wash
  const lp = ac.createBiquadFilter();
  lp.frequency.value = 1900;
  const delay = ac.createDelay(1);
  delay.delayTime.value = TICK_S * 3;
  const fb = ac.createGain();
  fb.gain.value = 0.34;
  delay.connect(fb);
  fb.connect(delay);
  lp.connect(mix);
  lp.connect(delay);
  delay.connect(mix);

  const kick = (t) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g);
    g.connect(mix);
    osc.start(t);
    osc.stop(t + 0.32);
  };

  const pluck = (t) => {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = SCALE[(Math.random() * SCALE.length) | 0];
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(g);
    g.connect(lp);
    osc.start(t);
    osc.stop(t + 0.5);
  };

  // lookahead scheduler on the sixteenth grid
  let step = 0;
  let nextT = 0;
  const timer = setInterval(() => {
    if (ac.state !== "running") return;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.25) {
      if (step % 8 === 0) kick(nextT);
      if (step % 2 === 0 && Math.random() < 0.55) pluck(nextT);
      step++;
      nextT += TICK_S;
    }
  }, 100);

  return {
    ac,
    analyser,
    master,
    wave: new Uint8Array(FFT),
    dispose() {
      clearInterval(timer);
      ac.close();
    },
  };
}

export function mount(el) {
  el.innerHTML =
    `<style>
.ws-stage{position:relative;width:100%;max-width:420px;aspect-ratio:1;margin:0 auto;touch-action:pan-y;cursor:pointer}
.ws-stage canvas{width:100%;height:100%;display:block}
.ws-tag{position:absolute;left:14px;bottom:10px;color:var(--dim);pointer-events:none;user-select:none}
.ws-row{display:flex;flex-wrap:wrap;gap:.5em 1.2em;align-items:center;justify-content:center;margin-top:1em}
.ws-row label{display:flex;align-items:center;gap:.5em;color:var(--dim)}
.ws-row input[type=range]{width:90px;accent-color:var(--green)}
.ws-row output{color:var(--fg);min-width:3ch;font-variant-numeric:tabular-nums}
.ws-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
</style>` +
    '<div class="ws-stage"><canvas></canvas><span class="ws-tag">tap for sound</span></div>' +
    '<div class="ws-row">' +
    '<label>cells <input type="range" min="28" max="64" value="44" data-p="bins"><output>44</output></label>' +
    '<label>gain <input type="range" min="60" max="260" value="140" data-p="gain"><output>140</output></label>' +
    "</div>" +
    '<p class="ws-cap">the loop is always playing, just muted — tap for sound.</p>';

  const stage = el.querySelector(".ws-stage");
  const canvas = el.querySelector("canvas");
  const tag = el.querySelector(".ws-tag");
  const ctx = canvas.getContext("2d");

  const params = { bins: 44, gain: 140 };
  let u, v, prev, sm, ins; // height + velocity fields, injected line state, disc mask
  const resetField = () => {
    const n = params.bins;
    u = new Float32Array(n * NZ);
    v = new Float32Array(n * NZ);
    prev = new Float32Array(n);
    sm = new Float32Array(n);
    ins = new Uint8Array(n * NZ);
    for (let i = 0; i < NZ; i++)
      for (let x = 0; x < n; x++) {
        const a = ((x + 0.5) / n) * 2 - 1;
        const b = ((i + 0.5) / NZ) * 2 - 1;
        ins[i * n + x] = a * a + b * b <= 1.02 ? 1 : 0;
      }
  };
  resetField();

  /* theme dim resolved from the css vars, refreshed on scheme flips */
  let dim = "#777";
  const readColors = () => {
    const cs = getComputedStyle(el);
    dim = cs.getPropertyValue("--dim").trim() || dim;
  };
  readColors();
  const mq = matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", readColors);

  for (const input of el.querySelectorAll("[data-p]"))
    input.addEventListener("input", () => {
      params[input.dataset.p] = +input.value;
      input.nextElementSibling.textContent = input.value;
      if (input.dataset.p === "bins") resetField();
    });

  /* ---- the always-playing loop ------------------------------------------- */

  const music = buildMusic();
  let unmuted = false;
  let nextDrip = 0;

  const setTag = () => {
    tag.textContent = unmuted ? "playing — tap to mute" : "tap for sound";
  };

  // the browser gates audio behind the first interaction; take the earliest
  // one anywhere on the page so the muted loop starts driving the surface
  music.ac.resume().catch(() => {});
  const wake = () => music.ac.resume().catch(() => {});
  addEventListener("pointerdown", wake, { once: true });

  /* tap toggles the mute; a real drag (scroll on touch) doesn't */
  let px0 = 0, py0 = 0;
  stage.addEventListener("pointerdown", (e) => {
    px0 = e.clientX;
    py0 = e.clientY;
  });
  stage.addEventListener("pointerup", (e) => {
    if (Math.abs(e.clientX - px0) + Math.abs(e.clientY - py0) > 6) return;
    unmuted = !unmuted;
    music.ac.resume().catch(() => {});
    music.master.gain.setTargetAtTime(unmuted ? 0.8 : 0, music.ac.currentTime, 0.08);
    setTag();
  });

  // pond drips stand in while the context is still suspended
  const drip = (t) => {
    nextDrip = t + 700 + Math.random() * 1600;
    const n = params.bins;
    // land the drip somewhere well inside the disc
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * 0.7;
    const cx = (n / 2) * (1 + Math.cos(ang) * rad);
    const cz = (NZ / 2) * (1 + Math.sin(ang) * rad);
    const amp = 0.35 + Math.random() * 0.4;
    const dr = n * 0.11; // drip footprint scales with the grid
    for (let i = 0; i < NZ; i++)
      for (let x = 0; x < n; x++) {
        const d2 = (x - cx) ** 2 + (i - cz) ** 2;
        if (d2 < dr * dr && ins[i * n + x])
          v[i * n + x] += amp * Math.exp(-d2 / (dr * dr * 0.3));
      }
  };

  const injectWave = () => {
    const { analyser, wave } = music;
    analyser.getByteTimeDomainData(wave);
    const n = params.bins;
    const zc = NZ >> 1;
    const stride = wave.length / n;
    const k = (params.gain / 100) * 1.2;
    let rms = 0;
    const d = new Float32Array(n);
    for (let x = 0; x < n; x++) {
      const s = (wave[(x * stride) | 0] - 128) / 128;
      // drive with the sample's change, not its value: steady tones cancel
      // out instead of pumping the sheet, transients kick it
      d[x] = s - prev[x];
      prev[x] = s;
      rms += s * s;
    }
    // soft blurs keep the injected line a wavefront, not speckle
    for (let pass = 0; pass < 4; pass++)
      for (let x = 0; x < n; x++)
        d[x] =
          0.5 * d[x] +
          0.25 * d[Math.max(0, x - 1)] +
          0.25 * d[Math.min(n - 1, x + 1)];
    // low-pass the line over time: frame-to-frame chatter cancels while a
    // kick's transient still punches through as one clean wavefront
    for (let x = 0; x < n; x++) {
      sm[x] += (d[x] - sm[x]) * 0.22;
      v[zc * n + x] += sm[x] * k;
    }
    return Math.sqrt(rms / n);
  };

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

  /* ---- wave equation ------------------------------------------------------ */

  const simStep = () => {
    const n = params.bins;
    for (let i = 0; i < NZ; i++)
      for (let x = 0; x < n; x++) {
        const idx = i * n + x;
        if (!ins[idx]) continue;
        const uc = u[idx];
        // outside-the-disc neighbors mirror the cell — ripples bounce off
        // the circular rim instead of a hidden square border
        const iL = i * n + Math.max(0, x - 1);
        const iR = i * n + Math.min(n - 1, x + 1);
        const iU = Math.max(0, i - 1) * n + x;
        const iD = Math.min(NZ - 1, i + 1) * n + x;
        const lap =
          (ins[iL] ? u[iL] : uc) +
          (ins[iR] ? u[iR] : uc) +
          (ins[iU] ? u[iU] : uc) +
          (ins[iD] ? u[iD] : uc) -
          4 * uc;
        v[idx] = (v[idx] + lap * C) * DAMP;
      }
    // diffuse velocity a touch, then integrate; the leak bleeds off any
    // height the damping alone can't reach
    for (let i = 0; i < NZ; i++)
      for (let x = 0; x < n; x++) {
        const idx = i * n + x;
        if (!ins[idx]) continue;
        const iL = i * n + Math.max(0, x - 1);
        const iR = i * n + Math.min(n - 1, x + 1);
        const iU = Math.max(0, i - 1) * n + x;
        const iD = Math.min(NZ - 1, i + 1) * n + x;
        const avg =
          ((ins[iL] ? v[iL] : v[idx]) +
            (ins[iR] ? v[iR] : v[idx]) +
            (ins[iU] ? v[iU] : v[idx]) +
            (ins[iD] ? v[iD] : v[idx])) *
          0.25;
        v[idx] += (avg - v[idx]) * VISC;
      }
    for (let idx = 0; idx < u.length; idx++) u[idx] = (u[idx] + v[idx]) * 0.998;
  };

  /* ---- render ------------------------------------------------------------- */

  let lift = 0; // the whole sheet swells on the beat

  const render = () => {
    // a fine grid pushes thousands of translucent fills per frame — trade
    // resolution for pixels so canvas 2d keeps up
    const dpr = Math.min(devicePixelRatio || 1, params.bins > 44 ? 1.25 : 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);

    // oversized on purpose: the disc bleeds past the container's crop
    const S = Math.min(w, h) * 0.52;
    const cx = w * 0.5;
    const cy = h * 0.54;
    const cp = Math.cos(PITCH + pitchOff), sp = Math.sin(PITCH + pitchOff);
    const cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const n = params.bins;
    // tiny cells, generously spaced — the wave shows through the air between
    const side = Math.min((2 * WX) / n, (2 * WZR) / NZ) * 0.48;
    const ts = last / 1000; // for the ambient swell

    // painter's order: farthest row (i = 0) first, front row last
    for (let i = 0; i < NZ; i++) {
      const b = ((i + 0.5) / NZ) * 2 - 1;
      const zRow = ZC + b * WZR;
      const fog = 0.15 + 0.85 * ((i + 0.5) / NZ);
      const levels = []; // one path per heat level → one fill each
      for (let x = 0; x < n; x++) {
        if (!ins[i * n + x]) continue;
        const a = ((x + 0.5) / n) * 2 - 1;
        const wx = a * WX;
        const d = Math.max(-1.2, Math.min(1.2, u[i * n + x]));
        // two traveling swells under the data — the base is already a wave,
        // and every sound just adds to it
        const swell =
          SWELL *
          (0.62 * Math.sin(a * 2.2 + b * 1.2 + ts * 0.85) +
            0.38 * Math.sin(b * 3.1 - a * 0.7 - ts * 0.6));
        const wy = REST + d * AMP + swell + lift;
        const x1 = wx * cyw + zRow * syw;
        const z1 = -wx * syw + zRow * cyw;
        const y2 = wy * cp - z1 * sp;
        const z2 = wy * sp + z1 * cp;
        const pers = FOC / (D - z2);
        const gx = cx + x1 * pers * S;
        const gy = cy - y2 * pers * S;
        const r = side * 0.5 * pers * S;
        // the swell tints the low blues; only real sound climbs the ramp
        const tot = Math.abs(d + (swell / AMP) * 0.55);
        const lvl = Math.min(NLVL - 1, (tot * NLVL * 1.3) | 0);
        const p = (levels[lvl] ??= new Path2D());
        // arcs are what hurt — below ~4px of radius the rounding is invisible
        if (r < 4) p.rect(gx - r, gy - r, r * 2, r * 2);
        else p.roundRect(gx - r, gy - r, r * 2, r * 2, r * 0.4);
      }
      ctx.globalAlpha = 0.6 * fog + 0.08; // translucent — ripples glow through
      for (let k = 0; k < NLVL; k++)
        if (levels[k]) {
          ctx.fillStyle = k === 0 ? dim : LEVEL[k];
          ctx.fill(levels[k]);
        }
    }
    ctx.globalAlpha = 1;
  };

  /* ---- loop ---------------------------------------------------------------- */

  let raf = 0;
  let last = 0;
  let acc = 0;
  let alive = true;

  const frame = (t) => {
    if (!alive) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    let rms = 0;
    if (music.ac.state === "running") rms = injectWave();
    else if (t >= nextDrip) drip(t);
    lift += (rms * 0.55 - lift) * Math.min(1, dt * 10);

    acc = Math.min(acc + dt, SIM_H * 4);
    while (acc >= SIM_H) {
      simStep();
      acc -= SIM_H;
    }

    const ease = Math.min(1, dt * 7);
    yaw += (yawT - yaw) * ease;
    pitchOff += (pitchT - pitchOff) * ease;

    render();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    music.dispose();
    removeEventListener("pointerdown", wake);
    mq.removeEventListener("change", readColors);
  };
}
