import SnakeHero from "./SnakeHero";

function Home() {
  const list = [
    { emoji: "🧊", info: "3D & graphics engineering with Three.js / React Three Fiber" },
    { emoji: "⚙️", info: "mechanical engineering background — CAD, FEA, simulation" },
    { emoji: "🌍", info: "building 3D web software remotely for a US startup" },
    { emoji: "🐍", info: "building colubrid, a snake game set inside a 3D cube" },
    { emoji: "✍️", info: "i write whenever i feel the muse" },
    { emoji: "💬", info: "love chatting about graphics, mechanics and music" },
    { emoji: "😄", info: "pronouns he/him" },
  ];
  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <div className="relative w-full max-w-3xl mx-auto p-3 md:p-5 lg:p-8 flex flex-col gap-6">
        {/* Hero: intro + live 3D scene side by side */}
        <div className="flex flex-col md:flex-row gap-6 md:items-stretch">
          <div className="flex flex-col gap-3 md:flex-1">
            <p className="text-sm lg:text-base leading-relaxed">
              Hi there!&#x1F44B; I&apos;m{" "}
              <span className="font-semibold">Tohir</span>{" "}
              — a <span className="font-semibold">3D / graphics software engineer</span>{" "}
              with a mechanical engineering background. I build interactive 3D
              tools for the browser with Three.js and React Three Fiber, backed
              by real CAD, FEA and simulation knowledge.
            </p>
            <ul className="flex flex-col gap-1 text-xs lg:text-sm">
              {list.map((about, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-lg">{about.emoji}</span>
                  <span className="flex">{about.info}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:w-[46%] w-full h-56 md:h-auto md:min-h-[15rem] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-100 border border-slate-200 relative">
            <SnakeHero />
            <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 select-none">
              live · three.js
            </span>
          </div>
        </div>

        {/* Skills strip */}
        <div className="flex flex-col gap-2 text-xs lg:text-sm">
          <p className="text-slate-500">what i work with</p>
          <div className="flex flex-wrap gap-2">
            {[
              "Three.js",
              "React Three Fiber",
              "WebGL / GLSL",
              "React",
              "TypeScript",
              "CAD",
              "FEA / Simulation",
              "GSAP",
            ].map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
