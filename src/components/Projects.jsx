import { HiOutlineArrowUpRight } from "react-icons/hi2";
import { FiPlay } from "react-icons/fi";
import { DigitalClock } from "./widgets/DigitalClock";
import { Battery } from "./widgets/Battery";
import { Weather } from "./widgets/Weather";

function Projects() {
  return (
    <div className="flex flex-col gap-8 lg:gap-12 pb-10">
      <div className="mx-auto max-w-2xl w-full px-3 md:px-5 pt-2">
        <h2 className="text-slate-500 text-sm">selected work</h2>
      </div>

      {/* ---- FLAGSHIP: colubrid ---------------------------------------- */}
      <div className="flex flex-col relative lg:rounded-2xl overflow-hidden">
        <div className="mx-auto max-w-2xl w-full p-3 md:p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              target="_blank"
              rel="noreferrer"
              href="https://colubrid.tohirr.xyz"
              className="text-lg font-semibold border-b w-max border-black"
            >
              colubrid 🐍 <HiOutlineArrowUpRight className="inline" />
            </a>
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              flagship
            </span>
          </div>
          <p className="opacity-70 text-xs md:text-base my-3">
            Snake, but the grid is a cube — a full 3D volume you steer through
            with a free-orbiting camera. Built from scratch with Three.js,
            React and TypeScript. Installable PWA with offline play and a
            Redis-backed global leaderboard.
          </p>
          <div className="flex flex-wrap gap-2 text-xs mb-1">
            {["Three.js", "TypeScript", "WebGL", "PWA", "Redis"].map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="flex gap-3 mt-3">
            <a
              target="_blank"
              rel="noreferrer"
              href="https://colubrid.tohirr.xyz"
              className="inline-flex items-center gap-2 text-sm bg-zinc-900 text-white px-4 py-2 rounded-full hover:bg-zinc-700 transition"
            >
              <FiPlay /> Play live
            </a>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://github.com/tohirr/colubrid"
              className="inline-flex items-center gap-2 text-sm border border-zinc-300 px-4 py-2 rounded-full hover:bg-zinc-100 transition"
            >
              Source <HiOutlineArrowUpRight />
            </a>
          </div>
        </div>
        <div className="z-10 p-3 flex overflow-x-auto w-full gap-4 lg:gap-6">
          <img
            src="/project_imgs/colubrid/arena.png"
            alt="colubrid — a wireframe cube arena with the snake and a glowing gem"
            className="rounded-2xl border border-slate-200 shadow-sm max-h-[26rem]"
          />
          <img
            src="/project_imgs/colubrid/action.png"
            alt="colubrid — the snake bending through the volume toward the gem"
            className="rounded-2xl border border-slate-200 shadow-sm max-h-[26rem]"
          />
        </div>
      </div>

      {/* ---- harvestgrove ---------------------------------------------- */}
      <div className="flex flex-col relative lg:rounded-2xl overflow-hidden">
        <div className="mx-auto max-w-2xl w-full p-3 md:p-5">
          <a
            target="_blank"
            rel="noreferrer"
            href="https://harvestgrover.vercel.app/"
            className="text-lg border-b w-max border-black"
          >
            harvestgrove <HiOutlineArrowUpRight className="inline" />
          </a>
          <p className="opacity-60 text-xs md:text-base my-3">
            a website that promotes sustainable farming
          </p>
        </div>
        <div className="z-10 p-3 rounded-lg flex overflow-x-auto w-full gap-4 lg:gap-6 h-[32rem]">
          <img
            src="/project_imgs/harvestgrove/hero.jpg"
            alt=""
            className="border-b rounded-2xl hidden lg:block border"
          />
          <img
            src="/project_imgs/harvestgrove/mobilehero.png"
            alt=""
            className="rounded-2xl lg:hidden border"
          />
          <img
            src="/project_imgs/harvestgrove/about.png"
            alt=""
            className="border-b rounded-xl hidden lg:block"
          />
          <img
            src="/project_imgs/harvestgrove/mobileabout.png"
            alt=""
            className="rounded-xl lg:hidden"
          />
          <img
            src="/project_imgs/harvestgrove/cards.png"
            alt=""
            className="border-b rounded-2xl hidden lg:block"
          />
          <img
            src="/project_imgs/harvestgrove/section.png"
            alt=""
            className="border-b rounded-2xl hidden lg:block"
          />
        </div>
      </div>

      {/* ---- southsidefood --------------------------------------------- */}
      <div className="flex flex-col relative lg:rounded-2xl overflow-hidden">
        <div className="mx-auto max-w-2xl w-full p-3 md:p-5">
          <a
            target="_blank"
            rel="noreferrer"
            href="https://southsidefood.vercel.app/"
            className="text-lg border-b w-max border-black"
          >
            southsidefood <HiOutlineArrowUpRight className="inline" />
          </a>
          <p className="opacity-60 text-xs md:text-base my-3">
            an ecommerce website for a restaurant
          </p>
        </div>
        <div className="hidden lg:flex z-10 p-3 overflow-x-auto gap-6 h-[32rem] w-full">
          <img
            src="/project_imgs/southsidefood/desktop/home.png"
            alt=""
            className="border-b rounded-2xl bg-white border"
          />
          <img
            src="/project_imgs/southsidefood/desktop/dishes.png"
            alt=""
            className="border-b rounded-2xl bg-white border"
          />
          <img
            src="/project_imgs/southsidefood/desktop/subscribe.png"
            alt=""
            className="border-b rounded-2xl bg-white border"
          />
        </div>
        <div className="lg:hidden z-10 p-3 rounded-lg flex overflow-x-auto w-full gap-4 h-[32rem]">
          <img
            src="/project_imgs/southsidefood/mobile/home.png"
            alt=""
            className="rounded-2xl bg-white object-contain border"
          />
          <img
            src="/project_imgs/southsidefood/mobile/desc.png"
            alt=""
            className="rounded-2xl border"
          />
        </div>
      </div>

      {/* ---- smaller stuff --------------------------------------------- */}
      <div className="mx-auto max-w-2xl w-full p-3 md:p-5 flex flex-col gap-4">
        <h2 className="text-slate-500 text-sm">also built</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a
            target="_blank"
            rel="noreferrer"
            href="https://galaria.vercel.app/"
            className="border-b w-max border-black"
          >
            galeria — a curated collection of african art{" "}
            <HiOutlineArrowUpRight className="inline" />
          </a>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-slate-500 text-sm">
            pandawidgets — compact utility widgets for the web
          </p>
          <div className="relative flex justify-center gap-6 flex-wrap">
            <DigitalClock />
            <Battery />
            <Weather />
          </div>
        </div>
      </div>

      {/* ---- contact CTA ----------------------------------------------- */}
      <div className="mx-auto max-w-2xl w-full p-5 md:p-6 rounded-2xl bg-zinc-900 text-white flex flex-col gap-3">
        <p className="text-base md:text-lg font-semibold">
          Building anything with 3D on the web?
        </p>
        <p className="text-sm text-white/70">
          I&apos;m open to 3D / graphics &amp; CAD software roles. Let&apos;s talk.
        </p>
        <div className="flex flex-wrap gap-3 mt-1 text-sm">
          <a
            href="https://mail.google.com/mail/u/0/?fs=1&to=tohirbabs@gmail.com&su=Hello%20Tohir&tf=cm"
            target="_blank"
            rel="noreferrer"
            className="bg-white text-zinc-900 px-4 py-2 rounded-full hover:bg-zinc-200 transition"
          >
            Email me
          </a>
          <a
            href="https://github.com/tohirr"
            target="_blank"
            rel="noreferrer"
            className="border border-white/30 px-4 py-2 rounded-full hover:bg-white/10 transition inline-flex items-center gap-2"
          >
            GitHub <HiOutlineArrowUpRight />
          </a>
          <a
            href="https://www.linkedin.com/in/tohir-babs-6a0045167/"
            target="_blank"
            rel="noreferrer"
            className="border border-white/30 px-4 py-2 rounded-full hover:bg-white/10 transition inline-flex items-center gap-2"
          >
            LinkedIn <HiOutlineArrowUpRight />
          </a>
        </div>
      </div>
    </div>
  );
}

export default Projects;
