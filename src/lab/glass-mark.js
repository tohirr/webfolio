/* lab/glass-mark — the bookmarx mark as a pane of blue-tinted glass. it
   rocks gently on its own and tilts toward the pointer; on a phone it
   leans with the row as it slides past. a flat translucent fill, a thin
   rim, a soft shadow — nothing else. plain svg and css transforms. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const BM =
  "M24 26 Q24 14 36 14 L64 14 Q76 14 76 26 L76 82 Q76 88.5 70.5 85.2 " +
  "L53 71.5 Q50 69 47 71.5 L29.5 85.2 Q24 88.5 24 82 Z";

export function mount(el) {
  el.innerHTML =
    `<style>
.gm-wrap{width:46%;aspect-ratio:1;perspective:520px}
.gm{width:100%;height:100%;transform-style:preserve-3d;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));will-change:transform}
.gm svg{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(0 12px 16px rgba(0,0,0,.3))}
.gm-edge{transform:translate(var(--ex,0px),var(--ey,3px))}
</style>` +
    '<div class="gm-wrap"><div class="gm"><svg viewBox="0 0 100 100" role="img" aria-label="bookmarx">' +
    /* back to front: the pane's thickness, the tinted glass, the rim */
    `<path class="gm-edge" d="${BM}" fill="#1d9bf0" opacity=".22"/>` +
    `<path d="${BM}" fill="#1d9bf0" opacity=".42"/>` +
    `<path d="${BM}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>` +
    "</svg></div></div>";

  const slab = el.querySelector(".gm");

  let hover = false;
  let tx = 0, ty = 0; // where the tilt wants to be
  let rx = 0, ry = 0; // where it is

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
    if (fine(e)) hover = true;
  });
  el.addEventListener("pointerleave", () => {
    hover = false;
  });

  /* ---- a phone: the pane leans with the slide -------------------------- */
  const coarse = matchMedia("(pointer: coarse)").matches;
  const scroller = el.closest(".blocks");
  let scrollTilt = false;
  const onScroll = () => {
    const r = el.getBoundingClientRect();
    const u = (r.left + r.width / 2 - innerWidth / 2) / innerWidth; // -0.5 … 0.5 across the screen
    scrollTilt = true;
    ty = -u * 40;
    tx = 0;
  };
  if (coarse && scroller) {
    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (reduceMotion) {
    return () => scroller?.removeEventListener("scroll", onScroll);
  }

  const apply = () => {
    slab.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    slab.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    // the pane's thickness shows on the far side of the tilt
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
