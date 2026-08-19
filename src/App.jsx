import {
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

const links = [
  { name: "github", href: "https://github.com/tohirr" },
  { name: "x", href: "https://x.com/_tohirr" },
  { name: "email", href: "mailto:tohirbabs@gmail.com" },
  { name: "linkedin", href: "https://www.linkedin.com/in/tohir-babs-6a0045167/" },
];

/* ---- speed dials --------------------------------------------------------
   all the pacing knobs, in one place. tweak to taste. */
const STREAM_TICK_MS = 14; // ms between output chunks (lower = faster)
const STREAM_CHUNK_MIN = 1; // chars revealed per chunk, at least…
const STREAM_CHUNK_EXTRA = 3; // …plus up to this many more, randomly
const KEYSTROKE_MS_MIN = 40; // intro commands: fastest keypress
const KEYSTROKE_MS_JITTER = 45; // extra random per-keypress delay
const CMD_START_DELAY_MS = 650; // pause before a command starts typing
const OUTPUT_DELAY_MS = 380; // pause between command and its output
const BOOT_LINE_MS = 170; // per boot line (first line waits 350ms)
const BOOT_HOLD_MS = 500; // hold the finished boot screen before clearing

const stripUrl = (href) => href.replace(/^https?:\/\//, "").replace(/\/$/, "");

function browserName() {
  const ua = navigator.userAgent;
  if (/firefox/i.test(ua)) return "firefox";
  if (/edg\//i.test(ua)) return "edge";
  if (/opr|opera/i.test(ua)) return "opera";
  if (/chrome|chromium|crios/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  return "browser";
}

const BOOT_LINES = [
  "tohirOS bios v2.6 — pixel edition",
  "mem check ............ 65536k ok",
  "sprite daemon ........ loaded",
  "booting /bin/zsh ...",
];

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

/* ---- command outputs --------------------------------------------------- */

const WhoAmI = () => (
  <>
    <h1>tohir babátúndé</h1>
    <p className="dim">3d / graphics engineer · pixel art × webdev</p>
  </>
);

const AboutTxt = () => (
  <>
    <p>
      i build interactive 3d things for the browser — lately at the
      intersection of pixel art and the web: crisp grids, small sprites,
      playful interfaces that feel like game ui.
    </p>
    <p>
      mechanical engineering background (cad, fea, simulation). currently
      building 3d web software remotely for a us startup.
    </p>
  </>
);

const ProjectsLs = () => (
  <ul>
    {projects.map((p) => (
      <li className="row" key={p.name}>
        {p.href ? (
          <>
            <a className="ln" href={p.href} target="_blank" rel="noreferrer">
              {p.name}
            </a>
            <span className="dim"> -&gt; {stripUrl(p.href)}</span>
          </>
        ) : (
          <>
            <span className="broken">{p.name}</span>
            <span className="dim"> -&gt; ??? [wip]</span>
          </>
        )}
        <span className="desc">{p.desc}</span>
      </li>
    ))}
  </ul>
);

const ContactTxt = () => (
  <>
    <p className="brackets">
      {links.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noreferrer">
          <span className="dim">[</span>
          <span className="ln">{l.name}</span>
          <span className="dim">]</span>
        </a>
      ))}
    </p>
    <p className="dim">
      open to 3d / graphics &amp; cad software roles —{" "}
      <a href="mailto:tohirbabs@gmail.com">say hi</a>.
    </p>
  </>
);

const RootLs = () => (
  <p>
    about.txt&nbsp;&nbsp;contact.txt&nbsp;&nbsp;<span className="dir">projects/</span>
  </p>
);

const Help = () => (
  <div className="help">
    <p className="dim">available commands:</p>
    <p>
      help{"            "}<span className="dim">show this list</span>{"\n"}
      whoami{"          "}<span className="dim">who is this guy</span>{"\n"}
      ls [dir]{"        "}<span className="dim">list files</span>{"\n"}
      cat &lt;file&gt;{"      "}<span className="dim">print a file</span>{"\n"}
      open &lt;project&gt;{"  "}<span className="dim">open a project in a new tab</span>{"\n"}
      theme &lt;name&gt;{"    "}<span className="dim">green · amber · default</span>{"\n"}
      history{"         "}<span className="dim">command history</span>{"\n"}
      clear{"           "}<span className="dim">clear the screen</span>
    </p>
  </div>
);

const INTRO_BLOCKS = [
  { cmd: "whoami", output: <WhoAmI /> },
  { cmd: "cat about.txt", output: <AboutTxt /> },
  { cmd: "ls projects/", output: <ProjectsLs /> },
  { cmd: "cat contact.txt", output: <ContactTxt /> },
];

const COMPLETIONS = [
  "help",
  "whoami",
  "cat about.txt",
  "cat contact.txt",
  "ls",
  "ls projects/",
  ...projects.map((p) => `open ${p.name}`),
  ...THEMES.map((t) => `theme ${t}`),
  "history",
  "clear",
  "pwd",
  "date",
];

/* ---- output streaming --------------------------------------------------
   reveals arbitrary JSX in fast character chunks, llm-chat style */

function countChars(node) {
  if (node == null || typeof node === "boolean") return 0;
  if (typeof node === "string" || typeof node === "number")
    return String(node).length;
  if (Array.isArray(node)) return node.reduce((a, c) => a + countChars(c), 0);
  if (isValidElement(node)) {
    const kids = node.props?.children;
    return kids == null ? 1 : countChars(kids);
  }
  return 0;
}

function sliceNode(node, budget) {
  if (node == null || typeof node === "boolean" || budget <= 0)
    return [null, 0];
  if (typeof node === "string" || typeof node === "number") {
    const s = String(node);
    if (s.length <= budget) return [s, s.length];
    return [s.slice(0, budget), budget];
  }
  if (Array.isArray(node)) {
    let used = 0;
    const out = [];
    for (const c of node) {
      if (used >= budget) break;
      const [n, u] = sliceNode(c, budget - used);
      if (n != null) out.push(n);
      used += u;
    }
    return [out, used];
  }
  if (isValidElement(node)) {
    const kids = node.props?.children;
    if (kids == null) return [node, 1];
    const [n, u] = sliceNode(kids, budget);
    return [cloneElement(node, undefined, n), u];
  }
  return [null, 0];
}

function Stream({ children, instant, onDone }) {
  const total = useMemo(() => countChars(children), [children]);
  const [n, setN] = useState(instant ? total : 0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (n >= total) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const t = setTimeout(
      () =>
        setN((x) =>
          Math.min(
            total,
            x + STREAM_CHUNK_MIN + Math.floor(Math.random() * (STREAM_CHUNK_EXTRA + 1))
          )
        ),
      STREAM_TICK_MS
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, total]);

  // follow the output while it streams
  useEffect(() => {
    if (n < total)
      window.scrollTo(0, document.documentElement.scrollHeight);
  }, [n, total]);

  if (n >= total) return children;
  const [partial] = sliceNode(children, n);
  return partial;
}

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

function App() {
  const [train, setTrain] = useState(false);
  const [vim, setVim] = useState(null); // {buf, cmd, insert, err}
  const reduceMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const [phase, setPhase] = useState(reduceMotion ? "term" : "boot");
  const [bootN, setBootN] = useState(0);
  const [blocks, setBlocks] = useState(() =>
    reduceMotion ? INTRO_BLOCKS.map((b, i) => ({ ...b, id: i })) : []
  );
  const [introIdx, setIntroIdx] = useState(
    reduceMotion ? INTRO_BLOCKS.length : 0
  );
  const [typed, setTyped] = useState(0);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(true);
  const inputRef = useRef(null);
  const historyRef = useRef(null);
  const idRef = useRef(INTRO_BLOCKS.length);

  if (historyRef.current === null) {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("wf-history") || "[]");
    } catch {
      saved = [];
    }
    historyRef.current = { list: saved, idx: saved.length };
  }

  const introDone = introIdx >= INTRO_BLOCKS.length;

  // restore a saved phosphor theme
  useEffect(() => {
    const t = localStorage.getItem("wf-theme");
    if (t && THEMES.includes(t)) applyTheme(t);
  }, []);

  const prompt = useMemo(() => {
    const host = browserName();
    return (
      <>
        <span className="p-user">guest@{host}</span>{" "}
        <span className="p-path">~</span> <span className="dim">%</span>
      </>
    );
  }, []);

  // fake POST screen, every load
  useEffect(() => {
    if (phase !== "boot") return;
    if (bootN < BOOT_LINES.length) {
      const t = setTimeout(
        () => setBootN((n) => n + 1),
        bootN === 0 ? 350 : BOOT_LINE_MS
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("term"), BOOT_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, bootN]);

  // auto-type the intro session: one command at a time, then stream its
  // output; the next command waits for the stream to finish
  useEffect(() => {
    if (phase !== "term" || introDone || busy) return;
    const cmd = INTRO_BLOCKS[introIdx].cmd;
    if (typed < cmd.length) {
      const t = setTimeout(
        () => setTyped((n) => n + 1),
        typed === 0
          ? CMD_START_DELAY_MS
          : KEYSTROKE_MS_MIN + Math.random() * KEYSTROKE_MS_JITTER
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setBusy(true);
      setBlocks((b) => [...b, { ...INTRO_BLOCKS[introIdx], id: idRef.current++ }]);
      setIntroIdx((i) => i + 1);
      setTyped(0);
    }, OUTPUT_DELAY_MS);
    return () => clearTimeout(t);
  }, [phase, introIdx, typed, introDone, busy]);

  // terminals follow their output
  useEffect(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  }, [blocks, typed]);

  // hand the keyboard to the prompt once the intro finishes (not on touch
  // devices — popping the keyboard open uninvited is rude)
  useEffect(() => {
    if (introDone && !window.matchMedia("(pointer: coarse)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [introDone]);

  // vim needs the keyboard too
  useEffect(() => {
    if (vim) inputRef.current?.focus({ preventScroll: true });
  }, [vim]);

  const saveHistory = () => {
    const list = historyRef.current.list.slice(-50);
    localStorage.setItem("wf-history", JSON.stringify(list));
  };

  const run = (raw) => {
    const cmd = raw.trim().replace(/\s+/g, " ");
    const [name, ...rest] = cmd.split(" ");
    const arg = rest.join(" ");
    let output = null;

    if (!cmd) {
      setBlocks((b) => [...b, { cmd: "", output: null, id: idRef.current++ }]);
      return;
    }
    if (name === "clear") {
      setBlocks([]);
      return;
    }

    if (name === "help") output = <Help />;
    else if (name === "whoami") output = <WhoAmI />;
    else if (name === "cat") {
      if (arg === "about.txt" || arg === "about") output = <AboutTxt />;
      else if (arg === "contact.txt" || arg === "contact")
        output = <ContactTxt />;
      else output = <p>cat: {arg || "cat"}: No such file or directory</p>;
    } else if (name === "ls") {
      const dir = arg.replace(/\/$/, "");
      if (!dir || dir === ".") output = <RootLs />;
      else if (dir === "projects") output = <ProjectsLs />;
      else output = <p>ls: {arg}: No such file or directory</p>;
    } else if (name === "open") {
      const p = projects.find((x) => x.name === arg);
      if (p && !p.href) {
        output = (
          <p className="dim">
            open: {p.name}: broken symlink — still being built. soon.
          </p>
        );
      } else if (p) {
        window.open(p.href, "_blank", "noopener");
        output = <p className="dim">opening {stripUrl(p.href)} …</p>;
      } else {
        output = (
          <p>
            open: {arg || "?"}: not a project{" "}
            <span className="dim">
              (try: {projects.map((x) => x.name).join(", ")})
            </span>
          </p>
        );
      }
    } else if (name === "theme") {
      if (THEMES.includes(arg)) {
        applyTheme(arg);
        output = <p className="dim">phosphor set to {arg}</p>;
      } else {
        output = (
          <p>
            usage: theme &lt;{THEMES.join(" | ")}&gt;
          </p>
        );
      }
    } else if (name === "history") {
      const list = historyRef.current.list;
      output = list.length ? (
        <p className="history">
          {list
            .map((h, i) => `${String(i + 1).padStart(4)}  ${h}`)
            .join("\n")}
        </p>
      ) : (
        <p className="dim">no history yet</p>
      );
    } else if (name === "sl") {
      setTrain(true);
      setBusy(true);
      output = null;
    } else if (name === "snake") {
      output = (
        <p className="dim">
          🐍 the real one lives in a cube — try: open colubrid
        </p>
      );
    } else if (name === "vi" || name === "vim" || name === "nvim") {
      setVim({ buf: "", cmd: "", insert: false, err: "" });
    } else if (name === "nano" || name === "emacs")
      output = <p>zsh: command not found: {name} (this is a vi household)</p>;
    else if (name === "pwd") output = <p>/home/guest</p>;
    else if (name === "date")
      output = <p>{new Date().toString().toLowerCase()}</p>;
    else if (name === "echo") output = <p>{arg || " "}</p>;
    else if (name === "sudo")
      output = (
        <p>guest is not in the sudoers file. this incident will be reported.</p>
      );
    else if (name === "exit" || name === "logout")
      output = <p className="dim">nice try — there is no escape.</p>;
    else if (name === "rm") output = <p className="dim">no.</p>;
    else output = <p>zsh: command not found: {name}</p>;

    if (output) setBusy(true);
    setBlocks((b) => [...b, { cmd, output, id: idRef.current++ }]);
  };

  /* ---- vim ------------------------------------------------------------- */

  const vimFeed = (str) => {
    setVim((v) => {
      if (!v) return v;
      let { buf, cmd, insert, err } = v;
      for (const ch of str) {
        if (insert) buf += ch;
        else if (cmd) cmd += ch;
        else if (ch === ":") {
          cmd = ":";
          err = "";
        } else if (ch === "i") {
          insert = true;
          err = "";
        }
      }
      return { buf, cmd, insert, err };
    });
  };

  const vimEnter = () => {
    const v = vim;
    if (!v) return;
    if (v.insert) {
      setVim({ ...v, buf: v.buf + "\n" });
      return;
    }
    const c = v.cmd.trim();
    if (c === ":q!" || c === ":wq!" || c === ":x!") setVim(null);
    else if (c === ":q")
      setVim({
        ...v,
        cmd: "",
        err: "E37: No write since last change (add ! to override)",
      });
    else if (c === ":w" || c === ":wq" || c === ":x")
      setVim({ ...v, cmd: "", err: "E45: 'readonly' option is set (add ! to override)" });
    else if (c.startsWith(":") && c.length > 1)
      setVim({ ...v, cmd: "", err: `E492: Not an editor command: ${c.slice(1)}` });
    else setVim({ ...v, cmd: "" });
  };

  /* ---- input plumbing --------------------------------------------------- */

  const submit = () => {
    if (vim) {
      vimEnter();
      return;
    }
    const hist = historyRef.current;
    if (input.trim()) {
      hist.list.push(input);
      saveHistory();
    }
    hist.idx = hist.list.length;
    setInput("");
    run(input);
  };

  const onChange = (e) => {
    if (vim) {
      // characters land here even from soft keyboards; route them to vim
      if (e.target.value) vimFeed(e.target.value);
      setInput("");
      return;
    }
    setInput(e.target.value);
  };

  const onKeyDown = (e) => {
    if (vim) {
      if (e.key === "Escape") {
        e.preventDefault();
        setVim((v) => (v ? { ...v, insert: false, cmd: "", err: "" } : v));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setVim((v) => {
          if (!v) return v;
          if (v.insert) return { ...v, buf: v.buf.slice(0, -1) };
          return { ...v, cmd: v.cmd.slice(0, -1) };
        });
      }
      return;
    }
    const hist = historyRef.current;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hist.idx > 0) {
        hist.idx -= 1;
        setInput(hist.list[hist.idx] ?? "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hist.idx < hist.list.length) {
        hist.idx += 1;
        setInput(hist.list[hist.idx] ?? "");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const matches = COMPLETIONS.filter((c) => c.startsWith(input));
      if (matches.length === 1) setInput(matches[0]);
      else if (matches.length > 1) {
        // complete to the longest common prefix
        let prefix = matches[0];
        for (const m of matches) {
          while (!m.startsWith(prefix)) prefix = prefix.slice(0, -1);
        }
        if (prefix.length > input.length) setInput(prefix);
      }
    }
  };

  const onMainClick = () => {
    if (phase === "boot") {
      setPhase("term");
      return;
    }
    if (!introDone) {
      // fast-forward the intro
      setBlocks(INTRO_BLOCKS);
      setIntroIdx(INTRO_BLOCKS.length);
      setTyped(0);
      return;
    }
    // don't steal a text-selection drag
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <main onClick={onMainClick}>
      {phase === "boot" && (
        <div className="boot">
          {BOOT_LINES.slice(0, bootN).map((l) => (
            <p className="dim" key={l}>
              {l}
            </p>
          ))}
        </div>
      )}

      {phase === "term" &&
        blocks.map((b) => (
          <div className="block" key={b.id}>
            <p className="cmdline">
              {prompt} <span>{b.cmd}</span>
            </p>
            {b.output && (
              <div className="output">
                <Stream instant={reduceMotion} onDone={() => setBusy(false)}>
                  {b.output}
                </Stream>
              </div>
            )}
          </div>
        ))}

      {phase === "term" && !introDone && (
        <p className="cmdline">
          {prompt} <span>{INTRO_BLOCKS[introIdx].cmd.slice(0, typed)}</span>
          <span className="cursor" aria-hidden="true" />
        </p>
      )}

      {phase === "term" && introDone && (
        <div className="block">
          {!busy && (
            <p className="cmdline">
              {prompt} <span>{input}</span>
              <span
                className={focused ? "cursor" : "cursor hollow"}
                aria-hidden="true"
              />
            </p>
          )}
          {!busy && blocks.length <= INTRO_BLOCKS.length && (
            <p className="dim comment"># try: help</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              ref={inputRef}
              className="ghost-input"
              value={vim ? "" : input}
              onChange={onChange}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-label="terminal input"
            />
          </form>
        </div>
      )}

      {vim && (
        <div className="vim" role="dialog" aria-label="vim">
          <div className="vim-buf">
            <span>{vim.buf}</span>
            <span className="cursor" aria-hidden="true" />
            {Array.from({ length: 18 }).map((_, i) => (
              <p className="vim-tilde dim" key={i}>
                ~
              </p>
            ))}
          </div>
          <p className="vim-status">
            &quot;portfolio.txt&quot; [readonly]
            <span className="vim-hint">:q! to leave</span>
          </p>
          <p className="vim-cmdline">
            {vim.insert ? "-- INSERT --" : vim.err || vim.cmd || " "}
          </p>
        </div>
      )}

      {train && (
        <pre
          className="sl"
          aria-hidden="true"
          onAnimationEnd={() => {
            setTrain(false);
            setBusy(false);
          }}
        >
          {TRAIN}
        </pre>
      )}
    </main>
  );
}

export default App;
