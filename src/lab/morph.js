/* lab/morph — a cloud of dots that morphs with music. ~1400 dots sit on a
   shape (sphere, record, sheet, helix) and a tap moves them
   to the next one, each dot leaving in turn so the change sweeps through;
   a damped wave membrane under the dots turns onsets into swells along
   the surface's normals; every frame is drawn over a faded, slightly
   zoomed copy of the last, so the whole thing leaves trails, longer the
   louder the music. a generative loop (soft kick, drone, pentatonic
   plucks — synthesized, nothing shipped) plays whenever the piece is on
   screen, from the first tap the page gets; the sound button mutes it,
   "add music" plays the listener's own files instead — they never leave
   the browser — and "use mic" lets the room drive it. the tile runs it
   small with the controls hidden and stays a sphere; the story card runs
   the same module beside the words with everything showing, and there a
   tap morphs it. */

import { audio } from "./audio.js";
import { unlockAudio } from "./audio-unlock.js";
import { SHAPES, seats } from "./morph-shapes.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;

const D = 3.4; // camera distance
const FOC = 2.8; // focal length
const FFT = 1024;
const NB = 24; // spectrum bands mapped over the membrane's latitude
const MORPH_S = 1.7; // a morph's travel time
const MORPH_EVERY = 26; // seconds between unprompted morphs
const MORPH_COOLDOWN = 9; // the least time a drop may ask for the next one

/* the membrane: a damped wave field on a wrap the dots sample along
   their normals, so the surface moves as one object on every shape */
const GW = 64, GH = 32;
const SIM_H = 1 / 240;
const FC = 0.14, FDAMP = 0.991, FVISC = 0.72;

const TICK_S = 60 / 72 / 4; // 72bpm, sixteenths
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440]; // a-minor pentatonic

/* heat ramps, one per morph: blue→teal→amber→red, violet→pink→amber,
   green→cyan→white. indexed by |displacement|, so the resting body is the
   ramp's first colour */
const RAMPS = [
  [[37, 99, 235], [20, 184, 166], [245, 158, 11], [239, 68, 68]],
  [[124, 58, 237], [236, 72, 153], [251, 146, 60], [254, 240, 138]],
  [[16, 185, 129], [34, 211, 238], [96, 165, 250], [244, 244, 245]],
];
const NLVL = 16;
const heat = (ramp, t) => {
  const S = RAMPS[ramp];
  const x = Math.min(0.999, Math.max(0, t)) * (S.length - 1);
  const i = Math.floor(x), f = x - i;
  const a = S[i], b = S[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(
    a[1] + (b[1] - a[1]) * f,
  )},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
};

/* the band: everything routes through mix → analyser → master, so the
   analyser keeps hearing the signal while the master sits muted at 0.
   the synth has its own bus, so a track can take its place */
function buildAudio() {
  const ac = audio();
  const mix = ac.createGain();
  const analyser = ac.createAnalyser();
  analyser.fftSize = FFT;
  analyser.smoothingTimeConstant = 0.7;
  const master = ac.createGain();
  master.gain.value = 0;
  mix.connect(analyser);
  analyser.connect(master);
  master.connect(ac.destination);

  const bus = ac.createGain();
  bus.connect(mix);

  for (const [f, g] of [[55, 0.05], [110, 0.035]]) {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    const og = ac.createGain();
    og.gain.value = g;
    osc.connect(og);
    og.connect(bus);
    osc.start();
  }

  const lp = ac.createBiquadFilter();
  lp.frequency.value = 1600;
  const delay = ac.createDelay(1);
  delay.delayTime.value = TICK_S * 3;
  const fb = ac.createGain();
  fb.gain.value = 0.34;
  delay.connect(fb);
  fb.connect(delay);
  lp.connect(bus);
  lp.connect(delay);
  delay.connect(bus);

  const kick = (t) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.75, t + 0.035);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + 0.58);
  };
  const pluck = (t) => {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = SCALE[(Math.random() * SCALE.length) | 0];
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(g);
    g.connect(lp);
    osc.start(t);
    osc.stop(t + 0.5);
  };

  // lookahead scheduler on the sixteenth grid; `held` parks it
  let step = 0, nextT = 0, held = false;
  const timer = setInterval(() => {
    if (held || ac.state !== "running") return;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.25) {
      if (step % 8 === 0) kick(nextT);
      if (step % 2 === 0 && Math.random() < 0.55) pluck(nextT);
      step++;
      nextT += TICK_S;
    }
  }, 100);

  /* the listener's own files play through an element made on first use */
  let el = null;
  const element = () => {
    if (el) return el;
    el = new Audio();
    el.setAttribute("playsinline", "");
    ac.createMediaElementSource(el).connect(mix);
    return el;
  };

  /* the room, through the microphone. it joins the mix like a track, so
     it drives the dots the same way — but the master stays at 0 while it
     is open, or the speakers would feed the mic and howl */
  let micStream = null, micSrc = null;
  const micGain = ac.createGain();
  micGain.gain.value = 2.5; // a phone mic across a room is quiet next to the synth
  micGain.connect(mix);
  const mic = async (on) => {
    if (!on) {
      micSrc?.disconnect();
      micStream?.getTracks().forEach((t) => t.stop());
      micSrc = micStream = null;
      return;
    }
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    });
    micSrc = ac.createMediaStreamSource(micStream);
    micSrc.connect(micGain);
  };

  return {
    ac,
    analyser,
    master,
    freq: new Uint8Array(analyser.frequencyBinCount),
    element,
    get el() { return el; },
    mic,
    holdSynth(on) {
      held = on;
      bus.gain.setTargetAtTime(on ? 0 : 1, ac.currentTime, 0.3);
    },
    dispose() {
      clearInterval(timer);
      mic(false);
      if (el) { el.pause(); el.removeAttribute("src"); }
      master.disconnect(); // the context is shared — leave it running
    },
  };
}

export function mount(el) {
  // the story card mounts the same module with its controls showing; there
  // a tap on the cloud morphs it. in the tile a tap opens the story instead
  const staged = !!el.closest(".drawer-stage");
  const N = coarse ? 720 : 1400;

  el.innerHTML =
    `<style>
.mo-stage{position:relative;width:100%;max-width:420px;aspect-ratio:1;margin:0 auto}
.mo-stage.staged{cursor:pointer}
.mo-stage canvas{width:100%;height:100%;display:block}
.mo-tag{position:absolute;left:14px;bottom:10px;right:14px;color:var(--dim);pointer-events:none;user-select:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mo-tag b{color:var(--fg);font-weight:500}
.mo-row{display:flex;flex-wrap:wrap;gap:.5em 1.2em;align-items:center;justify-content:center;margin-top:1em}
.mo-row button,.mo-row label{font:inherit;letter-spacing:inherit;color:var(--fg);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-decoration-color:var(--dim);text-underline-offset:3px}
.mo-row button:hover,.mo-row label:hover{color:var(--ink)}
.mo-row input[type=file]{display:none}
.mo-row [hidden]{display:none}
.mo-stage.drop::after{content:"";position:absolute;inset:6%;border:1px dashed var(--dim);border-radius:50%;pointer-events:none}
.mo-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
</style>` +
    `<div class="mo-stage${staged ? " staged" : ""}"><canvas></canvas><span class="mo-tag"></span></div>` +
    '<div class="mo-row">' +
    '<button type="button" data-act="sound">sound · off</button>' +
    '<label data-act="add">add music<input type="file" accept="audio/*" multiple></label>' +
    '<button type="button" data-act="next" hidden>next track →</button>' +
    (navigator.mediaDevices?.getUserMedia ? '<button type="button" data-act="mic">use mic</button>' : "") +
    "</div>" +
    '<p class="mo-cap">tap the cloud to morph it. the loop plays while the cloud is on screen — sound mutes it. add your own tracks and they play here, never uploaded anywhere, or use the mic and it moves to the room.</p>';

  const stage = el.querySelector(".mo-stage");
  const canvas = el.querySelector("canvas");
  const tag = el.querySelector(".mo-tag");
  const soundBtn = el.querySelector('[data-act="sound"]');
  const fileIn = el.querySelector('input[type="file"]');
  const nextBtn = el.querySelector('[data-act="next"]');
  const micBtn = el.querySelector('[data-act="mic"]');
  const ctx = canvas.getContext("2d");

  /* ---- the lattice and its seats on every shape ---------------------------- */

  const U = new Float32Array(N);
  const V = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    U[i] = (i * 0.618033988749895) % 1;
    V[i] = (i + 0.5) / N;
  }
  const SEATS = SHAPES.map((s) => seats(s, N, U, V, new Float32Array(N * 6)));

  let shape = 0;
  let from = SEATS[0];
  const cur = new Float32Array(SEATS[0]);
  let morphT = Infinity;
  let sinceMorph = 0;
  let ramp = 0;

  const morph = () => {
    if (!staged) return; // the tile stays a sphere — the story is where it morphs
    if (morphT < MORPH_S + 0.6) return; // one at a time
    const next = (shape + 1 + ((Math.random() * (SHAPES.length - 1)) | 0)) % SHAPES.length;
    from = Float32Array.from(cur);
    shape = next;
    morphT = 0;
    sinceMorph = 0;
    ramp = (ramp + 1) % RAMPS.length;
  };

  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  /* every dot toward its seat; during a morph each leaves in turn down the
     lattice, and the cloud puffs out mid-flight */
  const settle = (dt) => {
    if (morphT === Infinity) return;
    morphT += dt;
    const to = SEATS[shape];
    const spread = 0.55;
    const dur = MORPH_S - spread;
    let done = true;
    for (let i = 0; i < N; i++) {
      const k = smooth((morphT - V[i] * spread) / dur);
      if (k < 1) done = false;
      const puff = 1 + 0.35 * Math.sin(k * Math.PI);
      const o = i * 6;
      for (let c = 0; c < 3; c++) cur[o + c] = (from[o + c] + (to[o + c] - from[o + c]) * k) * puff;
      for (let c = 3; c < 6; c++) cur[o + c] = from[o + c] + (to[o + c] - from[o + c]) * k;
    }
    if (done) { cur.set(to); morphT = Infinity; }
  };

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
    // project out the mean: the wave equation has no spring on its DC mode
    let mean = 0;
    for (let k = 0; k < fieldU.length; k++) {
      fieldU[k] = (fieldU[k] + fieldV[k]) * 0.997;
      mean += fieldU[k];
    }
    mean /= fieldU.length;
    for (let k = 0; k < fieldU.length; k++) fieldU[k] -= mean;
  };

  const poke = (uF, vF, amp) => {
    const ci = uF * GW, cj = vF * GH;
    for (let dj = -7; dj <= 7; dj++) {
      const j = Math.round(cj + dj);
      if (j < 0 || j >= GH) continue;
      for (let di = -7; di <= 7; di++) {
        const d2 = di * di + dj * dj;
        if (d2 > 49) continue;
        const i = ((Math.round(ci + di) % GW) + GW) % GW;
        fieldV[j * GW + i] += amp * 0.6 * Math.exp(-d2 / 11);
      }
    }
  };

  const sample = (u, v) => {
    const fx = u * GW - 0.5, fy = v * GH - 0.5;
    let i0 = Math.floor(fx), j0 = Math.floor(fy);
    const tx = fx - i0, ty = fy - j0;
    const i1 = (i0 + 1 + GW) % GW;
    i0 = ((i0 % GW) + GW) % GW;
    const j1 = Math.min(GH - 1, Math.max(0, j0 + 1));
    j0 = Math.min(GH - 1, Math.max(0, j0));
    return (
      (fieldU[j0 * GW + i0] * (1 - tx) + fieldU[j0 * GW + i1] * tx) * (1 - ty) +
      (fieldU[j1 * GW + i0] * (1 - tx) + fieldU[j1 * GW + i1] * tx) * ty
    );
  };

  /* ---- sound ------------------------------------------------------------- */

  const band = buildAudio();
  let unmuted = true; // the listener's choice: on until they mute it
  let shown = false; // half the piece on screen — sound is gated on it too
  const tracks = []; // { name, url } — the listener's files, in order
  let ti = -1;
  let micOn = false;
  let micNote = ""; // what the tag says about the mic: listening, or why not
  let noteTimer = 0;

  const setTag = () => {
    const t = tracks[ti];
    tag.innerHTML = micNote
      ? micNote
      : t
        ? `<b>${t.name.replace(/[<>&]/g, "")}</b>${tracks.length > 1 ? ` · ${ti + 1}/${tracks.length}` : ""}`
        : staged ? "tap to morph" : "";
    soundBtn.textContent = unmuted ? "sound · on" : "sound · off";
    soundBtn.hidden = micOn; // nothing to hear while the mic is open
    nextBtn.hidden = tracks.length < 2 || micOn;
    if (micBtn) micBtn.textContent = micOn ? "mic · on" : "use mic";
  };

  /* what the ears get: the listener's choice, and only while the piece is
     on screen and the mic is closed */
  const applySound = () => {
    const on = unmuted && shown && !micOn;
    band.master.gain.setTargetAtTime(on ? 0.8 : 0, band.ac.currentTime, 0.08);
    const a = band.el;
    if (a && tracks[ti]) on ? a.play().catch(() => {}) : a.pause();
  };
  const setSound = (on) => {
    unmuted = on;
    applySound();
    setTag();
  };

  /* the mic takes the place of everything else: synth parked, track
     paused, master at 0. turning it off hands back to whatever was on */
  const setMic = async (on) => {
    if (on === micOn) return;
    if (on) {
      band.holdSynth(true);
      micNote = "listening…";
      micOn = true;
      applySound();
      setTag();
      try {
        await band.mic(true);
        band.ac.resume().catch(() => {});
        micNote = "<b>listening</b> · the room";
      } catch {
        // refused, or no mic: say so for a moment, then back to before
        micOn = false;
        micNote = "mic not allowed";
        band.holdSynth(ti >= 0);
        applySound();
        setTag();
        noteTimer = setTimeout(() => { micNote = ""; setTag(); }, 2400);
        return;
      }
      setTag();
      return;
    }
    band.mic(false);
    micOn = false;
    micNote = "";
    band.holdSynth(ti >= 0);
    applySound();
    setTag();
  };
  const play = (i) => {
    if (!tracks.length) return;
    if (micOn) setMic(false);
    ti = ((i % tracks.length) + tracks.length) % tracks.length;
    const a = band.element();
    a.src = tracks[ti].url;
    a.play().catch(() => {});
    band.holdSynth(true);
    unmuted = true;
    applySound();
    setTag();
    morph(); // a new track opens on a new shape
  };

  const addFiles = (files) => {
    const list = [...files].filter((f) => f.type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(f.name));
    if (!list.length) return;
    const first = tracks.length;
    for (const f of list) tracks.push({ name: f.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(f) });
    unlockAudio();
    band.ac.resume().catch(() => {});
    if (ti < 0) play(first); // the first files start playing; later ones queue
    else setTag();
  };

  fileIn.addEventListener("change", () => { addFiles(fileIn.files); fileIn.value = ""; });
  soundBtn.addEventListener("click", () => {
    unlockAudio();
    band.ac.resume().catch(() => {});
    setSound(!unmuted);
  });
  nextBtn.addEventListener("click", () => play(ti + 1));
  micBtn?.addEventListener("click", () => {
    unlockAudio();
    band.ac.resume().catch(() => {});
    setMic(!micOn);
  });

  // dropping files on the cloud plays them too
  const onDrag = (e) => { e.preventDefault(); stage.classList.add("drop"); };
  const onLeave = () => stage.classList.remove("drop");
  const onDrop = (e) => { e.preventDefault(); onLeave(); addFiles(e.dataTransfer?.files || []); };
  stage.addEventListener("dragover", onDrag);
  stage.addEventListener("dragleave", onLeave);
  stage.addEventListener("drop", onDrop);

  // the browser gates audio behind the first interaction; take the earliest
  // one anywhere on the page so the muted loop starts driving the dots
  band.ac.resume().catch(() => {});
  const wake = () => band.ac.resume().catch(() => {});
  addEventListener("pointerdown", wake, { once: true });

  /* the element takes over from the synth track by track, and hands back
     when the queue is spent — it loops instead */
  const onEnded = () => play(ti + 1);
  band.element().addEventListener("ended", onEnded);

  /* ---- spectrum → bands, onsets, the beat ----------------------------------- */

  const bandE = new Float32Array(NB);
  const bandBase = new Float32Array(NB);
  const bandLast = new Float32Array(NB);
  const edges = [];
  {
    const limit = Math.min(186, band.analyser.frequencyBinCount);
    for (let i = 0; i <= NB; i++) edges.push(1 + Math.floor(Math.pow(i / NB, 1.7) * (limit - 1)));
  }
  let energy = 0; // the spectrum's level, slow — trails and spin ride it
  let bassLast = 0;

  const readBands = () => {
    const { analyser, freq } = band;
    analyser.getByteFrequencyData(freq);
    let tot = 0;
    for (let b = 0; b < NB; b++) {
      const lo = edges[b], hi = Math.max(lo + 1, edges[b + 1]);
      let sum = 0;
      for (let k = lo; k < hi; k++) sum += freq[k];
      const v = Math.pow(sum / (hi - lo) / 255, 1.5);
      tot += v;
      // a slowly-adapting floor so a standing drone doesn't hold the surface
      // inflated; fast attack, slow release
      bandBase[b] += (v - bandBase[b]) * 0.015;
      const sig = Math.min(1.3, Math.max(0, v - bandBase[b] - 0.02) * 2.2);
      bandE[b] = Math.max(sig, bandE[b] * 0.95);
      const jump = bandE[b] - bandLast[b];
      bandLast[b] = bandE[b];
      if (jump > 0.16) {
        const y = Math.pow(b / NB, 1 / 1.2) * (Math.random() < 0.5 ? 1 : -1);
        poke(Math.random(), Math.acos(y) / Math.PI, Math.min(1, jump * 1.5) * 0.2);
      }
    }
    energy += (tot / NB - energy) * 0.05;
    const bass = (bandE[0] + bandE[1] + bandE[2]) / 3;
    // a real drop after a quiet stretch turns the page
    if (bass - bassLast > 0.5 && sinceMorph > MORPH_COOLDOWN) morph();
    bassLast = bass;
    return bass;
  };

  /* ---- input ---------------------------------------------------------------- */

  let scale = 0.36;
  const readScale = () => {
    const v = parseFloat(getComputedStyle(stage).getPropertyValue("--mo-scale"));
    scale = v > 0 ? v : 0.36;
  };
  readScale();

  let yaw = 0, pitch = 0, yawT = 0, pitchT = 0;
  stage.addEventListener("pointermove", (e) => {
    if (reduceMotion || e.pointerType === "touch") return;
    const r = stage.getBoundingClientRect();
    yawT = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
    pitchT = ((e.clientY - r.top) / r.height - 0.5) * 0.45;
  });
  stage.addEventListener("pointerleave", () => { yawT = 0; pitchT = 0; });

  /* on the story card a tap morphs the cloud; a drag doesn't */
  if (staged) {
    let dx0 = 0, dy0 = 0;
    stage.addEventListener("pointerdown", (e) => { dx0 = e.clientX; dy0 = e.clientY; });
    stage.addEventListener("pointerup", (e) => {
      if (Math.abs(e.clientX - dx0) + Math.abs(e.clientY - dy0) > 6) return;
      morph();
    });
  }

  /* ---- sprites ------------------------------------------------------------ */

  const sprites = new Map();
  const spriteFor = (rampI, lvl, dpx) => {
    const key = (rampI * NLVL + lvl) * 256 + dpx;
    let c = sprites.get(key);
    if (!c) {
      c = document.createElement("canvas");
      c.width = c.height = dpx;
      const g = c.getContext("2d");
      g.fillStyle = heat(rampI, lvl / (NLVL - 1));
      g.beginPath();
      g.arc(dpx / 2, dpx / 2, dpx / 2 - 0.5, 0, Math.PI * 2);
      g.fill();
      sprites.set(key, c);
    }
    return c;
  };

  /* ---- render --------------------------------------------------------------- */

  const depth = new Float32Array(N);
  const gxA = new Float32Array(N), gyA = new Float32Array(N), szA = new Float32Array(N);
  const lvA = new Uint8Array(N), alA = new Float32Array(N);
  const order = Array.from({ length: N }, (_, i) => i);

  const back = document.createElement("canvas");
  const bctx = back.getContext("2d");

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
    const cx = w * 0.5, cy = h * 0.5;

    /* trails: the last frame drawn back a hair larger and turned, and
       thinner. it goes through a second canvas — drawn straight onto
       itself the layers would stack and the haze would never clear — so
       the trail is the dots' own colour fading into whatever the piece
       sits on; the canvas itself stays transparent */
    if (back.width !== w || back.height !== h) { back.width = w; back.height = h; }
    bctx.clearRect(0, 0, w, h);
    bctx.globalAlpha = reduceMotion ? 0.5 : Math.min(0.84, 0.58 + energy * 0.5 + pulse * 0.1);
    if (!reduceMotion) {
      const zoom = 1.0025 + pulse * 0.008 + energy * 0.006;
      bctx.save();
      bctx.translate(cx, cy);
      bctx.scale(zoom, zoom);
      bctx.rotate(0.0015 + pulse * 0.003);
      bctx.translate(-cx, -cy);
      bctx.drawImage(canvas, 0, 0);
      bctx.restore();
    } else bctx.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(back, 0, 0);

    const S = Math.min(w, h) * scale;
    const cyw = Math.cos(spin + yaw), syw = Math.sin(spin + yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const dolly = D + 0.25 * Math.sin(ts * 0.09); // a slow drift in and out
    const RD = 0.03;
    const breath = 0.02 * Math.sin(ts * 0.8);
    const body = 1 + 0.1 * pulse;

    for (let i = 0; i < N; i++) {
      const o = i * 6;
      const s = sample(U[i], V[i]);
      const disp = Math.max(-0.3, Math.min(0.7, s * 0.6)) + breath;
      const X = (cur[o] + cur[o + 3] * disp) * body;
      const Y = (cur[o + 1] + cur[o + 4] * disp) * body;
      const Z = (cur[o + 2] + cur[o + 5] * disp) * body;
      const x1 = X * cyw + Z * syw;
      const z1 = -X * syw + Z * cyw;
      const y2 = Y * cp - z1 * sp;
      const z2 = Y * sp + z1 * cp;
      const pers = FOC / (dolly - z2);
      depth[i] = z2;
      gxA[i] = cx + x1 * pers * S;
      gyA[i] = cy - y2 * pers * S;
      szA[i] = RD * pers * S * (1 - Math.min(0.4, Math.abs(disp) * 0.35));
      lvA[i] = Math.min(NLVL - 1, ((Math.abs(disp) * 2.2 + pulse * 0.25) * NLVL) | 0);
      alA[i] = Math.max(0.12, Math.min(1, 0.2 + 0.8 * ((z2 + 1.4) / 2.8)));
    }
    order.sort((a, b) => depth[a] - depth[b]);
    for (const i of order) {
      const dpx = Math.max(2, Math.round(szA[i] * 2));
      ctx.globalAlpha = alA[i];
      ctx.drawImage(spriteFor(ramp, lvA[i], dpx), (gxA[i] - dpx / 2) | 0, (gyA[i] - dpx / 2) | 0);
    }
    ctx.globalAlpha = 1;
  };

  /* ---- loop ----------------------------------------------------------------- */

  let raf = 0;
  let last = 0;
  let acc = 0;
  let nextIdlePoke = 0;
  let alive = true;

  const frame = (t) => {
    if (!alive) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    const live = band.ac.state === "running";
    const bass = live ? readBands() : 0;
    // idle: the occasional drip keeps the skin visibly alive
    if (!live && t >= nextIdlePoke) {
      nextIdlePoke = t + 900 + Math.random() * 1600;
      poke(Math.random(), 0.2 + Math.random() * 0.6, 0.1 + Math.random() * 0.08);
    }
    acc = Math.min(acc + dt, SIM_H * 4);
    while (acc >= SIM_H) { stepField(); acc -= SIM_H; }
    pulse += (bass * 1.15 - pulse) * Math.min(1, dt * 8);
    if (!reduceMotion) spin += dt * (0.12 + energy * 0.2);

    sinceMorph += dt;
    if (sinceMorph > MORPH_EVERY) morph();
    settle(dt);

    const ease = Math.min(1, dt * 7);
    yaw += (yawT - yaw) * ease;
    pitch += (pitchT - pitch) * ease;

    render(t / 1000);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  setTag();

  /* only run while half the piece is on screen: the field sim and a
     thousand sprites a frame are real work for a small phone. off screen
     the sound stops with it; back on screen it comes straight back */
  const io = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    shown = e.intersectionRatio >= 0.5;
    if (!shown) {
      if (micOn) setMic(false);
      band.holdSynth(true);
      applySound();
      return;
    }
    if (ti < 0) band.holdSynth(false);
    band.ac.resume().catch(() => {});
    applySound();
    last = performance.now();
    acc = 0;
    raf = requestAnimationFrame(frame);
  }, { threshold: 0.5 });
  io.observe(stage);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    clearTimeout(noteTimer);
    band.el?.removeEventListener("ended", onEnded);
    band.dispose();
    for (const t of tracks) URL.revokeObjectURL(t.url);
    removeEventListener("pointerdown", wake);
  };
}
