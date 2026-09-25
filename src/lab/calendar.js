/* lab/calendar — apple's calendar widget with one thing added: while an event
   is running its block fills and counts down, so a glance answers the only
   question you actually have mid-meeting. a concept, not a shipped thing.

   one widget does both jobs: before the event it is the widget as it ships,
   rule and times, and when the event starts that rule opens into the block
   and fills. it is the built component from calendar-widget.js on a clock
   that runs the day through in a loop: each event waits as the next one,
   then runs, then slides away for the one after it; the day ends empty and
   comes round again. with reduced motion the clock stops at 11:00, the
   frame the figma render shows.

   it starts at the medium size, the next two events under the date and the
   month beside them, which the landscape cell is wide enough to hold, and
   the handle on its corner drags it down to the small one and back. in the
   story it drags on down to the large one, the day as a timeline. */

import { calendarWidget } from "./calendar-widget.js";

const DAY = [
  { title: "Apple Keynote", place: "Online", start: "10:00", end: "11:30" },
  { title: "Product meeting", place: "Video call", start: "15:30", end: "16:00", color: "#5dbf4c" },
];

/* the loop, as legs of [from, to, seconds] in minutes of the day; a leg
   with from equal to to is a hold. each event waits a few seconds as the
   next thing on the calendar before it goes live, and after the last one
   the day ends on its empty state before coming round. the clock jumps the
   dead afternoon between the two */
const LEGS = [
  [9 * 60 + 59, 9 * 60 + 59, 3.5], // the keynote, next
  [9 * 60 + 59.9, 11 * 60 + 30, 24], // the keynote, running
  [11 * 60 + 31, 11 * 60 + 31, 3.5], // the product meeting, next
  [15 * 60 + 29.9, 16 * 60, 14], // the product meeting, running
  [16 * 60 + 1, 16 * 60 + 1, 3], // no more events today
];
const LOOP = LEGS.reduce((n, l) => n + l[2], 0);
const STILL = 11 * 60;

// the minute of the day s seconds into the loop
const at = (s) => {
  for (const [from, to, secs] of LEGS) {
    if (s < secs) return from + (to - from) * (s / secs);
    s -= secs;
  }
  return LEGS[0][0];
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mount(el) {
  el.innerHTML =
    `<div class="cw"><div class="cw-w" role="img" aria-label="the calendar ` +
    `widget: the next event's name, place and times, and once it starts, ` +
    `a block that fills as it runs and says how long is left"></div></div>`;

  // the cell is a fixed shape; the story's stage has room for the large
  // one to grow down into
  const widget = calendarWidget(el.querySelector(".cw-w"), {
    events: DAY,
    large: !el.closest(".tile"),
  });
  const render = (m) => widget.render(m);

  let raf = 0;
  let t0 = 0;
  let seen = true;

  const tick = (t) => {
    raf = 0;
    if (!t0) t0 = t;
    render(at(((t - t0) / 1000) % LOOP));
    if (seen) raf = requestAnimationFrame(tick);
  };

  // the row holds a dozen cells; only the one on screen keeps a clock going
  const io = new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    if (seen && !raf && !reduceMotion) raf = requestAnimationFrame(tick);
  });

  render(reduceMotion ? STILL : at(0));
  if (!reduceMotion) io.observe(el);

  return () => {
    io.disconnect();
    cancelAnimationFrame(raf);
    widget.destroy();
    el.innerHTML = "";
  };
}
