/* lab/bookmarx-mark — in the cell, the bookmarx icon as the app ships it
   (bookmarx's src/app/icon.svg): the bookmark lit from the top-left shoulder
   in the brand's three blues, a silver sparkle on its top-right corner.
   under a mouse the icon tilts toward the pointer and the sparkle answers
   like metal: its bands of silver sweep as it turns, a glint follows the
   pointer across it, and it drifts a little ahead of the bookmark as if it
   sat nearer. in the drawer, the space itself — the top of
   the demo library's front page, captured from bookmarx.space. */

const BM =
  "M24 26 A12 12 0 0 1 36 14 L64 14 A12 12 0 0 1 76 26 L76 82 Q76 88.5 70.5 85.2 " +
  "L53 71.5 Q50 69 47 71.5 L29.5 85.2 Q24 88.5 24 82 Z";

/* the four-pointed sparkle, and the shift that centres bookmark and sparkle
   together in the box, both as the app's icon has them */
const SPARK =
  "M78.15 0.86 A14.5 14.5 0 0 0 89.14 11.85 A14.5 14.5 0 0 0 78.15 22.84 " +
  "A14.5 14.5 0 0 0 67.16 11.85 A14.5 14.5 0 0 0 78.15 0.86 Z";
const FIT = "translate(50 50) scale(1.14) translate(-56.75 -44.5)";

const SPACE = { src: "/media/bookmarx/space.jpg", w: 1200, h: 1500 };
const ALT =
  "the bookmarx space: the next date in your saves as a hero, a strip of " +
  "old saves to rediscover, and collections the library sorted itself into";

/* the cell and the drawer's stage can both be up at once, so each mount
   names its own gradients */
let seq = 0;

/* the rim: the same light as the cell's edge, a hairline just inside the
   bookmark's outline. it is the outline stroked and clipped to the shape,
   so only the inner half shows, with a gradient that is brightest where the
   light falls and gone along the sides. unlike the cell's ring it answers
   to no light but its own: the gradient turns slowly round the icon, once
   every half minute, and holds at the top left when motion is turned
   down */
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SPIN = still
  ? ""
  : '<animateTransform attributeName="gradientTransform" type="rotate" ' +
    'from="135 50 50" to="495 50 50" dur="30s" repeatCount="indefinite"/>';

const icon = () => {
  const n = ++seq;
  return (
    '<div class="bmx"><svg viewBox="0 0 100 100" role="img" aria-label="bookmarx">' +
    "<defs>" +
    `<linearGradient id="bmx-sheen-${n}" x1="0" y1="0" x2="0.85" y2="1">` +
    '<stop offset="0" stop-color="#7cc8fd"/>' +
    '<stop offset="0.55" stop-color="#1d9bf0"/>' +
    '<stop offset="1" stop-color="#0f6ba8"/>' +
    "</linearGradient>" +
    `<linearGradient id="bmx-rim-${n}" gradientUnits="userSpaceOnUse" x1="50" y1="89" x2="50" y2="11" gradientTransform="rotate(135 50 50)">` +
    '<stop offset="0" stop-color="#fff" stop-opacity="0.75"/>' +
    '<stop offset="0.32" stop-color="#fff" stop-opacity="0"/>' +
    '<stop offset="0.68" stop-color="#fff" stop-opacity="0"/>' +
    '<stop offset="1" stop-color="#fff" stop-opacity="0.3"/>' +
    SPIN +
    "</linearGradient>" +
    `<linearGradient id="bmx-silver-${n}" x1="0" y1="0" x2="1" y2="1">` +
    '<stop offset="0" stop-color="#ffffff"/>' +
    '<stop offset="0.3" stop-color="#e4e8ed"/>' +
    '<stop offset="0.48" stop-color="#a9b1bb"/>' +
    '<stop offset="0.62" stop-color="#f5f7f9"/>' +
    '<stop offset="0.85" stop-color="#c3c9d1"/>' +
    '<stop offset="1" stop-color="#8e97a3"/>' +
    "</linearGradient>" +
    `<radialGradient id="bmx-glint-${n}" gradientUnits="userSpaceOnUse" cx="78.15" cy="11.85" r="9">` +
    '<stop offset="0" stop-color="#fff" stop-opacity="0.95"/>' +
    '<stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
    "</radialGradient>" +
    `<clipPath id="bmx-clip-${n}"><path d="${BM}"/></clipPath>` +
    "</defs>" +
    `<g transform="${FIT}">` +
    `<path d="${BM}" fill="url(#bmx-sheen-${n})"/>` +
    `<path d="${BM}" fill="none" stroke="url(#bmx-rim-${n})" stroke-width="1.4" ` +
    `stroke-linejoin="round" clip-path="url(#bmx-clip-${n})"/>` +
    '<g class="bmx-spark">' +
    `<path d="${SPARK}" fill="url(#bmx-silver-${n})"/>` +
    `<path class="bmx-glint" d="${SPARK}" fill="url(#bmx-glint-${n})" opacity="0"/>` +
    "</g></g></svg></div>"
  );
};

export function mount(el) {
  const inCell = !!el.closest(".tile");

  el.innerHTML =
    `<style>
      .bmx { width: 46%; aspect-ratio: 1; display: grid; place-items: center; margin: auto; perspective: 520px; }
      .bmx svg { width: 100%; height: 100%; display: block; overflow: visible;
        transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); will-change: transform; }
      .bmx-space { display: block; background: #0a0a0a; overflow: hidden; }
      .bmx-space img { display: block; width: 100%; height: 100%; user-select: none; -webkit-user-drag: none; }
    </style>` +
    (inCell
      ? icon()
      : `<picture class="bmx-space"><img src="${SPACE.src}" alt="${ALT}" ` +
        `width="${SPACE.w}" height="${SPACE.h}" decoding="async" draggable="false" /></picture>`);

  const stop = inCell && !still ? tilt(el) : () => {};

  return () => {
    stop();
    el.innerHTML = "";
  };
}

/* the tilt and the silver's answer to it. the whole tile listens, so the
   icon turns as soon as the mouse is over the cell; it eases toward the
   pointer and settles flat again when the mouse leaves. touch gets none of
   it — the icon sits still as it ships */
function tilt(el) {
  const area = el.closest(".tile") || el;
  const svg = el.querySelector(".bmx svg");
  const spark = el.querySelector(".bmx-spark");
  const glint = el.querySelector(".bmx-glint");
  const silver = el.querySelector('[id^="bmx-silver-"]');
  const glow = el.querySelector('[id^="bmx-glint-"]');

  let px = 0, py = 0; // the pointer over the tile, -0.5 … 0.5
  let x = 0, y = 0, lit = 0; // where the eased values are
  let on = false;
  let raf = 0;

  const move = (e) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    const r = area.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width - 0.5;
    py = (e.clientY - r.top) / r.height - 0.5;
    on = true;
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const leave = () => {
    on = false;
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const frame = () => {
    const tx = on ? px : 0, ty = on ? py : 0;
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    lit += ((on ? 1 : 0) - lit) * 0.1;

    svg.style.setProperty("--rx", `${(-y * 22).toFixed(2)}deg`);
    svg.style.setProperty("--ry", `${(x * 26).toFixed(2)}deg`);
    // nearer things move further: the sparkle leads the bookmark
    spark.setAttribute("transform", `translate(${(x * 3).toFixed(2)} ${(y * 3).toFixed(2)})`);
    // the bands of silver turn with the tilt, so the bright ones slide over
    silver.setAttribute("gradientTransform", `rotate(${((x - y) * 160).toFixed(1)} 0.5 0.5)`);
    // and a glint sits on the side the pointer is on
    glow.setAttribute("cx", (78.15 + x * 16).toFixed(2));
    glow.setAttribute("cy", (11.85 + y * 16).toFixed(2));
    glint.setAttribute("opacity", (lit * 0.85).toFixed(3));

    const settled =
      !on && Math.abs(x) < 0.001 && Math.abs(y) < 0.001 && lit < 0.005;
    raf = settled ? 0 : requestAnimationFrame(frame);
  };

  area.addEventListener("pointermove", move);
  area.addEventListener("pointerleave", leave);
  return () => {
    cancelAnimationFrame(raf);
    area.removeEventListener("pointermove", move);
    area.removeEventListener("pointerleave", leave);
  };
}
