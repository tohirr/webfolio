/* lab/city-board — a dot-matrix world clock. it shows four cities at a
   time and turns the page every few seconds: every cell, blanks included,
   scrambles in a wave from the top left to the bottom right and lands on
   the next four; only the colon holds still. a click (or tap)
   turns the page right away. every flip ticks. times are real. */

import { createBoard } from "./board/board.js";
import { audio, output, soundOn, wakeAudio } from "./audio.js";

const CITIES = [
  ["LAGOS", "Africa/Lagos"],
  ["LONDON", "Europe/London"],
  ["NEW YORK", "America/New_York"],
  ["TOKYO", "Asia/Tokyo"],
  ["DUBAI", "Asia/Dubai"],
  ["PARIS", "Europe/Paris"],
  ["SEOUL", "Asia/Seoul"],
  ["NAIROBI", "Africa/Nairobi"],
  ["BERLIN", "Europe/Berlin"],
  ["SYDNEY", "Australia/Sydney"],
  ["LA", "America/Los_Angeles"],
  ["DELHI", "Asia/Kolkata"],
  ["ACCRA", "Africa/Accra"],
];
const ROWS = 4;
const TURN = 5000; // ms a page stays up
const COLS = 14; // "HH:MM" + gap + up to 8 letters (NEW YORK)
// the wave's timing
const WAVE = { stagger: 0.04, rowLag: 2, flips: 9, flipRate: 0.05 };

/* the sound of a turn: a dry tick for every flip, like a tiny relay. each
   tick is a few milliseconds of band-passed noise, fired by the board the
   moment a cell flips, so the clatter rides the wave and pans with it, left
   to right. a cell landing on its letter ticks lower and firmer. ticks are
   capped at one per TICK_GAP so a full page rattles instead of hissing.
   played into the page's shared output, so the nav's sound button covers
   it; until a tap has woken the audio, the auto turns stay silent */
const TICK_GAP = 0.014; // s, the tightest two ticks may sit
let noise = null; // one short white-noise buffer, reused by every tick

function tick(ac, { land, pan }) {
  if (!noise) {
    noise = ac.createBuffer(1, Math.round(ac.sampleRate * 0.05), ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const at = ac.currentTime + 0.005;
  const len = land ? 0.009 : 0.004;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = land ? 1700 + Math.random() * 300 : 3200 + Math.random() * 1800;
  bp.Q.value = land ? 2.2 : 1.4;
  const g = ac.createGain();
  const p = ac.createStereoPanner();
  p.pan.value = pan;
  const peak = (land ? 0.55 : 0.28) * (0.75 + Math.random() * 0.5);
  g.gain.setValueAtTime(peak, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + len);
  src.connect(bp).connect(g).connect(p).connect(output());
  src.start(at, Math.random() * 0.04, len + 0.005);
}

function ticker() {
  let last = 0;
  return (col, row, landed) => {
    if (!soundOn()) return;
    const ac = audio();
    if (!ac || ac.state !== "running") return; // no gesture yet: stay quiet, don't queue
    const now = ac.currentTime;
    if (now - last < (landed ? TICK_GAP * 0.6 : TICK_GAP)) return;
    last = now;
    tick(ac, { land: landed, pan: -0.6 + (1.2 * col) / (COLS - 1) });
  };
}

const time = (tz) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(
    new Date(),
  );

export function mount(el) {
  el.innerHTML = `<style>
.cb-wrap{width:84%;max-width:560px;cursor:pointer;-webkit-tap-highlight-color:transparent}
</style><div class="cb-wrap"></div>`;
  const wrap = el.querySelector(".cb-wrap");
  const board = createBoard(wrap, {
    cols: COLS,
    ...WAVE,
    rows: ROWS,
    voids: [5],
    still: [2], // the colon holds; every other cell flips with the wave
    onFlip: ticker(),
    grid: "color-mix(in srgb, var(--ink) 9%, var(--tile))",
  });

  // the board shows a page of ROWS cities; each turn moves to the next
  // ROWS on the list, wrapping, so every city comes round
  let page = 0;
  const cities = () => Array.from({ length: ROWS }, (_, r) => CITIES[(page + r) % CITIES.length]);
  const render = (all = false) => board.set(cities().map(([name, tz]) => `${time(tz)} ${name}`), { all });
  render(true); // the first page arrives the same way, as a full wave

  // a turn flips every cell, blanks included, as one diagonal wave
  const turn = () => {
    page = (page + ROWS) % CITIES.length;
    render(true);
  };

  // only tick while the cell is on screen
  let turnT = 0;
  let clockT = 0;
  const start = () => {
    if (turnT) return;
    render();
    turnT = setInterval(turn, TURN);
    clockT = setInterval(() => render(), 10_000); // minute ticks flip just the digits
  };
  const stop = () => {
    clearInterval(turnT);
    clearInterval(clockT);
    turnT = clockT = 0;
  };
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
  io.observe(el);

  // a click turns the page now, and the timer restarts from it
  const onClick = () => {
    wakeAudio(); // a tap is what lets the ticks play, for this turn and the auto ones
    turn();
    if (turnT) {
      clearInterval(turnT);
      turnT = setInterval(turn, TURN);
    }
  };
  wrap.addEventListener("click", onClick);

  return () => {
    stop();
    io.disconnect();
    wrap.removeEventListener("click", onClick);
    board.destroy();
  };
}
