/* lab/feedback-field — an endless music visualizer in the milkdrop
   tradition, rendered on a coarse dot grid. the state is a 44×44 field
   of intensities; every frame it is redrawn as a slightly warped, decayed
   echo of itself (zoom, rotation and swirl that never stop drifting), and
   the music only injects energy — bass thumps a blob at a wandering
   center, mids feed six emitters on a slow-turning ring, treble sparkles
   single cells. the state never resets and the warp never settles, so it
   never repeats. a generative beat plays from load with its output muted
   (stock loop for now — song upload later); tap for sound. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const N = 44; // field is N×N cells
const NB = 10; // spectrum bands: 0-1 bass, 2-7 emitters, 8-9 treble
const NLVL = 16; // color ramp resolution
const VMAX = 1.5; // field values clamp here
const FFT = 1024;

// 100bpm, sixteenth-note grid
const TICK_S = 60 / 100 / 4;
// bass riff over one bar, 0 = rest
const RIFF = [55, 0, 0, 55, 0, 0, 65.41, 0, 55, 0, 0, 82.41, 0, 73.42, 0, 0];

/* ---- the band: mix → analyser → master(0) → out ------------------------- */

function buildMusic() {
  const ac = new AudioContext();
  const mix = ac.createGain();
  const analyser = ac.createAnalyser();
  analyser.fftSize = FFT;
  analyser.smoothingTimeConstant = 0.55;
  const master = ac.createGain();
  master.gain.value = 0;
  mix.connect(analyser);
  analyser.connect(master);
  master.connect(ac.destination);

  // shared noise buffer for the hats
  const noise = ac.createBuffer(1, (ac.sampleRate * 0.2) | 0, ac.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  // stab bus: lowpass + feedback delay for the wash
  const lp = ac.createBiquadFilter();
  lp.frequency.value = 1400;
  const delay = ac.createDelay(1);
  delay.delayTime.value = TICK_S * 3;
  const fb = ac.createGain();
  fb.gain.value = 0.3;
  delay.connect(fb);
  fb.connect(delay);
  lp.connect(mix);
  lp.connect(delay);
  delay.connect(mix);

  const kick = (t) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g);
    g.connect(mix);
    osc.start(t);
    osc.stop(t + 0.3);
  };

  const hat = (t, v) => {
    const src = ac.createBufferSource();
    src.buffer = noise;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6500;
    const g = ac.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hp);
    hp.connect(g);
    g.connect(mix);
    src.start(t);
    src.stop(t + 0.07);
  };

  const bass = (t, f) => {
    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.value = f;
    const flt = ac.createBiquadFilter();
    flt.frequency.value = 420;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(flt);
    flt.connect(g);
    g.connect(mix);
    osc.start(t);
    osc.stop(t + 0.3);
  };

  const stab = (t) => {
    for (const f of [220, 261.63, 329.63]) {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(g);
      g.connect(lp);
      osc.start(t);
      osc.stop(t + 0.65);
    }
  };

  // lookahead scheduler on the sixteenth grid
  let step = 0;
  let nextT = 0;
  const timer = setInterval(() => {
    if (ac.state !== "running") return;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.25) {
      if (step % 4 === 0) kick(nextT);
      if (step % 4 === 2) hat(nextT, 0.16);
      else if (Math.random() < 0.12) hat(nextT, 0.07);
      const f = RIFF[step % 16];
      if (f) bass(nextT, f);
      if (step % 32 === 16 && Math.random() < 0.6) stab(nextT);
      step++;
      nextT += TICK_S;
    }
  }, 100);

  return {
    ac,
    analyser,
    master,
    freq: new Uint8Array(analyser.frequencyBinCount),
    dispose() {
      clearInterval(timer);
      ac.close();
    },
  };
}

export function mount(el) {
  el.innerHTML =
    `<style>
.ff-stage{position:relative;width:100%;max-width:420px;aspect-ratio:1;margin:0 auto;touch-action:pan-y;cursor:pointer}
.ff-stage canvas{width:100%;height:100%;display:block}
.ff-tag{position:absolute;left:14px;bottom:10px;color:var(--dim);pointer-events:none;user-select:none}
.ff-row{display:flex;flex-wrap:wrap;gap:.5em 1.2em;align-items:center;justify-content:center;margin-top:1em}
.ff-row label{display:flex;align-items:center;gap:.5em;color:var(--dim)}
.ff-row input[type=range]{width:90px;accent-color:var(--green)}
.ff-row output{color:var(--fg);min-width:3ch;font-variant-numeric:tabular-nums}
.ff-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
</style>` +
    '<div class="ff-stage"><canvas></canvas><span class="ff-tag">tap for sound</span></div>' +
    '<div class="ff-row">' +
    '<label>trail <input type="range" min="20" max="70" value="42" data-p="trail"><output>42</output></label>' +
    '<label>gain <input type="range" min="60" max="260" value="140" data-p="gain"><output>140</output></label>' +
    "</div>" +
    '<p class="ff-cap">every frame is a warped echo of the last — the beat only adds energy. it never repeats.</p>';

  const stage = el.querySelector(".ff-stage");
  const canvas = el.querySelector("canvas");
  const tag = el.querySelector(".ff-tag");
  const ctx = canvas.getContext("2d");

  const params = { trail: 42, gain: 140 };

  for (const input of el.querySelectorAll("[data-p]"))
    input.addEventListener("input", () => {
      params[input.dataset.p] = +input.value;
      input.nextElementSibling.textContent = input.value;
    });

  /* ---- theme: ramp fg → ink → green, sprites per level ------------------- */

  const hex = (s, fall) => {
    const m = /^#([0-9a-f]{6})$/i.exec(s.trim());
    if (!m) return fall;
    const v = parseInt(m[1], 16);
    return [v >> 16, (v >> 8) & 255, v & 255];
  };
  const lerp3 = (a, b, t) => [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];

  let sprites = [];
  let lattice = null; // pre-rendered resting grid, rebuilt on resize
  const readColors = () => {
    const cs = getComputedStyle(el);
    const fg = hex(cs.getPropertyValue("--fg"), [143, 143, 143]);
    const ink = hex(cs.getPropertyValue("--ink"), [255, 255, 255]);
    const green = hex(cs.getPropertyValue("--green"), [74, 222, 128]);
    sprites = Array.from({ length: NLVL }, (_, k) => {
      const t = k / (NLVL - 1);
      // grey through ink, the top of the ramp tips into green
      const c = t < 0.6 ? lerp3(fg, ink, t / 0.6) : lerp3(ink, green, (t - 0.6) / 0.4);
      const cv = document.createElement("canvas");
      cv.width = cv.height = 32;
      const g = cv.getContext("2d");
      g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      g.beginPath();
      g.arc(16, 16, 15, 0, Math.PI * 2);
      g.fill();
      return cv;
    });
    lattice = null;
  };
  readColors();
  const mq = matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", readColors);

  /* ---- the always-playing loop ------------------------------------------- */

  const music = buildMusic();
  let unmuted = false;

  const setTag = () => {
    tag.textContent = unmuted ? "playing — tap to mute" : "tap for sound";
  };

  // audio is gated behind the first interaction; take the earliest one
  // anywhere on the page so the muted loop starts driving the field
  music.ac.resume().catch(() => {});
  const wake = () => music.ac.resume().catch(() => {});
  addEventListener("pointerdown", wake, { once: true });

  /* tap toggles the mute; a real drag (scroll on touch) doesn't */
  let dx0 = 0, dy0 = 0;
  stage.addEventListener("pointerdown", (e) => {
    dx0 = e.clientX;
    dy0 = e.clientY;
  });
  stage.addEventListener("pointerup", (e) => {
    if (Math.abs(e.clientX - dx0) + Math.abs(e.clientY - dy0) > 6) return;
    unmuted = !unmuted;
    music.ac.resume().catch(() => {});
    music.master.gain.setTargetAtTime(unmuted ? 0.8 : 0, music.ac.currentTime, 0.08);
    setTag();
  });

  /* ---- spectrum → bands with adaptive floor ------------------------------- */

  const bandE = new Float32Array(NB);
  const bandBase = new Float32Array(NB);
  let edges = [];
  const rebin = () => {
    const limit = Math.min(200, music.analyser.frequencyBinCount);
    edges = [];
    for (let i = 0; i <= NB; i++)
      edges.push(1 + Math.floor(Math.pow(i / NB, 1.8) * (limit - 1)));
  };
  rebin();

  const readBands = () => {
    const { analyser, freq } = music;
    analyser.getByteFrequencyData(freq);
    for (let b = 0; b < NB; b++) {
      const lo = edges[b];
      const hi = Math.max(lo + 1, edges[b + 1]);
      let sum = 0;
      for (let k = lo; k < hi; k++) sum += freq[k];
      const v = Math.pow(sum / (hi - lo) / 255, 1.5);
      // slow floor so standing tones don't hold the field lit — only
      // change injects; fast attack, slow release
      bandBase[b] += (v - bandBase[b]) * 0.015;
      const sig = Math.max(0, v - bandBase[b] - 0.02) * 2.4;
      bandE[b] = Math.max(sig, bandE[b] * 0.9);
    }
  };

  // synthetic pulse until the browser lets the audio context run
  const idleBands = (ts) => {
    const beat = Math.pow(0.5 + 0.5 * Math.sin(ts * 2.6), 4) * 0.5;
    bandE[0] = bandE[1] = beat;
    for (let b = 2; b < 8; b++)
      bandE[b] = 0.1 * (0.5 + 0.5 * Math.sin(ts * 0.9 + b * 1.3));
    bandE[8] = bandE[9] = 0.04;
  };

  /* ---- the field ----------------------------------------------------------- */

  let field = new Float32Array(N * N);
  let next = new Float32Array(N * N);

  const blob = (bx, by, r, amt) => {
    const x0 = Math.max(0, (bx - r) | 0);
    const x1 = Math.min(N - 1, Math.ceil(bx + r));
    const y0 = Math.max(0, (by - r) | 0);
    const y1 = Math.min(N - 1, Math.ceil(by + r));
    const s2 = r * r * 0.45;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const d2 = (x - bx) ** 2 + (y - by) ** 2;
        const i = y * N + x;
        field[i] = Math.min(VMAX, field[i] + amt * Math.exp(-d2 / s2));
      }
  };

  let armAng = 0; // emitter ring rotation

  const stepField = (dt, ts) => {
    const gain = params.gain / 100;
    const warp = reduceMotion ? 0.25 : 1;

    // drifting warp: expansion, rotation and swirl wander on slow,
    // incommensurate sines — the combination never revisits a state
    const ex = 1 + (0.16 + 0.14 * Math.sin(ts * 0.037 + 1.2)) * warp * dt;
    const rot = 0.3 * Math.sin(ts * 0.021 + 0.7) * warp * dt;
    const swirl = 0.9 * Math.sin(ts * 0.013 + 3) * warp * dt;
    const decay = Math.pow(params.trail / 100, dt);
    const cx = N / 2 + N * 0.14 * Math.sin(ts * 0.11);
    const cy = N / 2 + N * 0.14 * Math.sin(ts * 0.083 + 2);
    const maxR = N * 0.7;
    const s = 1 / ex;

    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const u = x - cx;
        const v = y - cy;
        const ang = -(rot + swirl * (1 - Math.hypot(u, v) / maxR));
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const sx = cx + (u * ca - v * sa) * s;
        const sy = cy + (u * sa + v * ca) * s;
        // bilinear sample; outside the grid reads 0, so edges drain
        const xf = Math.floor(sx), yf = Math.floor(sy);
        const fx = sx - xf, fy = sy - yf;
        let acc = 0;
        for (let dy = 0; dy <= 1; dy++)
          for (let dx = 0; dx <= 1; dx++) {
            const px = xf + dx, py = yf + dy;
            if (px >= 0 && px < N && py >= 0 && py < N)
              acc +=
                field[py * N + px] *
                (dx ? fx : 1 - fx) *
                (dy ? fy : 1 - fy);
          }
        next[y * N + x] = acc * decay;
      }
    const t = field;
    field = next;
    next = t;

    // inject: bass blob at the wandering center
    const bassSig = (bandE[0] + bandE[1]) / 2;
    if (bassSig > 0.01) blob(cx, cy, 4, bassSig * gain * dt * 22);

    // six mid emitters on a slow-turning ring
    armAng += dt * 0.3;
    for (let k = 0; k < 6; k++) {
      const e = bandE[2 + k];
      if (e < 0.02) continue;
      const a = armAng + (k * Math.PI * 2) / 6;
      blob(
        cx + Math.cos(a) * N * 0.28,
        cy + Math.sin(a) * N * 0.28,
        2.2,
        e * gain * dt * 26,
      );
    }

    // treble sparkles single cells
    const treb = (bandE[8] + bandE[9]) / 2;
    const sparks = Math.min(14, treb * gain * 18 * dt * 60);
    for (let k = 0; k < sparks; k++) {
      const i = (Math.random() * N * N) | 0;
      field[i] = Math.min(VMAX, field[i] + 0.4 + Math.random() * 0.5);
    }
  };

  /* ---- render ------------------------------------------------------------- */

  const render = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      lattice = null;
    }
    const size = Math.min(w, h);
    const cell = size / N;
    const ox = (w - size) / 2;
    const oy = (h - size) / 2;

    // resting grid, drawn once — the empty lattice is part of the design
    if (!lattice) {
      lattice = document.createElement("canvas");
      lattice.width = w;
      lattice.height = h;
      const g = lattice.getContext("2d");
      g.globalAlpha = 0.22;
      const r = Math.max(0.75, cell * 0.09);
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++)
          g.drawImage(
            sprites[0],
            ox + (x + 0.5) * cell - r,
            oy + (y + 0.5) * cell - r,
            r * 2,
            r * 2,
          );
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(lattice, 0, 0);

    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const v = field[y * N + x];
        if (v < 0.045) continue;
        const t = Math.min(1, v / 1.2);
        const r = cell * (0.1 + 0.48 * Math.pow(t, 0.65));
        ctx.globalAlpha = Math.min(1, 0.3 + v);
        ctx.drawImage(
          sprites[Math.min(NLVL - 1, (t * NLVL) | 0)],
          ox + (x + 0.5) * cell - r,
          oy + (y + 0.5) * cell - r,
          r * 2,
          r * 2,
        );
      }
    ctx.globalAlpha = 1;
  };

  /* ---- loop ---------------------------------------------------------------- */

  let raf = 0;
  let last = 0;
  let alive = true;

  const frame = (t) => {
    if (!alive) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    if (music.ac.state === "running") readBands();
    else idleBands(t / 1000);
    stepField(dt, t / 1000);
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
