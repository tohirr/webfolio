/* lab/calendar-widget — the calendar concept built, not drawn: apple's
   calendar widget as one component driven by a clock, in three sizes.

   both sizes look the same: the day and the date over the next two events,
   stacked, each a block tinted in its colour with the rule inset, and the
   medium one adds the month on the right. the small one is the medium
   one's left column. when an event starts its rule opens into a fill that
   widens to the elapsed share of the event, and the times give way to the
   minutes left.

   the large one keeps the day and the date and lays the day out under
   them as a timeline, the hours in two columns and a red line at now, each
   event a block down its length. there the progress runs top to bottom:
   the rule opens into a fill that grows down the block, and carries on at
   the top of the next column if the event crosses into it.

   a handle on the bottom right corner — there on hover, always on a
   touchscreen — drags the widget between them, the way the home screen
   resizes one: out to the right from small to medium, then down from
   medium to large. the edge follows the pointer, rubber-bands past the
   ends, and springs to the nearest size on release. a tap on it steps to
   the next size round.

   the text in an event is drawn twice: once in the track's colours, once in
   the fill's, and the fill's copy is clipped to the fill's edge. so where
   the edge cuts through the title the glyph flips colour right at the edge.

   everything is sized in cqw off the small widget's width, measured from
   the figma widget (165pt wide) and a phone's medium one, so it scales
   like the widget does. the medium one is 2.11 of those wide, and the
   large one as wide again and 2.23 tall. */

const DAY = [
  { title: "Design review", place: "Studio", start: "09:00", end: "09:30" },
  { title: "Apple Keynote", place: "Online", start: "10:00", end: "11:30" },
  { title: "Product meeting", place: "Video call", start: "15:30", end: "16:00", color: "#5dbf4c" },
];

const FROM = 8.5 * 60; // the demo slider's span, in minutes past midnight
const TO = 16.5 * 60;
const SPEEDS = [1, 60, 300];

const WIDE = 2.11; // medium width over small width, as the phone draws it
const GROW = (WIDE - 1) * 100; // cqw the widget gains
const TALL = 2.23; // large height over small height
const LGROW = (TALL - 1) * 100; // cqw the large one gains downward
const SIZES = ["small", "medium", "large"];

/* the large widget's timeline: two columns of HOURS each, from the top of
   the hour the day's first event starts in */
const HOURS = 4;
const TL_TOP = 50; // cqw from the widget's top to the first hour line
const TL_BOT = 10; // cqw of room under the last one
const COL_W = 91.2; // cqw a column spans, labels and all
const COL_GAP = 8;
const LABEL = 11; // cqw the hour labels take
const HOUR_H = (TALL * 100 - TL_TOP - TL_BOT) / HOURS; // cqw an hour runs down
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const mins = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const clock = (m) => {
  const h = Math.floor(m / 60) % 24;
  const mm = Math.floor(m % 60);
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

/* the minutes always take two digits' room — a figure space, as wide as a
   digit, stands in for a missing tens — so "10 min" going to "9 min"
   doesn't pull the rest of the line left */
const FIG = "\u2007";
const two = (n) => (n < 10 ? FIG + n : String(n));
const left = (m) => {
  const n = Math.ceil(m);
  if (n < 60) return `${two(n)} min left`;
  const h = Math.floor(n / 60);
  const r = n % 60;
  return r ? `${h} h ${two(r)} min left` : `${h} h left`;
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (a, b, x) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

/* figma's widget is 165pt wide with a 28pt corner; a figma length in cqw */
// a length that runs from a at small to b at medium as the widget resizes
const lerp = (a, b) => `calc(${a}cqw + var(--t) * ${(b - a).toFixed(3)}cqw)`;
const px = (pt) => `${((pt / 165) * 100).toFixed(3)}cqw`;
const ROUND = +((28 / 165) * 100).toFixed(3);
const SQUIRCLE_R = 22;

const CSS = `
.cwg-c { container-type: inline-size; position: relative; width: 100%;
  height: 0; padding-bottom: calc(100% + var(--u) * ${LGROW}%); --t: 0; --u: 0; }
.cwg { position: absolute; top: 0; left: 0;
  height: calc(100cqw + var(--u) * ${LGROW}cqw);
  width: calc(100cqw + var(--t) * ${GROW}cqw);
  margin-left: calc(var(--t) * ${-GROW / 2}cqw);
  border-radius: ${ROUND}cqw; overflow: hidden; isolation: isolate;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  --fg: #000; --grey: #858585; --red: #ef5a50; --mag: #b04591;
  --track-mix: 11%, #fff; --on: #fff;
  /* figma's fills, bottom to top: a gradient under both themes, then the
     theme's own solid. figma's values are in points on a 165 wide widget,
     so every length here is that over 1.65, in cqw */
  --fill: #fff;
  background: linear-gradient(var(--fill), var(--fill)),
    linear-gradient(to bottom, #171717, #000);
  color: var(--fg);
  box-shadow: 0 .4cqw 3cqw rgba(0,0,0,.08); }
/* the squircle the cells have. a squircle at the same radius reads squarer
   than figma's smoothed corner, so it takes a bigger one to match the render */
@supports (corner-shape: squircle) {
  .cwg { border-radius: ${SQUIRCLE_R}cqw; corner-shape: squircle; }
}
@media (prefers-color-scheme: dark) {
  .cwg { --fg: #fff; --grey: #7d7d7d; --track-mix: 14%, #222;
    --on: #000;
    --fill: #1a1a1a;
    /* figma's edge, inner shadows all: a soft shade in from the top and
       bottom edges, a hairline on each, and a fine lighter line inside it */
    box-shadow:
      inset 0 ${px(20)} ${px(10)} ${px(-20)} #222,
      inset 0 ${px(-20)} ${px(10)} ${px(-20)} #222,
      inset 0 ${px(1)} 0 0 #1a1a1a,
      inset 0 ${px(-1)} 0 0 #1a1a1a,
      inset 0 ${px(4)} ${px(0.5)} ${px(-4)} #666,
      inset 0 ${px(-4)} ${px(0.5)} ${px(-4)} #666; }
}
/* the cells' rim of light: a one pixel ring just inside the edge, brightest
   at the top left, a fainter catch at the bottom right, over a hairline. it
   takes the page's --rim-* when it sits on the page, and its own otherwise */
.cwg::after { content: ""; position: absolute; inset: 0; padding: 1px;
  border-radius: inherit; corner-shape: inherit; pointer-events: none; z-index: 10;
  background: linear-gradient(var(--rim-angle, 135deg),
    var(--rim-hi, rgba(255,255,255,.32)), transparent 32%, transparent 68%,
    var(--rim-lo, rgba(255,255,255,.12)));
  box-shadow: inset 0 0 0 .5px var(--rim-line, rgba(255,255,255,.05));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }

/* both sizes are one layout: the small widget is the medium one's left
   column. the day, the date and the events stay put as the widget resizes,
   the events narrowing to fit, and the month fades in on the right */
.cwg-md { position: absolute; top: 0; left: 0; height: 100%; width: ${WIDE * 100}cqw; }
.cwg p { margin: 0; line-height: 1; }

.cwg-day { position: absolute; left: 11cqw; top: 10.1cqw; font-size: 7.6cqw;
  color: var(--red); text-transform: uppercase; letter-spacing: .01em; }
.cwg-date { position: absolute; left: 10.7cqw; top: 18.5cqw; font-size: 21.7cqw;
  font-weight: 400; letter-spacing: -.02em; }
.cwg-none { position: absolute; left: 11cqw; top: 48cqw; font-size: 6.6cqw;
  color: var(--grey); opacity: 0; transition: opacity .6s ease; }
.cwg-none.on { opacity: 1; transition-delay: .3s; }

/* an event: a tinted block under the date with the rule inset in it, the
   name and the time in the event's colour. the rule opens into a fill
   while the event runs. every event has a block, and the script moves the
   blocks: the next two stacked in place, the later ones below, the
   finished ones lifted out the top. so when an event ends it slides up and
   away and the next one rises into its place, rather than the text being
   swapped under you */
.cwg-ev { position: absolute; left: 10.6cqw; top: 45.5cqw; height: 20cqw;
  width: ${lerp(78.8, 89.9)}; opacity: 0;
  transition: transform .9s cubic-bezier(.3,.7,.2,1), opacity .6s ease; }
/* one after the other: the finished event is gone before the rest move up */
.cwg-ev[data-at="gone"] { transition: transform .7s cubic-bezier(.4,0,.6,1), opacity .35s ease; }
.cwg-ev[data-at="on"] { transition-delay: .3s; }
/* when the clock runs backwards — the loop coming round — nothing slides,
   the blocks just fade in where they belong */
.cwg.cut .cwg-ev { transition: opacity .6s ease; }
@media (prefers-reduced-motion: reduce) { .cwg-ev { transition: opacity .4s ease; } }

/* the track is the event's own colour, thinned into the widget's ground */
.cwg-track, .cwg-fill { position: absolute; }
.cwg-track { inset: 0; border-radius: 2.1cqw;
  background: color-mix(in srgb, var(--mag) var(--track-mix)); }
.cwg-fill { left: 1.9cqw; top: 1.7cqw; bottom: 1.7cqw; width: 1.5cqw;
  border-radius: .75cqw; background: var(--mag); }
.cwg-ev.live .cwg-fill { left: 0; top: 0; bottom: 0; border-radius: 2.1cqw; }
.cwg-ev.morph .cwg-fill { transition: width .7s cubic-bezier(.3,.7,.2,1),
  border-radius .7s ease, left .7s ease, top .7s ease, bottom .7s ease; }
.cwg-ev.morph .cwg-on { transition: clip-path .7s cubic-bezier(.3,.7,.2,1); }

.cwg-txt { position: absolute; inset: 0; padding: 1.3cqw 0 0 5.9cqw;
  white-space: nowrap; overflow: hidden; }
.cwg-t { font-size: 7.2cqw; font-weight: 600; }
.cwg-m { font-size: 7.2cqw; margin-top: 1.2cqw !important;
  /* every digit the same width, so the countdown ticks in place instead of
     the line shuffling as a 1 turns into an 8 */
  font-variant-numeric: tabular-nums; }
.cwg-off .cwg-t { color: color-mix(in srgb, var(--mag) 72%, #fff); }
.cwg-off .cwg-m { color: color-mix(in srgb, var(--mag) 60%, #fff); opacity: .8; }
@media (prefers-color-scheme: light) {
  .cwg-off .cwg-t { color: color-mix(in srgb, var(--mag) 85%, #000); }
  .cwg-off .cwg-m { color: color-mix(in srgb, var(--mag) 70%, #000); }
}
/* over the fill it is all the fill's ink, the countdown as much as the
   name: it is the thing being read */
.cwg-on { color: var(--on); clip-path: inset(0 calc(100% - 1.5cqw) 0 0); }

/* the small and medium widgets' list, which gives way to the timeline */
.cwg-list { position: absolute; inset: 0; }

/* the large widget's timeline. an hour is a row with its label and a
   hairline; an event is a block down its length, track and rule as in the
   list, and while it runs the fill drops from the block's top to now. the
   line at now runs under the blocks: inside a running one the fill's edge
   is now already, and the line would only strike through its name */
.cwg-lg { position: absolute; top: 0; left: 0; width: ${WIDE * 100}cqw;
  height: ${TALL * 100}cqw; }
.cwg-col { position: absolute; top: ${TL_TOP}cqw; width: ${COL_W}cqw;
  height: ${HOUR_H * HOURS}cqw; }
.cwg-hr { position: absolute; left: 0; right: 0; height: 0;
  border-top: 1px solid color-mix(in srgb, var(--grey) 45%, transparent); }
.cwg-hr span { position: absolute; left: -${LABEL + 0.6}cqw; top: -3.3cqw; width: ${LABEL}cqw;
  font-size: 6.4cqw; font-weight: 600; color: var(--grey); text-align: right;
  font-variant-numeric: tabular-nums; }
.cwg-lev { position: absolute; left: 1cqw; right: 1cqw; overflow: hidden;
  border-radius: 2.1cqw; z-index: 1; }
.cwg-lev .cwg-fill { left: 1.9cqw; top: 1.7cqw; bottom: 1.7cqw; width: 1.5cqw;
  height: auto; border-radius: .75cqw; }
.cwg-lev.live .cwg-fill { left: 0; top: 0; bottom: auto; width: 100%;
  border-radius: 0; }
.cwg-lev.morph .cwg-fill { transition: height .7s cubic-bezier(.3,.7,.2,1),
  width .7s ease, border-radius .7s ease, left .7s ease, top .7s ease; }
.cwg-lev.morph .cwg-on { transition: clip-path .7s cubic-bezier(.3,.7,.2,1); }
.cwg-lev .cwg-txt { padding-top: 1.6cqw; }
.cwg-lev .cwg-on { clip-path: inset(0 0 100% 0); }
.cwg-now { position: absolute; left: -${LABEL / 2 + 1}cqw; right: 0; height: .9cqw;
  margin-top: -.45cqw; background: var(--red); border-radius: .45cqw;
  transition: opacity .4s ease; }
.cwg-now::before { content: ""; position: absolute; left: -1.6cqw; top: 50%;
  width: 3.6cqw; height: 3.6cqw; margin-top: -1.8cqw; border-radius: 50%;
  background: var(--red); }

/* the month, as the medium widget draws it */
.cwg-cal { position: absolute; left: 110.3cqw; top: 10.1cqw; width: 92.8cqw; }
.cwg-mo { font-size: 7.6cqw; color: var(--red); text-transform: uppercase;
  padding-left: 3.7cqw; letter-spacing: .01em; }
.cwg-grid { display: grid; grid-template-columns: repeat(7, 13.26cqw);
  grid-auto-rows: var(--row, 11.7cqw); margin-top: 2.25cqw;
  font-size: 7.4cqw; font-weight: 600; font-variant-numeric: tabular-nums; }
.cwg-grid span { display: grid; place-items: center; }
.cwg-grid .wd { font-size: 6.4cqw; color: var(--grey); }
.cwg-grid .we { color: var(--grey); }
.cwg-grid .td { position: relative; color: #fff; }
.cwg-grid .td::before { content: ""; position: absolute; z-index: -1;
  width: 11.6cqw; height: 11.6cqw; border-radius: 50%; background: var(--red); }
.cwg-grid { isolation: isolate; }

/* the resize handle: a length of pale translucency laid over the bottom
   right corner, on the edge itself, bent to the widget's own corner (see
   handleShape). it sits beside the widget, not in it, so the widget's clip
   doesn't cut it; its box and place come from the script, which knows the
   corner's size. it is flat, not blurred glass: some chrome builds run a
   backdrop-filter over the element's whole box whatever clips or masks it,
   which leaves a lit square round the handle */
.cwg-h { position: absolute; z-index: 20; padding: 0; border: 0;
  background: none; cursor: nwse-resize; touch-action: none; }
.cwg-glass { position: absolute; inset: 0;
  clip-path: var(--shape);
  background: rgba(255,255,255,.34);
  opacity: 0; transform: scale(.94); transform-origin: 40% 40%;
  transition: opacity .2s ease, transform .25s cubic-bezier(.3,.7,.2,1); }
@media (prefers-color-scheme: light) {
  .cwg-glass { background: rgba(110,110,118,.32); }
}
.cwg-c:hover .cwg-glass, .cwg-h:focus-visible .cwg-glass, .cwg-c.drag .cwg-glass {
  opacity: 1; transform: none; }
.cwg-c.drag .cwg-glass { transform: scale(1.05); }
@media (hover: none) { .cwg-glass { opacity: 1; transform: none; } }
.cwg-h:focus-visible { outline: none; }

.cwd { display: flex; flex-direction: column; align-items: center; gap: 22px;
  width: 100%; height: 100%; justify-content: center; }
.cwd-ctl { display: flex; align-items: center; gap: 12px; width: min(520px, 86vw);
  font-variant-numeric: tabular-nums; }
.cwd-ctl input { flex: 1; accent-color: #b04591; }
.cwd-sp { display: flex; gap: 6px; }
.cwd-sp button { font: inherit; color: var(--dim, #888); background: none;
  border: 1px solid currentColor; border-radius: 6px; padding: 2px 6px;
  cursor: pointer; opacity: .6; }
.cwd-sp button[aria-pressed="true"] { opacity: 1; color: #b04591; }
`;

/* the handle's shape. the corner is the widget's: a squircle is a
   superellipse, |x|^4 + |y|^4 = r^4 across the corner's r-by-r box (a plain
   round corner, where corner-shape isn't supported, is the same with 2),
   so the handle is a short length of that curve, THICK wide with round
   ends, centred on the edge. it is drawn once, as a polygon in percentages
   of its box, so it scales with the widget and needs no measuring */
const SQUIRCLE = globalThis.CSS?.supports?.("corner-shape", "squircle") ?? false;
const CORNER = SQUIRCLE ? { r: SQUIRCLE_R, n: 4 } : { r: ROUND, n: 2 };
const PAD = 6; // cqw of room round the corner, for the stroke
const THICK = 7; // cqw
const TRIM = 0.3; // radians off each end of the quarter turn

function handleShape() {
  const { r, n } = CORNER;
  const size = r + 2 * PAD;
  const h = THICK / 2;
  // the curve at th, with its corner's centre at (PAD, PAD), and its unit
  // normal — the gradient of x^n + y^n — which the two edges are offset
  // along, off the edge by d, so the band keeps its width all the way round
  const at = (th, d = 0) => {
    const x = Math.cos(th) ** (2 / n);
    const y = Math.sin(th) ** (2 / n);
    const gx = x ** (n - 1);
    const gy = y ** (n - 1);
    const len = Math.hypot(gx, gy);
    const nx = gx / len;
    const ny = gy / len;
    return { x: PAD + r * x + d * nx, y: PAD + r * y + d * ny, nx, ny };
  };
  const pts = [];
  const put = (x, y) => pts.push(`${((x / size) * 100).toFixed(2)}% ${((y / size) * 100).toFixed(2)}%`);
  const STEPS = 40;
  const th = (i) => TRIM + (i / STEPS) * (Math.PI / 2 - 2 * TRIM);
  const cap = (c, sign, from) => {
    // a half circle round the end, from one edge to the other, bulging out
    // past the end along the curve
    const px = -c.ny * sign;
    const py = c.nx * sign;
    for (let j = 1; j < 12; j++) {
      const f = (j / 12) * Math.PI;
      const dx = c.nx * Math.cos(f) * from + px * Math.sin(f);
      const dy = c.ny * Math.cos(f) * from + py * Math.sin(f);
      put(c.x + h * dx, c.y + h * dy);
    }
  };
  for (let i = 0; i <= STEPS; i++) {
    const c = at(th(i), h);
    put(c.x, c.y);
  }
  cap(at(th(STEPS)), 1, 1);
  for (let i = STEPS; i >= 0; i--) {
    const c = at(th(i), -h);
    put(c.x, c.y);
  }
  cap(at(th(0)), -1, -1);
  return { size, clip: `polygon(${pts.join(",")})` };
}

const txt = (cls) =>
  `<div class="cwg-txt ${cls}"><p class="cwg-t"></p><p class="cwg-m"></p></div>`;

const EV = `<div class="cwg-track"></div><div class="cwg-fill"></div>${txt("cwg-off")}${txt("cwg-on")}`;

/* one event slot: set(ev, live, m) draws it; a change of event or state
   eases, a steady tick doesn't, or the fill would trail the clock */
function slot(node, { bar = 1.5, dash = "\u2013" } = {}) {
  node.innerHTML = EV;
  const fill = node.querySelector(".cwg-fill");
  const on = node.querySelector(".cwg-on");
  const texts = [...node.querySelectorAll(".cwg-txt")];
  const put = (sel, v) => texts.forEach((t) => (t.querySelector(sel).textContent = v));
  let shown = null;
  let wasLive = null;
  let timer = 0;

  const setFill = (w) => {
    fill.style.width = w;
    on.style.clipPath = `inset(0 calc(100% - ${w}) 0 0)`;
  };

  return {
    set(ev, live, m) {
      if (ev !== shown || live !== wasLive) {
        node.classList.add("morph");
        clearTimeout(timer);
        timer = setTimeout(() => node.classList.remove("morph"), 700);
        put(".cwg-t", ev.title);
        node.style.setProperty("--mag", ev.color || "");
        shown = ev;
        wasLive = live;
      }
      node.classList.toggle("live", live);
      if (live) {
        const p = (m - ev.s) / (ev.e - ev.s);
        setFill(`max(${bar}cqw, ${(p * 100).toFixed(3)}%)`);
        put(".cwg-m", left(ev.e - m));
      } else {
        setFill(`${bar}cqw`);
        put(".cwg-m", `${ev.start}${dash}${ev.end}`);
      }
    },
    stop() {
      clearTimeout(timer);
    },
  };
}

/* one piece of an event down the timeline: the same track and rule as the
   list's, but a running one fills from the top down, the piece's own share
   of it — so an event that crosses into the next column goes on filling
   at that column's top. the words are in the event's first piece only */
function vslot(node, words) {
  node.innerHTML = words ? EV : `<div class="cwg-track"></div><div class="cwg-fill"></div>`;
  const fill = node.querySelector(".cwg-fill");
  const on = node.querySelector(".cwg-on");
  const texts = [...node.querySelectorAll(".cwg-txt")];
  const put = (sel, v) => texts.forEach((t) => (t.querySelector(sel).textContent = v));
  let wasLive = null;
  let timer = 0;

  const setFill = (h) => {
    fill.style.height = h;
    if (on) on.style.clipPath = `inset(0 0 calc(100% - ${h}) 0)`;
  };

  return {
    set(ev, piece, m) {
      const live = ev.s <= m && m < ev.e;
      if (live !== wasLive) {
        node.classList.add("morph");
        clearTimeout(timer);
        timer = setTimeout(() => node.classList.remove("morph"), 700);
        node.style.setProperty("--mag", ev.color || "");
        put(".cwg-t", ev.title);
        wasLive = live;
      }
      node.classList.toggle("live", live);
      if (live) {
        const p = clamp01((m - piece.s) / (piece.e - piece.s));
        setFill(`${(p * 100).toFixed(3)}%`);
        put(".cwg-m", left(ev.e - m));
      } else {
        fill.style.height = "";
        if (on) on.style.clipPath = "";
        put(".cwg-m", `${ev.start}\u2013${ev.end}`);
      }
    },
    stop() {
      clearTimeout(timer);
    },
  };
}

function month(date) {
  const y = date.getFullYear();
  const mo = date.getMonth();
  const first = new Date(y, mo, 1).getDay();
  const days = new Date(y, mo + 1, 0).getDate();
  const rows = Math.ceil((first + days) / 7);
  let cells = "SMTWTFS".split("").map((d) => `<span class="wd">${d}</span>`).join("");
  for (let i = 0; i < first; i++) cells += "<span></span>";
  for (let d = 1; d <= days; d++) {
    const col = (first + d - 1) % 7;
    const cls = d === date.getDate() ? "td" : col === 0 || col === 6 ? "we" : "";
    cells += `<span${cls ? ` class="${cls}"` : ""}>${d}</span>`;
  }
  // six weeks of a month need the rows closer to stay inside the widget
  return (
    `<div class="cwg-cal"><p class="cwg-mo">${MONTHS[mo]}</p>` +
    `<div class="cwg-grid" style="--row: ${rows > 5 ? 10.4 : 11.7}cqw">${cells}</div></div>`
  );
}

/* the component: render(minute) draws the widget for that minute of `date`.
   leave `date` out and it is always today — the weekday, the number and the
   month roll over at midnight like the real one's. `size` is where it
   starts, "small", "medium" (the default) or "large", and `large` says
   whether it can be dragged out that far — it needs room to grow down */
export function calendarWidget(el, { events, date, size = "medium", large = true }) {
  const evs = events.map((e) => ({ ...e, s: mins(e.start), e: mins(e.end) }));
  const grip = handleShape();
  const row = () => evs.map(() => `<div class="cwg-ev"></div>`).join("");
  const big = large;
  const TOP = big ? 2 : 1; // the largest size it goes to, as a position

  /* the timeline: from the top of the first event's hour, two columns of
     HOURS. an event is cut into a piece per column it crosses, each piece a
     block with its own fill; the words go in the first piece only */
  const h0 = Math.floor(Math.min(...evs.map((e) => e.s)) / 60) * 60;
  const colX = (c) => 10.6 + LABEL + c * (COL_W + COL_GAP);
  const pieces = [];
  evs.forEach((ev, i) => {
    for (let c = 0; c < 2; c++) {
      const a = h0 + c * HOURS * 60;
      const b = a + HOURS * 60;
      const s0 = Math.max(ev.s, a);
      const s1 = Math.min(ev.e, b);
      if (s1 > s0) pieces.push({ i, c, s: s0, e: s1, first: s0 === ev.s });
    }
  });
  function timeline() {
    const cols = [0, 1].map((c) => {
      const hrs = Array.from({ length: HOURS + 1 }, (_, k) => {
        const h = (h0 / 60 + c * HOURS + k) % 24;
        return `<div class="cwg-hr" style="top:${(k * HOUR_H).toFixed(3)}cqw">` +
          `<span>${String(h).padStart(2, "0")}</span></div>`;
      }).join("");
      const blocks = pieces
        .filter((p) => p.c === c)
        .map((p) => {
          const top = ((p.s - (h0 + c * HOURS * 60)) / 60) * HOUR_H;
          const h = ((p.e - p.s) / 60) * HOUR_H;
          return `<div class="cwg-lev" style="top:${top.toFixed(3)}cqw;height:${h.toFixed(3)}cqw"></div>`;
        })
        .join("");
      return `<div class="cwg-col" style="left:${colX(c).toFixed(3)}cqw;width:${(COL_W - LABEL).toFixed(3)}cqw">` +
        hrs + blocks + `<div class="cwg-now"></div></div>`;
    });
    return `<div class="cwg-lg">${cols.join("")}</div>`;
  }

  el.innerHTML =
    `<style>${CSS}</style>` +
    `<div class="cwg-c"><div class="cwg">` +
    `<p class="cwg-day"></p>` +
    `<p class="cwg-date"></p>` +
    `<div class="cwg-list">` +
    row() +
    `<p class="cwg-none">No more events today</p>` +
    `</div>` +
    `<div class="cwg-md"><div class="cwg-cal"></div></div>` +
    (big ? timeline() : "") +
    `</div>` +
    `<button class="cwg-h" data-act aria-label="resize the widget">` +
    `<span class="cwg-glass" style="--shape: ${grip.clip}"></span></button>` +
    `</div>`;

  const box = el.querySelector(".cwg-c");
  const medium = el.querySelector(".cwg-md");
  const handle = el.querySelector(".cwg-h");
  // the handle's box: the corner's, with room round it, riding the right edge
  const { r } = CORNER;
  Object.assign(handle.style, {
    width: `${grip.size}cqw`,
    height: `${grip.size}cqw`,
    left: `calc(100cqw + var(--t) * ${GROW / 2}cqw - ${r + PAD}cqw)`,
    top: `calc(100cqw + var(--u) * ${LGROW}cqw - ${r + PAD}cqw)`,
  });
  const rowsOf = (sel) => [...el.querySelectorAll(sel)].map((node) => ({ node, ...slot(node) }));
  const rows = rowsOf(".cwg-ev");
  const root = el.querySelector(".cwg");
  const none = el.querySelector(".cwg-none");
  const list = el.querySelector(".cwg-list");
  const lg = el.querySelector(".cwg-lg");
  const nows = [...el.querySelectorAll(".cwg-now")];
  const tall = [...el.querySelectorAll(".cwg-lev")].map((node, k) => ({
    node,
    ...pieces[k],
    ...vslot(node, pieces[k].first),
  }));

  let day = "";
  const paintDay = (d) => {
    if (d.toDateString() === day) return;
    day = d.toDateString();
    el.querySelector(".cwg-day").textContent = WEEKDAYS[d.getDay()];
    el.querySelector(".cwg-date").textContent = String(d.getDate());
    el.querySelector(".cwg-cal").outerHTML = month(d);
  };
  paintDay(date || new Date());

  /* ---- size: t runs 0 (small) to 1 (medium) to 2 (large) --------------
     the first step is the width, the second the height */

  let t = Math.min(TOP, Math.max(0, SIZES.indexOf(size)));
  let v = 0;
  let target = t;
  let raf = 0;

  const draw = () => {
    const w = Math.min(1, Math.max(0, t));
    const u = Math.max(0, t - 1);
    box.style.setProperty("--t", w.toFixed(4));
    box.style.setProperty("--u", u.toFixed(4));
    const out = 1 - ease(0.05, 0.5, u); // the list and month give way
    medium.style.opacity = String(ease(0.35, 0.9, w) * out);
    medium.style.visibility = w < 0.3 || out === 0 ? "hidden" : "";
    list.style.opacity = String(out);
    list.style.visibility = out === 0 ? "hidden" : "";
    if (lg) {
      const into = ease(0.45, 0.95, u);
      lg.style.opacity = String(into);
      lg.style.visibility = into === 0 ? "hidden" : "";
    }
  };

  // a spring onto the nearer size, keeping the velocity the hand let go with
  const settle = (now) => {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.032);
    last = now;
    v += (170 * (target - t) - 22 * v) * dt;
    t += v * dt;
    if (Math.abs(v) < 0.002 && Math.abs(target - t) < 0.001) {
      t = target;
      v = 0;
    } else {
      raf = requestAnimationFrame(settle);
    }
    draw();
  };
  let last = 0;
  const release = (to) => {
    target = to;
    if (reduceMotion) {
      t = to;
      v = 0;
      draw();
      return;
    }
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(settle);
  };

  let x0 = 0;
  let y0 = 0;
  let t0 = 0;
  let moved = 0;
  let lastS = 0;
  let lastT = 0;
  let vs = 0; // how fast the size is moving, in sizes a millisecond
  const unit = () => box.getBoundingClientRect().width / 100; // px per cqw

  /* where the pointer puts the size: out to the right it runs small to
     medium — the edge moves half what the width grows, as the widget stays
     centred — then down it runs medium to large. past either end it
     rubber-bands */
  const sizeAt = (e) => {
    const dx = (e.clientX - x0) / ((GROW / 2) * unit());
    const dy = (e.clientY - y0) / (LGROW * unit());
    let raw;
    if (t0 >= 1 && TOP > 1) {
      // from medium or large: down is the height, back left is the width
      raw = t0 + dy;
      if (raw < 1) raw = Math.min(1, 1 + dx);
    } else {
      raw = t0 + dx;
      if (raw > 1 && TOP > 1) raw = 1 + Math.max(0, dy);
    }
    return raw > TOP ? TOP + (raw - TOP) * 0.18 : raw < 0 ? raw * 0.18 : raw;
  };

  handle.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    handle.setPointerCapture(e.pointerId);
    cancelAnimationFrame(raf);
    raf = 0;
    box.classList.add("drag");
    x0 = e.clientX;
    y0 = e.clientY;
    lastT = e.timeStamp;
    t0 = lastS = t;
    moved = 0;
    vs = 0;
  });
  handle.addEventListener("pointermove", (e) => {
    if (!box.classList.contains("drag")) return;
    moved = Math.max(moved, Math.hypot(e.clientX - x0, e.clientY - y0));
    t = sizeAt(e);
    const dt = Math.max(1, e.timeStamp - lastT);
    vs = (t - lastS) / dt;
    lastS = t;
    lastT = e.timeStamp;
    draw();
  });
  const up = (e) => {
    if (!box.classList.contains("drag")) return;
    e.stopPropagation();
    box.classList.remove("drag");
    // a tap steps to the next size round
    if (moved < 4) return release((Math.round(target) + 1) % (TOP + 1));
    // a flick carries on to where the size was heading, but never past the
    // next size over
    const ahead = Math.max(-0.6, Math.min(0.6, vs * 160));
    v = vs * 1000;
    release(Math.min(TOP, Math.max(0, Math.round(t + ahead))));
  };
  handle.addEventListener("pointerup", up);
  handle.addEventListener("pointercancel", up);
  handle.addEventListener("click", (e) => e.stopPropagation());
  handle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" && target < 1) release(1);
    if (e.key === "ArrowLeft") release(0);
    if (e.key === "ArrowDown" && TOP > 1) release(2);
    if (e.key === "ArrowUp" && target > 1) release(1);
  });

  draw();

  /* ---- time ------------------------------------------------------------ */

  /* where an event k places from the next one goes: [y, shown]. the next
     two stacked, the finished ones lifted out, the later ones below */
  const place = (k) => (k < 0 ? [-8, 0] : [k * 22.5, k < 2 ? 1 : 0]);

  let lastM = -Infinity;
  let cutT = 0;

  function render(m) {
    if (!date) paintDay(new Date());
    if (m < lastM - 1) {
      // the clock went back: place the rows without sliding them
      root.classList.add("cut");
      clearTimeout(cutT);
      cutT = setTimeout(() => root.classList.remove("cut"), 700);
    }
    lastM = m;

    let next = evs.findIndex((e) => m < e.e);
    if (next < 0) next = evs.length;
    evs.forEach((ev, i) => {
      const k = i - next;
      const live = k === 0 && ev.s <= m;
      const it = rows[i];
      // a finished event keeps its last frame while it leaves
      if (k >= 0 || !it.drawn) it.set(ev, live, m);
      it.drawn = true;
      const [y, shown] = place(k);
      it.node.style.transform = `translateY(${y}cqw)`;
      it.node.style.opacity = String(shown);
      it.node.dataset.at = k < 0 ? "gone" : shown ? "on" : "later";
    });
    none.classList.toggle("on", next >= evs.length);

    // the timeline: every piece of every event, and the line at now
    tall.forEach((p) => p.set(evs[p.i], p, m));
    nows.forEach((n, c) => {
      const a = h0 + c * HOURS * 60;
      const inside = m >= a && m <= a + HOURS * 60;
      n.style.opacity = inside ? "1" : "0";
      if (inside) n.style.top = `${(((m - a) / 60) * HOUR_H).toFixed(3)}cqw`;
    });
  }

  return {
    render,
    get size() {
      return SIZES[Math.round(target)];
    },
    resize: (to) => release(Math.min(TOP, Math.max(0, SIZES.indexOf(to)))),
    destroy() {
      cancelAnimationFrame(raf);
      rows.forEach((r) => r.stop());
      tall.forEach((p) => p.stop());
      clearTimeout(cutT);
      el.innerHTML = "";
    },
  };
}

export function mount(el) {
  el.innerHTML =
    `<div class="cwd"><div class="cwd-w"></div>` +
    `<div class="cwd-ctl"><span class="cwd-clock"></span>` +
    `<input type="range" min="${FROM}" max="${TO}" step="0.1" aria-label="time of day" />` +
    `<span class="cwd-sp">${SPEEDS.map((s) => `<button data-s="${s}">${s}×</button>`).join("")}</span>` +
    `</div></div>`;

  const holder = el.querySelector(".cwd-w");
  holder.style.width = "min(240px, 38vw)";
  const w = calendarWidget(holder, { events: DAY });
  const range = el.querySelector("input");
  const readout = el.querySelector(".cwd-clock");
  const buttons = [...el.querySelectorAll(".cwd-sp button")];

  let m = 9 * 60 + 55; // just before the keynote
  let speed = 60;
  let last = performance.now();
  let raf = 0;

  const setSpeed = (s) => {
    speed = s;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.s) === s)));
  };
  setSpeed(speed);
  buttons.forEach((b) => b.addEventListener("click", () => setSpeed(Number(b.dataset.s))));

  let dragging = false;
  range.addEventListener("pointerdown", () => (dragging = true));
  addEventListener("pointerup", () => (dragging = false));
  range.addEventListener("input", () => {
    m = Number(range.value);
  });

  const tick = (t) => {
    const dt = Math.min((t - last) / 1000, 0.1);
    last = t;
    if (!dragging) {
      m += (dt * speed) / 60;
      if (m > TO) m = FROM;
      range.value = String(m);
    }
    readout.textContent = clock(m);
    w.render(m);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    w.destroy();
    el.innerHTML = "";
  };
}
