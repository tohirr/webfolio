/* lab/elastic-tabs — the indicator's two edges run separate springs.
   the edge facing travel gets the stiff one, so the ink stretches toward
   its destination and the trailing edge snaps in after. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const TABS = ["grid", "sprites", "motion", "sound"];
const LEAD = { k: 420, c: 30 };
const TRAIL = { k: 150, c: 22 };

export function mount(el) {
  el.innerHTML =
    `<style>
.et-tabs{display:flex;gap:.2em;position:relative;border-bottom:1px solid var(--dim);padding-bottom:6px;width:max-content}
.et-tab{background:none;border:0;font:inherit;color:var(--dim);cursor:pointer;padding:.2em .6em}
.et-tab[aria-selected="true"]{color:var(--fg)}
.et-ink{position:absolute;bottom:-1px;height:2px;background:var(--green)}
.et-cap{color:var(--dim);margin:1.6em 0 0}
</style>` +
    '<div class="et-tabs" role="tablist">' +
    TABS.map(
      (t, i) =>
        `<button class="et-tab" role="tab" aria-selected="${i === 0}">${t}</button>`,
    ).join("") +
    '<span class="et-ink"></span></div>' +
    '<p class="et-cap">the leading edge sprints; the trailing edge drags. the stretch is the whole trick.</p>';

  const tabs = [...el.querySelectorAll(".et-tab")];
  const ink = el.querySelector(".et-ink");
  const left = { x: 0, v: 0, k: LEAD.k, c: LEAD.c };
  const right = { x: 0, v: 0, k: LEAD.k, c: LEAD.c };
  let targetL = 0;
  let targetR = 0;
  let raf = 0;
  let last = 0;
  let alive = true;

  const draw = () => {
    ink.style.left = `${left.x}px`;
    ink.style.width = `${Math.max(right.x - left.x, 2)}px`;
  };

  const settle = (s, target, dt) => {
    s.v += (s.k * (target - s.x) - s.c * s.v) * dt;
    s.x += s.v * dt;
    if (Math.abs(s.v) < 0.05 && Math.abs(target - s.x) < 0.05) {
      s.x = target;
      s.v = 0;
      return false;
    }
    return true;
  };

  const step = (t) => {
    raf = 0;
    const dt = Math.min((t - last) / 1000, 0.032);
    last = t;
    const moving = [
      settle(left, targetL, dt),
      settle(right, targetR, dt),
    ].some(Boolean);
    draw();
    if (moving && alive) raf = requestAnimationFrame(step);
  };

  const goTo = (tab) => {
    targetL = tab.offsetLeft;
    targetR = tab.offsetLeft + tab.offsetWidth;
    // reassign edge roles by direction of travel
    const goingRight = targetR > right.x;
    Object.assign(goingRight ? right : left, { k: LEAD.k, c: LEAD.c });
    Object.assign(goingRight ? left : right, { k: TRAIL.k, c: TRAIL.c });
    if (reduceMotion) {
      left.x = targetL;
      right.x = targetR;
      left.v = right.v = 0;
      draw();
      return;
    }
    if (!raf && alive) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      goTo(tab);
    });
  });

  // park the ink under the first tab, no animation
  left.x = targetL = tabs[0].offsetLeft;
  right.x = targetR = tabs[0].offsetLeft + tabs[0].offsetWidth;
  draw();

  return () => {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
  };
}
