/* /glass/ — a camera that sees through a wall of glass block. the feed
   fills the screen; the filter row swaps between the plain feed and the
   glass with a wipe; the shutter takes a picture, or records a clip in
   video mode. captures come straight off the webgl canvas, so what you
   see is what you get, at the screen's own resolution. */

import "./glass.css";
import { createGlass, makeWipe } from "../lab/glass-render.js";

const FLIP_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 10a8 8 0 0 1 14-4.5M20 14a8 8 0 0 1-14 4.5"/>' +
  '<path d="M18 2v4h-4M6 22v-4h4"/></svg>';

const CELL_STEPS = [10, 14, 20];
const isTouch = matchMedia("(pointer: coarse)").matches;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const app = document.getElementById("cam");
app.innerHTML =
  '<canvas class="view"></canvas>' +
  '<video class="feed" muted playsinline autoplay></video>' +
  '<div class="flash"></div>' +
  '<header class="top">' +
  '<a class="back" href="/">← tohirr</a>' +
  '<span class="rec" hidden><i></i><output>0:00</output></span>' +
  '<button class="pill grid-btn" type="button" aria-label="tile size">tiles <b>14</b></button>' +
  "</header>" +
  '<footer class="bottom">' +
  '<div class="filters" role="tablist" aria-label="filter">' +
  '<button role="tab" type="button" data-f="normal" aria-selected="false">normal</button>' +
  '<button role="tab" type="button" data-f="glass" aria-selected="true">glass</button>' +
  "</div>" +
  '<div class="modes" aria-label="mode">' +
  '<button type="button" data-m="photo" aria-pressed="true">photo</button>' +
  '<button type="button" data-m="video" aria-pressed="false">video</button>' +
  "</div>" +
  '<div class="shutter-row">' +
  '<button class="thumb" type="button" aria-label="last capture" hidden><img alt=""></button>' +
  '<button class="shutter" type="button" aria-label="take photo"><i></i></button>' +
  `<button class="round flip" type="button" aria-label="flip camera">${FLIP_ICON}</button>` +
  "</div>" +
  "</footer>" +
  '<div class="state" hidden><p></p><button type="button">allow camera</button></div>' +
  '<div class="review" hidden><div class="media"></div>' +
  '<div class="actions"><button type="button" class="primary" data-a="share" hidden>share</button>' +
  '<a class="primary" data-a="save" download>save</a>' +
  '<button type="button" data-a="close">close</button></div></div>';

const $ = (s) => app.querySelector(s);
const canvas = $(".view");
const video = $(".feed");
const flashEl = $(".flash");
const stateEl = $(".state");
const recEl = $(".rec");
const shutter = $(".shutter");
const thumb = $(".thumb");
const review = $(".review");

const glass = createGlass(canvas, { dpr: 2, preserve: true, params: { cells: 14 } });
if (!glass) {
  stateEl.hidden = false;
  stateEl.querySelector("p").textContent = "webgl is unavailable here — the glass needs it.";
  stateEl.querySelector("button").hidden = true;
}

/* ---- state ------------------------------------------------------------------ */

let facing = isTouch ? "environment" : "user";
let stream = null;
let mode = "photo";
let cellIdx = 1;
const wipe = makeWipe(1);
let recorder = null;
let recTrack = null; // the capture track while a clip records, if frames are pushed by hand
const recCanvas = document.createElement("canvas"); // a 2d copy of the view, for the recorder
const recCtx = recCanvas.getContext("2d");
let recChunks = [];
let recStart = 0;
let recTimer = 0;
let last = null; // { blob, url, kind, ext, poster }

const toast = (msg) => {
  app.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  app.appendChild(t);
  t.addEventListener("animationend", () => t.remove());
};

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/* ---- camera ------------------------------------------------------------------- */

const showState = (msg, button) => {
  stateEl.hidden = false;
  stateEl.querySelector("p").textContent = msg;
  const b = stateEl.querySelector("button");
  b.hidden = !button;
  if (button) b.textContent = button;
};

const stopCam = () => {
  if (!stream) return;
  for (const tr of stream.getTracks()) tr.stop();
  stream = null;
  video.srcObject = null;
};

const startCam = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    showState("no camera api here — try a current browser over https.");
    return;
  }
  stopCam();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facing,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    video.srcObject = stream;
    await video.play().catch(() => {});
    // what we actually got — a phone may only have the one camera
    facing = stream.getVideoTracks()[0]?.getSettings?.().facingMode || facing;
    stateEl.hidden = true;
  } catch (err) {
    stream = null;
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "SecurityError")
      showState("camera blocked — allow it for this site in the browser, then try again.", "try again");
    else if (name === "NotFoundError" || name === "OverconstrainedError")
      showState("no camera found on this device.", "try again");
    else showState(`camera failed: ${err?.message || name || "unknown"}`, "try again");
  }
};

stateEl.querySelector("button").addEventListener("click", startCam);

$(".flip").addEventListener("click", () => {
  facing = facing === "user" ? "environment" : "user";
  startCam();
});

/* ---- filter, tiles, mode ------------------------------------------------------ */

const filterBtns = [...app.querySelectorAll("[data-f]")];
const setFilter = (f) => {
  wipe.set(f === "glass", performance.now(), reduceMotion ? 0 : 480);
  for (const b of filterBtns) b.setAttribute("aria-selected", String(b.dataset.f === f));
};
for (const b of filterBtns) b.addEventListener("click", () => setFilter(b.dataset.f));
const toggleFilter = () => setFilter(wipe.target > 0.5 ? "normal" : "glass");

const gridBtn = $(".grid-btn");
const setCells = (i) => {
  cellIdx = (i + CELL_STEPS.length) % CELL_STEPS.length;
  glass.params.cells = CELL_STEPS[cellIdx];
  gridBtn.querySelector("b").textContent = CELL_STEPS[cellIdx];
};
gridBtn.addEventListener("click", () => setCells(cellIdx + 1));

const modeBtns = [...app.querySelectorAll("[data-m]")];
const setMode = (m) => {
  if (recorder) return; // not mid-clip
  mode = m;
  for (const b of modeBtns) b.setAttribute("aria-pressed", String(b.dataset.m === m));
  shutter.classList.toggle("video", m === "video");
  shutter.setAttribute("aria-label", m === "video" ? "record" : "take photo");
};
for (const b of modeBtns) b.addEventListener("click", () => setMode(b.dataset.m));

/* a sideways swipe on the feed swaps the filter, like flicking through a
   camera's filters; a vertical one swaps the mode */
let sx = 0, sy = 0, swiping = false;
canvas.addEventListener("pointerdown", (e) => {
  sx = e.clientX;
  sy = e.clientY;
  swiping = true;
});
canvas.addEventListener("pointerup", (e) => {
  if (!swiping) return;
  swiping = false;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) toggleFilter();
  else if (Math.abs(dy) > 48 && Math.abs(dy) > Math.abs(dx) * 1.5) setMode(mode === "photo" ? "video" : "photo");
});

/* ---- capture ------------------------------------------------------------------- */

const setLast = (cap) => {
  if (last?.url) URL.revokeObjectURL(last.url);
  if (last?.poster) URL.revokeObjectURL(last.poster);
  last = cap;
  thumb.querySelector("img").src = cap.poster || cap.url;
  thumb.hidden = false;
  thumb.classList.remove("pop");
  void thumb.offsetWidth;
  thumb.classList.add("pop");
};

const takePhoto = () => {
  if (!video.videoWidth) {
    toast("no camera yet");
    return;
  }
  flashEl.classList.remove("on");
  void flashEl.offsetWidth;
  flashEl.classList.add("on");
  navigator.vibrate?.(12);
  // the buffer is preserved, so this is exactly the frame on screen
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      setLast({ blob, url: URL.createObjectURL(blob), kind: "image", ext: "jpg" });
    },
    "image/jpeg",
    0.92,
  );
};

/* webm where the browser has it (chromium, firefox — its mp4 muxing is
   newer and patchier), mp4 where that is all there is (safari) */
const pickMime = () =>
  ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4;codecs=avc1", "video/mp4"]
    .find((m) => window.MediaRecorder?.isTypeSupported?.(m));

const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const startRec = () => {
  if (!video.videoWidth) {
    toast("no camera yet");
    return;
  }
  const mime = pickMime();
  if (!mime || !canvas.captureStream) {
    toast("video recording isn't supported here");
    return;
  }
  // record a 2d copy of the view, one blit per frame: capturing a webgl
  // canvas directly comes back empty in some browsers. push a frame per
  // draw where the browser lets us; elsewhere let it sample at 30
  // clips top out at 1080p-ish; the encoder has to keep up in real time
  const k = Math.min(1, 1920 / Math.max(canvas.width, canvas.height));
  recCanvas.width = Math.round(canvas.width * k);
  recCanvas.height = Math.round(canvas.height * k);
  let out = recCanvas.captureStream(0);
  recTrack = out.getVideoTracks()[0];
  if (!recTrack?.requestFrame) {
    for (const tr of out.getTracks()) tr.stop();
    recTrack = null;
    out = recCanvas.captureStream(30);
  }
  try {
    recorder = new MediaRecorder(out, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  } catch {
    toast("couldn't start recording");
    recorder = null;
    return;
  }
  recChunks = [];
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  recorder.ondataavailable = (e) => e.data.size && recChunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(recChunks, { type: mime.split(";")[0] });
    canvas.toBlob(
      (posterBlob) =>
        setLast({
          blob,
          url: URL.createObjectURL(blob),
          kind: "video",
          ext,
          poster: posterBlob ? URL.createObjectURL(posterBlob) : "",
        }),
      "image/jpeg",
      0.7,
    );
    for (const tr of out.getTracks()) tr.stop();
    recTrack = null;
    recorder = null;
    shutter.classList.remove("recording");
    recEl.hidden = true;
    clearInterval(recTimer);
  };
  recorder.onerror = () => {
    toast("recording failed");
    stopRec();
  };
  recorder.start(250);
  // a first frame straight away, so even the shortest tap makes a clip
  pushRecFrame();
  recStart = performance.now();
  shutter.classList.add("recording");
  recEl.hidden = false;
  recEl.querySelector("output").textContent = "0:00";
  recTimer = setInterval(() => {
    recEl.querySelector("output").textContent = fmtTime(performance.now() - recStart);
  }, 250);
  navigator.vibrate?.(12);
};

const pushRecFrame = () => {
  if (recorder?.state !== "recording") return;
  recCtx.drawImage(canvas, 0, 0, recCanvas.width, recCanvas.height);
  recTrack?.requestFrame();
};

const stopRec = () => {
  if (recorder?.state === "recording") recorder.stop();
};

shutter.addEventListener("click", () => {
  if (mode === "photo") takePhoto();
  else if (recorder) stopRec();
  else startRec();
});

/* ---- review --------------------------------------------------------------------- */

const shareBtn = review.querySelector("[data-a=share]");
const saveLink = review.querySelector("[data-a=save]");

const openReview = () => {
  if (!last) return;
  const media = review.querySelector(".media");
  media.innerHTML = "";
  if (last.kind === "image") {
    const img = new Image();
    img.src = last.url;
    img.alt = "your capture";
    media.appendChild(img);
  } else {
    const v = document.createElement("video");
    v.src = last.url;
    v.controls = true;
    v.playsInline = true;
    v.loop = true;
    v.autoplay = true;
    v.muted = true;
    media.appendChild(v);
  }
  const name = `glass-${stamp()}.${last.ext}`;
  saveLink.href = last.url;
  saveLink.download = name;
  const file = new File([last.blob], name, { type: last.blob.type });
  shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
  shareBtn.onclick = () => navigator.share({ files: [file] }).catch(() => {});
  review.hidden = false;
};

const closeReview = () => {
  review.hidden = true;
  review.querySelector(".media").innerHTML = "";
};

thumb.addEventListener("click", openReview);
review.querySelector("[data-a=close]").addEventListener("click", closeReview);

/* ---- keys ------------------------------------------------------------------------- */

addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Escape") return closeReview();
  if (!review.hidden) return;
  if (e.key === " " || e.key === "Enter") {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "A") return;
    e.preventDefault();
    shutter.click();
  } else if (e.key === "g") toggleFilter();
  else if (e.key === "f") $(".flip").click();
  else if (e.key === "v") setMode(mode === "photo" ? "video" : "photo");
  else if (e.key === "t") setCells(cellIdx + 1);
});

/* ---- loop -------------------------------------------------------------------------- */

const frame = (t) => {
  if (glass) {
    const mirror = facing === "user";
    if (video.videoWidth) glass.draw(video, { mirror, wipe: wipe.edge(t) });
    else glass.clear();
    pushRecFrame();
  }
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

/* let the camera go while the tab is hidden, and come back with it */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (recorder) stopRec();
    stopCam();
  } else if (!stream) startCam();
});

if (glass) startCam();
