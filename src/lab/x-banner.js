/* lab/x-banner — a profile page as it would be if x let the header move.

   the header on @_tohirr today is a still: one frame of a 274-frame loop,
   cropped 630x210 out of a 630x420 gif to make the 3:1 x asks for. the
   animation was always there — x just wants a png. so this piece is the
   same profile with the same picture, unfrozen.

   the header here is 2.25:1, not x's 3:1. the loop is a scene with speech
   bubbles over it, and 3:1 cuts their tops off: the artwork runs y 65..324
   of the 420, so 630x280 is the shortest crop that holds all of it. a still
   can be cropped to whatever a spec says because nothing in it moves. once
   it moves, the crop has to clear the motion — which is the other half of
   what a feature like this would have to decide.

   the chrome is x's dark palette, hard-coded: it is a picture *of* x, not a
   portfolio surface, so it must not follow the site's theme.

   everything is laid out at 1260x1200 and scaled to whatever frame it lands
   in — 1260 is 2x the gif's own width, so the pixels stay square and whole.

   /capture/?p=x-banner&w=1260&h=1340&mode=screen */

/* the two frames the piece draws itself into. 1260 is 2x the gif's own
   width in both, so the header's pixels stay square and whole either way.
   headerY/headerH is the rectangle the recorder drops the loop into. */
export const FRAMES = {
  web:    { w: 1260, h: 1340, headerY: 112, headerH: 560 },
  mobile: { w: 1260, h: 1552, headerY: 0,   headerH: 560 },
};

const BASE_W = FRAMES.web.w;
const BASE_H = FRAMES.web.h;

/* the verified badge: tohir dropped the real seal-check in
   public/media/x/SealCheck.svg. one path, 48x48, the tick cut out of the
   seal by the fill rule rather than drawn over it */
const badge = (size) =>
  `<svg class="xb-badge" viewBox="0 0 48 48" width="${size}" height="${size}" ` +
  `aria-label="verified account"><path fill="#479BE9" d="M42.3488 19.2787C41.6419 18.54 40.9106 17.7788 40.635 17.1094C40.38 16.4963 40.365 15.48 40.35 14.4956C40.3219 12.6656 40.2919 10.5919 38.85 9.15C37.4081 7.70812 35.3344 7.67812 33.5044 7.65C32.52 7.635 31.5037 7.62 30.8906 7.365C30.2231 7.08937 29.46 6.35812 28.7212 5.65125C27.4275 4.40812 25.9575 3 24 3C22.0425 3 20.5744 4.40812 19.2787 5.65125C18.54 6.35812 17.7788 7.08937 17.1094 7.365C16.5 7.62 15.48 7.635 14.4956 7.65C12.6656 7.67812 10.5919 7.70812 9.15 9.15C7.70812 10.5919 7.6875 12.6656 7.65 14.4956C7.635 15.48 7.62 16.4963 7.365 17.1094C7.08937 17.7769 6.35812 18.54 5.65125 19.2787C4.40812 20.5725 3 22.0425 3 24C3 25.9575 4.40812 27.4256 5.65125 28.7212C6.35812 29.46 7.08937 30.2212 7.365 30.8906C7.62 31.5037 7.635 32.52 7.65 33.5044C7.67812 35.3344 7.70812 37.4081 9.15 38.85C10.5919 40.2919 12.6656 40.3219 14.4956 40.35C15.48 40.365 16.4963 40.38 17.1094 40.635C17.7769 40.9106 18.54 41.6419 19.2787 42.3488C20.5725 43.5919 22.0425 45 24 45C25.9575 45 27.4256 43.5919 28.7212 42.3488C29.46 41.6419 30.2212 40.9106 30.8906 40.635C31.5037 40.38 32.52 40.365 33.5044 40.35C35.3344 40.3219 37.4081 40.2919 38.85 38.85C40.2919 37.4081 40.3219 35.3344 40.35 33.5044C40.365 32.52 40.38 31.5037 40.635 30.8906C40.9106 30.2231 41.6419 29.46 42.3488 28.7212C43.5919 27.4275 45 25.9575 45 24C45 22.0425 43.5919 20.5744 42.3488 19.2787ZM32.5613 20.5613L22.0613 31.0613C21.9219 31.2007 21.7565 31.3114 21.5744 31.3868C21.3923 31.4623 21.1971 31.5012 21 31.5012C20.8029 31.5012 20.6077 31.4623 20.4256 31.3868C20.2435 31.3114 20.0781 31.2007 19.9387 31.0613L15.4387 26.5613C15.1573 26.2798 14.9992 25.898 14.9992 25.5C14.9992 25.102 15.1573 24.7202 15.4387 24.4387C15.7202 24.1573 16.102 23.9992 16.5 23.9992C16.898 23.9992 17.2798 24.1573 17.5613 24.4387L21 27.8794L30.4387 18.4387C30.5781 18.2994 30.7436 18.1888 30.9257 18.1134C31.1077 18.038 31.3029 17.9992 31.5 17.9992C31.6971 17.9992 31.8923 18.038 32.0743 18.1134C32.2564 18.1888 32.4219 18.2994 32.5613 18.4387C32.7006 18.5781 32.8112 18.7436 32.8866 18.9257C32.962 19.1077 33.0008 19.3029 33.0008 19.5C33.0008 19.6971 32.962 19.8923 32.8866 20.0743C32.8112 20.2564 32.7006 20.4219 32.5613 20.5613Z"/></svg>`;

/* the small line-art x uses beside the profile facts */
const ICON = {
  back: '<path d="M20 12H4.8M11.6 5.2L4.8 12l6.8 6.8"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  link: '<path d="M10 13.5a4 4 0 006 .5l2.5-2.5a4.2 4.2 0 00-6-6L11 7"/><path d="M14 10.5a4 4 0 00-6-.5L5.5 12.5a4.2 4.2 0 006 6L13 17"/>',
  balloon: '<path d="M12 14.5a5 5 0 005-5.2C17 6 15 3.5 12 3.5S7 6 7 9.3a5 5 0 005 5.2z"/><path d="M12 14.5v2M10.6 20.5c0-1.6 2.8-1.6 2.8-3"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/>',
  chev: '<path d="M9.5 5.5l6 6.5-6 6.5"/>',
  caret: '<path d="M5 9l7 7 7-7"/>',
};

/* the grok mark is a filled glyph, not a line drawing, so it does not go
   through icon() — and it has to be inline rather than an <img>, because
   currentColor does not resolve inside one and it would come out black on
   a black bar. the path is the real mark, lifted from public/media/x/grok */
const grok = (size) =>
  `<svg class="xb-i" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" ` +
  `fill-rule="evenodd" aria-hidden="true"><path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"/></svg>`;

const icon = (k, size, cls = "") =>
  `<svg class="xb-i ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" ` +
  `stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ` +
  `aria-hidden="true">${ICON[k]}</svg>`;

const TABS = ["Posts", "Replies", "Reposts", "Media"];

/* over a picture the app does not put its controls on a bar — it floats them
   on the picture itself, each on its own dark disc so it stays legible
   whatever the header happens to be doing underneath */
const floatBtn = (label, glyph) =>
  `<button class="xb-disc" type="button" aria-label="${label}">${glyph}</button>`;

function mobileFrame(live) {
  return (
    `<div class="xb-header">` +
      (live
        ? `<img class="xb-headerimg" src="/media/x/banner.gif" alt="a pixel chicken in headphones at a desk: a download finishes, a dialog asks to open it, and the chicken dances" width="630" height="280" draggable="false" />`
        : "") +
      `<div class="xb-floatL">${floatBtn("back", icon("back", 50))}</div>` +
      `<div class="xb-floatR">${floatBtn("grok", grok(46))}${floatBtn("search", icon("search", 52))}</div>` +
    `</div>` +

    `<div class="xb-body">` +
      `<img class="xb-avatar" src="/media/x/avatar.png" alt="" width="240" height="240" draggable="false" />` +
      `<div class="xb-ident">` +
        `<div class="xb-line xb-name"><b>tohirr</b>${badge(56)}</div>` +
        `<div class="xb-dim xb-handle">@_tohirr</div>` +
      `</div>` +
      `<p class="xb-bio">pushing pixels \u{1F47E}</p>` +
      `<div class="xb-meta">` +
        `<span>${icon("pin", 40)}6.45407\u00B0 N, 3.39467\u00B0 E</span>` +
        `<span>${icon("link", 40)}<a class="xb-link" href="https://tohirr.dev">tohirr.dev</a></span>` +
      `</div>` +
      `<div class="xb-meta">` +
        `<span>${icon("balloon", 40)}Born July 15</span>` +
        `<span>${icon("cal", 40)}Joined January 2020${icon("chev", 32, "xb-chev")}</span>` +
      `</div>` +
      `<div class="xb-counts">` +
        `<span><b>841</b> <span class="xb-dim">Following</span></span>` +
        `<span><b>712</b> <span class="xb-dim">Followers</span></span>` +
      `</div>` +
      `<div class="xb-actions">` +
        `<button class="xb-pill" type="button">Share Profile</button>` +
        `<button class="xb-pill" type="button">Edit Profile</button>` +
      `</div>` +
    `</div>`
  );
}

/* live=false leaves the header a hole — the plate the recorder composites
   the moving picture into. see scripts/x-banner.mjs */
export function frame({ live = true, theme = "dark", device = "web" } = {}) {
  const m = device === "mobile";
  return (
    `<div class="xb-card${m ? " xb-m" : ""}${live ? "" : " xb-plate"}" data-xb="${theme}">` +
    (m ? mobileFrame(live) : webFrame(live)) +
    `</div>`
  );
}

function webFrame(live) {
  return (
    `<header class="xb-top">` +
      `<button class="xb-ico" type="button" aria-label="back">${icon("back", 40)}</button>` +
      `<div class="xb-topname">` +
        `<div class="xb-line"><b>tohirr</b>${badge(40)}</div>` +
        `<span class="xb-dim xb-posts">2,319 posts</span>` +
      `</div>` +
      `<div class="xb-topact">` +
        `<button class="xb-ico" type="button" aria-label="grok">${grok(44)}</button>` +
        `<button class="xb-ico" type="button" aria-label="search">${icon("search", 46)}</button>` +
      `</div>` +
    `</header>` +

    `<div class="xb-header">` +
      (live
        ? `<img class="xb-headerimg" src="/media/x/banner.gif" alt="a pixel chicken in headphones at a desk: a download finishes, a dialog asks to open it, and the chicken dances" width="630" height="280" draggable="false" />`
        : "") +
    `</div>` +

    `<div class="xb-body">` +
      `<img class="xb-avatar" src="/media/x/avatar.png" alt="" width="240" height="240" draggable="false" />` +
      `<div class="xb-editrow"><button class="xb-edit" type="button">Edit profile</button></div>` +
      `<div class="xb-ident">` +
        `<div class="xb-line xb-name"><b>tohirr</b>${badge(42)}</div>` +
        `<div class="xb-dim xb-handle">@_tohirr</div>` +
      `</div>` +
      `<p class="xb-bio">pushing pixels \u{1F47E}</p>` +
      `<div class="xb-meta">` +
        `<span>${icon("pin", 32)}6.45407\u00B0 N, 3.39467\u00B0 E</span>` +
        `<span>${icon("link", 32)}<a class="xb-link" href="https://tohirr.dev">tohirr.dev</a></span>` +
        `<span>${icon("balloon", 32)}Born July 15</span>` +
      `</div>` +
      `<div class="xb-meta">` +
        `<span>${icon("cal", 32)}Joined January 2020${icon("chev", 26, "xb-chev")}</span>` +
      `</div>` +
      `<div class="xb-counts">` +
        `<span><b>841</b> <span class="xb-dim">Following</span></span>` +
        `<span><b>712</b> <span class="xb-dim">Followers</span></span>` +
      `</div>` +
    `</div>` +

    `<nav class="xb-tabs">` +
      TABS.map(
        (t, i) =>
          `<span class="xb-tab${i ? "" : " on"}">` +
          `<span class="xb-tablabel">${t}${i ? "" : icon("caret", 24, "xb-caret")}</span>` +
          `</span>`,
      ).join("") +
    `</nav>`
  );
}

export const styles = `
  /* x ships three palettes; the two that matter here are the ends of it —
     "lights out", which is what @_tohirr runs, and the default white. the
     picture is the same file in both: only what surrounds it moves. */
  .xb-card[data-xb="dark"] {
    --xb-bg: #000000; --xb-ink: #e7e9ea; --xb-dim: #71767b;
    --xb-rule: #2f3336; --xb-edge: #536471; --xb-blue: #1d9bf0; --xb-hole: #333639;
  }
  .xb-card[data-xb="light"] {
    --xb-bg: #ffffff; --xb-ink: #0f1419; --xb-dim: #536471;
    --xb-rule: #eff3f4; --xb-edge: #cfd9de; --xb-blue: #1d9bf0; --xb-hole: #cfd9de;
  }

  .xb-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; background: #000; }
  .xb-wrap:has(.xb-card[data-xb="light"]) { background: #fff; }
  .xb-card { width: ${BASE_W}px; min-height: ${BASE_H}px; transform-origin: 0 0;
             background: var(--xb-bg); color: var(--xb-ink);
             font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
             -webkit-font-smoothing: antialiased; text-align: left; cursor: pointer; }
  .xb-card b { font-weight: 800; }
  .xb-dim { color: var(--xb-dim); }
  .xb-i { flex: none; }

  .xb-top { height: 112px; display: flex; align-items: center; gap: 72px; padding: 0 42px 0 20px; }
  .xb-ico { width: 60px; height: 60px; border: 0; padding: 0; border-radius: 50%; flex: none;
            display: grid; place-items: center; color: var(--xb-ink); background: transparent; cursor: pointer; }
  .xb-topname { flex: 1 1 auto; min-width: 0; }
  .xb-line { display: flex; align-items: center; gap: 9px; }
  .xb-topname .xb-line { font-size: 36px; line-height: 42px; }
  .xb-posts { display: block; font-size: 26px; line-height: 32px; margin-top: 2px; }
  .xb-topact { display: flex; align-items: center; gap: 30px; }

  .xb-header { height: 560px; overflow: hidden; background: var(--xb-hole); }
  .xb-headerimg { display: block; width: 100%; height: 100%; object-fit: cover;
                  image-rendering: pixelated; user-select: none; -webkit-user-drag: none; }

  .xb-body { position: relative; padding: 22px 28px 0 32px; }
  .xb-avatar { position: absolute; left: 32px; top: -154px; width: 270px; height: 270px;
               border-radius: 50%; border: 8px solid var(--xb-bg); background: var(--xb-bg);
               box-sizing: border-box; user-select: none; -webkit-user-drag: none; }
  .xb-editrow { display: flex; justify-content: flex-end; }
  .xb-edit { height: 76px; padding: 0 34px; border-radius: 999px; border: 2px solid var(--xb-edge);
             background: transparent; color: var(--xb-ink); font: inherit; font-size: 30px;
             font-weight: 800; cursor: pointer; }

  .xb-ident { margin-top: 76px; }
  .xb-name { font-size: 42px; line-height: 50px; }
  .xb-handle { font-size: 30px; line-height: 38px; margin-top: 6px; }
  .xb-bio { margin: 26px 0 0; font-size: 30px; line-height: 38px; }

  .xb-meta + .xb-meta { margin-top: 6px; }
  .xb-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 26px; margin-top: 26px;
             color: var(--xb-dim); font-size: 30px; line-height: 38px; }
  .xb-meta span { display: inline-flex; align-items: center; gap: 8px; }
  .xb-link { color: var(--xb-blue); text-decoration: none; }
  .xb-chev { margin-left: 2px; opacity: 0.9; }

  .xb-counts { display: flex; gap: 34px; margin-top: 26px; font-size: 30px; line-height: 38px; }
  .xb-counts b { color: var(--xb-ink); }

  .xb-tabs { display: flex; margin-top: 34px; border-bottom: 2px solid var(--xb-rule); }
  .xb-tab { flex: 1 1 0; display: flex; justify-content: center; height: 96px; align-items: center;
            color: var(--xb-dim); font-size: 30px; font-weight: 800; }
  .xb-tab.on { color: var(--xb-ink); }
  .xb-tablabel { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 100%; }
  .xb-tab.on .xb-tablabel::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0;
                                   height: 8px; border-radius: 999px; background: var(--xb-blue); }
  .xb-caret { opacity: 0.9; }


  /* ---- the app ----------------------------------------------------------
     the same profile, but the phone draws it differently enough that it is a
     second layout rather than a breakpoint: the picture runs to the top of
     the screen, the controls float on discs over it instead of sitting on a
     bar, and the two buttons come down under the facts. it stops at the
     buttons — the tab row and the timeline below them say nothing about a
     header that moves, and the phone's own status bar is not x's to show. */
  .xb-card.xb-m { min-height: ${FRAMES.mobile.h}px; display: flex; flex-direction: column; }

  .xb-m .xb-header { position: relative; height: ${FRAMES.mobile.headerH}px; }
  .xb-floatL { position: absolute; left: 52px; top: 52px; }
  .xb-floatR { position: absolute; right: 52px; top: 52px; display: flex; gap: 25px; }
  .xb-disc { width: 136px; height: 136px; border: 0; padding: 0; border-radius: 50%;
             display: grid; place-items: center; color: #fff; background: rgba(0,0,0,0.45); cursor: pointer; }

  .xb-m .xb-body { padding: 0 30px 30px; }
  .xb-m .xb-avatar { left: 17px; top: -54px; width: 294px; height: 294px; border-width: 12px; }
  .xb-m .xb-ident { margin-top: 268px; }
  .xb-m .xb-name { font-size: 74px; line-height: 86px; }
  .xb-m .xb-handle { font-size: 46px; line-height: 56px; margin-top: 12px; }
  .xb-m .xb-bio { font-size: 46px; line-height: 56px; margin-top: 46px; }
  .xb-m .xb-meta { font-size: 42px; line-height: 52px; margin-top: 40px; gap: 8px 40px; }
  .xb-m .xb-meta + .xb-meta { margin-top: 22px; }
  .xb-m .xb-counts { font-size: 44px; line-height: 54px; margin-top: 42px; gap: 40px; }

  .xb-actions { display: flex; gap: 30px; margin-top: 46px; }
  .xb-pill { flex: 1 1 0; height: 130px; border-radius: 999px; border: 2px solid var(--xb-edge);
             background: transparent; color: var(--xb-ink); font: inherit; font-size: 46px;
             font-weight: 800; cursor: pointer; }

  /* the plate is everything but the picture. the card has to go transparent
     along with the header: a card background would paint *behind* its own
     child and fill the hole straight back in. the recorder lays the plate
     over a base of the page colour, so the page colour is not lost. */
  .xb-plate, .xb-plate .xb-header { background: transparent; }
`;

export function mount(el) {
  const sys = () =>
    window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  /* the capture route forces a palette by putting data-theme on <html>, and
     leaves it off to mean "follow the system". the piece reads the same
     signal, so the route's theme control doubles as the toggle */
  const routed = () => {
    const t = document.documentElement.dataset.theme;
    return t === "light" || t === "dark" ? t : sys();
  };

  let device = new URLSearchParams(location.search).get("device") === "mobile" ? "mobile" : "web";
  let theme = routed();

  el.innerHTML = `<style>${styles}</style><div class="xb-wrap"></div>`;
  const wrap = el.querySelector(".xb-wrap");

  /* a profile is a width-driven layout that scrolls: nothing about it
     reflows when the window gets shorter, you just see less of it. so the
     card is drawn once at its own width and scaled by width alone, and its
     height is stretched to whatever the frame has — a tall frame shows empty
     page under the tabs, a short one cuts them off, which is what a real one
     does. fitting both axes instead would letterbox it, and a mock with bars
     down the side is a picture of a video, not of a page. */
  const fit = () => {
    const card = wrap.firstElementChild;
    /* clientWidth, not getBoundingClientRect — the capture frame is itself a
       css transform, and a measured rect would carry that scale in, so the
       card would take it a second time */
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!card || !w || !h) return;
    const base = FRAMES[device];
    const k = w / base.w;
    card.style.transform = `scale(${k})`;
    card.style.height = `${Math.max(base.h, h / k)}px`;
  };

  const draw = () => { wrap.innerHTML = frame({ theme, device }); fit(); };
  draw();

  /* the palette is an attribute, not a redraw — re-inserting the <img> would
     snap the loop back to its first frame every time you flipped it */
  const setTheme = (t) => {
    theme = t;
    if (wrap.firstElementChild) wrap.firstElementChild.dataset.xb = t;
  };

  const ro = new ResizeObserver(fit);
  ro.observe(wrap);

  /* a click anywhere flips the palette, m swaps the page for the app — no
     switch drawn on the mock, because anything drawn on it would end up in
     the recording */
  const onClick = () => setTheme(theme === "light" ? "dark" : "light");
  const onKey = (e) => {
    if (e.key === "t" || e.key === "T") { onClick(); e.preventDefault(); }
    else if (e.key === "m" || e.key === "M") {
      device = device === "mobile" ? "web" : "mobile";
      draw();
      e.preventDefault();
    }
  };
  wrap.addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);

  /* and keep following the route once it changes its mind */
  const mo = new MutationObserver(() => setTheme(routed()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = window.matchMedia ? matchMedia("(prefers-color-scheme: light)") : null;
  const onSys = () => { if (!document.documentElement.dataset.theme) setTheme(sys()); };
  mq?.addEventListener("change", onSys);

  return () => {
    ro.disconnect();
    mo.disconnect();
    mq?.removeEventListener("change", onSys);
    wrap.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKey);
    el.innerHTML = "";
  };
}
