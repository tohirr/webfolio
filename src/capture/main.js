/* capture — a recording harness for the lab pieces.

   one route renders one piece, alone, in a frame of exact pixel size, with
   no portfolio around it, and records that frame to a file. the point is to
   never crop or rescale a clip afterwards: what the frame is, is what gets
   posted.

   every dial below is a control in the panel — the url is where the panel
   writes what you picked, so a set-up frame stays linkable and reloadable,
   not something you have to remember to type.

   /capture/?p=morph&w=1080&h=1080

     p       lab module basename (src/lab/<p>.js). omit for the index
     w,h     frame size in px — the piece measures this, so its canvas is
             sized to it. default 1080x1080. the readout has a picker for the
             usual sizes; it resizes live and writes the url back
     theme   light | dark — forces the palette. default: follows the system
     bg      none (transparent) | a hex, with or without the #. default: the
             frame's own tile colour
     radius  corner radius in px. default 0
     raw     1 — show the piece the way the lab does, captions and controls
             and all, instead of the way a tile does
     fill    1 — strip the max-widths pieces use to sit in a column
     dpr     the devicePixelRatio the piece should see. raise it to render a
             canvas above the frame's css size. default: the display's own
     fps     capture frame rate. default 60
     mbps    recording bitrate. default 12, which is plenty for a short
             social clip; 20 and 32 are there for a master worth grading
     fmt     mp4 (default) — h264 straight out of the recorder, which is one
             encode rather than two and the only thing x actually accepts.
             webm is vp9, a better intermediate if the clip gets graded
     audio   1 — tee whatever the piece sends to the speakers into the file
     mode    canvas | screen. default: canvas when the piece draws into
             exactly one canvas, screen otherwise
     controls 0 — leave the piece's own sliders inside the frame (hidden by
             the tile rules) instead of moving them out to the side rail

   keys: r record · s still · f 1:1 · h hide/show the panel

   the panel's dismiss sticks across reloads. h brings it back, and so does
   ?hud=1 if you are staring at an empty window wondering where it went.
*/

import "../index.css";
import "./capture.css";
import { audio } from "../lab/audio.js";
import { unlockAudio } from "../lab/audio-unlock.js";

const q = new URLSearchParams(location.search);

const num = (k, dflt, lo, hi) => {
  const v = Number(q.get(k));
  return Number.isFinite(v) && v > 0 ? Math.min(hi, Math.max(lo, v)) : dflt;
};
const flag = (k) => q.get(k) === "1";

const NAME = q.get("p");
let W = num("w", 1080, 16, 4096);
let H = num("h", 1080, 16, 4096);
let RADIUS = num("radius", 0, 0, 512);
let FPS = num("fps", 60, 1, 120);
let MBPS = num("mbps", 12, 1, 200);
let FMT = q.get("fmt") === "webm" ? "webm" : "mp4";
let MODE = q.get("mode") === "canvas" || q.get("mode") === "screen" ? q.get("mode") : null;
const DPR = num("dpr", 0, 0.5, 8); // 0 — leave the display's alone
const THEME = q.get("theme");
const BG = q.get("bg");
const RAW = flag("raw");
const FILL = flag("fill");
const WANT_AUDIO = flag("audio");

/* ---- both of these have to land before the piece mounts ---------------- */

/* a piece sizes its canvas by devicePixelRatio, so this is the lever that
   renders a 1080 frame at 2160 backing pixels — or pins a retina mac to 1,
   when the output should be exactly w x h */
/* the display's real ratio, read before the override below starts lying about
   it — screen mode needs to know how many actual pixels a css pixel is worth */
const REAL_DPR = window.devicePixelRatio || 1;

/* held open rather than set once, so the panel can change what a piece thinks
   it is rendering onto without a reload — they read it every frame */
let dprOverride = DPR;
Object.defineProperty(window, "devicePixelRatio", {
  configurable: true,
  get: () => dprOverride || REAL_DPR,
});

if (THEME === "light" || THEME === "dark") document.documentElement.dataset.theme = THEME;

/* every piece that makes sound routes it to ac.destination. tee anything that
   lands there into a second sink the recorder can read, so a clip can carry
   the piece's own audio without the piece knowing anything about it. */
let audioDest = null;
if (WANT_AUDIO) {
  const ac = audio();
  if (ac) {
    audioDest = ac.createMediaStreamDestination();

    /* the pieces build a node per sound and drop it when the sound ends, so
       between notes nothing at all is connected here and the track goes idle:
       chrome then stops emitting, and the recorder ends up with a few seconds
       of real samples carrying half a minute of timestamps — every sound
       bunched at the front on playback. a constant source at zero keeps a
       continuous, silent stream running into the sink so the clock never
       stops. it adds nothing audible: offset is 0. */
    const keepAlive = ac.createConstantSource();
    keepAlive.offset.value = 0;
    keepAlive.connect(audioDest);
    keepAlive.start();

    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (target, ...rest) {
      if (target === ac.destination) connect.call(this, audioDest);
      return connect.call(this, target, ...rest);
    };
  }
}

/* the lab, as a map of name -> loader. declared up here because the panel's
   piece picker is built from it before anything mounts. */
const modules = import.meta.glob("../lab/*.js");
const pathOf = (n) => `../lab/${n}.js`;
const nameOf = (p) => p.slice("../lab/".length, -3);

/* ---- the frame --------------------------------------------------------- */

const root = document.getElementById("capture");
const fit = document.createElement("div");
fit.className = "cap-fit";
const stage = document.createElement("div");
stage.className = `cap-stage ${RAW ? "cap-raw" : "tile"}${FILL ? " cap-fill" : ""}`;
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;
if (RADIUS) stage.style.borderRadius = `${RADIUS}px`;
if (BG === "none") {
  stage.style.background = "transparent";
  document.body.classList.add("cap-alpha");
} else if (BG) {
  stage.style.background = /^#/.test(BG) ? BG : `#${BG}`;
}
fit.append(stage);
root.append(fit);

/* the frame is laid out at full size and only displayed scaled — the piece
   still measures w x h, so nothing about the recording changes with the
   window. at anything below 1:1 a piece that reads raw pointer pixels rather
   than a fraction of its rect will feel off by the scale factor; press f, or
   open a bigger window, to drive one by hand. */
let oneToOne = false;
function refit() {
  const k = oneToOne ? 1 : Math.min(1, (innerWidth - 48) / W, (innerHeight - 120) / H);
  stage.style.setProperty("--k", k);
  /* the wrapper takes the size the frame *looks*, so the grid centres that */
  fit.style.width = `${Math.round(W * k)}px`;
  fit.style.height = `${Math.round(H * k)}px`;
  document.body.classList.toggle("cap-1to1", k >= 1);
  hud.scale.textContent = k >= 1 ? "1:1" : `${Math.round(k * 100)}%`;
}
addEventListener("resize", refit);

/* ---- hud --------------------------------------------------------------- */

const hudEl = document.createElement("div");
hudEl.className = "cap-hud";
hudEl.innerHTML =
  '<button class="cap-close" type="button" aria-label="hide the readout">' +
  '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M3 3l10 10M13 3L3 13"/></svg></button>' +
  '<div class="cap-row"><b class="cap-name"></b><span class="cap-size"></span>' +
  '<span class="cap-mode"></span><span class="cap-scale"></span></div>' +
  '<div class="cap-fields"></div>' +
  '<div class="cap-actions">' +
  '<button class="cap-btn cap-go" type="button">record</button>' +
  '<button class="cap-btn cap-snap" type="button">still</button></div>' +
  '<div class="cap-keys"><kbd>r</kbd> record · <kbd>s</kbd> still · ' +
  "<kbd>f</kbd> 1:1 · <kbd>h</kbd> hide</div>" +
  '<div class="cap-note"></div>' +
  '<button class="cap-cmd" type="button" hidden></button>';
document.body.append(hudEl);
/* the piece's sliders ship inside the piece, where the tile rules hide them
   and a recording would catch them if they were shown. this rail takes them
   out of the frame instead — see railControls(). */
const rail = document.createElement("aside");
rail.className = "cap-rail";
rail.hidden = true;
document.body.append(rail);

const recEl = document.createElement("div");
recEl.className = "cap-rec";
recEl.hidden = true;
recEl.innerHTML = '<i></i><span class="cap-time">0:00</span>';
document.body.append(recEl);

/* the readout is chrome, not content — it has to be able to get out of the
   way of an external screen recorder (screen studio, cmd+shift+5) pointed at
   this window. dismissing sticks across reloads and piece changes, so a whole
   recording session stays clean; h brings it back. */
const HUD_KEY = "capture:hud";
let hudOff = false;
try {
  hudOff = localStorage.getItem(HUD_KEY) === "0";
} catch {
  /* private window, storage blocked — the session just starts visible */
}
/* ?hud=0 only speaks for the load it is on — dismissing is what sticks, so a
   linked frame cannot quietly hide the chrome for every later visit. ?hud=1 is
   the way back in: a dismissed panel leaves nothing to click, and h is no help
   if you have forgotten it, so the url has to be able to undo the dismissal. */
if (q.get("hud") === "0") hudOff = true;
else if (q.get("hud") === "1") hudOff = false;

function syncHud() {
  hudEl.hidden = hudOff || !!rec; // a recording hides it either way
  /* the rail sits outside the frame, and both modes crop to the frame, so a
     recording never sees it — it only goes away when the chrome is dismissed */
  rail.hidden = hudOff || !rail.childElementCount;
}

/* only a deliberate dismiss persists */
function setHudOff(off) {
  hudOff = off;
  try {
    if (off) localStorage.setItem(HUD_KEY, "0");
    else localStorage.removeItem(HUD_KEY);
  } catch {
    /* nothing to persist to; the toggle still works for this page */
  }
  syncHud();
}

const hud = {
  name: hudEl.querySelector(".cap-name"),
  size: hudEl.querySelector(".cap-size"),
  mode: hudEl.querySelector(".cap-mode"),
  scale: hudEl.querySelector(".cap-scale"),
  note: hudEl.querySelector(".cap-note"),
  cmd: hudEl.querySelector(".cap-cmd"),
  time: recEl.querySelector(".cap-time"),
};


/* ---- the panel --------------------------------------------------------- */

/* every dial lives here rather than in the url. a change applies to the live
   page where it can (size, theme, corner, capture settings — the pieces
   re-measure every frame, so nothing needs remounting) and reloads only where
   it must: a different piece, and the two that have to be in place *before*
   mount — the audio tee, and whether the frame behaves as a tile or raw.
   either way the url is rewritten, so the frame you set up is a link. */

const SIZES = [
  [1080, 1080, "1:1 square"],
  [1080, 1350, "4:5 portrait"],
  [1080, 1920, "9:16 vertical"],
  [1920, 1080, "16:9 wide"],
  [1200, 675, "16:9 small"],
];

function setParam(k, v, reload) {
  const url = new URL(location.href);
  if (v === "" || v == null) url.searchParams.delete(k);
  else url.searchParams.set(k, v);
  if (reload) location.assign(url);
  else history.replaceState(null, "", url);
}

function applySize(v) {
  const [w, h] = v.split("x").map(Number);
  W = w;
  H = h;
  stage.style.width = `${W}px`;
  stage.style.height = `${H}px`;
  hud.size.textContent = `${W}x${H}`;
  refit();
}

function applyBg(v) {
  document.body.classList.toggle("cap-alpha", v === "none");
  if (v === "none") stage.style.background = "transparent";
  else if (v) stage.style.background = /^#/.test(v) ? v : `#${v}`;
  else stage.style.background = "";
}

const FIELDS = [
  { k: "p", label: "piece", reload: true, opts: () => pieceOpts, val: () => NAME },
  { k: "size", label: "size", param: false, val: () => `${W}x${H}`,
    opts: () => SIZES.map(([w, h, l]) => [`${w}x${h}`, `${l} · ${w}×${h}`]),
    apply: (v) => { applySize(v); const [w, h] = v.split("x"); setParam("w", w); setParam("h", h); } },
  { k: "theme", label: "theme", val: () => THEME || "",
    opts: () => [["", "auto"], ["dark", "dark"], ["light", "light"]],
    apply: (v) => { if (v) document.documentElement.dataset.theme = v;
                    else delete document.documentElement.dataset.theme; } },
  { k: "bg", label: "backdrop", val: () => BG || "",
    opts: () => [["", "tile"], ["none", "transparent"], ["0e0e0e", "black"], ["ffffff", "white"]],
    apply: applyBg },
  { k: "radius", label: "corner", type: "range", min: 0, max: 96, step: 4, val: () => RADIUS,
    apply: (v) => { RADIUS = +v; stage.style.borderRadius = RADIUS ? `${RADIUS}px` : ""; } },
  { k: "mode", label: "capture", val: () => MODE || "",
    opts: () => [["", "auto"], ["canvas", "canvas only"], ["screen", "whole frame"]],
    apply: (v) => { MODE = v || null; describeMode(); } },
  { k: "dpr", label: "render at", val: () => (DPR ? String(DPR) : ""),
    opts: () => [["", "display"], ["1", "1x — exact px"], ["2", "2x"], ["3", "3x"]],
    apply: (v) => { dprOverride = Number(v) || 0; } },
  { k: "fps", label: "fps", val: () => String(FPS),
    opts: () => [["60", "60"], ["30", "30"], ["24", "24"]],
    apply: (v) => { FPS = +v; } },
  { k: "mbps", label: "quality", val: () => String(MBPS),
    opts: () => [["8", "8 Mbps — small"], ["12", "12 Mbps"], ["20", "20 Mbps"], ["32", "32 Mbps — master"]],
    apply: (v) => { MBPS = +v; } },
  { k: "fmt", label: "file", val: () => FMT,
    opts: () => [["mp4", "mp4 — post as is"], ["webm", "webm — master"]],
    apply: (v) => { FMT = v; } },
  { k: "audio", label: "sound", type: "check", reload: true, val: () => WANT_AUDIO },
  { k: "fill", label: "fill frame", type: "check", val: () => FILL,
    apply: (v) => stage.classList.toggle("cap-fill", v) },
  { k: "raw", label: "show controls", type: "check", reload: true, val: () => RAW },
];

/* names first, so the picker is right immediately; the helpers in lab/ have no
   mount() and drop out as soon as the scan comes back */
let pieceOpts = Object.keys(modules).map((path) => [nameOf(path), nameOf(path)]).sort();

const fieldsEl = hudEl.querySelector(".cap-fields");
const controlOf = new Map();

function buildFields() {
  fieldsEl.innerHTML = "";
  for (const f of FIELDS) {
    const id = `cap-f-${f.k}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = f.label;

    let input;
    if (f.type === "check") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!f.val();
    } else if (f.type === "range") {
      input = document.createElement("input");
      input.type = "range";
      input.min = f.min;
      input.max = f.max;
      input.step = f.step;
      input.value = f.val();
    } else {
      input = document.createElement("select");
      const cur = String(f.val());
      input.innerHTML = f
        .opts()
        .map(([v, l]) => `<option value="${v}"${v === cur ? " selected" : ""}>${l}</option>`)
        .join("");
    }
    input.id = id;
    input.className = "cap-input";
    controlOf.set(f.k, input);

    const on = f.type === "range" ? "input" : "change";
    input.addEventListener(on, () => {
      const v = f.type === "check" ? input.checked : input.value;
      f.apply?.(v);
      if (f.param !== false) setParam(f.k, f.type === "check" ? (v ? "1" : "") : v, f.reload);
      if (f.type === "range") out.textContent = v;
      /* hand the keys back, or r and s go to the control */
      if (!f.reload && f.type !== "range") input.blur();
    });

    const cell = document.createElement("div");
    cell.className = "cap-cell";
    cell.append(input);
    let out;
    if (f.type === "range") {
      out = document.createElement("output");
      out.textContent = f.val();
      cell.append(out);
    }
    fieldsEl.append(label, cell);
  }
}

buildFields();

/* prune what cannot be mounted, then rebuild just the piece picker */
Promise.all(
  Object.entries(modules).map(async ([path, load]) => {
    try {
      return typeof (await load()).mount === "function" ? nameOf(path) : null;
    } catch {
      return null;
    }
  }),
).then((names) => {
  pieceOpts = names.filter(Boolean).sort().map((n) => [n, n]);
  const sel = controlOf.get("p");
  if (!sel) return;
  sel.innerHTML = pieceOpts
    .map(([v]) => `<option value="${v}"${v === NAME ? " selected" : ""}>${v}</option>`)
    .join("");
});

hudEl.querySelector(".cap-go").addEventListener("click", () => (rec ? stopRec() : startRec()));
hudEl.querySelector(".cap-snap").addEventListener("click", () => still());

hudEl.querySelector(".cap-close").addEventListener("click", () => {
  setHudOff(true);
  console.info("capture — readout hidden. press h to bring it back.");
});

/* two things write here: the live mode advisory, and the result of a take.
   the advisory refreshes every 400ms, so a result has to be able to pin the
   line or it is wiped before it can be read. */
let noteSticky = false;
const note = (t = "", sticky = false) => {
  if (noteSticky && !sticky) return;
  noteSticky = sticky;
  hud.note.textContent = t;
};

hud.cmd.addEventListener("click", () => {
  navigator.clipboard?.writeText(hud.cmd.dataset.cmd || "").then(
    () => note("ffmpeg line copied", true),
    () => note("copy failed — select it by hand", true),
  );
});

/* ---- boot -------------------------------------------------------------- */

let cleanup = null;

function fail(msg) {
  stage.remove();
  const p = document.createElement("p");
  p.className = "cap-fail";
  p.textContent = msg;
  root.append(p);
  hudEl.hidden = true;
}

/* no ?p= — list what can be mounted. the helpers in lab/ (audio, the glass
   renderer) have no mount(), so they sort themselves out of this. */
async function showIndex() {
  hudEl.hidden = true;
  stage.remove();
  const names = (
    await Promise.all(
      Object.entries(modules).map(async ([path, load]) => {
        try {
          const m = await load();
          return typeof m.mount === "function" ? nameOf(path) : null;
        } catch {
          return null;
        }
      }),
    )
  )
    .filter(Boolean)
    .sort();

  const el = document.createElement("div");
  el.className = "cap-index";
  el.innerHTML =
    "<h1>capture</h1><p>a piece alone in a frame, at the size it gets posted at. " +
    "<kbd>r</kbd> records it.</p><ul>" +
    names
      .map((n) => `<li><a href="?p=${encodeURIComponent(n)}">${n}</a></li>`)
      .join("") +
    "</ul>";
  root.append(el);
}

async function boot() {
  if (!NAME) return showIndex();

  const load = modules[pathOf(NAME)];
  if (!load) return fail(`no piece named "${NAME}" in src/lab/`);

  let mod;
  try {
    mod = await load();
  } catch (e) {
    return fail(`${NAME} failed to load — ${e.message}`);
  }
  if (typeof mod.mount !== "function") return fail(`${NAME} exports no mount()`);

  try {
    cleanup = mod.mount(stage) || null;
  } catch (e) {
    return fail(`${NAME} threw on mount — ${e.message}`);
  }

  railControls();
  document.title = `capture — ${NAME}`;
  hud.name.textContent = NAME;
  hud.size.textContent = `${W}x${H}`;
  if (q.get("hud") === "1") setHudOff(false); // clear the stored dismissal too
  syncHud();
  if (hudOff) console.info("capture — readout hidden. press h to bring it back.");
  refit();
  /* a piece sizes its canvas on its own schedule — some only once a first
     frame has run, some again on resize — so the readout is kept live rather
     than sampled once. it is the one number that must never surprise: it is
     exactly what the file will be. */
  describeMode();
  setInterval(() => { if (!rec) describeMode(); }, 400);
}

/* lift the piece's controls and caption out of the frame and into the rail.
   moving them stops `.tile .fc-row { display: none }` from matching, so they
   turn visible on the way out with no per-piece css here; every listener is
   bound to the input itself, so it travels with the element. */
function railControls() {
  if (q.get("controls") === "0") return;
  const bits = stage.querySelectorAll(':scope > [class$="-row"], :scope > [class$="-cap"]');
  if (!bits.length) return;
  rail.append(...bits);
  syncHud();
}

function canvases() {
  return [...stage.querySelectorAll("canvas")].filter((c) => {
    const r = c.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && getComputedStyle(c).visibility !== "hidden";
  });
}

/* canvas capture is the better recording — true frames, no cursor, no
   compositor — but it only holds when the whole piece *is* one canvas. a dom
   piece, or stacked canvases, needs the tab surface instead. */
/* canvas capture is the better recording — true frames, no cursor, no
   compositor — but only when the canvas *is* the whole piece. when it is
   smaller than the frame, everything around it is the piece too: the
   background, the drop shadow, and in foil's case the entire tilt,
   which is a css transform on the card element and never touches a canvas
   pixel. recording the canvas there gets you a flat, floating card. */
function fillsFrame(c) {
  return c.clientWidth >= W * 0.92 && c.clientHeight >= H * 0.92;
}

function pickMode() {
  if (MODE) return MODE;
  const all = canvases();
  return all.length === 1 && fillsFrame(all[0]) ? "canvas" : "screen";
}

/* what screen mode can actually deliver. the tab surface only holds as many
   pixels as the frame is really occupying — its css size times the display's
   own ratio — so asking for 1080 off a frame carrying 1037 would just upscale.
   the output takes the smaller of the two instead: never an invented pixel,
   never a refusal, and the number is on the readout before you record. */
const even = (n) => Math.max(2, Math.round(n / 2) * 2);

function screenOut() {
  const r = stage.getBoundingClientRect();
  const have = Math.floor(r.width * REAL_DPR);
  const k = Math.min(1, have / W);
  return { w: even(W * k), h: even(H * k), short: k < 0.995 };
}

function describeMode() {
  const all = canvases();
  const mode = pickMode();
  if (mode === "canvas" && all[0]) hud.mode.textContent = `canvas · ${all[0].width}x${all[0].height}`;
  else {
    const o = screenOut();
    hud.mode.textContent = `screen · ${o.w}x${o.h}`;
  }
  if (MODE) return;

  if (mode === "screen" && all.length > 1) {
    return note(`${all.length} canvases — recording the frame off the tab`);
  }
  if (mode === "screen" && all[0]) {
    return note(
      `the canvas is only ${all[0].clientWidth}x${all[0].clientHeight} of the frame, so the ` +
        "background and any css motion are recorded off the tab. &mode=canvas for the canvas alone",
    );
  }
  note();
}

/* ---- recording --------------------------------------------------------- */

let rec = null;
let composite = null; // { raf, video, stream } when recording off the tab
let started = 0;
let tick = 0;

/* screen mode records the tab, which is bigger than the frame — so the tab is
   drawn into a canvas cropped to the frame's rectangle and *that* is what the
   recorder sees. the file comes out exactly the frame, same as canvas mode. */
async function tabStream() {
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: FPS },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    surfaceSwitching: "exclude",
  });

  const video = document.createElement("video");
  video.srcObject = display;
  video.muted = true;
  await video.play();

  const o = screenOut();
  const out = document.createElement("canvas");
  out.width = o.w;
  out.height = o.h;
  const ctx = out.getContext("2d", { alpha: false });

  let raf = 0;
  const draw = () => {
    raf = requestAnimationFrame(draw);
    if (!video.videoWidth) return;
    /* the tab surface maps onto the viewport, so one factor converts a css
       rect into source pixels. the rect is read every frame: the fit scale
       moves with the window, and the crop has to move with it. */
    const f = video.videoWidth / innerWidth;
    const r = stage.getBoundingClientRect();
    ctx.drawImage(video, r.left * f, r.top * f, r.width * f, r.height * f, 0, 0, out.width, out.height);
  };
  draw();

  composite = { raf: () => raf, video, display };
  return { stream: out.captureStream(FPS), w: out.width, h: out.height };
}

function canvasStream() {
  const c = canvases()[0];
  if (!c) throw new Error("no canvas in the frame — try &mode=screen");
  return { stream: c.captureStream(FPS), w: c.width, h: c.height };
}

async function startRec() {
  const mode = pickMode();

  /* screen mode copies pixels off the tab, so the frame has to be carrying at
     least w x h real pixels on screen. that is not the same as 1:1 — a retina
     display packs two device pixels into every css one, so a 1080x1920 frame
     shown at half size still has all 1080x1920 of them. what it must not do
     is hang off the edge of the window, or the crop reads what is not there. */
  if (mode === "screen") {
    const r = stage.getBoundingClientRect();
    if (r.width > innerWidth + 1 || r.height > innerHeight + 1) {
      oneToOne = false; // fit it back inside before cropping
      refit();
    }
    const o = screenOut();
    if (o.short) {
      const pct = Math.ceil((100 / REAL_DPR) * 1.02);
      note(
        `recording at ${o.w}x${o.h} — all the frame is carrying on screen. ` +
          `for the full ${W}x${H}, show it at ${pct}% or more (press f, or a bigger window)`,
      );
    }
  }

  let got;
  try {
    got = mode === "canvas" ? canvasStream() : await tabStream();
  } catch (e) {
    return note(e.name === "NotAllowedError" ? "screen capture declined" : e.message);
  }

  const { stream, w, h } = got;
  if (audioDest) for (const t of audioDest.stream.getAudioTracks()) stream.addTrack(t);

  /* name the audio codec, or chrome muxes opus into the mp4 — legal, but x
     wants aac and plenty of players mistime opus-in-mp4 */
  const mimes =
    FMT === "mp4"
      ? [
          audioDest ? "video/mp4;codecs=avc1.640028,mp4a.40.2" : "video/mp4;codecs=avc1.640028",
          "video/mp4;codecs=avc1.640028",
          "video/mp4",
          "video/webm;codecs=vp9",
          "video/webm",
        ]
      : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mime = mimes.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mime) return note("no recordable format in this browser");

  const chunks = [];
  rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: MBPS * 1e6 });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    for (const t of stream.getTracks()) t.stop();
    teardownComposite();
    finish(chunks, mime, w, h);
  };
  rec.start();

  started = performance.now();
  const go = hudEl.querySelector(".cap-go");
  go.textContent = "stop";
  go.dataset.on = "1";
  syncHud(); // never let the readout into a screen recording
  recEl.hidden = false;
  noteSticky = false; // a new take clears the last one's result
  note();
  hud.cmd.hidden = true;
  tick = setInterval(() => {
    const s = Math.floor((performance.now() - started) / 1000);
    hud.time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    document.title = `● rec ${hud.time.textContent} — ${NAME}`;
  }, 200);
}

function teardownComposite() {
  if (!composite) return;
  cancelAnimationFrame(composite.raf());
  for (const t of composite.display.getTracks()) t.stop();
  composite.video.srcObject = null;
  composite = null;
}

function stopRec() {
  if (!rec) return;
  rec.stop(); // the tracks come down in onstop, once the last chunk is out
  rec = null;
  clearInterval(tick);
  recEl.hidden = true;
  const go = hudEl.querySelector(".cap-go");
  go.textContent = "record";
  delete go.dataset.on;
  syncHud(); // back only if it was not dismissed
  document.title = `capture — ${NAME}`;
}

function finish(chunks, mime, w, h) {
  const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
  const file = `${NAME}-${w}x${h}-${stamp()}.${ext}`;
  save(new Blob(chunks, { type: mime }), file);

  const audioArgs = audioDest ? "-c:a aac -b:a 192k" : "-an";
  let cmd, msg;
  if (ext === "mp4") {
    /* already h264 — the one thing it can still need is a remux. the recorder
       writes fragmented mp4, which some uploaders read as having no duration;
       -c copy rewrites the container around the same frames, so it is instant
       and cannot cost a single bit of quality. */
    cmd = `ffmpeg -i ${file} -c copy -movflags +faststart ${NAME}.mp4`;
    msg = `${file} — post it as is. click to copy a lossless remux if x balks`;
  } else {
    /* vp9 master — this is the encode to h264 in yuv420p with even dimensions */
    cmd =
      `ffmpeg -i ${file} -c:v libx264 -pix_fmt yuv420p -crf 18 ` +
      `-movflags +faststart ${audioArgs} -vf "scale=${Math.min(w, 1080)}:-2" ` +
      `${NAME}.mp4`;
    msg = `${file} — click to copy the ffmpeg line`;
  }
  hud.cmd.dataset.cmd = cmd;
  hud.cmd.textContent = cmd;
  console.info(cmd); // the readout may be dismissed — never lose the line
  hud.cmd.hidden = false;
  note(msg, true);
}

function still() {
  const c = canvases()[0];
  if (pickMode() !== "canvas" || !c) return note("stills need a single-canvas piece");
  c.toBlob((b) => {
    save(b, `${NAME}-${c.width}x${c.height}-${stamp()}.png`);
    note("still saved", true);
  }, "image/png");
}

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const stamp = () => new Date().toTimeString().slice(0, 8).replace(/:/g, "");

/* ---- keys -------------------------------------------------------------- */

let woke = false;
addEventListener(
  "keydown",
  (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;

    /* a keypress is a gesture, so it is also the moment audio may start */
    if (!woke) {
      woke = true;
      unlockAudio();
      audio()?.resume?.().catch(() => {});
    }

    switch (e.key.toLowerCase()) {
      case "r":
        e.preventDefault();
        rec ? stopRec() : startRec();
        break;
      case "s":
        e.preventDefault();
        still();
        break;
      case "f":
        e.preventDefault();
        oneToOne = !oneToOne;
        refit();
        break;
      case "h":
        e.preventDefault();
        setHudOff(!hudOff);
        break;
    }
  },
  { capture: true },
);

addEventListener("beforeunload", () => {
  stopRec();
  cleanup?.();
});

boot();
