import "./index.css";

/* ---- data -------------------------------------------------------------- */

const projects = [
  {
    name: "colubrid",
    href: "https://colubrid.tohirr.xyz",
    desc: "snake, but the grid is a cube — a full 3d volume with a free-orbiting camera. three.js · typescript · pwa · redis leaderboard",
  },
  {
    name: "bookmarx",
    href: "https://bookmarx.space",
    desc: "type a vague query, get back the saved x post you meant — hybrid semantic search over your bookmarks. next.js · postgres + pgvector",
  },
  {
    name: "avatarsprite",
    href: null, // not deployed yet — renders as a broken symlink
    desc: "deterministic pixel avatars — type any string, get back the same 16×16 creature forever. typescript · svg · oklch",
  },
  {
    name: "galeria",
    href: "https://galaria.vercel.app/",
    desc: "a curated collection of african art",
  },
];

/* the lab: self-contained interaction pieces, lazy-loaded into a window
   over the terminal. each module exports mount(el) → optional cleanup fn */
const lab = [
  {
    name: "spring-toggle",
    desc: "a toggle driven by a real damped spring — interrupt it mid-flight and it keeps its momentum",
    load: () => import("./lab/spring-toggle.js"),
  },
  {
    name: "elastic-tabs",
    desc: "a tab indicator that stretches toward where it's going — leading edge sprints, trailing edge drags",
    load: () => import("./lab/elastic-tabs.js"),
  },
  {
    name: "scramble-hover",
    desc: "labels that decode out of terminal noise, one locked character at a time",
    load: () => import("./lab/scramble-hover.js"),
  },
];

const links = [
  { name: "github", href: "https://github.com/tohirr" },
  { name: "x", href: "https://x.com/_tohirr" },
  { name: "email", href: "mailto:tohirr.dev@gmail.com" },
  {
    name: "linkedin",
    href: "https://www.linkedin.com/in/tohir-babs-6a0045167/",
  },
];

/* ---- speed dials --------------------------------------------------------
   all the pacing knobs, in one place. tweak to taste. */
const STREAM_TICK_MS = 30; // ms between output chunks (lower = faster)
const STREAM_CHUNK_MIN = 1; // chars revealed per chunk, at least…
const STREAM_CHUNK_EXTRA = 3; // …plus up to this many more, randomly
const KEYSTROKE_MS_MIN = 40; // intro commands: fastest keypress
const KEYSTROKE_MS_JITTER = 45; // extra random per-keypress delay
const CMD_START_DELAY_MS = 650; // pause before a command starts typing
const OUTPUT_DELAY_MS = 380; // pause between command and its output
const BOOT_LINE_MS = 300; // pause between boot lines (chars ride the stream dials)
const BOOT_HOLD_MS = 1000; // hold the finished boot screen before clearing

const stripUrl = (href) => href.replace(/^https?:\/\//, "").replace(/\/$/, "");

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

function browserName() {
  const ua = navigator.userAgent;
  if (/firefox/i.test(ua)) return "firefox";
  if (/edg\//i.test(ua)) return "edge";
  if (/opr|opera/i.test(ua)) return "opera";
  if (/chrome|chromium|crios/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  return "browser";
}

// every check runs a live progress bar, then resolves to its status —
// only the title line streams as plain text
const BOOT_STEPS = [
  { text: "tohirOS bios v2.6 — pixel edition" },
  { label: "mem check ............", result: "65536k ok" },
  { label: "sprite daemon ........", result: "loaded" },
  { label: "loading pixels .......", result: "done" },
  { label: "booting /bin/zsh .....", result: "ok" },
];

const BAR_CELLS = 18;

const THEMES = ["default", "green", "amber"];

// typo `ls` and find out. sl ignores interrupts, as is tradition.
const TRAIN = String.raw`      ====        ________                ___________
  _D _|  |_______/        \__I_I_____===__|_________|
   |(_)---  |   H\________/ |   |        =|___ ___|
   /     |  |   H  |  |     |   |         ||_| |_||
  |      |  |   H  |__--------------------| [___] |
  | ________|___H__/__|_____/[][]~\_______|       |
  |/ |   |-----------I_____I [][] []  D   |=======|__
__/ =| o |=-~~\  /~~\  /~~\  /~~\ ____Y___________|__
 |/-=|___|=    ||    ||    ||    |_____/~\___/
  \_/      \O=====O=====O=====O_/      \_/`;

/* ---- command outputs (html strings; dynamic bits go through esc) ------- */

const WHOAMI_HTML =
  "<h1>tohirr</h1>" +
  '<p class="dim">design engineer · interfaces, motion &amp; pixels</p>';

const ABOUT_HTML =
  "<p>i design and build interfaces where the details carry the feel — springs instead of easing curves, states that respond mid-gesture, pixels placed on purpose. the lab/ below is the working proof.</p>" +
  "<p>background in mechanical engineering (cad, fea, simulation) and 3d for the browser. currently building 3d web software remotely for a us startup.</p>";

const PROJECTS_HTML =
  "<ul>" +
  projects
    .map(
      (p) =>
        '<li class="row">' +
        (p.href
          ? `<a class="ln" href="${p.href}" target="_blank" rel="noreferrer">${p.name}</a>` +
            `<span class="dim"> -&gt; ${stripUrl(p.href)}</span>`
          : `<span class="broken">${p.name}</span>` +
            '<span class="dim"> -&gt; ??? [wip]</span>') +
        `<span class="desc">${esc(p.desc)}</span></li>`,
    )
    .join("") +
  "</ul>";

const CONTACT_HTML =
  '<p class="brackets">' +
  links
    .map(
      (l) =>
        `<a href="${l.href}" target="_blank" rel="noreferrer">` +
        `<span class="dim">[</span><span class="ln">${l.name}</span><span class="dim">]</span></a>`,
    )
    .join("") +
  "</p>" +
  '<p class="dim">open to design engineer &amp; creative frontend roles — <a href="mailto:tohirr.dev@gmail.com">say hi</a>.</p>';

const ROOT_LS_HTML =
  "<p>about.txt&nbsp;&nbsp;contact.txt&nbsp;&nbsp;" +
  '<span class="dir">lab/</span>&nbsp;&nbsp;' +
  '<span class="dir">projects/</span></p>';

// lab listing — entries are clickable, so nobody has to type to see the work
const LAB_LS_HTML =
  "<ul>" +
  lab
    .map(
      (p) =>
        '<li class="row">' +
        `<a class="ln" data-lab="${p.name}">${p.name}</a>` +
        `<span class="dim"> -&gt; ./${p.name}.js</span>` +
        `<span class="desc">${esc(p.desc)}</span></li>`,
    )
    .join("") +
  "</ul>" +
  '<p class="dim">click a piece to run it — or: open lab/&lt;name&gt;</p>';

// .help p is pre-wrap — the padding spaces and \n are load-bearing
const HELP_HTML =
  '<div class="help"><p class="dim">available commands:</p><p>' +
  'help            <span class="dim">show this list</span>\n' +
  'whoami          <span class="dim">who is this guy</span>\n' +
  'ls [dir]        <span class="dim">list files</span>\n' +
  'cat &lt;file&gt;      <span class="dim">print a file</span>\n' +
  'open &lt;name&gt;     <span class="dim">open a project or lab piece</span>\n' +
  'theme &lt;name&gt;    <span class="dim">green · amber · default</span>\n' +
  'history         <span class="dim">command history</span>\n' +
  'clear           <span class="dim">clear the screen</span>' +
  "</p></div>";

const INTRO_BLOCKS = [
  { cmd: "whoami", html: WHOAMI_HTML },
  { cmd: "cat about.txt", html: ABOUT_HTML },
  { cmd: "ls projects/", html: PROJECTS_HTML },
  { cmd: "ls lab/", html: LAB_LS_HTML },
  { cmd: "cat contact.txt", html: CONTACT_HTML },
];

const COMPLETIONS = [
  "help",
  "whoami",
  "cat about.txt",
  "cat contact.txt",
  "ls",
  "ls lab/",
  "ls projects/",
  ...projects.map((p) => `open ${p.name}`),
  ...lab.map((p) => `open lab/${p.name}`),
  ...THEMES.map((t) => `theme ${t}`),
  "history",
  "clear",
  "pwd",
  "date",
];

/* ---- tiny dom helpers -------------------------------------------------- */

function frag(html) {
  const t = document.createElement("template");
  t.innerHTML = html;
  return t.content;
}

function makeCursor(hollow) {
  const s = document.createElement("span");
  s.className = hollow ? "cursor hollow" : "cursor";
  s.setAttribute("aria-hidden", "true");
  return s;
}

const follow = () =>
  window.scrollTo(0, document.documentElement.scrollHeight);

/* ---- output streaming --------------------------------------------------
   reveals an arbitrary dom fragment in fast character chunks, llm-chat
   style. each tick rebuilds the visible prefix from the detached source —
   cheap at these sizes, and the blinking cursor rides the reveal tip. */

function countChars(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.length;
  if (node.nodeType !== Node.ELEMENT_NODE) return 0;
  const kids = node.childNodes;
  if (!kids.length) return 1;
  let n = 0;
  for (const c of kids) n += countChars(c);
  return n;
}

function sliceDom(node, budget) {
  if (budget <= 0) return [null, 0];
  if (node.nodeType === Node.TEXT_NODE) {
    const s = node.nodeValue;
    if (s.length <= budget) return [node.cloneNode(), s.length];
    // the reveal tip — park the blinking cursor right here
    const f = document.createDocumentFragment();
    f.append(document.createTextNode(s.slice(0, budget)), makeCursor());
    return [f, budget];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [null, 0];
  const kids = node.childNodes;
  if (!kids.length) return [node.cloneNode(true), 1];
  const clone = node.cloneNode(false);
  let used = 0;
  for (const c of kids) {
    if (used >= budget) break;
    const [k, u] = sliceDom(c, budget - used);
    if (k) clone.appendChild(k);
    used += u;
  }
  return [clone, used];
}

const activeStreams = new Set();

function stream(container, source, { instant = false, onDone } = {}) {
  const total = [...source.childNodes].reduce((a, c) => a + countChars(c), 0);
  let n = instant ? total : 0;
  let timer = null;

  const handle = {
    finish(silent) {
      clearTimeout(timer);
      activeStreams.delete(handle);
      container.replaceChildren(source);
      if (!silent) onDone?.();
    },
  };

  if (n >= total) {
    container.replaceChildren(source);
    onDone?.();
    return handle;
  }

  activeStreams.add(handle);
  const step = () => {
    n += STREAM_CHUNK_MIN + Math.floor(Math.random() * (STREAM_CHUNK_EXTRA + 1));
    if (n >= total) {
      handle.finish();
      follow();
      return;
    }
    const out = document.createDocumentFragment();
    let used = 0;
    for (const c of source.childNodes) {
      if (used >= n) break;
      const [k, u] = sliceDom(c, n - used);
      if (k) out.appendChild(k);
      used += u;
    }
    container.replaceChildren(out);
    follow();
    timer = setTimeout(step, STREAM_TICK_MS);
  };
  timer = setTimeout(step, STREAM_TICK_MS);
  return handle;
}

/* ---- themes ------------------------------------------------------------ */

function applyTheme(name) {
  if (name === "default") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("wf-theme");
  } else {
    document.documentElement.setAttribute("data-theme", name);
    localStorage.setItem("wf-theme", name);
  }
}

/* ---- the terminal ------------------------------------------------------ */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  .matches;

const main = document.getElementById("term");
main.innerHTML =
  '<div class="boot" hidden></div>' +
  '<div id="blocks"></div>' +
  '<p class="cmdline" id="introline" hidden></p>' +
  '<div class="block" id="promptblock" hidden>' +
  '<p class="cmdline" id="promptline"></p>' +
  '<p class="dim comment" id="hint" hidden># try: help</p>' +
  '<form id="promptform"><input id="ghost" class="ghost-input" ' +
  'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
  'spellcheck="false" enterkeyhint="go" aria-label="terminal input"></form>' +
  "</div>";

const bootEl = main.querySelector(".boot");
const blocksEl = main.querySelector("#blocks");
const introLine = main.querySelector("#introline");
const promptBlock = main.querySelector("#promptblock");
const promptLine = main.querySelector("#promptline");
const hintEl = main.querySelector("#hint");
const ghost = main.querySelector("#ghost");

const PROMPT_HTML =
  `<span class="p-user">guest@${browserName()}</span> ` +
  '<span class="p-path">~</span> <span class="dim">%</span> ';

let phase = "boot"; // boot | term
let introIdx = 0;
let introDone = false;
let busy = false;
let focused = true;
let vim = null; // {buf, cmd, insert, err}
let vimEl = null;
let bootTimer = null;
let introTimer = null;

// command history, persisted
let history = [];
try {
  history = JSON.parse(localStorage.getItem("wf-history") || "[]");
} catch {
  history = [];
}
let histIdx = history.length;

const saveHistory = () =>
  localStorage.setItem("wf-history", JSON.stringify(history.slice(-50)));

// restore a saved phosphor theme
{
  const t = localStorage.getItem("wf-theme");
  if (t && THEMES.includes(t)) applyTheme(t);
}

/* ---- prompt line ------------------------------------------------------- */

function renderPrompt() {
  promptBlock.hidden = !(phase === "term" && introDone);
  const showLine = phase === "term" && introDone && !busy;
  promptLine.hidden = !showLine;
  hintEl.hidden = !showLine || blocksEl.childElementCount > INTRO_BLOCKS.length;
  if (!showLine) return;
  promptLine.innerHTML = PROMPT_HTML;
  const span = document.createElement("span");
  span.textContent = ghost.value;
  promptLine.append(span, makeCursor(!focused));
}

function setBusy(b) {
  busy = b;
  renderPrompt();
}

/* ---- blocks ------------------------------------------------------------ */

function addBlock(cmd, html, { instant = false, onDone } = {}) {
  const div = document.createElement("div");
  div.className = "block";
  const p = document.createElement("p");
  p.className = "cmdline";
  p.innerHTML = PROMPT_HTML;
  const span = document.createElement("span");
  span.textContent = cmd;
  p.appendChild(span);
  div.appendChild(p);
  if (html) {
    const out = document.createElement("div");
    out.className = "output";
    div.appendChild(out);
    blocksEl.appendChild(div);
    follow();
    stream(out, frag(html), { instant, onDone });
  } else {
    blocksEl.appendChild(div);
    follow();
    onDone?.();
  }
}

/* ---- boot sequence ----------------------------------------------------- */

function runBar(p, label, onDone) {
  p.className = "dim bar";
  let pct = 0;
  const draw = () => {
    p.innerHTML = "";
    p.append(`${label} [`);
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    fill.textContent = "█".repeat(Math.round((pct / 100) * BAR_CELLS));
    p.append(
      fill,
      `${"░".repeat(BAR_CELLS - Math.round((pct / 100) * BAR_CELLS))}]` +
        `${String(Math.round(pct)).padStart(4)}%`,
    );
  };
  const tick = () => {
    draw();
    if (pct >= 100) {
      onDone();
      return;
    }
    // creeps up in uneven jumps, hitches around 80% — as is tradition
    const hitch = pct > 76 && pct < 92 && Math.random() < 0.35;
    bootTimer = setTimeout(
      () => {
        pct = Math.min(100, pct + 2 + Math.floor(Math.random() * 7));
        tick();
      },
      hitch ? 280 : 40 + Math.random() * 60,
    );
  };
  tick();
}

function bootStep(i) {
  if (i >= BOOT_STEPS.length) {
    bootTimer = setTimeout(startTerm, BOOT_HOLD_MS);
    return;
  }
  const s = BOOT_STEPS[i];
  const p = document.createElement("p");
  p.className = "dim";
  bootEl.appendChild(p);
  const next = () => {
    bootTimer = setTimeout(() => bootStep(i + 1), BOOT_LINE_MS);
  };
  if (s.label) {
    runBar(p, s.label, () => {
      // hold the full bar a beat, then settle into its status line
      bootTimer = setTimeout(() => {
        p.className = "dim";
        p.textContent = `${s.label} ${s.result}`;
        bootStep(i + 1);
      }, BOOT_LINE_MS);
    });
  } else {
    const src = document.createDocumentFragment();
    src.append(document.createTextNode(s.text));
    stream(p, src, { onDone: next });
  }
}

function startTerm() {
  phase = "term";
  clearTimeout(bootTimer);
  bootEl.hidden = true;
  bootEl.innerHTML = "";
  if (reduceMotion) {
    finishIntro();
    return;
  }
  introStep();
}

/* ---- intro session (auto-typed) ---------------------------------------- */

function introStep() {
  if (introIdx >= INTRO_BLOCKS.length) {
    introFinishedUi();
    return;
  }
  const { cmd } = INTRO_BLOCKS[introIdx];
  introLine.hidden = false;
  let typed = 0;
  const render = () => {
    introLine.innerHTML = PROMPT_HTML;
    const span = document.createElement("span");
    span.textContent = cmd.slice(0, typed);
    introLine.append(span, makeCursor());
    follow();
  };
  const typeNext = () => {
    render();
    if (typed >= cmd.length) {
      introTimer = setTimeout(() => {
        introLine.hidden = true;
        const b = INTRO_BLOCKS[introIdx];
        introIdx += 1;
        addBlock(b.cmd, b.html, { onDone: introStep });
      }, OUTPUT_DELAY_MS);
      return;
    }
    introTimer = setTimeout(
      () => {
        typed += 1;
        typeNext();
      },
      typed === 0
        ? CMD_START_DELAY_MS
        : KEYSTROKE_MS_MIN + Math.random() * KEYSTROKE_MS_JITTER,
    );
  };
  typeNext();
}

// fast-forward: finish whatever is streaming, dump the rest instantly
function finishIntro() {
  clearTimeout(introTimer);
  introLine.hidden = true;
  for (const h of [...activeStreams]) h.finish(true);
  for (let i = introIdx; i < INTRO_BLOCKS.length; i++) {
    addBlock(INTRO_BLOCKS[i].cmd, INTRO_BLOCKS[i].html, { instant: true });
  }
  introIdx = INTRO_BLOCKS.length;
  introFinishedUi();
}

// hand the keyboard to the prompt once the intro finishes (not on touch
// devices — popping the keyboard open uninvited is rude)
function introFinishedUi() {
  introDone = true;
  renderPrompt();
  follow();
  if (!window.matchMedia("(pointer: coarse)").matches) {
    ghost.focus({ preventScroll: true });
  }
}

/* ---- commands ---------------------------------------------------------- */

function run(raw) {
  const cmd = raw.trim().replace(/\s+/g, " ");
  const [name, ...rest] = cmd.split(" ");
  const arg = rest.join(" ");
  let output = null;

  if (!cmd) {
    addBlock("", null);
    renderPrompt();
    return;
  }
  if (name === "clear") {
    blocksEl.innerHTML = "";
    renderPrompt();
    return;
  }

  if (name === "help") output = HELP_HTML;
  else if (name === "whoami") output = WHOAMI_HTML;
  else if (name === "cat") {
    if (arg === "about.txt" || arg === "about") output = ABOUT_HTML;
    else if (arg === "contact.txt" || arg === "contact") output = CONTACT_HTML;
    else output = `<p>cat: ${esc(arg || "cat")}: No such file or directory</p>`;
  } else if (name === "ls") {
    const dir = arg.replace(/\/$/, "");
    if (!dir || dir === ".") output = ROOT_LS_HTML;
    else if (dir === "projects") output = PROJECTS_HTML;
    else if (dir === "lab") output = LAB_LS_HTML;
    else output = `<p>ls: ${esc(arg)}: No such file or directory</p>`;
  } else if (name === "open") {
    const labName = (
      arg.startsWith("lab/") ? arg.slice(4) : arg
    ).replace(/\/$/, "");
    const piece = lab.find((x) => x.name === labName);
    const p = projects.find((x) => x.name === arg);
    if (piece) {
      openLab(piece.name);
      output = `<p class="dim">running lab/${piece.name} …</p>`;
    } else if (p && !p.href) {
      output = `<p class="dim">open: ${p.name}: broken symlink — still being built. soon.</p>`;
    } else if (p) {
      window.open(p.href, "_blank", "noopener");
      output = `<p class="dim">opening ${stripUrl(p.href)} …</p>`;
    } else {
      output =
        `<p>open: ${esc(arg || "?")}: not a project or lab piece ` +
        `<span class="dim">(try: ${projects.map((x) => x.name).join(", ")}, ` +
        `${lab.map((x) => `lab/${x.name}`).join(", ")})</span></p>`;
    }
  } else if (name === "theme") {
    if (THEMES.includes(arg)) {
      applyTheme(arg);
      output = `<p class="dim">phosphor set to ${arg}</p>`;
    } else {
      output = `<p>usage: theme &lt;${THEMES.join(" | ")}&gt;</p>`;
    }
  } else if (name === "history") {
    output = history.length
      ? `<p class="history">${esc(
          history
            .map((h, i) => `${String(i + 1).padStart(4)}  ${h}`)
            .join("\n"),
        )}</p>`
      : '<p class="dim">no history yet</p>';
  } else if (name === "sl") {
    startTrain();
    output = null;
  } else if (name === "snake") {
    output =
      '<p class="dim">🐍 the real one lives in a cube — try: open colubrid</p>';
  } else if (name === "vi" || name === "vim" || name === "nvim") {
    openVim();
  } else if (name === "nano" || name === "emacs") {
    output = `<p>zsh: command not found: ${name} (this is a vi household)</p>`;
  } else if (name === "pwd") output = "<p>/home/guest</p>";
  else if (name === "date")
    output = `<p>${new Date().toString().toLowerCase()}</p>`;
  else if (name === "echo") output = `<p>${esc(arg) || " "}</p>`;
  else if (name === "sudo")
    output =
      "<p>guest is not in the sudoers file. this incident will be reported.</p>";
  else if (name === "exit" || name === "logout")
    output = '<p class="dim">nice try — there is no escape.</p>';
  else if (name === "rm") output = '<p class="dim">no.</p>';
  else output = `<p>zsh: command not found: ${esc(name)}</p>`;

  if (output) setBusy(true);
  addBlock(cmd, output, {
    instant: reduceMotion,
    onDone: output ? () => setBusy(false) : undefined,
  });
  renderPrompt();
}

/* ---- the lab window manager -------------------------------------------- */

let winEl = null;
let winCleanup = null;
let winToken = 0; // guards a load that resolves after its window closed

function closeWin() {
  if (!winEl) return;
  winToken += 1;
  try {
    winCleanup?.();
  } catch {
    // demo cleanup is best-effort
  }
  winCleanup = null;
  winEl.remove();
  winEl = null;
}

function dragWin(el) {
  const bar = el.querySelector(".win-bar");
  let dx = 0;
  let dy = 0;
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".win-close")) return;
    e.preventDefault();
    const sx = e.clientX - dx;
    const sy = e.clientY - dy;
    const move = (ev) => {
      dx = ev.clientX - sx;
      dy = ev.clientY - sy;
      el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
}

async function openLab(name) {
  const piece = lab.find((p) => p.name === name);
  if (!piece) return;
  closeWin();
  const token = ++winToken;
  winEl = document.createElement("div");
  winEl.className = "window";
  winEl.setAttribute("role", "dialog");
  winEl.setAttribute("aria-label", `lab/${name}`);
  winEl.innerHTML =
    `<div class="win-bar"><span class="win-title">lab/${name}</span>` +
    '<button class="win-close" aria-label="close window">[x]</button></div>' +
    `<div class="win-body"><p class="dim">loading ${name} …</p></div>`;
  winEl.querySelector(".win-close").addEventListener("click", () => {
    closeWin();
    if (!window.matchMedia("(pointer: coarse)").matches)
      ghost.focus({ preventScroll: true });
  });
  dragWin(winEl);
  document.body.appendChild(winEl);
  const body = winEl.querySelector(".win-body");
  try {
    const mod = await piece.load();
    if (token !== winToken) return; // window was closed while loading
    body.innerHTML = "";
    winCleanup = mod.mount(body) || null;
  } catch {
    if (token === winToken)
      body.innerHTML =
        '<p class="dim">failed to load — check the connection and retry</p>';
  }
}

// esc closes the window (vim owns esc while it's up)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && winEl && !vim) closeWin();
});

// clickable lab entries in any listing, streamed partials included
main.addEventListener("click", (e) => {
  const t = e.target.closest("[data-lab]");
  if (t) {
    e.preventDefault();
    openLab(t.dataset.lab);
  }
});

/* ---- the sl locomotive ------------------------------------------------- */

function startTrain() {
  setBusy(true);
  const pre = document.createElement("pre");
  pre.className = "sl";
  pre.setAttribute("aria-hidden", "true");
  pre.textContent = TRAIN;
  pre.addEventListener("animationend", () => {
    pre.remove();
    setBusy(false);
  });
  main.appendChild(pre);
}

/* ---- fake vim ---------------------------------------------------------- */

function openVim() {
  vim = { buf: "", cmd: "", insert: false, err: "" };
  vimEl = document.createElement("div");
  vimEl.className = "vim";
  vimEl.setAttribute("role", "dialog");
  vimEl.setAttribute("aria-label", "vim");
  vimEl.innerHTML =
    '<div class="vim-buf"><span></span>' +
    '<span class="cursor" aria-hidden="true"></span>' +
    '<p class="vim-tilde dim">~</p>'.repeat(18) +
    "</div>" +
    '<p class="vim-status">"portfolio.txt" [readonly]' +
    '<span class="vim-hint">:q! to leave</span></p>' +
    '<p class="vim-cmdline"> </p>';
  main.appendChild(vimEl);
  renderVim();
  ghost.focus({ preventScroll: true });
}

function closeVim() {
  vim = null;
  vimEl?.remove();
  vimEl = null;
}

function renderVim() {
  if (!vim || !vimEl) return;
  vimEl.querySelector(".vim-buf > span").textContent = vim.buf;
  vimEl.querySelector(".vim-cmdline").textContent = vim.insert
    ? "-- INSERT --"
    : vim.err || vim.cmd || " ";
}

function vimFeed(str) {
  for (const ch of str) {
    if (vim.insert) vim.buf += ch;
    else if (vim.cmd) vim.cmd += ch;
    else if (ch === ":") {
      vim.cmd = ":";
      vim.err = "";
    } else if (ch === "i") {
      vim.insert = true;
      vim.err = "";
    }
  }
  renderVim();
}

function vimEnter() {
  if (vim.insert) {
    vim.buf += "\n";
    renderVim();
    return;
  }
  const c = vim.cmd.trim();
  if (c === ":q!" || c === ":wq!" || c === ":x!") {
    closeVim();
    return;
  }
  if (c === ":q")
    vim.err = "E37: No write since last change (add ! to override)";
  else if (c === ":w" || c === ":wq" || c === ":x")
    vim.err = "E45: 'readonly' option is set (add ! to override)";
  else if (c.startsWith(":") && c.length > 1)
    vim.err = `E492: Not an editor command: ${c.slice(1)}`;
  vim.cmd = "";
  renderVim();
}

/* ---- input plumbing ---------------------------------------------------- */

function submit() {
  if (vim) {
    vimEnter();
    return;
  }
  const raw = ghost.value;
  if (raw.trim()) {
    history.push(raw);
    saveHistory();
  }
  histIdx = history.length;
  ghost.value = "";
  run(raw);
}

// soft keyboards submit through the form; hardware Enter is handled in
// keydown below — cover both
main.querySelector("#promptform").addEventListener("submit", (e) => {
  e.preventDefault();
  submit();
});

ghost.addEventListener("input", () => {
  if (vim) {
    // characters land here even from soft keyboards; route them to vim
    if (ghost.value) vimFeed(ghost.value);
    ghost.value = "";
    return;
  }
  renderPrompt();
});

ghost.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submit();
    return;
  }
  if (vim) {
    if (e.key === "Escape") {
      e.preventDefault();
      vim.insert = false;
      vim.cmd = "";
      vim.err = "";
      renderVim();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      if (vim.insert) vim.buf = vim.buf.slice(0, -1);
      else vim.cmd = vim.cmd.slice(0, -1);
      renderVim();
    }
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (histIdx > 0) {
      histIdx -= 1;
      ghost.value = history[histIdx] ?? "";
      renderPrompt();
    }
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (histIdx < history.length) {
      histIdx += 1;
      ghost.value = history[histIdx] ?? "";
      renderPrompt();
    }
  } else if (e.key === "Tab") {
    e.preventDefault();
    const input = ghost.value;
    const matches = COMPLETIONS.filter((c) => c.startsWith(input));
    if (matches.length === 1) ghost.value = matches[0];
    else if (matches.length > 1) {
      // complete to the longest common prefix
      let prefix = matches[0];
      for (const m of matches) {
        while (!m.startsWith(prefix)) prefix = prefix.slice(0, -1);
      }
      if (prefix.length > input.length) ghost.value = prefix;
    }
    renderPrompt();
  }
});

ghost.addEventListener("focus", () => {
  focused = true;
  renderPrompt();
});

ghost.addEventListener("blur", () => {
  focused = false;
  renderPrompt();
});

main.addEventListener("click", () => {
  if (phase === "boot") {
    startTerm();
    return;
  }
  if (!introDone) {
    finishIntro();
    return;
  }
  // don't steal a text-selection drag
  if (window.getSelection()?.toString()) return;
  ghost.focus({ preventScroll: true });
});

/* ---- go ---------------------------------------------------------------- */

if (reduceMotion) {
  startTerm();
} else {
  bootEl.hidden = false;
  bootStep(0);
}
