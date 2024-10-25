import { HiOutlineArrowUpRight } from "react-icons/hi2";
import { DigitalClock } from "./widgets/DigitalClock";
import { Battery } from "./widgets/Battery";
import { Weather } from "./widgets/Weather";
import { NavLink } from "react-router-dom";

function Projects() {
  const NavButton = ({ link }) => {
    return (
      <NavLink
        exact
        to={link.href}
        className={({
          isActive,
        }) => `flex gap-3  transition cursor-pointer  p-4  rounded-full items-center justify-between 
  ${
    !isActive
      ? "text-black  hover:bg-zinc-800 bg-zinc-300 "
      : "hover:bg-zinc-800 font-semibold bg-zinc-800 text-white"
  }`}
      >
        <div className="flex text-xs items-center gap-1">
          <div className="">{link.icon}</div>
          {link.title}
        </div>
      </NavLink>
    );
  };
  const navLinks = [
    { title: "projects", href: "/projects", icon: "✨" },
    { title: "read_me", href: "/", icon: "🏠" },
    { title: "writing", href: "/writing", icon: "✒︎" },
    { title: "tools", href: "/tools", icon: "🔧" },
    { title: "bookmarks", href: "/bookmarks", icon: "🔖" },
  ];

  return (
    <div className="  flex flex-col gap-8 lg:gap-10 ">
      <div className="h-[2px] bg-zinc-300 w-[95%] mx-auto"></div>
      <div className="flex flex-col  relative lg:rounded-2xl overflow-hidden">
        <div className="mx-auto max-w-2xl w-full p-3 md:p-5">
          <a href="" className="text-lg border-b w-max border-black">harvestgrove <HiOutlineArrowUpRight className="inline"/></a>
          <p className="opacity-60 text-xs md:text-base my-3 ">a website that promotes sustainable farming </p>
        </div>
        <div className=" z-10 p-3 rounded-lg flex overflow-x-scroll w-full flex gap-4 lg:gap-6 h-[32rem] lg:h-[32rem]">
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
            src="/project_imgs/harvestgrove/mobilecards.png"
            alt=""
            className="rounded-xl lg:hidden"
          />
          <img
            src="/project_imgs/harvestgrove/section.png"
            alt=""
            className="border-b rounded-2xl hidden lg:block"
          />
          <img
            src="/project_imgs/harvestgrove/mobilesection.png"
            alt=""
            className="rounded-xl lg:hidden"
          />
        </div>
      </div>
      <div className="flex flex-col  relative lg:rounded-2xl overflow-hidden">
      <div className="mx-auto max-w-2xl w-full p-3 md:p-5">
          <a href="" className="text-lg border-b w-max border-black">southsidefood <HiOutlineArrowUpRight className="inline"/></a>
           <p className="opacity-60 text-xs md:text-base my-3 ">an ecommerce website for a restaurant</p>
        </div>
        <div className="hidden lg:flex  z-10 p-3   overflow-x-scroll  gap-6 h-[32rem] w-full">
          <img
            src="/project_imgs/southsidefood/desktop/home.png"
            alt=""
            className="border-b rounded-2xl bg-white  border"
          /> <img
          src="/project_imgs/southsidefood/desktop/dishes.png"
          alt=""
          className="border-b rounded-2xl bg-white  border"
        />
          
         
        </div>
        <div className="lg:hidden z-10 p-3 rounded-lg flex overflow-x-scroll w-full flex gap-4 lg:gap-6 h-[32rem] ">
          <img
            src="/project_imgs/southsidefood/mobile/home.png"
            alt=""
            className=" rounded-2xl bg-white object-contain border"
          /><img
          src="/project_imgs/southsidefood/mobile/desc.png"
          alt=""
          className="rounded-2xl border"
        />
          <img
            src="/project_imgs/southsidefood/mobile/Track Order.png"
            alt=""
            className="rounded-2xl border"
          /> <img
          src="/project_imgs/southsidefood/mobile/team.png"
          alt=""
          className="rounded-2xl border"
        />  <img
            src="/project_imgs/southsidefood/mobile/contact.png"
            alt=""
            className="rounded-2xl border"
          /></div>
      </div>
      <div className="flex items-center justify-center relative lg:rounded-2xl rounded-lg   shadow overflow-hidden">
        {/* <img src="/field.png" alt="" className="absolute top-0 h-full w-full" /> */}
        <div className="bg-white  rounded-xl overflow-hidden">
          <img src="/titlebar.png" alt="" className="border-b " />

          <img
            src="/gallara.png"
            alt=""
            className="object-cover w-full h-full"
          />
          <img
            src="/galara2.png"
            alt=""
            className="object-cover w-full h-full"
          />
        </div>

        <a
          target="_blank"
          href="https://galaria.vercel.app/"
          className="absolute  lg:bottom-4 lg:right-4 bottom-1 right-1 text-xs bg-slate-200 text-black hover:bg-red-300 transition shadow border border-slate-50 w-max p-1   rounded-md flex items-center gap-1"
        >
          <span>galaria</span>
          <div className="p-1  text-white bg-red-800 rounded">
            <HiOutlineArrowUpRight />
          </div>
        </a>
      </div>
      <div className="flex flex-col items-center  gap-3 ">
        {/* <p className="text-xs bg-red-200 m-3 shadow border w-max p-1 px-2 rounded-md ">pandawidgtes.&#128214;</p> */}
        <div className=" relative flex max-w-[24rem] bg-zinc-300 lg:p-8 lg:py-8 p-3 py-5 rounded-2xl lg:max-w-none justify-center gap-6 my-8 flex-wrap">
          <DigitalClock />
          <Battery />
          <Weather />
        </div>
      </div>
    </div>
  );
}

export default Projects;
