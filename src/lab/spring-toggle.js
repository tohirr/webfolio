/* lab/spring-toggle — one damped spring drives each knob:
   x'' = k(target − x) − c·x'. interrupting mid-flight keeps the current
   velocity, which is the feel a canned easing curve can't fake. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const SPRINGS = [
  { label: "settled", k: 210, c: 26 }, // critically damped — no overshoot
  { label: "bouncy", k: 320, c: 12 },
  { label: "lazy", k: 60, c: 14 },
];

const TRAVEL = 26; // px between off/on knob positions

export function mount(el) {
  el.innerHTML =
    `<style>
.st-stage{display:flex;flex-direction:column;gap:1.4em}
.st-row{display:flex;align-items:center;gap:1em}
.st-toggle{position:relative;width:58px;height:32px;flex:none;border:1px solid var(--dim);border-radius:16px;background:transparent;cursor:pointer;padding:0}
.st-toggle[aria-checked="true"]{border-color:var(--green)}
.st-knob{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:var(--dim)}
.st-toggle[aria-checked="true"] .st-knob{background:var(--green)}
.st-meta{line-height:1.3}
.st-name{display:block}
.st-params{color:var(--dim);font-size:.85em}
.st-cap{color:var(--dim);margin:1.6em 0 0}
</style>` +
    '<div class="st-stage"></div>' +
    '<p class="st-cap">click — then click again mid-flight. velocity carries over.</p>';

  const stage = el.querySelector(".st-stage");
  const springs = [];
  let raf = 0;
  let last = 0;
  let alive = true;

  const draw = (st) => {
    const squash = Math.min(0.18, Math.abs(st.v) * 0.04);
    st.knob.style.transform =
      `translateX(${st.x * TRAVEL}px) scale(${1 + squash}, ${1 - squash})`;
  };

  const step = (t) => {
    raf = 0;
    // clamp dt — a backgrounded tab pauses rAF, and a huge step would
    // launch the spring into orbit
    const dt = Math.min((t - last) / 1000, 0.032);
    last = t;
    let moving = false;
    for (const st of springs) {
      const target = st.on ? 1 : 0;
      st.v += (st.k * (target - st.x) - st.c * st.v) * dt;
      st.x += st.v * dt;
      if (Math.abs(st.v) > 0.001 || Math.abs(target - st.x) > 0.001) {
        moving = true;
      } else {
        st.x = target;
        st.v = 0;
      }
      draw(st);
    }
    if (moving && alive) raf = requestAnimationFrame(step);
  };

  const start = () => {
    if (!raf && alive) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
  };

  for (const s of SPRINGS) {
    const row = document.createElement("div");
    row.className = "st-row";
    row.innerHTML =
      '<button class="st-toggle" role="switch" aria-checked="false">' +
      '<span class="st-knob"></span></button>' +
      `<span class="st-meta"><span class="st-name">${s.label}</span>` +
      `<span class="st-params">k ${s.k} · damping ${s.c}</span></span>`;
    stage.appendChild(row);
    const btn = row.querySelector(".st-toggle");
    const st = {
      on: false,
      x: 0,
      v: 0,
      k: s.k,
      c: s.c,
      knob: row.querySelector(".st-knob"),
    };
    btn.addEventListener("click", () => {
      st.on = !st.on;
      btn.setAttribute("aria-checked", String(st.on));
      if (reduceMotion) {
        st.x = st.on ? 1 : 0;
        st.v = 0;
        draw(st);
        return;
      }
      start();
    });
    springs.push(st);
  }

  return () => {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
  };
}
