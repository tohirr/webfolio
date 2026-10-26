/* lab/glass-studio — the liquid glass logo as a single-column component
   page (served at /glass-logo/): a preview card, and under it the controls
   as a grid of compact fields — drop zones for the images, selects,
   scrub-to-set number fields, toggles, colour wells — grouped Images, Logo,
   Glass, Motion, Interaction, Export. the same glass as /glass-lab/, laid
   out the way a component library page is rather than as a labs tool.

   in a tile it plays the reveal on its own (glass-common's reel). */

import "../glass-studio/glass-studio.css";
import { DEFAULTS, THEMES, GlassLogo, lengthOf } from "./glass-logo.js";
import { BRANDS, brandArt, steer, record, reel } from "./glass-common.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const ASPECTS = { "16:9": 16 / 9, "1:1": 1, "4:5": 4 / 5, "9:16": 9 / 16 };
const RES = { "720p": 720, "1080p": 1080, "1440p": 1440, "4K": 2160 };

/* every control, by section: [kind, key, label, ...] */
const FIELDS = {
  Logo: [
    ["select", "ending", "Ending", [["icon", "Icon (stays glass)"], ["logo", "Logo"], ["wordmark", "Wordmark"]]],
    ["select", "theme", "Theme", [["dark", "Dark"], ["light", "Light"]]],
    ["select", "brand", "Logo", Object.entries(BRANDS).map(([k, b]) => [k, b.label]).concat([["custom", "Custom"]])],
    ["toggle", "original", "Original colors"],
    ["range", "logoSize", "Tile size (px)", 96, 480, 1],
    ["range", "logoScale", "Logo scale", 0.2, 1, 0.01],
    ["range", "finalLogoScale", "Final logo scale", 0.2, 1, 0.01],
    ["range", "logoRelief", "Logo relief", 0, 1, 0.01],
    ["toggle", "tile", "Icon plate"],
    ["text", "text", "Wordmark", "wordmark"],
  ],
  Glass: [
    ["range", "depth", "Optical depth", 0, 6, 0.1],
    ["range", "dispersion", "Dispersion", 0, 4, 0.05],
    ["range", "relief", "Double bevel", 0, 3, 0.05],
    ["range", "caustics", "Caustics", 0, 4, 0.05],
    ["range", "highlights", "Highlights", 0, 4, 0.05],
    ["range", "echoTint", "Echo plate tint", 0, 1, 0.01],
    ["range", "innerWallFocus", "Inner wall focus", 0, 1, 0.01],
    ["range", "bloom", "Light diffusion", 0, 2, 0.01],
    ["color", "logoColor", "Logo color"],
    ["color", "tileColor", "Plate color"],
    ["color", "background", "Background"],
  ],
  Motion: [
    ["range", "dropStrength", "Drop strength", 0, 4, 0.05],
    ["range", "decay", "Ring decay (s)", 0.1, 10, 0.1],
    ["range", "speed", "Speed", 0.1, 4, 0.05],
    ["range", "loopDelay", "Loop delay (s)", 0, 10, 0.1],
    ["toggle", "loop", "Loop"],
    ["toggle", "paused", "Paused"],
  ],
  Interaction: [
    ["toggle", "interact", "Glass follows the pointer"],
    ["range", "strength", "Strength", 0, 1, 0.01],
  ],
};

const loadFile = (file) => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = rej;
  im.src = URL.createObjectURL(file);
});
const decimals = (step) => (String(step).split(".")[1] || "").length;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SVG = (d, s = 13) =>
  `<svg viewBox="0 0 16 16" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  replay: SVG("M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5V5H5"),
  full: SVG("M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"),
  upload: SVG("M8 10.5V2.5M5 5.5l3-3 3 3M2.5 10.5v3h11v-3"),
  down: SVG("M8 2.5v8M5 7.5l3 3 3-3M2.5 13.5h11"),
  reset: SVG("M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5V5H5", 12),
};

export function mount(el) {
  if (el.closest(".tile")) return reel(el);

  /* the page rests on the glass icon, so there is something to steer; the
     page's own keys ride along in params, the renderer ignores them */
  const PAGE = { ending: "icon", interact: true, strength: 0.8, brand: "tohirr", paused: false };
  const params = { ...DEFAULTS, ...PAGE };
  const exp = { type: "video", format: "mp4", aspect: "16:9", res: "1080p", fps: 60 };
  const q = new URLSearchParams(location.search);
  if (q.get("theme") === "light") Object.assign(params, THEMES.light, { theme: "light" });
  for (const [k, v] of q) {
    if (k === "brand" && BRANDS[v]) params.brand = v;
    else if (k === "aspect" && ASPECTS[v]) exp.aspect = v;
    else if ((k in DEFAULTS || k in PAGE) && k !== "theme" && k !== "brand") {
      const d = k in PAGE ? PAGE[k] : DEFAULTS[k];
      params[k] = typeof d === "number" ? +v : typeof d === "boolean" ? v === "1" : v;
    }
  }

  const field = ([kind, key, label, a, b, c]) => {
    if (kind === "range")
      return `<label class="gx-f gx-range" style="--f:0%"><span>${label}</span>` +
        `<input type="text" inputmode="decimal" data-num="${key}" data-min="${a}" data-max="${b}" data-step="${c}" aria-label="${label}"></label>`;
    if (kind === "select")
      return `<label class="gx-f gx-sel"><span>${label}</span><select data-p="${key}">` +
        a.map(([v, l]) => `<option value="${v}">${l}</option>`).join("") + "</select></label>";
    if (kind === "toggle")
      return `<label class="gx-f gx-tog"><span>${label}</span><input type="checkbox" role="switch" data-p="${key}"><i aria-hidden="true"></i></label>`;
    if (kind === "color")
      return `<label class="gx-f gx-col"><span>${label}</span><output data-hex="${key}"></output><input type="color" data-p="${key}"></label>`;
    return `<label class="gx-f gx-txt" data-only="${a}"><span>${label}</span><input type="text" data-p="${key}" maxlength="28" spellcheck="false"></label>`;
  };

  el.innerHTML = `
<div class="gx">
  <header class="gx-top">
    <nav class="gx-crumb"><a href="/">tohirr</a><span>/</span>Components<span>/</span><b>Glass Logo</b></nav>
  </header>
  <main class="gx-main">
    <h1>Glass Logo</h1>
    <p class="gx-lede">A drop of liquid glass lands and settles into a clear glass icon around your logo. Move over it, drag, or tilt your phone and the glass answers; click to drop it again. Any SVG or PNG.</p>

    <section class="gx-card gx-preview" aria-label="Preview">
      <div class="gx-stage"><canvas aria-label="liquid glass logo"></canvas></div>
      <div class="gx-tools">
        <button type="button" class="gx-chip" data-act="replay">${ICON.replay}Replay</button>
        <button type="button" class="gx-chip gx-sq" data-act="full" aria-label="Fullscreen">${ICON.full}</button>
      </div>
    </section>

    <section class="gx-controls" aria-label="Controls">
      <div class="gx-head"><h2>Controls</h2><button type="button" class="gx-chip" data-act="reset">${ICON.reset}Reset</button></div>

      <h3>Images</h3>
      <div class="gx-grid gx-two">
        <label class="gx-f gx-drop" data-drop="ground">${ICON.upload}<span data-name="ground">Background</span><em>Drop an image or click</em>
          <input type="file" accept="image/*" data-file="ground"><button type="button" class="gx-x" data-clear="ground" hidden aria-label="Remove background">×</button></label>
        <label class="gx-f gx-drop" data-drop="logo">${ICON.upload}<span data-name="logo">Logo</span><em>SVG or PNG · drop or click</em>
          <input type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg" data-file="logo"><button type="button" class="gx-x" data-clear="logo" hidden aria-label="Remove logo">×</button></label>
      </div>

      ${Object.entries(FIELDS).map(([name, list]) => `<h3>${name}</h3><div class="gx-grid">${list.map(field).join("")}</div>`).join("")}

      <h3>Export</h3>
      <div class="gx-grid">
        <label class="gx-f gx-sel"><span>Type</span><select data-x="type"><option value="video">Video</option><option value="image">Image</option></select></label>
        <label class="gx-f gx-sel"><span>Format</span><select data-x="format"></select></label>
        <label class="gx-f gx-sel"><span>Aspect ratio</span><select data-x="aspect">${Object.keys(ASPECTS).map((k) => `<option>${k}</option>`).join("")}</select></label>
        <label class="gx-f gx-sel"><span>Resolution</span><select data-x="res">${Object.keys(RES).map((k) => `<option>${k}</option>`).join("")}</select></label>
        <label class="gx-f gx-sel" data-vid><span>Frame rate</span><select data-x="fps"><option value="60">60 fps</option><option value="30">30 fps</option></select></label>
      </div>
      <button type="button" class="gx-export" data-act="export">${ICON.down}<span>Export video</span></button>
    </section>
  </main>
  <div class="gx-toast" role="status" aria-live="polite"></div>
</div>`;

  const $ = (s) => el.querySelector(s);
  const $$ = (s) => [...el.querySelectorAll(s)];
  const canvas = $(".gx-stage canvas");
  const stage = $(".gx-stage");
  const card = $(".gx-preview");
  const glass = new GlassLogo(canvas, params);
  const art = { logo: null, mark: null, wordImg: null, ground: null };

  const toast = (msg, keep) => {
    const tt = $(".gx-toast");
    tt.textContent = msg;
    tt.dataset.on = "1";
    clearTimeout(toast.t);
    if (!keep) toast.t = setTimeout(() => delete tt.dataset.on, 2400);
  };

  /* ---- playback ---------------------------------------------------------- */
  /* one pass is the reveal, then the hold; the icon ending holds for good */
  let t = reduceMotion ? lengthOf(params.ending) : 0;
  let last = performance.now();
  let raf = 0;
  let alive = true;
  let needs = false;
  const pass = () => lengthOf(params.ending) + params.loopDelay;
  const loops = () => params.loop && params.ending !== "icon";
  const frame = (now) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const running = !params.paused && !reduceMotion;
    if (running) {
      t += dt * params.speed;
      if (t >= pass()) t = loops() ? 0 : pass();
    }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
    const springing = steering.step(dt);
    glass.render(t, canvas.clientWidth);
    const moving = (running && (loops() || t < pass())) || springing;
    if (moving || needs || glass.dirty) raf = requestAnimationFrame(frame);
    needs = false;
  };
  const kick = () => {
    needs = true;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  const replay = () => { t = reduceMotion ? lengthOf(params.ending) : 0; params.paused = false; sync(); };
  const steering = steer({ stage: card, canvas, glass, kick, replay,
    enabled: () => params.interact, strength: () => params.strength, paused: () => params.paused, time: () => t });

  /* the preview card follows the export's aspect */
  const layout = () => { stage.style.aspectRatio = String(ASPECTS[exp.aspect]); kick(); };
  const ro = new ResizeObserver(kick);
  ro.observe(stage);

  /* ---- fields ------------------------------------------------------------ */
  const show = (v, step) => Number(v).toFixed(decimals(step));
  const sync = () => {
    for (const lab of $$(".gx-range")) {
      const i = lab.querySelector("input");
      const k = i.dataset.num, lo = +i.dataset.min, hi = +i.dataset.max;
      if (document.activeElement !== i) i.value = show(params[k], i.dataset.step);
      lab.style.setProperty("--f", `${Math.max(0, Math.min(1, (params[k] - lo) / (hi - lo))) * 100}%`);
    }
    for (const i of $$("[data-p]")) {
      const k = i.dataset.p;
      if (i.type === "checkbox") i.checked = !!params[k];
      else if (document.activeElement !== i) i.value = params[k];
    }
    for (const o of $$("[data-hex]")) o.textContent = params[o.dataset.hex];
    for (const f of $$("[data-only]")) f.hidden = params.ending !== f.dataset.only;
    const fmt = $('[data-x="format"]');
    const opts = exp.type === "video" ? [["mp4", "MP4"], ["webm", "WebM"]] : [["png", "PNG"]];
    fmt.innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    if (!opts.some(([v]) => v === exp.format)) exp.format = opts[0][0];
    for (const s of $$("[data-x]")) s.value = String(exp[s.dataset.x]);
    $("[data-vid]").hidden = exp.type !== "video";
    $(".gx-export span").textContent = exp.type === "video" ? "Export video" : "Export image";

    /* the url carries what differs from the defaults, so a tuned logo is a link */
    const url = new URLSearchParams();
    if (params.brand !== "tohirr" && BRANDS[params.brand]) url.set("brand", params.brand);
    if (params.theme !== "dark") url.set("theme", params.theme);
    const base = { ...DEFAULTS, ...PAGE, ...THEMES[params.theme], original: !!BRANDS[params.brand]?.original };
    for (const k of [...Object.keys(DEFAULTS), "ending", "interact", "strength"]) {
      const v = params[k];
      if (k !== "theme" && v !== base[k] && !(k === "text" && BRANDS[params.brand]?.text === v)) url.set(k, typeof v === "boolean" ? +v : v);
    }
    if (exp.aspect !== "16:9") url.set("aspect", exp.aspect);
    history.replaceState(null, "", [...url].length ? `?${url}` : location.pathname);
    glass.touch();
    kick();
  };

  /* number fields: drag across the cell to scrub, or click the value and
     type. arrow keys step, shift for ten */
  for (const lab of $$(".gx-range")) {
    const i = lab.querySelector("input");
    const k = i.dataset.num, lo = +i.dataset.min, hi = +i.dataset.max, step = +i.dataset.step;
    const set = (v) => {
      params[k] = +Math.max(lo, Math.min(hi, Math.round(v / step) * step)).toFixed(decimals(step));
      sync();
    };
    let drag = null;
    lab.addEventListener("pointerdown", (e) => {
      if (e.target === i && document.activeElement === i) return;
      e.preventDefault();
      drag = { x: e.clientX, moved: false };
      lab.setPointerCapture(e.pointerId);
    });
    lab.addEventListener("pointermove", (e) => {
      if (!drag) return;
      if (Math.abs(e.clientX - drag.x) > 3) drag.moved = true;
      if (!drag.moved) return;
      const r = lab.getBoundingClientRect();
      set(lo + ((e.clientX - r.left) / r.width) * (hi - lo));
    });
    lab.addEventListener("pointerup", () => {
      if (drag && !drag.moved) { i.focus(); i.select(); }
      drag = null;
    });
    i.addEventListener("change", () => { const v = parseFloat(i.value); if (Number.isFinite(v)) set(v); else sync(); });
    i.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); set(params[k] + step * (e.shiftKey ? 10 : 1)); }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); set(params[k] - step * (e.shiftKey ? 10 : 1)); }
      if (e.key === "Enter") i.blur();
    });
    i.addEventListener("blur", sync);
  }

  for (const i of $$("[data-p]")) {
    i.addEventListener(i.tagName === "SELECT" || i.type === "checkbox" ? "change" : "input", () => {
      const k = i.dataset.p;
      const v = i.type === "checkbox" ? i.checked : i.value;
      if (k === "brand") return v === "custom" ? $('input[data-file="logo"]').click() : useBrand(v);
      params[k] = v;
      if (k === "theme") Object.assign(params, THEMES[v]);
      if (k === "ending") return replay();
      if (k === "paused" && !v && t >= pass()) t = 0;
      if (k === "interact" && !v) steering.home();
      sync();
    });
  }
  for (const s of $$("[data-x]"))
    s.addEventListener("change", () => {
      exp[s.dataset.x] = s.dataset.x === "fps" ? +s.value : s.value;
      if (s.dataset.x === "aspect") layout();
      sync();
    });

  /* ---- images ------------------------------------------------------------ */
  const useBrand = async (name) => {
    params.brand = name;
    const B = BRANDS[name];
    art.logo = art.wordImg = art.mark = null;
    $('[data-name="logo"]').textContent = "Logo";
    $('[data-clear="logo"]').hidden = true;
    try { [art.logo, art.wordImg] = await brandArt(B); } catch { toast("that logo did not load"); }
    if (B.text) params.text = B.text;
    else if (Object.values(BRANDS).some((b) => b.text === params.text)) params.text = DEFAULTS.text;
    params.original = !!B.original;
    glass.setArt(art);
    replay();
  };
  const take = async (slot, file) => {
    if (!file || !file.type.startsWith("image/")) return toast("that is not an image");
    try {
      art[slot] = await loadFile(file);
      if (slot === "logo") { art.wordImg = null; params.brand = "custom"; params.original = false; }
      $(`[data-name="${slot}"]`).textContent = file.name;
      $(`[data-clear="${slot}"]`).hidden = false;
      glass.setArt(art);
      if (slot === "logo") replay();
      else sync();
    } catch { toast("that file would not load as an image"); }
  };
  for (const f of $$("[data-file]")) f.addEventListener("change", () => { take(f.dataset.file, f.files[0]); f.value = ""; });
  for (const z of $$("[data-drop]")) {
    z.addEventListener("dragover", (e) => { e.preventDefault(); z.dataset.over = "1"; });
    z.addEventListener("dragleave", () => delete z.dataset.over);
    z.addEventListener("drop", (e) => { e.preventDefault(); delete z.dataset.over; take(z.dataset.drop, e.dataTransfer.files[0]); });
  }
  for (const b of $$("[data-clear]"))
    b.addEventListener("click", (e) => {
      e.preventDefault();
      const k = b.dataset.clear;
      if (k === "logo") return useBrand("tohirr");
      art.ground = null;
      $('[data-name="ground"]').textContent = "Background";
      b.hidden = true;
      glass.setArt(art);
      kick();
    });

  /* ---- export ------------------------------------------------------------ */
  const save = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  };
  const slug = () => (params.brand === "custom" ? "logo" : params.brand) + (params.ending === "wordmark" ? "-wordmark" : "");
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

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "replay") replay();
    if (act === "full") {
      const p = document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen?.();
      p?.catch?.(() => {});
    }
    if (act === "export") exportNow();
    if (act === "reset") {
      Object.assign(params, DEFAULTS, PAGE);
      art.ground = null;
      $('[data-name="ground"]').textContent = "Background";
      $('[data-clear="ground"]').hidden = true;
      useBrand("tohirr");
    }
  });

  el.glassStudio = { params, glass, exp, look: steering.look, time: () => t, seek: (s) => { t = s; params.paused = true; sync(); }, exportNow };
  layout();
  useBrand(params.brand);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    steering.destroy();
  };
}
