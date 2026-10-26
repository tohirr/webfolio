/* /glass-logo/ — the glass logo as a component page of its own. the page
   lives in src/lab/glass-studio.js so a tile or the capture route can
   mount it too. */

import { mount } from "../lab/glass-studio.js";

mount(document.getElementById("glass-logo"));
