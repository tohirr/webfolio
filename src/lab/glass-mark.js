/* lab/glass-mark — the bookmarx mark as a slab of glass. it rocks gently
   on its own; under the pointer it tilts toward it and the light slides
   across the surface; hovering the cell fills the glass with the app's
   blue, the way saving a post fills the bookmark. the blue pours in from
   wherever the cursor came in, and drains out toward wherever it left.
   on a phone there is no cursor, so the row does it: the glass fills
   from its leading edge as the cell slides toward the middle of the
   screen, and drains as it slides away. plain svg layers and css
   transforms — no webgl. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const BM =
  "M24 26 Q24 14 36 14 L64 14 Q76 14 76 26 L76 82 Q76 88.5 70.5 85.2 " +
  "L53 71.5 Q50 69 47 71.5 L29.5 85.2 Q24 88.5 24 82 Z";

export function mount(el) {
  el.innerHTML =
    `<style>
.gm-wrap{width:46%;aspect-ratio:1;perspective:520px;transition:transform .55s cubic-bezier(.34,1.56,.64,1)}
.gm-wrap.is-hover{transform:scale(1.08)}
.gm{width:100%;height:100%;transform-style:preserve-3d;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));will-change:transform}
.gm svg{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(0 12px 16px rgba(0,0,0,.35));transition:filter .4s ease}
.is-hover .gm svg{filter:drop-shadow(0 18px 26px rgba(29,155,240,.35))}
.gm-edge{transform:translate(var(--ex,0px),var(--ey,3px))}
.gm-spec{transform:translate(var(--sx,0px),var(--sy,0px));transition:opacity .3s ease}
.is-hover .gm-spec{opacity:.8}
</style>` +
    '<div class="gm-wrap"><div class="gm"><svg viewBox="0 0 100 100" role="img" aria-label="bookmarx">' +
    "<defs>" +
    '<linearGradient id="gm-blue" x1="0" y1="0" x2=".85" y2="1">' +
    '<stop offset="0" stop-color="#7cc8fd"/><stop offset=".55" stop-color="#1d9bf0"/>' +
    '<stop offset="1" stop-color="#0f6ba8"/></linearGradient>' +
    '<linearGradient id="gm-edge" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".05"/>' +
    '<stop offset="1" stop-color="#fff" stop-opacity=".28"/></linearGradient>' +
    '<linearGradient id="gm-rim" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".95"/>' +
    '<stop offset=".45" stop-color="#fff" stop-opacity=".08"/>' +
    '<stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient>' +
    '<radialGradient id="gm-spec" cx=".5" cy=".5" r=".5">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".9"/>' +
    '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    `<clipPath id="gm-clip"><path d="${BM}"/></clipPath>` +
    /* the pour: a circle that grows from a point to cover the mark */
    '<clipPath id="gm-pour"><circle cx="50" cy="90" r="0"/></clipPath>' +
    "</defs>" +
    /* back to front: the slab's thickness, the clear glass, the blue that
       fills it, the frost sitting on top, the light, the rim */
    `<path class="gm-edge" d="${BM}" fill="url(#gm-edge)"/>` +
    `<path d="${BM}" fill="url(#gm-blue)" opacity=".1"/>` +
    `<path d="${BM}" fill="#fff" opacity=".06"/>` +
    `<path class="gm-fill" d="${BM}" fill="url(#gm-blue)" clip-path="url(#gm-pour)"/>` +
    `<path d="${BM}" fill="#fff" opacity=".07"/>` +
    '<g clip-path="url(#gm-clip)">' +
    '<ellipse class="gm-spec" cx="37" cy="29" rx="19" ry="13" fill="url(#gm-spec)" opacity=".38"/>' +
    "</g>" +
    `<path d="${BM}" fill="none" stroke="url(#gm-rim)" stroke-width="1.5"/>` +
    "</svg></div></div>";

  const wrap = el.querySelector(".gm-wrap");
  const slab = el.querySelector(".gm");
  const svg = el.querySelector("svg");
  const pour = el.querySelector("#gm-pour circle");

  let hover = false;
  let tx = 0, ty = 0; // where the tilt wants to be
  let rx = 0, ry = 0; // where it is

  /* the pour, in the mark's own units: a circle at (ox, oy) of radius
     pr, chasing a target. FULL covers the mark from any point on it */
  const FULL = 100;
  let ox = 50, oy = 90, pr = 0;
  let tox = 50, toy = 90, tpr = 0;
  const setPour = () => {
    pour.setAttribute("cx", ox.toFixed(2));
    pour.setAttribute("cy", oy.toFixed(2));
    pour.setAttribute("r", Math.max(0, pr).toFixed(2));
  };

  /* where the blue pours from: a point in the mark's own units, clamped
     to just outside it */
  const pourFrom = (clientX, clientY) => {
    const r = svg.getBoundingClientRect();
    tox = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    toy = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
  };

  const fine = (e) => e.pointerType === "mouse" || e.pointerType === "pen";
  el.addEventListener("pointermove", (e) => {
    if (!fine(e)) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tx = -py * 26;
    ty = px * 30;
  });
  el.addEventListener("pointerenter", (e) => {
    if (!fine(e)) return;
    hover = true;
    // the circle starts where the cursor came in and grows from there
    pourFrom(e.clientX, e.clientY);
    if (pr < 1) {
      ox = tox;
      oy = toy;
    }
    tpr = FULL;
    wrap.classList.add("is-hover");
  });
  el.addEventListener("pointerleave", (e) => {
    hover = false;
    // and shrinks toward where it went out
    if (fine(e)) pourFrom(e.clientX, e.clientY);
    tpr = 0;
    wrap.classList.remove("is-hover");
  });
  el.addEventListener("focus", () => {
    tpr = FULL;
    wrap.classList.add("is-hover");
  });
  el.addEventListener("blur", () => {
    tpr = 0;
    wrap.classList.remove("is-hover");
  });

  /* ---- a phone: the row fills it ------------------------------------- */
  const coarse = matchMedia("(pointer: coarse)").matches;
  const scroller = el.closest(".blocks");
  let scrollTilt = false;
  const onScroll = () => {
    const r = el.getBoundingClientRect();
    const u = (r.left + r.width / 2 - innerWidth / 2) / innerWidth; // -0.5 … 0.5 across the screen
    // full in the middle third of the screen, empty by the edges; it
    // pours from the edge nearest the middle of the screen
    const amount = Math.max(0, Math.min(1, 1 - (Math.abs(u) - 0.12) / 0.3));
    tox = ox = u > 0 ? 20 : 80;
    toy = oy = 50;
    tpr = amount * FULL;
    wrap.classList.toggle("is-hover", amount > 0.9);
    // and it leans with the slide
    scrollTilt = true;
    ty = -u * 40;
    tx = 0;
  };
  if (coarse && scroller) {
    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (reduceMotion) {
    // no rock, no chase: the pour lands where it is put
    const settle = () => {
      ox = tox;
      oy = toy;
      pr = tpr;
      setPour();
    };
    for (const t of ["pointerenter", "pointerleave", "focus", "blur"]) el.addEventListener(t, settle);
    scroller?.addEventListener("scroll", settle, { passive: true });
    settle();
    return () => {
      scroller?.removeEventListener("scroll", onScroll);
      scroller?.removeEventListener("scroll", settle);
    };
  }

  const apply = () => {
    slab.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    slab.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    // the light sits opposite the tilt; the slab's thickness shows on the far side
    slab.style.setProperty("--sx", `${(ry * 0.7).toFixed(2)}px`);
    slab.style.setProperty("--sy", `${(-rx * 0.5).toFixed(2)}px`);
    slab.style.setProperty("--ex", `${(-ry * 0.12).toFixed(2)}px`);
    slab.style.setProperty("--ey", `${(3 + rx * 0.12).toFixed(2)}px`);
  };

  let raf = 0;
  const frame = (t) => {
    if (!hover && !scrollTilt) {
      // the idle rock: slow, small, never quite repeating
      tx = Math.sin(t * 0.00055) * 4;
      ty = Math.sin(t * 0.0004 + 1.3) * 9;
    }
    // the lean from a slide gives way to the rock once it has settled
    if (scrollTilt && Math.abs(ty - ry) < 0.3) scrollTilt = false;
    const k = hover ? 0.12 : 0.04;
    rx += (tx - rx) * k;
    ry += (ty - ry) * k;
    // the pour: quick in, quicker out, sliding toward its target point
    const kp = tpr > pr ? 0.16 : 0.22;
    pr += (tpr - pr) * kp;
    ox += (tox - ox) * kp;
    oy += (toy - oy) * kp;
    if (Math.abs(tpr - pr) < 0.05) pr = tpr;
    setPour();
    apply();
    raf = requestAnimationFrame(frame);
  };

  /* only spin the loop while the tile is on screen */
  const io = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    if (e.isIntersecting) raf = requestAnimationFrame(frame);
  });
  io.observe(el);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    scroller?.removeEventListener("scroll", onScroll);
  };
}
