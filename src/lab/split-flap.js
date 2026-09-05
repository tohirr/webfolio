/* lab/split-flap — a solari departure board. every character is a flap
   split across the middle; to change, the top leaf falls forward over the
   bottom, one character at a time around a fixed ring, until it lands on
   the one it wants. all flaps tick together, each stops when it arrives,
   which is where the stagger comes from. pages rotate on their own;
   hover turns the page early. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const COLS = 10;
const ROWS = 4;
const STEP = 66; // ms per flip — the board's tick
const DWELL = 8000; // ms a page stays up
const RING = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:'.-+";

const lagos = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

/* each page is up to ROWS lines of up to COLS characters. a function is
   read at flip time, for the clock */
const PAGES = [
  ["HI THERE", "I'M TOHIR", "DESIGN", "ENGINEER"],
  ["BUTTONS", "YOU PRESS", "JUST TO", "FEEL THEM"],
  () => ["LAGOS", lagos(), "GMT+1", ""],
  ["OPEN TO", "DESIGN", "ENGINEER", "ROLES"],
  ["BOOKMARX", "COLUBRID", "WISP", "DOTIX"],
];

export function mount(el) {
  el.innerHTML =
    `<style>
.sf-board{--gap:4px;display:grid;grid-template-columns:repeat(${COLS},1fr);gap:var(--gap);width:100%;max-width:420px;padding:0 14px;margin:0 auto;perspective:900px}
.sf-flap{position:relative;aspect-ratio:.74;border-radius:3px;font-size:var(--fs,20px);line-height:var(--fh,40px);font-weight:600;letter-spacing:0;color:var(--ink);transform-style:preserve-3d;user-select:none}
.sf-half{position:absolute;left:0;width:100%;height:50%;overflow:hidden;border-radius:3px 3px 0 0;background:color-mix(in srgb,var(--tile) 90%,var(--ink) 10%);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.sf-half.sf-top{top:0;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--ink) 9%,transparent)}
.sf-half.sf-bot{top:50%;border-radius:0 0 3px 3px;background:color-mix(in srgb,var(--tile) 86%,var(--ink) 14%)}
.sf-half span{position:absolute;left:0;width:100%;height:var(--fh,40px);text-align:center}
.sf-half.sf-top span{top:0}
.sf-half.sf-bot span{top:-100%}
.sf-flap::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;margin-top:-.5px;background:var(--bg);z-index:3;pointer-events:none;opacity:.9}
.sf-leaf{position:absolute;left:0;top:0;width:100%;height:50%;transform-origin:50% 100%;transform-style:preserve-3d;transform:rotateX(0);transition:transform ${STEP - 6}ms cubic-bezier(.45,0,.75,.55);z-index:2}
.sf-leaf .sf-half{top:0;height:100%}
.sf-leaf .sf-back{transform:rotateX(180deg);border-radius:0 0 3px 3px;background:color-mix(in srgb,var(--tile) 86%,var(--ink) 14%)}
.sf-leaf .sf-back span{top:-100%}
.sf-flap.go .sf-leaf{transform:rotateX(-180deg)}
.sf-flap.snap .sf-leaf{transition:none}
</style>` +
    '<div class="sf-board" role="img" aria-label="split-flap board"></div>';

  const board = el.querySelector(".sf-board");
  const flaps = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const f = document.createElement("div");
    f.className = "sf-flap";
    f.innerHTML =
      '<div class="sf-half sf-top"><span> </span></div>' +
      '<div class="sf-half sf-bot"><span> </span></div>' +
      '<div class="sf-leaf"><div class="sf-half sf-top sf-front"><span> </span></div>' +
      '<div class="sf-half sf-bot sf-back"><span> </span></div></div>';
    board.appendChild(f);
    const [top, bot, front, back] = [...f.querySelectorAll("span")];
    flaps.push({ el: f, top, bot, front, back, cur: 0, target: 0, flipping: false });
  }

  /* size the glyph to the flap: line-height is the full flap height so
     each half shows exactly half a character */
  const ro = new ResizeObserver(() => {
    const h = flaps[0].el.getBoundingClientRect().height;
    if (!h) return;
    board.style.setProperty("--fh", `${h}px`);
    board.style.setProperty("--fs", `${h * 0.62}px`);
  });
  ro.observe(flaps[0].el);

  /* ---- the mechanism ------------------------------------------------- */

  const ch = (i) => RING[i];
  const paint = (f) => {
    // at rest every face shows the current character
    f.top.textContent = f.front.textContent = f.bot.textContent = f.back.textContent = ch(f.cur);
  };
  flaps.forEach(paint);

  let ticking = 0;
  let onSettle = null;

  const tick = () => {
    let busy = false;
    for (const f of flaps) {
      if (f.flipping) {
        // the leaf has fallen: commit, and reset the leaf without motion
        f.cur = (f.cur + 1) % RING.length;
        f.flipping = false;
        f.el.classList.add("snap");
        f.el.classList.remove("go");
        paint(f);
        void f.el.offsetWidth;
        f.el.classList.remove("snap");
      }
      if (f.cur !== f.target) {
        const next = (f.cur + 1) % RING.length;
        f.top.textContent = ch(next); // what shows behind the falling leaf
        f.back.textContent = ch(next); // the underside of the leaf
        f.front.textContent = f.bot.textContent = ch(f.cur);
        f.flipping = true;
        f.el.classList.add("go");
        busy = true;
      }
    }
    if (busy) ticking = setTimeout(tick, STEP);
    else {
      ticking = 0;
      onSettle?.();
    }
  };

  const setText = (lines) => {
    const flat = [];
    for (let r = 0; r < ROWS; r++) {
      const line = (lines[r] || "").toUpperCase().slice(0, COLS).padEnd(COLS, " ");
      for (const c of line) flat.push(Math.max(0, RING.indexOf(c)));
    }
    flaps.forEach((f, i) => (f.target = flat[i]));
    if (reduceMotion) {
      // no falling leaves: land straight on the text
      for (const f of flaps) {
        f.cur = f.target;
        paint(f);
      }
      onSettle?.();
      return;
    }
    if (!ticking) tick();
  };

  /* ---- pages ------------------------------------------------------------ */

  let page = -1;
  let dwell = 0;
  let live = false;

  const show = (i) => {
    page = (i + PAGES.length) % PAGES.length;
    const p = PAGES[page];
    setText(typeof p === "function" ? p() : p);
  };

  const schedule = () => {
    clearTimeout(dwell);
    if (live) dwell = setTimeout(() => show(page + 1), DWELL);
  };
  onSettle = schedule;

  // hover turns the page, once it has settled
  el.addEventListener("pointerenter", () => {
    if (!ticking) show(page + 1);
  });

  /* run only while the tile is on screen and the tab is visible; the
     board freezes where it is and carries on when it comes back */
  const setLive = (on) => {
    if (on === live) return;
    live = on;
    if (on) {
      if (page < 0) show(0);
      else if (!ticking) schedule();
    } else clearTimeout(dwell);
  };
  let inView = false;
  const sync = () => setLive(inView && !document.hidden);
  const io = new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      sync();
    },
    { threshold: 0.3 },
  );
  io.observe(el);
  document.addEventListener("visibilitychange", sync);

  return () => {
    clearTimeout(ticking);
    clearTimeout(dwell);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", sync);
  };
}
