/* lab/glass-block — the glass wall in a tile. a drifting clock stands in
   until the camera is allowed; tap for the webcam, hover to lean past the
   glass. the piece opens as the plain scene and wipes into glass, the way
   the /glass/ camera swaps its filter. the wall itself lives in
   glass-render.js and is shared with that page. */

import { createGlass, makeWipe } from "./glass-render.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mount(el) {
  el.innerHTML =
    `<style>
.gb-stage{position:relative;width:100%;max-width:420px;aspect-ratio:5/6;margin:0 auto;border-radius:18px;overflow:hidden;touch-action:pan-y;cursor:pointer;background:#141416}
.gb-stage canvas{width:100%;height:100%;display:block}
.gb-stage video{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.gb-tag{position:absolute;left:14px;bottom:10px;color:rgba(255,255,255,.7);pointer-events:none;user-select:none;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.gb-link{position:absolute;right:12px;bottom:8px;padding:2px 8px;border-radius:999px;color:#fff;background:rgba(0,0,0,.35);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);text-decoration:none;opacity:.85}
.gb-link:hover{opacity:1;text-decoration:none}
.gb-row{display:flex;flex-wrap:wrap;gap:.5em 1.2em;align-items:center;justify-content:center;margin-top:1em}
.gb-row label{display:flex;align-items:center;gap:.5em;color:var(--dim)}
.gb-row input[type=range]{width:90px;accent-color:var(--green)}
.gb-row output{color:var(--fg);min-width:3ch;font-variant-numeric:tabular-nums}
.gb-cap{color:var(--dim);margin:1.2em 0 0;text-align:center}
</style>` +
    '<div class="gb-stage"><canvas></canvas><video muted playsinline autoplay></video>' +
    '<span class="gb-tag">tap for camera</span>' +
    '<a class="gb-link" href="/glass/">open camera ↗</a></div>' +
    '<div class="gb-row">' +
    '<label>tiles <input type="range" min="8" max="32" value="14" data-p="cells"><output>14</output></label>' +
    '<label>flat <input type="range" min="8" max="60" value="30" data-p="mag"><output>30</output></label>' +
    '<label>bend <input type="range" min="0" max="250" value="140" data-p="bend"><output>140</output></label>' +
    '<label>shine <input type="range" min="0" max="100" value="75" data-p="shine"><output>75</output></label>' +
    "</div>" +
    '<p class="gb-cap">a wall of glass block — tap for the camera, hover to lean past it.</p>';

  const stage = el.querySelector(".gb-stage");
  const canvas = el.querySelector("canvas");
  const video = el.querySelector("video");
  const tag = el.querySelector(".gb-tag");

  const glass = createGlass(canvas, { dpr: 1.5, params: { cells: 14 } });
  if (!glass) {
    el.innerHTML = '<p class="gb-cap">webgl unavailable</p>';
    return;
  }
  const scale = { cells: 1, mag: 1 / 100, bend: 1 / 100, shine: 1 / 100 };
  for (const input of el.querySelectorAll("[data-p]"))
    input.addEventListener("input", () => {
      glass.params[input.dataset.p] = +input.value * scale[input.dataset.p];
      input.nextElementSibling.textContent = input.value;
    });

  /* ---- the stand-in scene: the time, wandering ------------------------- */
  const scene = document.createElement("canvas");
  scene.width = 480;
  scene.height = 576;
  const sctx = scene.getContext("2d");
  const drawScene = (t) => {
    const w = scene.width, h = scene.height;
    const g = sctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#5b616b");
    g.addColorStop(0.5, "#2b2f36");
    g.addColorStop(1, "#1a1c21");
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, w, h);
    sctx.fillStyle = "rgba(190,205,200,0.5)";
    sctx.fillRect(0, h * 0.62, w, h * 0.12);
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ox = Math.sin(t * 0.23) * w * 0.08;
    const oy = Math.cos(t * 0.17) * h * 0.06;
    sctx.fillStyle = "#f2efe8";
    sctx.font = `700 ${w * 0.27}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillText(hh, w * 0.5 + ox, h * 0.4 + oy);
    sctx.fillText(mm, w * 0.5 + ox, h * 0.4 + w * 0.25 + oy);
    sctx.fillStyle = "#e0782d";
    sctx.beginPath();
    sctx.arc(w * 0.22 - ox * 0.6, h * 0.16 + oy * 0.5, w * 0.09, 0, Math.PI * 2);
    sctx.fill();
  };

  /* ---- camera ------------------------------------------------------------ */
  let stream = null;
  const setTag = (msg) => {
    tag.textContent = msg ?? (stream ? "camera on — tap to stop" : "tap for camera");
  };
  const stopCam = () => {
    if (!stream) return;
    for (const tr of stream.getTracks()) tr.stop();
    stream = null;
    video.srcObject = null;
    setTag();
  };
  const startCam = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setTag("no camera here");
      return;
    }
    setTag("asking…");
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play().catch(() => {});
      setTag();
    } catch {
      stream = null;
      setTag("camera blocked — tap to retry");
    }
  };

  /* tap toggles the camera; a real drag (scroll on touch) doesn't, and
     the corner link is its own thing */
  let px0 = 0, py0 = 0;
  stage.addEventListener("pointerdown", (e) => {
    px0 = e.clientX;
    py0 = e.clientY;
  });
  stage.addEventListener("pointerup", (e) => {
    if (e.target.closest("a")) return;
    if (Math.abs(e.clientX - px0) + Math.abs(e.clientY - py0) > 6) return;
    if (stream) stopCam();
    else startCam();
  });

  /* ---- hover: lean past the glass -------------------------------------- */
  let lookX = 0, lookY = 0, lookTX = 0, lookTY = 0;
  stage.addEventListener("pointermove", (e) => {
    if (reduceMotion) return;
    const r = stage.getBoundingClientRect();
    lookTX = ((e.clientX - r.left) / r.width - 0.5) * 0.03;
    lookTY = -((e.clientY - r.top) / r.height - 0.5) * 0.02;
  });
  stage.addEventListener("pointerleave", () => {
    lookTX = 0;
    lookTY = 0;
  });

  /* ---- loop ---------------------------------------------------------------- */
  const wipe = makeWipe(reduceMotion ? 1 : 0);
  let armed = false;
  let raf = 0;
  let last = 0;
  let alive = true;

  const frame = (t) => {
    if (!alive) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    const ts = t / 1000;
    if (!armed && t > 600) {
      armed = true;
      wipe.set(true, t, 900);
    }

    const ease = Math.min(1, dt * 6);
    lookX += (lookTX - lookX) * ease;
    lookY += (lookTY - lookY) * ease;
    // a handheld drift — blocks pop as the scene slides under them
    const wob = reduceMotion ? 0 : 0.004;
    const look = [lookX + Math.sin(ts * 0.7) * wob, lookY + Math.cos(ts * 0.9) * wob * 0.6];

    const live = stream && video.videoWidth;
    if (!live) drawScene(ts);
    glass.draw(live ? video : scene, { mirror: !!live, wipe: wipe.edge(t), look });

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    stopCam();
    glass.destroy();
  };
}
