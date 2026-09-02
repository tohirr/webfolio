/* lab/scramble-hover — labels decode out of terminal noise, locking in
   one character at a time from the left. hover (or focus) to run it. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const NOISE = "█▓▒░<>/\\|=+*·";
const ITEMS = [
  "design engineer",
  "micro interactions",
  "pixels on purpose",
  "terminal native",
];
const LOCK_MS_PER_CHAR = 45; // decode speed

const rand = () => NOISE[Math.floor(Math.random() * NOISE.length)];

export function mount(el) {
  el.innerHTML =
    `<style>
.sc-stage{display:flex;flex-direction:column;gap:.6em}
.sc-item{background:none;border:0;font:inherit;text-align:left;padding:0;cursor:default;width:max-content;color:var(--fg)}
.sc-item .sc-noise{color:var(--dim)}
.sc-cap{color:var(--dim);margin:1.6em 0 0}
</style>` +
    '<div class="sc-stage">' +
    ITEMS.map(
      (t) =>
        `<button class="sc-item"><span class="sc-locked">${t}</span>` +
        '<span class="sc-noise" aria-hidden="true"></span></button>',
    ).join("") +
    "</div>" +
    '<p class="sc-cap">hover a line — it decodes left to right.</p>';

  const running = new Set();
  const handles = new Map();

  const play = (btn, text) => {
    if (reduceMotion || running.has(btn)) return;
    running.add(btn);
    const locked = btn.querySelector(".sc-locked");
    const noise = btn.querySelector(".sc-noise");
    const t0 = performance.now();
    const frame = (t) => {
      if (!running.has(btn)) return;
      const n = Math.min(text.length, Math.floor((t - t0) / LOCK_MS_PER_CHAR));
      locked.textContent = text.slice(0, n);
      noise.textContent = [...text.slice(n)]
        .map((c) => (c === " " ? " " : rand()))
        .join("");
      if (n < text.length) {
        handles.set(btn, requestAnimationFrame(frame));
      } else {
        running.delete(btn);
        handles.delete(btn);
      }
    };
    handles.set(btn, requestAnimationFrame(frame));
  };

  const stop = (btn, text) => {
    running.delete(btn);
    const h = handles.get(btn);
    if (h) cancelAnimationFrame(h);
    handles.delete(btn);
    btn.querySelector(".sc-locked").textContent = text;
    btn.querySelector(".sc-noise").textContent = "";
  };

  [...el.querySelectorAll(".sc-item")].forEach((btn, i) => {
    const text = ITEMS[i];
    btn.addEventListener("pointerenter", () => play(btn, text));
    btn.addEventListener("focus", () => play(btn, text));
    btn.addEventListener("pointerleave", () => stop(btn, text));
    btn.addEventListener("blur", () => stop(btn, text));
  });

  return () => {
    for (const h of handles.values()) cancelAnimationFrame(h);
    running.clear();
  };
}
