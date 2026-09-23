/* lab/calendar — apple's calendar widget with one thing added: while an event
   is running its block drains and counts down, so a glance answers the only
   question you actually have mid-meeting. a concept, not a shipped thing.

   the piece is the comparison — the widget as it ships next to the concept —
   so the cell is a landscape one and the picture is the whole of it. */

const FRAME = { w: 1846, h: 1092 };
const LIGHT = "/media/calendar/full.png";
const DARK = null; // a dark render goes here and the picture starts switching
const PAPER = "#e5e5e5"; // the figma frame's own ground, under it while it loads

const ALT =
  "the calendar widget twice: as it ships, and a concept where a running " +
  "event fills its block and counts down the minutes left";

export function mount(el) {
  const quiet = !!el.closest(".tile"); // in the cell, nothing but the picture

  el.innerHTML =
    `<style>
      .cw { width: 100%; background: ${PAPER}; overflow: hidden; }
      .cw img { display: block; width: 100%; user-select: none; -webkit-user-drag: none; }
      .cw-cell { height: 100%; }
      .cw-cell img { height: 100%; object-fit: cover; }
      .cw-whole { border-radius: 18px; }
      .cw-whole img { height: auto; }
    </style>` +
    `<picture class="cw ${quiet ? "cw-cell" : "cw-whole"}">` +
    (DARK ? `<source media="(prefers-color-scheme: dark)" srcset="${DARK}" />` : "") +
    `<img src="${LIGHT}" alt="${ALT}" width="${FRAME.w}" height="${FRAME.h}"` +
    ` decoding="async" draggable="false" />` +
    `</picture>`;

  return () => {
    el.innerHTML = "";
  };
}
