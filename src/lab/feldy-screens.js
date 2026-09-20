/* lab/feldy-screens — feldy's store screens, cropped to the phone. the
   cell shows one, still, the phone rising from the bottom edge the way it
   does in the listing. the drawer's stage shows the set, one at a time
   under your hand: the arrows, the dots, the arrow keys, or a swipe. */

const SCREENS = [
  { src: "/media/feldy/03.jpg", cap: "photos & videos — every job files itself" },
  { src: "/media/feldy/02.jpg", cap: "job walkthroughs — talk while you shoot, it takes notes" },
  { src: "/media/feldy/01.jpg", cap: "ai estimate — built from what happened on site" },
  { src: "/media/feldy/04.jpg", cap: "3d modelling — scan a roof, get a model to quote from" },
  { src: "/media/feldy/05.jpg", cap: "proposals — a document for the customer" },
];
const W = 900, H = 1262; // the crops' pixels, for the layout

const ARROW =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M6 3l5 5-5 5"/></svg>';

export function mount(el) {
  /* in the cell the whole tile is a link, so nothing stands inside it but
     the first screen. in the drawer's stage the set comes out with controls */
  const quiet = !!el.closest(".tile");
  const list = quiet ? SCREENS.slice(0, 1) : SCREENS;

  el.innerHTML =
    `<style>
      .fs-stage { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; gap: 14px; outline: none; }
      .fs-pics { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--tile); }
      .fs-pic { display: none; width: 100%; height: 100%; object-fit: cover; object-position: 50% 0; user-select: none; -webkit-user-drag: none; }
      .fs-pic.on { display: block; }
      .fs-row { display: flex; align-items: center; gap: 14px; }
      .fs-dots { display: flex; gap: 7px; }
      .fs-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--dim); border: 0; padding: 0; cursor: pointer; opacity: 0.55; }
      .fs-dot.on { background: var(--ink); opacity: 1; }
      .fs-arrow { width: 34px; height: 34px; border-radius: 50%; border: 0; padding: 0; display: grid; place-items: center;
                  color: var(--ink); background: color-mix(in srgb, var(--ink) 7%, transparent); cursor: pointer; transition: background 0.15s ease; }
      .fs-arrow:hover, .fs-arrow:focus-visible { background: color-mix(in srgb, var(--ink) 13%, transparent); }
      .fs-prev svg { transform: scaleX(-1); }
      .fs-cap { margin: 0; color: var(--dim); text-align: center; min-height: 1.6em; }
    </style>` +
    `<div class="fs-stage" role="group" aria-roledescription="carousel" aria-label="feldy app screens"` +
    (quiet ? "" : ' tabindex="0"') +
    `><div class="fs-pics">` +
    list
      .map(
        (s, i) =>
          `<img class="fs-pic${i ? "" : " on"}" src="${s.src}" alt="${s.cap}" width="${W}" height="${H}"` +
          ` decoding="async"${i ? ' loading="lazy"' : ""} draggable="false" />`,
      )
      .join("") +
    `</div>` +
    (quiet
      ? ""
      : `<div class="fs-row" data-act>` +
        `<button class="fs-arrow fs-prev" type="button" aria-label="previous screen">${ARROW}</button>` +
        `<div class="fs-dots">` +
        list.map((s, i) => `<button class="fs-dot${i ? "" : " on"}" type="button" aria-label="${s.cap}"></button>`).join("") +
        `</div>` +
        `<button class="fs-arrow fs-next" type="button" aria-label="next screen">${ARROW}</button>` +
        `</div>` +
        `<p class="fs-cap" aria-live="polite">${list[0].cap}</p>`);

  if (quiet) return () => (el.innerHTML = "");

  const stage = el.querySelector(".fs-stage");
  const pics = [...el.querySelectorAll(".fs-pic")];
  const dots = [...el.querySelectorAll(".fs-dot")];
  const cap = el.querySelector(".fs-cap");
  let at = 0;

  const show = (i) => {
    at = (i + list.length) % list.length;
    pics.forEach((p, k) => p.classList.toggle("on", k === at));
    dots.forEach((d, k) => d.classList.toggle("on", k === at));
    cap.textContent = list[at].cap;
  };
  el.querySelector(".fs-prev").addEventListener("click", () => show(at - 1));
  el.querySelector(".fs-next").addEventListener("click", () => show(at + 1));
  dots.forEach((d, k) => d.addEventListener("click", () => show(k)));
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(at - 1);
    else if (e.key === "ArrowRight") show(at + 1);
    else return;
    e.preventDefault();
  });
  /* a swipe across the picture turns it too */
  const strip = el.querySelector(".fs-pics");
  let x0 = null;
  strip.style.touchAction = "pan-y";
  strip.addEventListener("pointerdown", (e) => (x0 = e.clientX));
  strip.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 36) show(dx < 0 ? at + 1 : at - 1);
  });
  strip.addEventListener("pointercancel", () => (x0 = null));

  return () => {
    el.innerHTML = "";
  };
}
