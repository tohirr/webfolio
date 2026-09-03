/* lab/pulse-sphere — a sphere of dots whose surface pulses with sound.
   ~1100 dots sit on a fibonacci sphere; a generative music loop (soft
   kick, drone, pentatonic arpeggio — synthesized, nothing shipped) plays
   from load with its output muted, and its spectrum displaces the dots
   radially: bass bulges the equator, highs shimmer the poles, the whole
   body thumps on the kick. dot color rides a heat ramp on displacement —
   calm blue at rest, red where the surface is thrown. a tap unmutes so
   the track can play out; another tap mutes it again. until the browser
   lets audio run (first interaction), the sphere just breathes. dots are
   pre-rendered sprites — a thousand canvas arcs per frame would crawl. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const R0 = 1.0; // resting radius
const D = 3.4; // camera distance
const FOC = 2.8; // focal length
const FFT = 1024;
const NB = 24; // spectrum bands mapped over latitude

/* the skin: a damped wave field on a lat-long wrap of the sphere. sound
   pokes it, viscosity drags each poke's neighborhood along, and the dots
   just sample the membrane — so the surface moves as one object */
const GW = 64; // field columns (longitude, wraps)
const GH = 32; // field rows (latitude)
const SIM_H = 1 / 240;
const FC = 0.12; // wave speed — slow, heavy pulls
const FDAMP = 0.988; // rings die fast; goo doesn't oscillate
const FVISC = 0.55; // the neighbor drag — the "skin" in the skin-pull

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

/* the band: everything routes through mix → analyser → master, so the
   analyser keeps hearing the track while the master sits muted at 0 */
function buildMusic() {
  const ac = new AudioContext();
  const mix = ac.createGain();
  const analyser = ac.createAnalyser();
  analyser.fftSize = FFT;
  analyser.smoothingTimeConstant = 0.7;
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
.ps-stage{position:relative;width:100%;max-width:420px;aspect-ratio:1;margin:0 auto}
.ps-stage.over{cursor:pointer}
.ps-stage canvas{width:100%;height:100%;display:block}
.ps-tag{position:absolute;left:14px;bottom:10px;color:var(--dim);pointer-events:none;user-select:none}
.ps-row{display:flex;flex-wrap:wrap;gap:.5em 1.2em;align-items:center;justify-content:center;margin-top:1em}
.ps-row label{display:flex;align-items:center;gap:.5em;color:var(--dim)}
.ps-row input[type=range]{width:90px;accent-color:var(--green)}
.ps-row output{color:var(--fg);min-width:4ch;font-variant-numeric:tabular-nums}
.ps-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
</style>` +
    '<div class="ps-stage"><canvas></canvas><span class="ps-tag">tap for sound</span></div>' +
    '<div class="ps-row">' +
    '<label>dots <input type="range" min="400" max="2000" step="50" value="1100" data-p="dots"><output>1100</output></label>' +
    '<label>gain <input type="range" min="60" max="260" value="140" data-p="gain"><output>140</output></label>' +
    "</div>" +
    '<p class="ps-cap">the loop is always playing, just muted — tap for sound.</p>';

  const stage = el.querySelector(".ps-stage");
  const canvas = el.querySelector("canvas");
  const tag = el.querySelector(".ps-tag");
  const ctx = canvas.getContext("2d");

  const params = { dots: 1100, gain: 140 };

  /* fibonacci sphere + per-dot field coordinates and scratch buffers */
  let px, py, pz, du, dv, depth, order, gxA, gyA, szA, lvA, alA;
  const resetSphere = () => {
    const n = params.dots;
    px = new Float32Array(n);
    py = new Float32Array(n);
    pz = new Float32Array(n);
    du = new Float32Array(n);
    dv = new Float32Array(n);
    depth = new Float32Array(n);
    gxA = new Float32Array(n);
    gyA = new Float32Array(n);
    szA = new Float32Array(n);
    lvA = new Uint8Array(n);
    alA = new Float32Array(n);
    order = Array.from({ length: n }, (_, i) => i);
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (2 * (i + 0.5)) / n;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      px[i] = Math.cos(ga * i) * r;
      py[i] = y;
      pz[i] = Math.sin(ga * i) * r;
      // where this dot reads the membrane
      du[i] = Math.atan2(pz[i], px[i]) / (Math.PI * 2) + 0.5;
      dv[i] = Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI;
    }
  };
  resetSphere();

  /* ---- the membrane ------------------------------------------------------- */

  const fieldU = new Float32Array(GW * GH);
  const fieldV = new Float32Array(GW * GH);

  const stepField = () => {
    for (let j = 0; j < GH; j++)
      for (let i = 0; i < GW; i++) {
        const idx = j * GW + i;
        const lap =
          fieldU[j * GW + ((i + GW - 1) % GW)] +
          fieldU[j * GW + ((i + 1) % GW)] +
          fieldU[Math.max(0, j - 1) * GW + i] +
          fieldU[Math.min(GH - 1, j + 1) * GW + i] -
          4 * fieldU[idx];
        fieldV[idx] = (fieldV[idx] + lap * FC) * FDAMP;
      }
    // viscosity: a moving dot drags its neighborhood with it
    for (let j = 0; j < GH; j++)
      for (let i = 0; i < GW; i++) {
        const idx = j * GW + i;
        const avg =
          (fieldV[j * GW + ((i + GW - 1) % GW)] +
            fieldV[j * GW + ((i + 1) % GW)] +
            fieldV[Math.max(0, j - 1) * GW + i] +
            fieldV[Math.min(GH - 1, j + 1) * GW + i]) *
          0.25;
        fieldV[idx] += (avg - fieldV[idx]) * FVISC;
      }
    // integrate, then project out the mean: a wave equation has no spring
    // on its DC mode, so all-positive pokes would otherwise inflate the
    // whole membrane forever (the global size lives in `pulse` instead)
    let mean = 0;
    for (let k = 0; k < fieldU.length; k++) {
      fieldU[k] = (fieldU[k] + fieldV[k]) * 0.998;
      mean += fieldU[k];
    }
    mean /= fieldU.length;
    for (let k = 0; k < fieldU.length; k++) fieldU[k] -= mean;
  };

  // an outward yank at (lon, lat) — the wave field turns it into a pull
  // that the whole neighborhood follows
  const poke = (uF, vF, amp) => {
    const ci = uF * GW, cj = vF * GH;
    for (let dj = -5; dj <= 5; dj++) {
      const j = Math.round(cj + dj);
      if (j < 0 || j >= GH) continue;
      for (let di = -5; di <= 5; di++) {
        const d2 = di * di + dj * dj;
        if (d2 > 25) continue;
        const i = ((Math.round(ci + di) % GW) + GW) % GW;
        fieldV[j * GW + i] += amp * Math.exp(-d2 / 5);
      }
    }
  };

  /* dot sprites, cached per (heat level, integer pixel size) and blitted
     1:1 — scaled drawImage is what crawls on software rasterizers. the
     ramp starts at calm blue, so the resting body is blue in any theme */
  const sprites = new Map();
  const spriteFor = (lvl, dpx) => {
    const key = lvl * 256 + dpx;
    let c = sprites.get(key);
    if (!c) {
      c = document.createElement("canvas");
      c.width = c.height = dpx;
      const g = c.getContext("2d");
      g.fillStyle = heat(lvl / (NLVL - 1));
      g.beginPath();
      g.arc(dpx / 2, dpx / 2, dpx / 2 - 0.5, 0, Math.PI * 2);
      g.fill();
      sprites.set(key, c);
    }
    return c;
  };

  for (const input of el.querySelectorAll("[data-p]"))
    input.addEventListener("input", () => {
      params[input.dataset.p] = +input.value;
      input.nextElementSibling.textContent = input.value;
      if (input.dataset.p === "dots") resetSphere();
    });

  /* ---- the always-playing loop ------------------------------------------- */

  const music = buildMusic();
  let unmuted = false;

  const setTag = () => {
    tag.textContent = unmuted ? "playing — tap to mute" : "tap for sound";
  };

  // the browser gates audio behind the first interaction; take the earliest
  // one anywhere on the page so the muted loop starts driving the sphere
  music.ac.resume().catch(() => {});
  const wake = () => music.ac.resume().catch(() => {});
  addEventListener("pointerdown", wake, { once: true });

  /* only the sphere itself is the button — the rest of the stage stays
     inert so a swipe across the tile scrolls the row. the hit circle is the
     resting silhouette (S · FOC/√(D²−R0²)) plus room for a stretched skin */
  /* how much of the stage the sphere takes: hosts can raise it with
     --ps-scale (the tile does on phones, where the cell is smaller) */
  let scale = 0.36;
  const readScale = () => {
    const v = parseFloat(getComputedStyle(stage).getPropertyValue("--ps-scale"));
    scale = v > 0 ? v : 0.36;
  };
  readScale();

  const onSphere = (e) => {
    const r = stage.getBoundingClientRect();
    const hit = Math.min(r.width, r.height) * scale * (FOC / Math.sqrt(D * D - R0 * R0)) * 1.25;
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    return x * x + y * y <= hit * hit;
  };

  /* tap toggles the mute; a real drag (scroll on touch) doesn't */
  let dx0 = 0, dy0 = 0, hit0 = false;
  stage.addEventListener("pointerdown", (e) => {
    dx0 = e.clientX;
    dy0 = e.clientY;
    hit0 = onSphere(e);
  });
  stage.addEventListener("pointerup", (e) => {
    if (!hit0 || !onSphere(e)) return;
    if (Math.abs(e.clientX - dx0) + Math.abs(e.clientY - dy0) > 6) return;
    unmuted = !unmuted;
    music.ac.resume().catch(() => {});
    music.master.gain.setTargetAtTime(unmuted ? 0.8 : 0, music.ac.currentTime, 0.08);
    setTag();
  });

  /* ---- spectrum → latitude bands ------------------------------------------ */

  const bandE = new Float32Array(NB);
  const bandBase = new Float32Array(NB); // slow per-band floor (the drone)
  const bandLast = new Float32Array(NB); // for onset detection
  let edges = [];
  const rebin = () => {
    const limit = Math.min(186, music.analyser.frequencyBinCount);
    edges = [];
    for (let i = 0; i <= NB; i++)
      edges.push(1 + Math.floor(Math.pow(i / NB, 1.7) * (limit - 1)));
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
      // subtract a slowly-adapting floor so the standing drone doesn't hold
      // the surface inflated — only change moves it; then fast attack,
      // slow release, so it snaps out and eases back
      bandBase[b] += (v - bandBase[b]) * 0.015;
      const sig = Math.min(1.3, Math.max(0, v - bandBase[b] - 0.02) * 2.2);
      bandE[b] = Math.max(sig, bandE[b] * 0.92);
      // a band's onset strikes the membrane at its latitude — bass near
      // the equator, highs toward a pole — and the skin does the rest
      const jump = bandE[b] - bandLast[b];
      bandLast[b] = bandE[b];
      if (jump > 0.1) {
        const y = Math.pow(b / NB, 1 / 1.2) * (Math.random() < 0.5 ? 1 : -1);
        // small impulse — the field integrates it into a much larger swell
        poke(Math.random(), Math.acos(y) / Math.PI, Math.min(1, jump * 1.5) * 0.42);
      }
    }
    return (bandE[0] + bandE[1] + bandE[2]) / 3; // bass, for the body thump
  };

  /* ---- hover parallax ----------------------------------------------------- */

  let yaw = 0, pitch = 0, yawT = 0, pitchT = 0;
  stage.addEventListener("pointermove", (e) => {
    stage.classList.toggle("over", onSphere(e));
    if (reduceMotion) return;
    const r = stage.getBoundingClientRect();
    yawT = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
    pitchT = ((e.clientY - r.top) / r.height - 0.5) * 0.45;
  });
  stage.addEventListener("pointerleave", () => {
    stage.classList.remove("over");
    yawT = 0;
    pitchT = 0;
  });

  /* ---- render ------------------------------------------------------------- */

  let spin = 0;
  let pulse = 0;

  const render = (ts) => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      readScale();
    }
    ctx.clearRect(0, 0, w, h);

    const S = Math.min(w, h) * scale;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const n = params.dots;
    const gain = params.gain / 100;
    const cyw = Math.cos(spin + yaw), syw = Math.sin(spin + yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const RD = 0.034; // world dot radius

    // displace radially, rotate, project; then depth-sort and draw far-first
    for (let i = 0; i < n; i++) {
      // sample the membrane bilinearly (longitude wraps, poles clamp)
      const fx = du[i] * GW - 0.5;
      const fy = dv[i] * GH - 0.5;
      let i0 = Math.floor(fx);
      let j0 = Math.floor(fy);
      const tx = fx - i0, ty = fy - j0;
      const i1 = (i0 + 1 + GW) % GW;
      i0 = ((i0 % GW) + GW) % GW;
      const j1 = Math.min(GH - 1, Math.max(0, j0 + 1));
      j0 = Math.min(GH - 1, Math.max(0, j0));
      const s =
        (fieldU[j0 * GW + i0] * (1 - tx) + fieldU[j0 * GW + i1] * tx) * (1 - ty) +
        (fieldU[j1 * GW + i0] * (1 - tx) + fieldU[j1 * GW + i1] * tx) * ty;
      const breath = 0.022 * Math.sin(ts * 0.8);
      // outward pulls may stretch far past the body — inward stays modest
      const disp = Math.max(-0.4, Math.min(1.15, s * 0.5 * gain)) + breath;
      const r = R0 * (1 + 0.2 * pulse + disp);
      const X = px[i] * r, Y = py[i] * r, Z = pz[i] * r;
      const x1 = X * cyw + Z * syw;
      const z1 = -X * syw + Z * cyw;
      const y2 = Y * cp - z1 * sp;
      const z2 = Y * sp + z1 * cp;
      const pers = FOC / (D - z2);
      depth[i] = z2;
      gxA[i] = cx + x1 * pers * S;
      gyA[i] = cy - y2 * pers * S;
      // stretched skin thins: dots shrink as they're pulled from the body
      szA[i] = RD * pers * S * (1 - Math.min(0.4, Math.abs(disp) * 0.35));
      lvA[i] = Math.min(
        NLVL - 1,
        ((Math.abs(disp) * 2.2 + pulse * 0.25) * NLVL) | 0,
      );
      alA[i] = Math.max(0.1, Math.min(1, 0.16 + 0.84 * ((z2 + 1.4) / 2.8)));
    }
    order.sort((a, b) => depth[a] - depth[b]);
    for (const i of order) {
      const dpx = Math.max(2, Math.round(szA[i] * 2));
      ctx.globalAlpha = alA[i];
      ctx.drawImage(spriteFor(lvA[i], dpx), (gxA[i] - dpx / 2) | 0, (gyA[i] - dpx / 2) | 0);
    }
    ctx.globalAlpha = 1;
  };

  /* ---- loop ---------------------------------------------------------------- */

  let raf = 0;
  let last = 0;
  let acc = 0;
  let nextIdlePoke = 0;
  let alive = true;

  const frame = (t) => {
    if (!alive) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    const live = music.ac.state === "running";
    const bass = live ? readBands() : 0;
    // idle: the occasional drip keeps the skin visibly alive
    if (!live && t >= nextIdlePoke) {
      nextIdlePoke = t + 900 + Math.random() * 1600;
      poke(Math.random(), 0.2 + Math.random() * 0.6, 0.1 + Math.random() * 0.08);
    }
    acc = Math.min(acc + dt, SIM_H * 4);
    while (acc >= SIM_H) {
      stepField();
      acc -= SIM_H;
    }
    pulse += (bass * 1.15 - pulse) * Math.min(1, dt * 12);
    if (!reduceMotion) spin += dt * 0.16;

    const ease = Math.min(1, dt * 7);
    yaw += (yawT - yaw) * ease;
    pitch += (pitchT - pitch) * ease;

    render(t / 1000);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    music.dispose();
    removeEventListener("pointerdown", wake);
  };
}
