/* neofetch-style identity block: pixelated portrait left, system info
   right. the portrait rests as a coarse mosaic and resolves on hover in
   stepped frames — no tweening, resolution by resolution. the source is
   the pixel avatar (favicon.svg); a square portrait.png in public/ takes
   precedence if one ever appears. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const SIZE = 96; // canvas css pixels, square
const PHOTO_STEPS = [8, 12, 16, 24, 48, 96]; // mosaic resolutions, coarse → sharp
const AVATAR_STEPS = [8, 12, 16, 24]; // the avatar is 24×24 — stop at native
const STEP_MS = 70; // per resolution step

// fallback: 16×16 guest sprite in theme colors (# fg · o dim · s green)
const SPRITE = [
  "................",
  "....########....",
  "...##########...",
  "..############..",
  "..##oooooooo##..",
  "..#oooooooooo#..",
  "..#oo##oo##oo#..",
  "..#oooooooooo#..",
  "..#ooo####ooo#..",
  "..##oooooooo##..",
  "...##oooooo##...",
  "....########....",
  "......ssss......",
  "..ssssssssssss..",
  ".ssssssssssssss.",
  "................",
];
const SPRITE_INK = { "#": "--fg", o: "--dim", s: "--green" };

const INFO = [
  ["role", "design engineer"],
  ["craft", "interfaces · motion · pixels"],
  ["stack", "typescript · css · three.js"],
  ["work", "3d web · us startup · remote"],
  ["shell", "/bin/zsh"],
];

function drawSprite(ctx) {
  const cell = SIZE / SPRITE.length;
  const styles = getComputedStyle(document.documentElement);
  ctx.clearRect(0, 0, SIZE, SIZE);
  SPRITE.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const token = SPRITE_INK[ch];
      if (!token) return;
      ctx.fillStyle = styles.getPropertyValue(token).trim() || "#888";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }),
  );
}

export function buildFetch() {
  const frag = document.createDocumentFragment();
  const wrap = document.createElement("div");
  wrap.className = "fetch";
  frag.appendChild(wrap);

  const canvas = document.createElement("canvas");
  canvas.className = "fetch-img";
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.setAttribute("aria-label", "pixelated portrait of tohirr");
  wrap.appendChild(canvas);

  const theme = document.documentElement.getAttribute("data-theme") || "default";
  const info = document.createElement("div");
  info.className = "fetch-info";
  info.innerHTML =
    '<p><span class="fetch-name">tohirr</span><span class="dim">@</span>' +
    '<span class="fetch-name">tohirOS</span>\n' +
    '<span class="dim">--------------</span>\n' +
    INFO.map(
      ([k, v]) => `<span class="fetch-key">${k.padEnd(8)}</span>${v}`,
    ).join("\n") +
    `\n<span class="fetch-key">${"theme".padEnd(8)}</span>${theme}</p>`;
  wrap.appendChild(info);

  const ctx = canvas.getContext("2d");
  const off = document.createElement("canvas");
  const img = new Image();
  let steps = PHOTO_STEPS;
  let usingAvatar = false;
  let loaded = false;
  let idx = 0;
  let targetIdx = 0;
  let timer = null;

  const drawMosaic = (n) => {
    // center-crop to square, average down to n×n, blow back up unsmoothed
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - s) / 2;
    const sy = (img.naturalHeight - s) / 2;
    off.width = n;
    off.height = n;
    const octx = off.getContext("2d");
    octx.imageSmoothingEnabled = true;
    octx.drawImage(img, sx, sy, s, s, 0, 0, n, n);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(off, 0, 0, n, n, 0, 0, SIZE, SIZE);
  };

  const tick = () => {
    timer = null;
    if (idx === targetIdx) return;
    idx += Math.sign(targetIdx - idx);
    drawMosaic(steps[idx]);
    if (idx !== targetIdx) timer = setTimeout(tick, STEP_MS);
  };

  const go = (t) => {
    if (!loaded) return;
    targetIdx = t;
    if (reduceMotion) {
      if (timer) clearTimeout(timer);
      timer = null;
      idx = t;
      drawMosaic(steps[idx]);
      return;
    }
    if (!timer) timer = setTimeout(tick, STEP_MS);
  };

  canvas.addEventListener("pointerenter", () => go(steps.length - 1));
  canvas.addEventListener("pointerleave", () => go(0));

  img.onload = () => {
    loaded = true;
    steps = usingAvatar ? AVATAR_STEPS : PHOTO_STEPS;
    drawMosaic(steps[0]);
  };
  img.onerror = () => {
    if (!usingAvatar) {
      usingAvatar = true;
      img.src = "/favicon.svg";
      return;
    }
    drawSprite(ctx);
  };
  img.src = "/portrait.png";

  return frag;
}
