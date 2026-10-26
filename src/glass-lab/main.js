/* /glass-lab/ — the glass lab as a page of its own. the tool lives in
   src/lab/glass-lab.js so the capture route can mount it too. */

import { mount } from "../lab/glass-lab.js";

mount(document.getElementById("glass-lab"));
