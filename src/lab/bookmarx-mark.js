/* lab/bookmarx-mark — in the cell, the bookmarx icon as the app ships it
   (bookmarx's src/app/icon.svg): the bookmark lit from the top-left shoulder
   in the brand's three blues. in the drawer, the space itself — the top of
   the demo library's front page, captured from bookmarx.space. */

const BM =
  "M24 26 Q24 14 36 14 L64 14 Q76 14 76 26 L76 82 Q76 88.5 70.5 85.2 " +
  "L53 71.5 Q50 69 47 71.5 L29.5 85.2 Q24 88.5 24 82 Z";

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
    `<clipPath id="bmx-clip-${n}"><path d="${BM}"/></clipPath>` +
    "</defs>" +
    `<path d="${BM}" fill="url(#bmx-sheen-${n})"/>` +
    `<path d="${BM}" fill="none" stroke="url(#bmx-rim-${n})" stroke-width="1.4" ` +
    `stroke-linejoin="round" clip-path="url(#bmx-clip-${n})"/>` +
    "</svg></div>"
  );
};

export function mount(el) {
  const inCell = !!el.closest(".tile");

  el.innerHTML =
    `<style>
      .bmx { width: 46%; aspect-ratio: 1; display: grid; place-items: center; margin: auto; }
      .bmx svg { width: 100%; height: 100%; display: block; }
      .bmx-space { display: block; background: #0a0a0a; overflow: hidden; }
      .bmx-space img { display: block; width: 100%; height: 100%; user-select: none; -webkit-user-drag: none; }
    </style>` +
    (inCell
      ? icon()
      : `<picture class="bmx-space"><img src="${SPACE.src}" alt="${ALT}" ` +
        `width="${SPACE.w}" height="${SPACE.h}" decoding="async" draggable="false" /></picture>`);

  return () => {
    el.innerHTML = "";
  };
}
