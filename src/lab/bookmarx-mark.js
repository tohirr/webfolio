/* lab/bookmarx-mark — the bookmarx icon, as the app ships it (bookmarx's
   src/app/icon.svg): the bookmark lit from the top-left shoulder in the
   brand's three blues. the cell is only the mark; the story is a tap away. */

const BM =
  "M24 26 Q24 14 36 14 L64 14 Q76 14 76 26 L76 82 Q76 88.5 70.5 85.2 " +
  "L53 71.5 Q50 69 47 71.5 L29.5 85.2 Q24 88.5 24 82 Z";

/* the cell and the drawer's stage can both be up at once, so each mount
   names its own gradient */
let seq = 0;

export function mount(el) {
  const id = `bmx-sheen-${++seq}`;
  el.innerHTML =
    `<style>
      .bmx { width: 46%; aspect-ratio: 1; display: grid; place-items: center; margin: auto; }
      .bmx svg { width: 100%; height: 100%; display: block; }
    </style>` +
    '<div class="bmx"><svg viewBox="0 0 100 100" role="img" aria-label="bookmarx">' +
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0.85" y2="1">` +
    '<stop offset="0" stop-color="#7cc8fd"/>' +
    '<stop offset="0.55" stop-color="#1d9bf0"/>' +
    '<stop offset="1" stop-color="#0f6ba8"/>' +
    "</linearGradient></defs>" +
    `<path d="${BM}" fill="url(#${id})"/>` +
    "</svg></div>";

  return () => {
    el.innerHTML = "";
  };
}
