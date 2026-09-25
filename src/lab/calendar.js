/* lab/calendar — apple's calendar widget with one thing added: while an event
   is running its block drains and counts down, so a glance answers the only
   question you actually have mid-meeting. a concept, not a shipped thing.

   the piece is the comparison — the widget as it ships next to the concept —
   so the cell is a landscape one with the two side by side. each widget is
   its own png from figma at 4x, light and dark, and follows the theme. */

const WIDGETS = [
  {
    name: "event",
    alt: "the calendar widget as it ships: the day, and the event's name, place and times",
  },
  {
    name: "live",
    alt: "the concept: the running event's block fills as it goes and says 30 min left",
  },
];

const src = (name, theme) => `/media/calendar/${name}-${theme}.png`;

const widget = ({ name, alt }) =>
  `<picture class="cw-w">` +
  `<source media="(prefers-color-scheme: dark)" srcset="${src(name, "dark")}" />` +
  `<img src="${src(name, "light")}" alt="${alt}" width="659" height="659" decoding="async" draggable="false" />` +
  `</picture>`;

export function mount(el) {
  el.innerHTML =
    `<style>
      .cw { width: 100%; height: 100%; display: flex; align-items: center;
            justify-content: center; gap: 5%; }
      .cw-w { display: block; height: 58%; aspect-ratio: 1; }
      .cw-w img { display: block; width: 100%; height: 100%;
                  user-select: none; -webkit-user-drag: none; }
    </style>` +
    `<div class="cw">${WIDGETS.map(widget).join("")}</div>`;

  return () => {
    el.innerHTML = "";
  };
}
