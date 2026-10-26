/* lab/glass-common — what the two glass pages share: the built-in logos,
   the viewer steering the glass (pointer, finger, phone tilt), recording a
   video, and the reveal on its own for a tile or a capture frame. the
   glass itself is glass-logo.js; the pages are glass-lab.js (the labs
   layout) and glass-studio.js (the single-column component page). */

import { DEFAULTS, THEMES, GlassLogo, lengthOf } from "./glass-logo.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* built-in logos. tohirr is the pixel self-portrait from the site's favicon,
   in its own colours; ux pilot's mark is the vector mascot from its site */
export const BRANDS = {
  tohirr: { label: "Tohir", name: "tohirr", logo: "/favicon.svg", text: "tohirr", original: true },
  note: { label: "Note", name: "Aria" },
  uxpilot: { label: "UX Pilot", name: "UX Pilot", logo: "/media/glass/uxpilot-mark.svg", wordImg: "/media/glass/uxpilot-wordmark.svg", text: "UX Pilot" },
};

export const fetchImage = (src) => new Promise((res, rej) => {
  const im = new Image();
  im.crossOrigin = "anonymous";
  im.onload = () => res(im);
  im.onerror = rej;
  im.src = src;
});

/* the logo and wordmark images for a built-in logo; the note is drawn by
   the renderer, so it has none */
export const brandArt = async (B) =>
  B.logo ? Promise.all([fetchImage(B.logo), B.wordImg ? fetchImage(B.wordImg) : null]) : [null, null];

/* mp4 where the browser records it (chrome, safari) — x takes nothing else —
   and webm where it does not */
export function videoType(format) {
  if (typeof MediaRecorder === "undefined") return "";
  const list = format === "webm" ? ["video/webm;codecs=vp9", "video/webm"] : ["video/mp4;codecs=avc1.640028", "video/mp4"];
  return list.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

const clamp1 = (v) => Math.max(-1, Math.min(1, v));
const smoothstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/* the viewer steering the glass. the pointer's offset from the icon is
   measured in icon sizes, so crossing the icon sweeps the whole tilt and
   its edge is full tilt; a finger drags the same way; a phone's tilt
   steers once allowed (ios asks on a tap). a critically damped spring
   carries the glass there and back, so it arrives without wobbling. while
   the reveal runs the timeline is in charge; the steering blends in once
   the icon has formed, or at once when paused. a tap or click replays.

   steer({ stage, canvas, glass, enabled, strength, paused, time, kick,
   replay }) → { step(dt) → still moving?, look, destroy } */
export function steer({ stage, canvas, glass, enabled, strength, paused, time, kick, replay }) {
  const look = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, at: -1e9, acc: 0 };
  const aim = (e) => {
    const r = canvas.getBoundingClientRect();
    const k = canvas.clientWidth / r.width; // the canvas may be shown scaled
    const reach = Math.max(16, (glass.iconPx || 256) * 0.62);
    look.tx = clamp1(((e.clientX - (r.left + r.width / 2)) * k) / reach);
    look.ty = clamp1((-(e.clientY - (r.top + r.height / 2)) * k) / reach);
    look.at = performance.now();
    kick();
  };
  const home = () => { look.tx = look.ty = 0; kick(); };
  let down = null;
  const onMove = (e) => { if (enabled()) aim(e); };
  const onDown = (e) => {
    down = { x: e.clientX, y: e.clientY };
    if (enabled()) { aim(e); askMotion(); }
  };
  const onUp = (e) => {
    const tap = down && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 6;
    down = null;
    if (e.pointerType === "touch") home();
    if (tap && !e.target.closest("button, a, input, select, label")) replay();
  };
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerleave", home);
  stage.addEventListener("pointercancel", home);
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointerup", onUp);

  let motionOn = false;
  const onTilt = (e) => {
    if (!enabled() || e.beta == null || e.gamma == null) return;
    if (performance.now() - look.at < 1500) return; // a finger or pointer leads
    look.tx = clamp1(e.gamma / 30);
    look.ty = clamp1(-(e.beta - 45) / 30);
    kick();
  };
  const listenTilt = () => { if (!motionOn) { motionOn = true; addEventListener("deviceorientation", onTilt); } };
  const askMotion = () => {
    const D = typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : null;
    if (motionOn || !D || navigator.maxTouchPoints === 0) return;
    if (typeof D.requestPermission === "function")
      D.requestPermission().then((r) => r === "granted" && listenTilt()).catch(() => {});
    else listenTilt();
  };
  if (matchMedia("(pointer: coarse)").matches && typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission !== "function") listenTilt();

  const step = (dt) => {
    const formed = paused() ? 1 : smoothstep(0.45, 0.85, time());
    glass.lookAmt = enabled() ? strength() * formed : 0;
    if (reduceMotion) { look.x = look.tx; look.y = look.ty; }
    else {
      const k = 140, d = 2 * Math.sqrt(k); // per second; d = 2√k is critical
      look.acc = Math.min(look.acc + dt, 0.1);
      while (look.acc >= 1 / 120) {
        look.acc -= 1 / 120;
        look.vx += ((look.tx - look.x) * k - look.vx * d) / 120;
        look.vy += ((look.ty - look.y) * k - look.vy * d) / 120;
        look.x += look.vx / 120;
        look.y += look.vy / 120;
      }
    }
    glass.look = [look.x, look.y];
    return Math.abs(look.tx - look.x) + Math.abs(look.ty - look.y) + Math.abs(look.vx) + Math.abs(look.vy) > 1e-3;
  };
  const destroy = () => {
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerleave", home);
    stage.removeEventListener("pointercancel", home);
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointerup", onUp);
    removeEventListener("deviceorientation", onTilt);
  };
  return { step, look, home, destroy };
}

/* record t = 0 → secs of a renderer's canvas to a video blob, in real time */
export async function record(g, c, { fps, format, bitsPerSecond, secs, speed, cssW, onProgress }) {
  const type = videoType(format);
  if (!type) return null;
  const stream = c.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: bitsPerSecond });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start();
  const t0 = performance.now();
  await new Promise((resolve) => {
    const step = (now) => {
      const s = (now - t0) / 1000;
      g.render(s * speed, cssW);
      onProgress?.(Math.min(1, s / secs));
      if (s < secs) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  await done;
  for (const tr of stream.getTracks()) tr.stop();
  return new Blob(chunks, { type });
}

/* ---- the tile and the capture reel ---------------------------------------- */
/* the reveal on its own, looping with its hold, on one canvas that fills the
   cell. in a portfolio tile it draws no ground, so the tile's own colour
   shows, follows the page's light or dark, and rests while scrolled away;
   in a capture frame it stays opaque so the recording has a ground
   (&brand=uxpilot&ending=wordmark pick the logo and the ending there) */
export function reel(el) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  el.appendChild(canvas);
  const q = new URLSearchParams(location.search);
  const capture = !!el.closest(".cap-stage");
  const light = !capture && !matchMedia("(prefers-color-scheme: dark)").matches;
  const params = { ...DEFAULTS, ...(light ? { theme: "light", ...THEMES.light } : {}),
    ending: q.get("ending") === "wordmark" ? "wordmark" : "logo" };
  const glass = new GlassLogo(canvas, params, { clear: !capture });
  const B = BRANDS[(capture && q.get("brand")) || "tohirr"];
  if (B && B.logo) brandArt(B)
    .then(([logo, wordImg]) => { params.text = B.text; params.original = !!B.original; glass.setArt({ logo, wordImg }); })
    .catch(() => {});
  const pass = lengthOf(params.ending) + params.loopDelay;
  let t0 = null;
  let raf = 0;
  let elapsed = 0;
  let paused = 0;
  const io = capture ? null : new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) {
      if (paused && t0 !== null) t0 += performance.now() - paused; // resume where it left off
      paused = 0;
      raf = requestAnimationFrame(frame);
    } else if (!e.isIntersecting && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      paused = performance.now();
    }
  });
  io?.observe(el);
  const frame = (now) => {
    t0 ??= now;
    elapsed = (now - t0) / 1000;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
    /* compose the frame as a 540px-high view, whatever its pixel size */
    glass.render(reduceMotion ? lengthOf(params.ending) : elapsed % pass, canvas.width * (540 / Math.min(canvas.width, canvas.height)));
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  /* restart from the first frame — call it as the recorder starts */
  el.glassReel = { restart: () => { t0 = null; }, elapsed: () => elapsed, length: pass };
  return () => { cancelAnimationFrame(raf); io?.disconnect(); canvas.remove(); };
}
