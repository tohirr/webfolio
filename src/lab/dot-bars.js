/* lab/dot-bars — a bar chart set entirely in braille dots. every braille
   glyph is a 2×4 dot matrix, so the chart is genuinely text: select it,
   copy it, paste it into a readme. bars animate one dot-row per tick —
   quantized motion, no tweening. */

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const LABELS = ["mo", "tu", "we", "th", "fr", "sa", "su"];
const H = 6; // chart height in chars → H*4 dot rows
const TICK_MS = 45; // one dot-row of travel per tick

// braille dot bits by (dot row 0-3): left column, right column
const LEFT_BIT = [0x01, 0x02, 0x04, 0x40];
const RIGHT_BIT = [0x08, 0x10, 0x20, 0x80];

// each bar is 2 chars wide (4 dot columns) with a 1-char gap
function renderChart(dotHeights) {
  const totalRows = H * 4;
  const lines = [];
  for (let cr = 0; cr < H; cr++) {
    let line = "";
    for (let b = 0; b < dotHeights.length; b++) {
      let bits = 0;
      for (let dr = 0; dr < 4; dr++) {
        const globalRow = cr * 4 + dr;
        if (globalRow >= totalRows - dotHeights[b])
          bits |= LEFT_BIT[dr] | RIGHT_BIT[dr];
      }
      const ch = String.fromCharCode(0x2800 + bits);
      line += ch + ch + (b < dotHeights.length - 1 ? "⠀" : "");
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export function mount(el) {
  el.innerHTML =
    `<style>
.db-chart{margin:0;white-space:pre;line-height:1.15;cursor:pointer;width:max-content;user-select:text}
.db-labels{margin:.3em 0 0;white-space:pre;color:var(--dim);width:max-content}
.db-cap{color:var(--dim);margin:1.6em 0 0}
</style>` +
    '<pre class="db-chart" role="img" aria-label="animated bar chart drawn in braille dots"></pre>' +
    `<p class="db-labels">${LABELS.join(" ")}</p>` +
    '<p class="db-cap">click to reroll — one dot-row per frame, no tweening. and select the bars: it’s all just text.</p>';

  const chart = el.querySelector(".db-chart");
  const maxDots = H * 4;
  const bars = LABELS.map(() => ({ h: 0, target: 0 }));
  let timer = null;
  let alive = true;

  const draw = () => {
    chart.textContent = renderChart(bars.map((b) => b.h));
  };

  const tick = () => {
    timer = null;
    let moving = false;
    for (const b of bars) {
      if (b.h !== b.target) {
        b.h += Math.sign(b.target - b.h);
        moving = true;
      }
    }
    draw();
    if (moving && alive) timer = setTimeout(tick, TICK_MS);
  };

  const reroll = () => {
    for (const b of bars)
      b.target = 2 + Math.floor(Math.random() * (maxDots - 2));
    if (reduceMotion) {
      for (const b of bars) b.h = b.target;
      draw();
      return;
    }
    if (!timer && alive) timer = setTimeout(tick, TICK_MS);
  };

  chart.addEventListener("click", reroll);
  draw();
  reroll(); // bars rise in from zero on mount

  return () => {
    alive = false;
    if (timer) clearTimeout(timer);
  };
}
