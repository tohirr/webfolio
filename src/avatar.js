/* the avatar as a particle field: pixels flee the cursor. inside the
   influence radius the displacement grows as the cursor nears the
   center; backing away lets the spring reassemble the portrait.
   if sampling fails the plain <img> stays put */

const SRC = "/favicon.svg";
const GRID = 24; // the portrait is a 24×24 pixel grid
const PAD = 56; // room around the portrait for the pixels to fly into
const RADIUS = 130; // css px — cursor influence around the avatar center

export function mount(img) {
  if (!img || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const probe = new Image();
  probe.onload = () => {
    const off = document.createElement("canvas");
    off.width = off.height = GRID;
    const octx = off.getContext("2d");
    octx.drawImage(probe, 0, 0, GRID, GRID);
    const data = octx.getImageData(0, 0, GRID, GRID).data;

    const SIZE = img.getBoundingClientRect().width || 52; // css size, from the <img>
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = (SIZE / GRID) * dpr; // one grid cell in device px
    const pad = PAD * dpr;
    const full = (SIZE + PAD * 2) * dpr;

    /* the wrapper keeps the <img>'s layout slot; the canvas hangs over it
       so displaced pixels aren't clipped */
    const wrap = document.createElement("div");
    wrap.className = "avatar-wrap";
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", img.alt);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = full;
    canvas.style.inset = `${-PAD}px`;
    canvas.style.width = canvas.style.height = `${SIZE + PAD * 2}px`;
    wrap.append(canvas);
    const ctx = canvas.getContext("2d");

    const dots = [];
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const i = (gy * GRID + gx) * 4;
        if (data[i + 3] < 128) continue;
        const hx = pad + gx * px;
        const hy = pad + gy * px;
        dots.push({
          hx,
          hy,
          x: hx,
          y: hy,
          vx: 0,
          vy: 0,
          range: (18 + Math.random() * 34) * dpr, // how far this pixel flees
          jitter: (Math.random() - 0.5) * 0.9, // per-pixel angle wobble
          color: `rgb(${data[i]} ${data[i + 1]} ${data[i + 2]})`,
        });
      }
    }
    if (!dots.length) return;

    img.replaceWith(wrap);

    // a hair of overlap hides seams between fractional-sized pixels
    const cell = px + 0.5;

    function draw() {
      ctx.clearRect(0, 0, full, full);
      for (const d of dots) {
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x, d.y, cell, cell);
      }
    }
    draw();

    let raf = 0;
    let strength = 0; // 0..1 — how deep the cursor is inside the radius
    let pulse = 0; // tap fallback for touch screens
    // cursor position in canvas coords; defaults to the center
    let cx = full / 2;
    let cy = full / 2;

    function tick() {
      pulse *= 0.96;
      const s = Math.max(strength, pulse);
      let alive = s > 0.005;

      for (const d of dots) {
        let tx = d.hx;
        let ty = d.hy;
        if (s > 0.005) {
          // flee straight away from the cursor, with a per-pixel twist
          const a = Math.atan2(d.hy - cy, d.hx - cx) + d.jitter;
          tx = d.hx + Math.cos(a) * d.range * s;
          ty = d.hy + Math.sin(a) * d.range * s;
          tx = Math.min(full - cell, Math.max(0, tx));
          ty = Math.min(full - cell, Math.max(0, ty));
        }
        d.vx = (d.vx + (tx - d.x) * 0.09) * 0.84;
        d.vy = (d.vy + (ty - d.y) * 0.09) * 0.84;
        d.x += d.vx;
        d.y += d.vy;
        if (
          Math.abs(tx - d.x) + Math.abs(ty - d.y) > 0.05 ||
          Math.abs(d.vx) + Math.abs(d.vy) > 0.05
        ) {
          alive = true;
        } else if (s <= 0.005) {
          d.x = d.hx;
          d.y = d.hy;
          d.vx = d.vy = 0;
        }
      }
      draw();
      raf = alive ? requestAnimationFrame(tick) : 0;
    }

    function wake() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        const r = wrap.getBoundingClientRect();
        const mx = r.left + r.width / 2;
        const my = r.top + r.height / 2;
        const dist = Math.hypot(e.clientX - mx, e.clientY - my);
        // proportional: 0 at the radius edge, 1 with the cursor dead center
        const t = Math.max(0, 1 - dist / RADIUS);
        strength = t * t; // gentle at the rim, forceful near the middle
        cx = (e.clientX - r.left) * dpr + pad;
        cy = (e.clientY - r.top) * dpr + pad;
        if (strength > 0) wake();
        else if (raf) wake(); // let the spring carry them home
      },
      { passive: true },
    );

    // touch screens have no cursor — a tap bursts, then it drifts home
    wrap.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      pulse = 1;
      cx = full / 2;
      cy = full / 2;
      wake();
    });
  };
  probe.src = SRC;
}
