/* lab/glass-lab — the liquid glass logo as a labs tool, laid out the way
   ux pilot's labs are: controls down the left (the logo, presets, then
   collapsible sections), the live preview in the middle under a toolbar
   (preview mode, play, scrub, randomize, undo), and down the right a rail
   of layouts — the same reveal in the places a logo lives: a landing hero,
   a phone's launch screen, a site header, a home screen, a video intro, a
   loading screen, a sign-up card, a social post. the reveal is
   glass-logo.js; the mock screens are glass-layouts.js.

   in a capture frame (a .tile) it drops the chrome and loops the reveal on
   one canvas, so /capture/?p=glass-lab records true frames
   (&brand=uxpilot&ending=wordmark pick the logo and the ending). */

import "../glass-lab/glass-lab.css";
import { DEFAULTS, THEMES, GlassLogo, lengthOf } from "./glass-logo.js";
import { LAYOUTS } from "./glass-layouts.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* built-in logos. ux pilot's mark is the glyph from its app icon, lifted
   off the lavender tile; its wordmark is the one in its site header */
const BRANDS = {
  /* the pixel self-portrait from the site's favicon, in its own colours */
  tohirr: { label: "Tohir", name: "tohirr", logo: "/favicon.svg", text: "tohirr", original: true },
  note: { label: "Note", name: "Aria" },
  uxpilot: { label: "UX Pilot", name: "UX Pilot", logo: "/media/glass/uxpilot-mark.svg", wordImg: "/media/glass/uxpilot-wordmark.svg", text: "UX Pilot" },
};

const PRESETS = [
  { id: "studio", label: "Studio", set: { theme: "dark", ...THEMES.dark } },
  { id: "frost", label: "Frost", set: { theme: "light", ...THEMES.light, depth: 2.9, innerWallFocus: 1, bloom: 0.3 } },
  { id: "deep", label: "Deep", set: { theme: "dark", logoColor: "#eef3ff", textColor: "#e2e6ee", tileColor: "#0a1d44", background: "#01040c", depth: 2.2, highlights: 1.3 } },
  { id: "prism", label: "Prism", set: { theme: "dark", ...THEMES.dark, dispersion: 2.6, highlights: 1.4, caustics: 1.6 } },
  { id: "pilot", label: "Pilot", set: { theme: "dark", logoColor: "#c7ff01", textColor: "#e9ffc2", tileColor: "#130537", background: "#07021a", dispersion: 1.3 } },
  { id: "ember", label: "Ember", set: { theme: "dark", logoColor: "#ffe2c4", textColor: "#ffe2c4", tileColor: "#1d0c04", background: "#000000", highlights: 1.2 } },
  { id: "lagoon", label: "Lagoon", set: { theme: "dark", logoColor: "#d4fff6", textColor: "#d4fff6", tileColor: "#042827", background: "#010807", depth: 1.8 } },
  { id: "ink", label: "Ink", set: { theme: "dark", logoColor: "#f2f2f2", textColor: "#f2f2f2", tileColor: "#141416", background: "#060607", dispersion: 0.35, highlights: 0.8 } },
  { id: "paper", label: "Paper", set: { theme: "light", logoColor: "#1a1a1a", textColor: "#1a1a1a", tileColor: "#f3f1ea", background: "#e9e6dd", depth: 1.6, innerWallFocus: 1, bloom: 0.2 } },
];
const PRESET_KEYS = [...new Set(PRESETS.flatMap((p) => Object.keys(p.set)))];

/* the panel's sections: [kind, key, label, min, max, step, unit] */
const SECTIONS = [
  ["Interaction", [
    ["toggle", "interact", "Interaction"],
    ["range", "strength", "Strength", 0, 1, 0.01, ""],
    ["toggle", "dropOnClick", "Drop on click"],
  ]],
  ["Reveal", [
    ["select", "ending", "Ending", [["icon", "Icon (stays glass)"], ["logo", "Logo"], ["wordmark", "Wordmark"]]],
    ["text", "text", "Wordmark", "wordmark"],
    ["toggle", "tile", "Icon plate"],
  ]],
  ["Logo", [
    ["range", "logoSize", "Tile size", 96, 480, 1, "px"],
    ["range", "logoScale", "Logo scale", 0.2, 1, 0.01, "×"],
    ["range", "finalLogoScale", "Final scale", 0.2, 1, 0.01, "×"],
    ["range", "logoRelief", "Relief", 0, 1, 0.01, ""],
    ["toggle", "original", "Original colors"],
  ]],
  ["Glass", [
    ["range", "depth", "Optical depth", 0, 6, 0.1, ""],
    ["range", "dispersion", "Dispersion", 0, 4, 0.05, ""],
    ["range", "relief", "Double bevel", 0, 3, 0.05, ""],
    ["range", "caustics", "Caustics", 0, 4, 0.05, ""],
    ["range", "highlights", "Highlights", 0, 4, 0.05, ""],
    ["range", "bloom", "Light diffusion", 0, 2, 0.01, ""],
    ["range", "echoTint", "Echo tint", 0, 1, 0.01, ""],
    ["range", "innerWallFocus", "Inner wall focus", 0, 1, 0.01, ""],
  ]],
  ["Color", [
    ["select", "theme", "Theme", [["dark", "Dark"], ["light", "Light"]]],
    ["color", "logoColor", "Logo"],
    ["color", "tileColor", "Plate"],
    ["color", "background", "Background"],
    ["ground", "ground", "Background image"],
  ]],
  ["Motion", [
    ["range", "dropStrength", "Drop strength", 0, 4, 0.05, ""],
    ["range", "speed", "Speed", 0.1, 4, 0.05, "×"],
    ["range", "decay", "Ring decay", 0.1, 10, 0.1, "s"],
    ["range", "loopDelay", "Loop delay", 0, 10, 0.1, "s"],
    ["toggle", "loop", "Loop"],
  ]],
];

const ASPECTS = { "16:9": 16 / 9, "1:1": 1, "4:5": 4 / 5, "9:16": 9 / 16 };
const RES = { "720p": 720, "1080p": 1080, "1440p": 1440, "4K": 2160 };

const fetchImage = (src) => new Promise((res, rej) => {
  const im = new Image();
  im.crossOrigin = "anonymous";
  im.onload = () => res(im);
  im.onerror = rej;
  im.src = src;
});
const smoothstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const decimals = (step) => (String(step).split(".")[1] || "").length;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SVG = (d, s = 14) =>
  `<svg viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  pause: SVG('<path d="M5.5 3.5v9M10.5 3.5v9"/>'),
  play: SVG('<path d="M5 3.2v9.6L12.5 8z"/>'),
  restart: SVG('<path d="M3.5 3.5v9M12.5 3.8 6 8l6.5 4.2z"/>'),
  random: SVG('<path d="M2.5 4.5h2.2c3.8 0 3.8 7 7.6 7h1.2M11.8 9.8l1.7 1.7-1.7 1.7M2.5 11.5h2.2c1.3 0 2.1-.8 2.7-1.9M9.4 6.4c.6-1.1 1.4-1.9 2.9-1.9h1.2M11.8 2.8l1.7 1.7-1.7 1.7"/>'),
  undo: SVG('<path d="M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8h-2"/>'),
  redo: SVG('<path d="M10.5 3.5l3 3-3 3M13.5 6.5h-7a4 4 0 0 0 0 8h2"/>'),
  full: SVG('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),
  link: SVG('<path d="M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.9.9M9.2 6.8a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.9-.9"/>'),
  down: SVG('<path d="M8 2.5v8M5 7.5l3 3 3-3M2.5 13.5h11"/>'),
  chev: SVG('<path d="M4.5 6.5 8 10l3.5-3.5"/>', 12),
};

/* a small square of the logo on a dark tile, for the sample row */
const NOTE_THUMB =
  'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff" d="M36 22.5c0-2.3 1.5-4.3 3.7-4.9l42-11.3c3-.8 5.8 1.4 5.8 4.5V66c0 9-7.3 16.5-16.6 18.3-8.6 1.6-14.9-2.7-14.9-9.8 0-7.6 6.8-13.6 15.4-14.6 2.5-.3 4.7-.1 6.6.5V27.6L46.5 37.4v36.7c0 9-7.3 16.5-16.6 18.3C21.3 94 15 89.7 15 82.6c0-7.6 6.8-13.6 15.4-14.6 2.4-.3 4.6-.1 5.6.3z"/></svg>');

export function mount(el) {
  if (el.closest(".tile")) return reel(el);

  /* the lab rests on the glass icon, so there is something to steer; the
     interaction keys are the lab's own, the renderer ignores them */
  const LAB = { ending: "icon", interact: true, strength: 0.7, dropOnClick: true };
  const params = { ...DEFAULTS, ...LAB };
  const ui = { brand: "tohirr", preset: "studio", layout: "result", paused: false };
  const exp = { type: "video", format: "mp4", aspect: "16:9", res: "1080p", fps: 60 };
  const q = new URLSearchParams(location.search);
  if (q.get("theme") === "light") Object.assign(params, THEMES.light, { theme: "light" });
  for (const [k, v] of q) {
    if (k === "brand" && BRANDS[v]) ui.brand = v;
    else if (k === "layout" && LAYOUTS.some((l) => l.id === v)) ui.layout = v;
    else if (k === "preset" && PRESETS.some((p) => p.id === v)) { ui.preset = v; Object.assign(params, PRESETS.find((p) => p.id === v).set); }
    else if (k in DEFAULTS && k !== "theme") {
      const d = DEFAULTS[k];
      params[k] = typeof d === "number" ? +v : typeof d === "boolean" ? v === "1" : v;
    }
  }

  const row = ([kind, key, label, a, b, c, unit]) => {
    if (kind === "range")
      return `<div class="ul-row"><label for="ul-${key}">${label}</label>` +
        `<input id="ul-${key}" type="range" min="${a}" max="${b}" step="${c}" data-p="${key}">` +
        `<span class="ul-num"><input type="text" inputmode="decimal" data-num="${key}" aria-label="${label} value">${unit ? `<i>${unit}</i>` : ""}</span></div>`;
    if (kind === "select")
      return `<div class="ul-row"><label for="ul-${key}">${label}</label><span class="ul-select"><select id="ul-${key}" data-p="${key}">` +
        a.map(([v, l]) => `<option value="${v}">${l}</option>`).join("") + `</select>${ICON.chev}</span></div>`;
    if (kind === "toggle")
      return `<label class="ul-row ul-tog"><span>${label}</span><input type="checkbox" role="switch" data-p="${key}"><i aria-hidden="true"></i></label>`;
    if (kind === "color")
      return `<div class="ul-row"><label for="ul-${key}">${label}</label><span class="ul-color"><input type="color" data-p="${key}" aria-label="${label} colour">` +
        `<input id="ul-${key}" type="text" data-hex="${key}" maxlength="7" spellcheck="false"></span></div>`;
    if (kind === "ground")
      return `<div class="ul-row"><label>${label}</label><span class="ul-file"><label class="ul-btn ul-sm">Choose<input type="file" accept="image/*" data-file="ground"></label>` +
        `<button type="button" class="ul-link" data-clear="ground" hidden>Remove</button></span></div>`;
    return `<div class="ul-row" data-only="${a}"><label for="ul-${key}">${label}</label><input id="ul-${key}" class="ul-text" type="text" data-p="${key}" maxlength="28" spellcheck="false"></div>`;
  };

  el.innerHTML = `
<div class="ul">
  <header class="ul-top">
    <div class="ul-crumb"><span class="ul-mark" aria-hidden="true"></span><a href="/">tohirr</a><span class="ul-sep"></span>Labs<span>/</span><b>Glass Lab</b></div>
    <div class="ul-actions">
      <button type="button" class="ul-btn" data-act="link">${ICON.link}Copy link</button>
      <div class="ul-menu">
        <button type="button" class="ul-btn ul-cta" data-act="export" aria-haspopup="dialog" aria-expanded="false">${ICON.down}Export</button>
        <div class="ul-pop" role="dialog" aria-label="Export" hidden>
          <div class="ul-row"><label>Type</label><span class="ul-select"><select data-x="type"><option value="video">Video</option><option value="image">Image</option></select>${ICON.chev}</span></div>
          <div class="ul-row"><label>Format</label><span class="ul-select"><select data-x="format"></select>${ICON.chev}</span></div>
          <div class="ul-row"><label>Aspect ratio</label><span class="ul-select"><select data-x="aspect">${Object.keys(ASPECTS).map((k) => `<option>${k}</option>`).join("")}</select>${ICON.chev}</span></div>
          <div class="ul-row"><label>Resolution</label><span class="ul-select"><select data-x="res">${Object.keys(RES).map((k) => `<option>${k}</option>`).join("")}</select>${ICON.chev}</span></div>
          <div class="ul-row" data-vid><label>Frame rate</label><span class="ul-select"><select data-x="fps"><option value="60">60 fps</option><option value="30">30 fps</option></select>${ICON.chev}</span></div>
          <button type="button" class="ul-btn ul-cta ul-wide" data-act="go">${ICON.down}<span>Export video</span></button>
        </div>
      </div>
    </div>
  </header>

  <aside class="ul-panel" aria-label="Controls">
    <div class="ul-scroll">
      <div class="ul-intro">
        <small>LABS</small>
        <h1>GLASS LAB</h1>
        <p>Reveal a logo through liquid glass: a drop lands, swells into a glass app icon, and clears to leave your logo. Spectral refraction, a real bevel, light that behaves.</p>
      </div>

      <div class="ul-box">
        <b>Logo</b>
        <div class="ul-file"><label class="ul-btn ul-cta">Choose file<input type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg" data-file="logo"></label><span data-name="logo">No file chosen</span></div>
        <div class="ul-meta"><span data-brandname></span><button type="button" class="ul-link" data-clear="logo" hidden>Remove</button></div>
        <small>SAMPLE LOGOS</small>
        <div class="ul-samples">${Object.entries(BRANDS).map(([k, b]) =>
          `<button type="button" data-brand="${k}" aria-label="${b.label}"><img alt="" src="${b.logo || NOTE_THUMB}"></button>`).join("")}</div>
      </div>

      <div class="ul-sec-head"><small>PRESETS</small><button type="button" class="ul-link" data-act="more">Show more (${PRESETS.length - 6})</button></div>
      <div class="ul-presets">${PRESETS.map((p, i) =>
        `<button type="button" data-preset="${p.id}" style="--pbg:${p.set.background}"${i >= 6 ? " data-extra hidden" : ""}><img alt=""><span>${p.label}</span></button>`).join("")}</div>

      ${SECTIONS.map(([name, rows], i) => `
      <details class="ul-sec"${i < 3 ? " open" : ""}>
        <summary>${ICON.chev}<small>${name.toUpperCase()}</small><em>${rows.length}</em></summary>
        <div class="ul-rows">${rows.map(row).join("")}</div>
      </details>`).join("")}
    </div>
    <footer class="ul-foot"><p>Runs in your browser. WebGL2, two passes; the video records in real time.</p><button type="button" class="ul-btn" data-act="reset">Reset tool</button></footer>
  </aside>

  <main class="ul-center">
    <div class="ul-bar">
      <label class="ul-mode"><span>Preview mode</span><span class="ul-select"><select data-mode>${LAYOUTS.map((l) => `<option value="${l.id}">${l.label}</option>`).join("")}</select>${ICON.chev}</span></label>
      <span class="ul-gap"></span>
      <button type="button" class="ul-btn" data-act="pause"><span data-pause-icon></span><span data-pause-label>Pause</span></button>
      <button type="button" class="ul-icon" data-act="restart" aria-label="Restart">${ICON.restart}</button>
      <input type="range" class="ul-scrub" min="0" step="0.001" data-scrub aria-label="Timeline">
      <output class="ul-time" data-time>0.0s</output>
      <button type="button" class="ul-btn" data-act="random">${ICON.random}Randomize</button>
      <span class="ul-div"></span>
      <button type="button" class="ul-icon" data-act="undo" aria-label="Undo">${ICON.undo}</button>
      <button type="button" class="ul-icon" data-act="redo" aria-label="Redo">${ICON.redo}</button>
      <button type="button" class="ul-icon" data-act="full" aria-label="Fullscreen">${ICON.full}</button>
    </div>
    <div class="ul-stage" data-stage><div class="ul-fit" data-fit></div></div>
  </main>

  <aside class="ul-rail" aria-label="Layouts">
    <div class="ul-rail-head"><small>LAYOUTS</small><em>${LAYOUTS.length}</em></div>
    <div class="ul-thumbs">${LAYOUTS.map((l, i) => `
      <button type="button" class="ul-thumb" data-layout="${l.id}"><span class="ul-mini" data-mini="${l.id}"></span><b><i>${String(i + 1).padStart(2, "0")}</i> ${l.label}</b></button>`).join("")}
    </div>
  </aside>
  <div class="ul-toast" role="status" aria-live="polite"></div>
</div>`;

  const $ = (s) => el.querySelector(s);
  const $$ = (s) => [...el.querySelectorAll(s)];
  const stage = $("[data-stage]");
  const fitBox = $("[data-fit]");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "liquid glass logo");
  const glass = new GlassLogo(canvas, params, { clear: true });
  const art = { logo: null, mark: null, wordImg: null, ground: null };
  let groundURL = "";

  const toast = (msg, keep) => {
    const t = $(".ul-toast");
    t.textContent = msg;
    t.dataset.on = "1";
    clearTimeout(toast.t);
    if (!keep) toast.t = setTimeout(() => delete t.dataset.on, 2400);
  };

  /* ---- the stage: a layout mock scaled to fit, the live canvas in its slot */
  let scale = 1;
  const mockVars = () => {
    const v = { "--g-bg": params.background, "--g-ink": params.logoColor, "--g-plate": params.tileColor };
    if (groundURL) v["--g-img"] = `url("${groundURL}")`;
    return v;
  };
  const applyVars = (node) => {
    const v = mockVars();
    for (const k in v) node.style.setProperty(k, v[k]);
    if (!groundURL) node.style.removeProperty("--g-img");
    node.classList.toggle("lx-light", params.theme === "light");
  };
  const brandName = () => (ui.brand === "custom" ? "Brand" : BRANDS[ui.brand].name);
  const layoutOf = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
  const showLayout = () => {
    const L = layoutOf(ui.layout);
    fitBox.innerHTML = L.html(brandName());
    fitBox.style.width = `${L.w}px`;
    fitBox.style.height = `${L.h}px`;
    applyVars(fitBox);
    fitBox.querySelector(".lx-slot").appendChild(canvas);
    for (const b of $$("[data-layout]")) b.setAttribute("aria-current", b.dataset.layout === ui.layout);
    $("[data-mode]").value = ui.layout;
    fitStage();
  };
  const fitStage = () => {
    const L = layoutOf(ui.layout);
    const W = stage.clientWidth - 48, H = stage.clientHeight - 48;
    scale = Math.max(0.05, Math.min(W / L.w, H / L.h));
    fitBox.style.transform = `translate(-50%, -50%) scale(${scale})`;
    kick();
  };
  const ro = new ResizeObserver(fitStage);
  ro.observe(stage);

  /* ---- playback ---------------------------------------------------------- */
  let t = reduceMotion ? lengthOf(params.ending) : 0;
  let last = performance.now();
  let raf = 0;
  let alive = true;
  let needs = false;
  const scrub = $("[data-scrub]");
  const pass = () => lengthOf(params.ending) + params.loopDelay;
  const frame = (now) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const running = !ui.paused && !reduceMotion;
    if (running) {
      t += dt * params.speed;
      /* the icon ending holds on the formed icon rather than looping */
      if (t >= pass()) t = params.loop && params.ending !== "icon" ? 0 : pass();
    }
    /* the canvas is laid out at the mock's design size and shown scaled, so
       its backing store follows what is actually on screen */
    const dpr = Math.min(devicePixelRatio || 1, 2) * Math.min(1, scale * 1.15);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const springing = stepLook(dt);
    glass.render(t, canvas.clientWidth);
    const end = lengthOf(params.ending);
    scrub.max = end;
    scrub.value = Math.min(t, end);
    scrub.style.setProperty("--f", `${(Math.min(t, end) / end) * 100}%`);
    $("[data-time]").textContent = `${Math.min(t, end).toFixed(1)}s`;
    const moving = (running && ((params.loop && params.ending !== "icon") || t < pass())) || springing;
    if (moving || needs || glass.dirty) raf = requestAnimationFrame(frame);
    needs = false;
  };
  /* ---- the viewer: the pointer, a finger or the phone's tilt steers the
     glass. a critically damped spring carries it there and back — it
     arrives without overshooting, so the glass never wobbles. while the
     reveal runs the timeline is in charge; the steering blends in once the
     icon has formed (or at once, when paused) */
  const look = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, at: -1e9, acc: 0 };
  const stepLook = (dt) => {
    const formed = ui.paused ? 1 : smoothstep(0.45, 0.85, t);
    glass.lookAmt = params.interact ? params.strength * formed : 0;
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
  const kick = () => {
    needs = true;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  const syncPause = () => {
    $("[data-pause-icon]").innerHTML = ui.paused ? ICON.play : ICON.pause;
    $("[data-pause-label]").textContent = ui.paused ? "Play" : "Pause";
  };
  scrub.addEventListener("input", () => { t = +scrub.value; ui.paused = true; syncPause(); kick(); });

  /* ---- stills: one spare renderer draws the preset and layout thumbnails */
  const spare = new GlassLogo(document.createElement("canvas"), { ...params }, { clear: true });
  const still = async (over, w, h, at = 0.8) => {
    Object.assign(spare.params, params, over);
    spare.canvas.width = w;
    spare.canvas.height = h;
    spare.setArt(art);
    for (let i = 0; i < 30; i++) {
      spare.render(at, w);
      if (!spare.dirty) break;
      await wait(30);
    }
    return spare.canvas.toDataURL("image/webp", 0.9);
  };
  let stillsToken = 0;
  const refreshStills = async (presets) => {
    const token = ++stillsToken;
    await wait(250); // let a slider drag settle first
    if (token !== stillsToken) return;
    const frameURL = await still({}, 480, 270);
    if (token !== stillsToken) return;
    for (const L of LAYOUTS) {
      const box = el.querySelector(`[data-mini="${L.id}"]`);
      box.innerHTML = `<span class="ul-mini-in" style="width:${L.w}px;height:${L.h}px">${L.html(brandName())}</span>`;
      const inner = box.firstChild;
      applyVars(inner);
      inner.style.transform = `scale(${box.clientWidth / L.w})`;
      inner.querySelector(".lx-slot").innerHTML = `<img alt="" src="${frameURL}">`;
    }
    if (!presets) return;
    for (const P of PRESETS) {
      const url = await still(P.set, 240, 160);
      if (token !== stillsToken) return;
      el.querySelector(`[data-preset="${P.id}"] img`).src = url;
    }
  };

  /* ---- history: every settled change is a step ---------------------------- */
  const undo = [], redo = [];
  let committed = JSON.stringify(params);
  let commitT = 0;
  const commit = () => {
    clearTimeout(commitT);
    commitT = setTimeout(() => {
      const now = JSON.stringify(params);
      if (now === committed) return;
      undo.push(committed);
      if (undo.length > 80) undo.shift();
      redo.length = 0;
      committed = now;
      syncHistory();
    }, 350);
  };
  const syncHistory = () => {
    $('[data-act="undo"]').disabled = !undo.length;
    $('[data-act="redo"]').disabled = !redo.length;
  };
  const restore = (json) => {
    Object.assign(params, JSON.parse(json));
    committed = json;
    sync(true);
    syncHistory();
  };

  /* ---- fields ------------------------------------------------------------ */
  const sync = (repaintStills = false) => {
    for (const i of $$("[data-p]")) {
      const k = i.dataset.p;
      if (i.type === "checkbox") i.checked = !!params[k];
      else if (document.activeElement !== i) i.value = params[k];
      if (i.type === "range") i.style.setProperty("--f", `${((params[k] - i.min) / (i.max - i.min)) * 100}%`);
    }
    for (const n of $$("[data-num]")) {
      const r = el.querySelector(`input[type=range][data-p="${n.dataset.num}"]`);
      if (document.activeElement !== n) n.value = Number(params[n.dataset.num]).toFixed(decimals(r.step));
    }
    for (const h of $$("[data-hex]")) if (document.activeElement !== h) h.value = params[h.dataset.hex];
    for (const r of $$("[data-only]")) r.hidden = params.ending !== r.dataset.only;
    for (const b of $$("[data-preset]")) b.setAttribute("aria-pressed", b.dataset.preset === ui.preset);
    for (const b of $$("[data-brand]")) b.setAttribute("aria-pressed", b.dataset.brand === ui.brand);
    $("[data-brandname]").textContent = ui.brand === "custom" ? "Your logo" : BRANDS[ui.brand].label;

    const fmt = $('[data-x="format"]');
    const opts = exp.type === "video" ? [["mp4", "MP4"], ["webm", "WebM"]] : [["png", "PNG"]];
    fmt.innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    if (!opts.some(([v]) => v === exp.format)) exp.format = opts[0][0];
    for (const s of $$("[data-x]")) s.value = String(exp[s.dataset.x]);
    $("[data-vid]").hidden = exp.type !== "video";
    $('[data-act="go"] span').textContent = exp.type === "video" ? "Export video" : "Export image";

    applyVars(fitBox);
    const url = new URLSearchParams();
    if (ui.brand !== "tohirr" && BRANDS[ui.brand]) url.set("brand", ui.brand);
    if (ui.layout !== "result") url.set("layout", ui.layout);
    if (ui.preset !== "studio" && PRESETS.some((p) => p.id === ui.preset)) url.set("preset", ui.preset);
    const base = { ...DEFAULTS, ...LAB, ...(PRESETS.find((p) => p.id === ui.preset)?.set || {}) };
    for (const k in DEFAULTS) {
      const v = params[k];
      if (v !== base[k] && !(k === "text" && BRANDS[ui.brand]?.text === v)) url.set(k, typeof v === "boolean" ? +v : v);
    }
    history.replaceState(null, "", [...url].length ? `?${url}` : location.pathname);
    glass.touch();
    kick();
    refreshStills(repaintStills);
  };

  /* a preset owns its keys; touching one of them leaves the preset behind */
  const changed = (k) => {
    if (PRESET_KEYS.includes(k)) ui.preset = "custom";
    commit();
  };
  for (const i of $$("[data-p]")) {
    const ev = i.tagName === "SELECT" || i.type === "checkbox" ? "change" : "input";
    i.addEventListener(ev, () => {
      const k = i.dataset.p;
      params[k] = i.type === "checkbox" ? i.checked : i.type === "range" ? +i.value : i.value;
      if (k === "theme") Object.assign(params, THEMES[i.value]);
      if (k === "ending") t = 0;
      if (k === "loop" && i.checked && t >= pass()) t = 0;
      changed(k);
      sync(k === "theme");
    });
  }
  for (const n of $$("[data-num]")) {
    const r = el.querySelector(`input[type=range][data-p="${n.dataset.num}"]`);
    n.addEventListener("change", () => {
      const v = parseFloat(n.value);
      if (Number.isFinite(v)) params[n.dataset.num] = Math.max(+r.min, Math.min(+r.max, v));
      changed(n.dataset.num);
      sync();
    });
    n.addEventListener("keydown", (e) => { if (e.key === "Enter") n.blur(); });
  }
  for (const h of $$("[data-hex]"))
    h.addEventListener("change", () => {
      if (/^#[0-9a-f]{6}$/i.test(h.value)) { params[h.dataset.hex] = h.value.toLowerCase(); changed(h.dataset.hex); }
      sync();
    });
  for (const b of $$("[data-preset]"))
    b.addEventListener("click", () => {
      Object.assign(params, DEFAULTS, { ending: params.ending, text: params.text, logoSize: params.logoSize, logoScale: params.logoScale,
        finalLogoScale: params.finalLogoScale, speed: params.speed, loop: params.loop, loopDelay: params.loopDelay, original: params.original },
      PRESETS.find((p) => p.id === b.dataset.preset).set);
      ui.preset = b.dataset.preset;
      commit();
      t = 0;
      sync();
    });

  /* ---- logos and the background image ------------------------------------ */
  const useBrand = async (name) => {
    ui.brand = name;
    const B = BRANDS[name];
    art.logo = art.wordImg = art.mark = null;
    $('[data-name="logo"]').textContent = "No file chosen";
    $('[data-clear="logo"]').hidden = true;
    if (B.logo) {
      try { [art.logo, art.wordImg] = await Promise.all([fetchImage(B.logo), B.wordImg ? fetchImage(B.wordImg) : null]); }
      catch { toast("that logo did not load"); }
      params.text = B.text;
    } else if (Object.values(BRANDS).some((b) => b.text === params.text)) params.text = DEFAULTS.text;
    params.original = !!B.original;
    glass.setArt(art);
    t = 0;
    showLayout();
    sync(true);
  };
  for (const b of $$("[data-brand]")) b.addEventListener("click", () => useBrand(b.dataset.brand));
  const take = async (slot, file) => {
    if (!file || !file.type.startsWith("image/")) return toast("that is not an image");
    try {
      const url = URL.createObjectURL(file);
      art[slot] = await fetchImage(url);
      if (slot === "logo") {
        art.wordImg = null;
        ui.brand = "custom";
        $('[data-name="logo"]').textContent = file.name;
        t = 0;
      } else groundURL = url;
      el.querySelector(`[data-clear="${slot}"]`).hidden = false;
      glass.setArt(art);
      showLayout();
      sync(true);
    } catch { toast("that file would not load as an image"); }
  };
  for (const f of $$("[data-file]")) f.addEventListener("change", () => { take(f.dataset.file, f.files[0]); f.value = ""; });
  stage.addEventListener("dragover", (e) => { e.preventDefault(); stage.dataset.over = "1"; });
  stage.addEventListener("dragleave", () => delete stage.dataset.over);
  stage.addEventListener("drop", (e) => { e.preventDefault(); delete stage.dataset.over; take("logo", e.dataTransfer.files[0]); });

  /* steering: where the pointer sits over the canvas, -1..1, y up */
  const aim = (e) => {
    const r = canvas.getBoundingClientRect();
    look.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    look.ty = Math.max(-1, Math.min(1, -(e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    look.at = performance.now();
    kick();
  };
  stage.addEventListener("pointermove", (e) => { if (params.interact) aim(e); });
  stage.addEventListener("pointerleave", () => { look.tx = look.ty = 0; kick(); });
  stage.addEventListener("pointercancel", () => { look.tx = look.ty = 0; kick(); });

  /* a tap or click drops a new drop where it lands: the reveal replays from
     there and the icon glides home as it forms */
  let down = null;
  stage.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
    if (params.interact) { aim(e); askMotion(); }
  });
  stage.addEventListener("pointerup", (e) => {
    const tap = down && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 6;
    down = null;
    if (e.pointerType === "touch") { look.tx = look.ty = 0; kick(); }
    if (!tap || !params.interact || !params.dropOnClick || reduceMotion) return;
    const r = canvas.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    const k = canvas.clientWidth / r.width; // the mock is shown scaled
    glass.origin = [(e.clientX - (r.left + r.width / 2)) * k, -(e.clientY - (r.top + r.height / 2)) * k];
    t = 0;
    ui.paused = false;
    syncPause();
    kick();
  });

  /* the phone's tilt, once allowed. ios asks on a tap, so the first tap on
     the stage asks; elsewhere it just listens */
  let motionOn = false;
  const onTilt = (e) => {
    if (!params.interact || e.beta == null || e.gamma == null) return;
    if (performance.now() - look.at < 1500) return; // a finger or pointer leads
    look.tx = Math.max(-1, Math.min(1, e.gamma / 30));
    look.ty = Math.max(-1, Math.min(1, -(e.beta - 45) / 30));
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
  for (const b of $$("[data-clear]"))
    b.addEventListener("click", () => {
      if (b.dataset.clear === "logo") return useBrand("tohirr");
      art.ground = null;
      groundURL = "";
      b.hidden = true;
      glass.setArt(art);
      sync(true);
    });

  /* ---- layouts ----------------------------------------------------------- */
  const pickLayout = (id) => { ui.layout = id; showLayout(); sync(); };
  for (const b of $$("[data-layout]")) b.addEventListener("click", () => pickLayout(b.dataset.layout));
  $("[data-mode]").addEventListener("change", (e) => pickLayout(e.target.value));

  /* ---- export ------------------------------------------------------------ */
  const pop = $(".ul-pop");
  const setPop = (open) => { pop.hidden = !open; $('[data-act="export"]').setAttribute("aria-expanded", open); };
  const onDoc = (e) => { if (!e.target.closest(".ul-menu")) setPop(false); };
  const onKey = (e) => { if (e.key === "Escape") setPop(false); };
  document.addEventListener("click", onDoc);
  document.addEventListener("keydown", onKey);
  for (const s of $$("[data-x]"))
    s.addEventListener("change", () => { exp[s.dataset.x] = s.dataset.x === "fps" ? +s.value : s.value; sync(); });

  const save = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  };
  const slug = () => (ui.brand === "custom" ? "logo" : ui.brand) + (params.ending === "wordmark" ? "-wordmark" : "");
  /* an export renders on its own canvas at the export size, composed the
     way a 540px-high view is, so every resolution frames the same */
  const offscreen = () => {
    const a = ASPECTS[exp.aspect], s = RES[exp.res];
    const w = a >= 1 ? Math.round((s * a) / 2) * 2 : s;
    const h = a >= 1 ? s : Math.round(s / a / 2) * 2;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = new GlassLogo(c, params);
    g.setArt(art);
    return { c, g, cssW: w * (540 / Math.min(w, h)) };
  };
  let busy = false;
  const exportNow = async () => {
    if (busy) return;
    const { c, g, cssW } = offscreen();
    const size = `${c.width}x${c.height}`;
    for (let i = 0; i < 30 && (g.render(0, cssW), g.dirty); i++) await wait(30);
    if (exp.type === "image") {
      g.render(Math.min(t, lengthOf(params.ending)), cssW);
      c.toBlob((b) => { save(b, `glass-${slug()}-${size}.png`); toast("saved the frame"); }, "image/png");
      return;
    }
    const type = videoType(exp.format);
    if (!type) return toast(`this browser cannot record ${exp.format.toUpperCase()}`);
    busy = true;
    const stream = c.captureStream(exp.fps);
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: Math.round(RES[exp.res] * 15000) });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    const secs = (lengthOf(params.ending) + Math.min(params.loopDelay, 1.2)) / params.speed;
    rec.start();
    const t0 = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        const s = (now - t0) / 1000;
        g.render(s * params.speed, cssW);
        toast(`recording ${Math.min(100, Math.round((s / secs) * 100))}% — keep this tab in front`, true);
        if (s < secs) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    rec.stop();
    await done;
    for (const tr of stream.getTracks()) tr.stop();
    busy = false;
    save(new Blob(chunks, { type }), `glass-${slug()}-${size}.${exp.format}`);
    toast(`saved glass-${slug()}-${size}.${exp.format}`);
  };

  /* ---- buttons ----------------------------------------------------------- */
  const randomize = () => {
    const P = PRESETS[(Math.random() * PRESETS.length) | 0];
    const r = (lo, hi, d = 2) => +(lo + Math.random() * (hi - lo)).toFixed(d);
    Object.assign(params, P.set, { depth: r(0.8, 3.2, 1), dispersion: r(0.5, 2.4), relief: r(0.6, 1.6), caustics: r(0.6, 1.8),
      highlights: r(0.8, 1.6), bloom: r(0.3, 0.9), dropStrength: r(0.7, 1.5) });
    ui.preset = "custom";
    t = 0;
    commit();
    sync(true);
  };
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "export") return setPop(pop.hidden);
    if (act === "go") { setPop(false); return exportNow(); }
    if (act === "pause") { ui.paused = !ui.paused; if (!ui.paused && t >= pass()) t = 0; syncPause(); kick(); }
    if (act === "restart") { t = 0; glass.origin = [0, 0]; kick(); }
    if (act === "random") randomize();
    if (act === "undo" && undo.length) { redo.push(JSON.stringify(params)); restore(undo.pop()); }
    if (act === "redo" && redo.length) { undo.push(JSON.stringify(params)); restore(redo.pop()); }
    if (act === "full") {
      const p = document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen?.();
      p?.catch?.(() => {});
    }
    if (act === "more") {
      const extra = $$("[data-extra]");
      const open = extra[0].hidden;
      for (const x of extra) x.hidden = !open;
      b.textContent = open ? "Show less" : `Show more (${extra.length})`;
    }
    if (act === "link") {
      try { await navigator.clipboard.writeText(location.href); toast("link copied — it carries every setting"); }
      catch { toast(location.href); }
    }
    if (act === "reset") {
      Object.assign(params, DEFAULTS, LAB);
      glass.origin = [0, 0];
      ui.preset = "studio";
      art.ground = null;
      groundURL = "";
      $('[data-clear="ground"]').hidden = true;
      commit();
      useBrand("tohirr");
    }
  });
  const onKeys = (e) => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      el.querySelector(`[data-act="${e.shiftKey ? "redo" : "undo"}"]`).click();
    } else if (e.key === " " && !e.target.closest("button")) {
      e.preventDefault();
      el.querySelector('[data-act="pause"]').click();
    }
  };
  addEventListener("keydown", onKeys);

  el.glassLab = { params, ui, glass, exp, look, seek: (s) => { t = s; ui.paused = true; syncPause(); kick(); }, exportNow, pickLayout, useBrand };
  syncPause();
  syncHistory();
  showLayout();
  useBrand(ui.brand);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    document.removeEventListener("click", onDoc);
    document.removeEventListener("keydown", onKey);
    removeEventListener("keydown", onKeys);
    removeEventListener("deviceorientation", onTilt);
  };
}

function videoType(format) {
  if (typeof MediaRecorder === "undefined") return "";
  const list = format === "webm" ? ["video/webm;codecs=vp9", "video/webm"] : ["video/mp4;codecs=avc1.640028", "video/mp4"];
  return list.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

/* ---- the tile and the capture reel ---------------------------------------- */
/* the reveal on its own, looping with its hold, on one canvas that fills the
   cell. in a portfolio tile it draws no ground, so the tile's own colour
   shows, follows the page's light or dark, and rests while scrolled away;
   in a capture frame it stays opaque so the recording has a ground */
function reel(el) {
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
  if (B && B.logo) Promise.all([fetchImage(B.logo), B.wordImg ? fetchImage(B.wordImg) : null])
    .then(([logo, wordImg]) => { params.text = B.text; params.original = !!B.original; glass.setArt({ logo, wordImg }); })
    .catch(() => {});
  const pass = lengthOf(params.ending) + params.loopDelay;
  let t0 = null;
  let raf = 0;
  let elapsed = 0;
  let paused = 0;
  const io = capture ? null : new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) {
      if (paused) t0 += performance.now() - paused; // resume where it left off
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
