import { lazy, Suspense, useEffect, useMemo, useState } from "react";

const SnakeHero = lazy(() => import("./components/SnakeHero"));

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
  { name: "whatsapp", href: "https://wa.link/l4h8xz" },
  { name: "spotify", href: "https://open.spotify.com/user/e48xr1tcz09muuqh1oski4qme" },
];

function browserName() {
  const ua = navigator.userAgent;
  if (/firefox/i.test(ua)) return "firefox";
  if (/edg\//i.test(ua)) return "edge";
  if (/opr|opera/i.test(ua)) return "opera";
  if (/chrome|chromium|crios/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  return "browser";
}

const steps = [
  {
    cmd: "whoami",
    output: (
      <>
        <h1>tohir babátúndé</h1>
        <p className="dim">3d / graphics engineer · pixel art × webdev</p>
      </>
    ),
  },
  {
    cmd: "cat about.txt",
    output: (
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
    ),
  },
  {
    cmd: "ls projects/",
    output: (
      <ul>
        {projects.map((p) => (
          <li className="row" key={p.name}>
            <a href={p.href} target="_blank" rel="noreferrer">
              {p.name}
            </a>{" "}
            <span className="accent">↗</span>
            <span className="desc">{p.desc}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    cmd: "cat contact.txt",
    output: (
      <>
        <div className="elsewhere">
          {links.map((l) => (
            <a key={l.name} href={l.href} target="_blank" rel="noreferrer">
              {l.name}
            </a>
          ))}
        </div>
        <p className="dim">
          open to 3d / graphics &amp; cad software roles —{" "}
          <a href="mailto:tohirbabs@gmail.com">say hi</a>.
        </p>
      </>
    ),
  },
];

function App() {
  const [snake, setSnake] = useState(false);
  const prompt = useMemo(() => `guest@${browserName()} ~ %`, []);
  const reduceMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const [stepIdx, setStepIdx] = useState(reduceMotion ? steps.length : 0);
  const [typed, setTyped] = useState(0);

  // auto-type the session: one command at a time, then reveal its output
  useEffect(() => {
    if (stepIdx >= steps.length) return;
    const cmd = steps[stepIdx].cmd;
    if (typed < cmd.length) {
      const t = setTimeout(
        () => setTyped((n) => n + 1),
        typed === 0 ? 650 : 40 + Math.random() * 45
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setStepIdx((i) => i + 1);
      setTyped(0);
    }, 380);
    return () => clearTimeout(t);
  }, [stepIdx, typed]);

  // terminals follow their output — keep the latest line in view while typing
  useEffect(() => {
    if (stepIdx < steps.length) {
      window.scrollTo(0, document.documentElement.scrollHeight);
    }
  }, [stepIdx, typed]);

  useEffect(() => {
    let buffer = "";
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSnake(false);
        return;
      }
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-5);
      if (buffer === "snake") setSnake(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const done = stepIdx >= steps.length;
  const skip = () => {
    if (!done) {
      setStepIdx(steps.length);
      setTyped(0);
    }
  };

  return (
    <main onClick={skip}>
      {steps.map(
        (s, i) =>
          i <= stepIdx && (
            <div className="block" key={s.cmd}>
              <p className="cmdline">
                <span className="dim">{prompt}</span>{" "}
                <span>{i < stepIdx ? s.cmd : s.cmd.slice(0, typed)}</span>
                {i === stepIdx && <span className="cursor" aria-hidden="true" />}
              </p>
              {i < stepIdx && <div className="output">{s.output}</div>}
            </div>
          )
      )}

      {done && (
        <div className="block">
          <p className="cmdline">
            <span className="dim">{prompt}</span>
            <span className="cursor" aria-hidden="true" />
          </p>
          <p>
            <button
              className="hint"
              onClick={(e) => {
                e.stopPropagation();
                setSnake(true);
              }}
            >
              # type &quot;snake&quot;
            </button>
          </p>
        </div>
      )}

      {snake && (
        <div
          className="snake-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setSnake(false);
          }}
          role="button"
          aria-label="close snake"
        >
          <Suspense fallback={null}>
            <div className="scene">
              <SnakeHero />
            </div>
          </Suspense>
          <p className="caption">🐍 colubrid lives here — esc or click to close</p>
        </div>
      )}
    </main>
  );
}

export default App;
