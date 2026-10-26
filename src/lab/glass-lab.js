/* lab/glass-lab — the liquid glass logo as a labs tool, laid out the way
   ux pilot's labs are: controls down the left, the live preview in the
   middle under a small toolbar, and down the right a rail of layouts — the
   same reveal in the places a logo lives (a landing hero, a phone's launch
   screen, a site header, a home screen, a video intro, a loading screen, a
   sign-up card, a social post).

   the controls are kept to what changes the result: the logo, how the
   reveal ends, light or dark, two colours, and whether the glass answers
   the viewer. the pointer, a finger or the phone's tilt steers the resting
   icon; a click replays the reveal. the reveal is glass-logo.js; the mock
   screens are glass-layouts.js.

   in a tile (the portfolio's work row, or a capture frame) it drops the
   chrome and loops the reveal on one canvas, so /capture/?p=glass-lab
   records true frames (&brand=uxpilot&ending=wordmark pick the logo and the
   ending). */

import "../glass-lab/glass-lab.css";
import { DEFAULTS, THEMES, GlassLogo, lengthOf } from "./glass-logo.js";
import { LAYOUTS } from "./glass-layouts.js";
import { BRANDS, brandArt, steer, record, reel } from "./glass-common.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* the panel's sections: [kind, key, label, ...] */
const SECTIONS = [
  ["Reveal", [
    ["select", "ending", "Ending", [["icon", "Icon (stays glass)"], ["logo", "Logo"], ["wordmark", "Wordmark"]]],
    ["text", "text", "Wordmark", "wordmark"],
  ]],
  ["Look", [
    ["select", "theme", "Theme", [["dark", "Dark"], ["light", "Light"]]],
    ["color", "logoColor", "Logo"],
    ["color", "background", "Background"],
  ]],
  ["Interaction", [
    ["toggle", "interact", "Interaction"],
    ["range", "strength", "Strength", 0, 1, 0.01, ""],
  ]],
];

const ASPECTS = { "16:9": 16 / 9, "1:1": 1, "4:5": 4 / 5, "9:16": 9 / 16 };
const RES = { "720p": 720, "1080p": 1080, "1440p": 1440, "4K": 2160 };

const loadFile = (file) => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = rej;
  im.src = URL.createObjectURL(file);
});
const decimals = (step) => (String(step).split(".")[1] || "").length;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SVG = (d, s = 14) =>
  `<svg viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  pause: SVG('<path d="M5.5 3.5v9M10.5 3.5v9"/>'),
  play: SVG('<path d="M5 3.2v9.6L12.5 8z"/>'),
  restart: SVG('<path d="M3.5 3.5v9M12.5 3.8 6 8l6.5 4.2z"/>'),
  full: SVG('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),
  link: SVG('<path d="M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.9.9M9.2 6.8a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.9-.9"/>'),
  down: SVG('<path d="M8 2.5v8M5 7.5l3 3 3-3M2.5 13.5h11"/>'),
  chev: SVG('<path d="M4.5 6.5 8 10l3.5-3.5"/>', 12),
};

/* the sample row's note, as a little white glyph */
const NOTE_THUMB =
  'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff" d="M36 22.5c0-2.3 1.5-4.3 3.7-4.9l42-11.3c3-.8 5.8 1.4 5.8 4.5V66c0 9-7.3 16.5-16.6 18.3-8.6 1.6-14.9-2.7-14.9-9.8 0-7.6 6.8-13.6 15.4-14.6 2.5-.3 4.7-.1 6.6.5V27.6L46.5 37.4v36.7c0 9-7.3 16.5-16.6 18.3C21.3 94 15 89.7 15 82.6c0-7.6 6.8-13.6 15.4-14.6 2.4-.3 4.6-.1 5.6.3z"/></svg>');

export function mount(el) {
  if (el.closest(".tile")) return reel(el);

  /* the lab rests on the glass icon, so there is something to steer; the
     interaction keys are the lab's own, the renderer ignores them */
  const LAB = { ending: "icon", interact: true, strength: 0.8 };
  const params = { ...DEFAULTS, ...LAB };
  const ui = { brand: "tohirr", layout: "result", paused: false };
  const exp = { type: "video", format: "mp4", aspect: "16:9", res: "1080p", fps: 60 };
  const q = new URLSearchParams(location.search);
  if (q.get("theme") === "light") Object.assign(params, THEMES.light, { theme: "light" });
  for (const [k, v] of q) {
    if (k === "brand" && BRANDS[v]) ui.brand = v;
    else if (k === "layout" && LAYOUTS.some((l) => l.id === v)) ui.layout = v;
    else if ((k in DEFAULTS || k in LAB) && k !== "theme") {
      const d = k in LAB ? LAB[k] : DEFAULTS[k];
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
        <p>A drop of liquid glass lands and settles into a clear glass icon around your logo. Move over it, drag, or tilt your phone and the glass answers; click to drop it again.</p>
      </div>

      <div class="ul-box">
        <b>Logo</b>
        <div class="ul-file"><label class="ul-btn ul-cta">Choose file<input type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg" data-file="logo"></label><span data-name="logo">No file chosen</span></div>
        <div class="ul-meta"><span data-brandname></span><button type="button" class="ul-link" data-clear="logo" hidden>Remove</button></div>
        <small>SAMPLE LOGOS</small>
        <div class="ul-samples">${Object.entries(BRANDS).map(([k, b]) =>
          `<button type="button" data-brand="${k}" aria-label="${b.label}"><img alt="" src="${b.logo || NOTE_THUMB}"></button>`).join("")}</div>
        <label class="ul-row ul-tog"><span>Original colors</span><input type="checkbox" role="switch" data-p="original"><i aria-hidden="true"></i></label>
      </div>

      ${SECTIONS.map(([name, rows]) => `
      <details class="ul-sec" open>
        <summary>${ICON.chev}<small>${name.toUpperCase()}</small><em>${rows.length}</em></summary>
        <div class="ul-rows">${rows.map(row).join("")}</div>
      </details>`).join("")}
    </div>
    <footer class="ul-foot"><p>Runs in your browser. WebGL2; the video records in real time.</p><button type="button" class="ul-btn" data-act="reset">Reset tool</button></footer>
  </aside>

  <main class="ul-center">
    <div class="ul-bar">
      <label class="ul-mode"><span>Preview mode</span><span class="ul-select"><select data-mode>${LAYOUTS.map((l) => `<option value="${l.id}">${l.label}</option>`).join("")}</select>${ICON.chev}</span></label>
      <span class="ul-gap"></span>
      <button type="button" class="ul-btn" data-act="pause"><span data-pause-icon></span><span data-pause-label>Pause</span></button>
      <button type="button" class="ul-icon" data-act="restart" aria-label="Replay">${ICON.restart}</button>
      <input type="range" class="ul-scrub" min="0" step="0.001" data-scrub aria-label="Timeline">
      <output class="ul-time" data-time>0.0s</output>
      <span class="ul-div"></span>
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
  const art = { logo: null, mark: null, wordImg: null };

  const toast = (msg, keep) => {
    const t = $(".ul-toast");
    t.textContent = msg;
    t.dataset.on = "1";
    clearTimeout(toast.t);
    if (!keep) toast.t = setTimeout(() => delete t.dataset.on, 2400);
  };

  /* ---- the stage: a layout mock scaled to fit, the live canvas in its slot */
  let scale = 1;
  const applyVars = (node) => {
    node.style.setProperty("--g-bg", params.background);
    node.style.setProperty("--g-ink", params.logoColor);
    node.style.setProperty("--g-plate", params.tileColor);
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
  const ro = new ResizeObserver(() => fitStage());
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
       its backing store follows the pixels it actually covers on screen */
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
  const kick = () => {
    needs = true;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  const syncPause = () => {
    $("[data-pause-icon]").innerHTML = ui.paused ? ICON.play : ICON.pause;
    $("[data-pause-label]").textContent = ui.paused ? "Play" : "Pause";
  };
  const replay = () => { t = reduceMotion ? lengthOf(params.ending) : 0; ui.paused = false; syncPause(); kick(); };
  scrub.addEventListener("input", () => { t = +scrub.value; ui.paused = true; syncPause(); kick(); });

  /* ---- the viewer steers the resting glass; a click replays ------------- */
  const steering = steer({ stage, canvas, glass, kick: () => kick(), replay: () => replay(),
    enabled: () => params.interact, strength: () => params.strength, paused: () => ui.paused, time: () => t });
  const stepLook = steering.step;
  const home = steering.home;

  /* ---- the rail: each layout as a still frame of the formed glass -------- */
  const spare = new GlassLogo(document.createElement("canvas"), { ...params }, { clear: true });
  let stillsToken = 0;
  const refreshStills = async () => {
    const token = ++stillsToken;
    await wait(250); // let a drag settle first
    if (token !== stillsToken) return;
    Object.assign(spare.params, params, { ending: "icon" });
    spare.canvas.width = 480;
    spare.canvas.height = 270;
    spare.setArt(art);
    for (let i = 0; i < 30; i++) {
      spare.render(1.0, 480);
      if (!spare.dirty) break;
      await wait(30);
    }
    if (token !== stillsToken) return;
    const frameURL = spare.canvas.toDataURL("image/webp", 0.9);
    for (const L of LAYOUTS) {
      const box = el.querySelector(`[data-mini="${L.id}"]`);
      box.innerHTML = `<span class="ul-mini-in" style="width:${L.w}px;height:${L.h}px">${L.html(brandName())}</span>`;
      const inner = box.firstChild;
      applyVars(inner);
      inner.style.transform = `scale(${box.clientWidth / L.w})`;
      inner.querySelector(".lx-slot").innerHTML = `<img alt="" src="${frameURL}">`;
    }
  };

  /* ---- fields ------------------------------------------------------------ */
  const sync = () => {
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
    for (const b of $$("[data-brand]")) b.setAttribute("aria-pressed", b.dataset.brand === ui.brand);
    $("[data-brandname]").textContent = ui.brand === "custom" ? "Your logo" : BRANDS[ui.brand].label;

    const fmt = $('[data-x="format"]');
    const opts = exp.type === "video" ? [["mp4", "MP4"], ["webm", "WebM"]] : [["png", "PNG"]];
    fmt.innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    if (!opts.some(([v]) => v === exp.format)) exp.format = opts[0][0];
    for (const s of $$("[data-x]")) s.value = String(exp[s.dataset.x]);
    $("[data-vid]").hidden = exp.type !== "video";
    $('[data-act="go"] span').textContent = exp.type === "video" ? "Export video" : "Export image";

    /* the url carries what differs from the defaults, so a tuned logo is a link */
    applyVars(fitBox);
    const url = new URLSearchParams();
    if (ui.brand !== "tohirr" && BRANDS[ui.brand]) url.set("brand", ui.brand);
    if (ui.layout !== "result") url.set("layout", ui.layout);
    if (params.theme !== "dark") url.set("theme", params.theme);
    const base = { ...DEFAULTS, ...LAB, ...THEMES[params.theme], original: !!BRANDS[ui.brand]?.original };
    for (const k of [...Object.keys(DEFAULTS), ...Object.keys(LAB)]) {
      const v = params[k];
      if (k !== "theme" && v !== base[k] && !(k === "text" && BRANDS[ui.brand]?.text === v)) url.set(k, typeof v === "boolean" ? +v : v);
    }
    history.replaceState(null, "", [...url].length ? `?${url}` : location.pathname);
    glass.touch();
    kick();
    refreshStills();
  };

  for (const i of $$("[data-p]")) {
    const ev = i.tagName === "SELECT" || i.type === "checkbox" ? "change" : "input";
    i.addEventListener(ev, () => {
      const k = i.dataset.p;
      params[k] = i.type === "checkbox" ? i.checked : i.type === "range" ? +i.value : i.value;
      if (k === "theme") Object.assign(params, THEMES[i.value]);
      if (k === "ending") replay();
      if (k === "interact" && !i.checked) home();
      sync();
    });
  }
  for (const n of $$("[data-num]")) {
    const r = el.querySelector(`input[type=range][data-p="${n.dataset.num}"]`);
    n.addEventListener("change", () => {
      const v = parseFloat(n.value);
      if (Number.isFinite(v)) params[n.dataset.num] = Math.max(+r.min, Math.min(+r.max, v));
      sync();
    });
    n.addEventListener("keydown", (e) => { if (e.key === "Enter") n.blur(); });
  }
  for (const h of $$("[data-hex]"))
    h.addEventListener("change", () => {
      if (/^#[0-9a-f]{6}$/i.test(h.value)) params[h.dataset.hex] = h.value.toLowerCase();
      sync();
    });

  /* ---- logos ------------------------------------------------------------- */
  const useBrand = async (name) => {
    ui.brand = name;
    const B = BRANDS[name];
    art.logo = art.wordImg = art.mark = null;
    $('[data-name="logo"]').textContent = "No file chosen";
    $('[data-clear="logo"]').hidden = true;
    if (B.logo) {
      try { [art.logo, art.wordImg] = await brandArt(B); }
      catch { toast("that logo did not load"); }
      params.text = B.text;
    } else if (Object.values(BRANDS).some((b) => b.text === params.text)) params.text = DEFAULTS.text;
    params.original = !!B.original;
    glass.setArt(art);
    showLayout();
    replay();
    sync();
  };
  for (const b of $$("[data-brand]")) b.addEventListener("click", () => useBrand(b.dataset.brand));
  const take = async (file) => {
    if (!file || !file.type.startsWith("image/")) return toast("that is not an image");
    try {
      art.logo = await loadFile(file);
      art.wordImg = null;
      ui.brand = "custom";
      params.original = false;
      $('[data-name="logo"]').textContent = file.name;
      $('[data-clear="logo"]').hidden = false;
      glass.setArt(art);
      showLayout();
      replay();
      sync();
    } catch { toast("that file would not load as an image"); }
  };
  $("[data-file]").addEventListener("change", (e) => { take(e.target.files[0]); e.target.value = ""; });
  stage.addEventListener("dragover", (e) => { e.preventDefault(); stage.dataset.over = "1"; });
  stage.addEventListener("dragleave", () => delete stage.dataset.over);
  stage.addEventListener("drop", (e) => { e.preventDefault(); delete stage.dataset.over; take(e.dataTransfer.files[0]); });
  $('[data-clear="logo"]').addEventListener("click", () => useBrand("tohirr"));

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
    busy = true;
    const secs = (lengthOf(params.ending) + Math.min(params.loopDelay, 1.2)) / params.speed;
    const blob = await record(g, c, { fps: exp.fps, format: exp.format, bitsPerSecond: Math.round(RES[exp.res] * 15000), secs, speed: params.speed, cssW,
      onProgress: (f) => toast(`recording ${Math.round(f * 100)}% — keep this tab in front`, true) });
    busy = false;
    if (!blob) return toast(`this browser cannot record ${exp.format.toUpperCase()}`);
    save(blob, `glass-${slug()}-${size}.${exp.format}`);
    toast(`saved glass-${slug()}-${size}.${exp.format}`);
  };

  /* ---- buttons ----------------------------------------------------------- */
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "export") return setPop(pop.hidden);
    if (act === "go") { setPop(false); return exportNow(); }
    if (act === "pause") {
      ui.paused = !ui.paused;
      if (!ui.paused && t >= pass()) t = 0;
      syncPause();
      kick();
    }
    if (act === "restart") replay();
    if (act === "full") {
      const p = document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen?.();
      p?.catch?.(() => {});
    }
    if (act === "link") {
      try { await navigator.clipboard.writeText(location.href); toast("link copied — it carries every setting"); }
      catch { toast(location.href); }
    }
    if (act === "reset") {
      Object.assign(params, DEFAULTS, LAB);
      useBrand("tohirr");
    }
  });
  const onKeys = (e) => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.target.closest("button")) return;
    if (e.key === " ") {
      e.preventDefault();
      el.querySelector('[data-act="pause"]').click();
    }
  };
  addEventListener("keydown", onKeys);

  el.glassLab = { params, ui, glass, exp, look: steering.look, seek: (s) => { t = s; ui.paused = true; syncPause(); kick(); }, exportNow, pickLayout, useBrand };
  syncPause();
  showLayout();
  useBrand(ui.brand);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    document.removeEventListener("click", onDoc);
    document.removeEventListener("keydown", onKey);
    removeEventListener("keydown", onKeys);
    steering.destroy();
  };
}
