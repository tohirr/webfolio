/* /keycaps/ — the workbench: one cap in a viewport, every control in an
   inspector down the right, the way a model editor lays itself out. the
   same module the work row runs, mounted in its editor mode. */

import "../index.css";
import "./keycaps.css";
import { mount } from "../lab/keycaps.js";

const app = document.getElementById("keycaps");
app.innerHTML =
  '<header class="kp-top">' +
  '<a class="kp-back" href="/">← tohirr</a>' +
  '<span class="kp-title"><b>keycaps</b> · text set as keycaps</span>' +
  "</header>" +
  '<div class="kp-piece"></div>';

mount(app.querySelector(".kp-piece"), { editor: true });
