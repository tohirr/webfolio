import { MdKeyboardCommandKey } from "react-icons/md";
import { TfiGithub } from "react-icons/tfi";
import { FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { ImPinterest2 } from "react-icons/im";
import { HiOutlineArrowUpRight } from "react-icons/hi2";
import { HiOutlineSparkles } from "react-icons/hi2";
import { SiGmail, SiThreads } from "react-icons/si";
import { LuPenTool,LuLinkedin } from "react-icons/lu";
import { BiBookmarkAltPlus } from "react-icons/bi";
import { FiTool } from "react-icons/fi";
import { SlSocialSpotify } from "react-icons/sl";
import { useState } from "react";
import { IoArrowDownCircleOutline } from "react-icons/io5";
import { NavLink } from 'react-router-dom';

function Layout({children}) {
  
  const [navOpen, setNavOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);



  const navLinks = [{title:"home", href:"/", icon:"🏠"},
{title:"writing", href:"/writing", icon:"✒︎"},
{title:"projects", href:"/projects", icon:"✨"},
{title:"tools", href:"/tools", icon:"🔧"},
{title:"bookmarks", href:"/bookmarks", icon:"🔖"},]

const socialLinks = [
{title:"gmail", href:"https://github.com/TohirBabs", icon:<SiGmail/>},  
{title:"github", href:"https://github.com/TohirBabs", icon:<TfiGithub/>},
{title:"X/twitter", href:"https://twitter.com/BabsTohir", icon:<FaXTwitter/>},
{title:"whatsapp", href:"https://twitter.com/BabsTohir", icon:<FaWhatsapp/>},
{title:"linkedin", href:"https://www.linkedin.com/in/tohir-babs-6a0045167/", icon:<LuLinkedin/>},
{title:"spotify", href:"https://open.spotify.com/user/e48xr1tcz09muuqh1oski4qme", icon:<SlSocialSpotify/>},
{title:"threads", href:"https://www.threads.net/@dev_panda42", icon:<SiThreads/>},
{title:"pinterest", href:"https://www.pinterest.com/tohirbabs/", icon:<ImPinterest2/>},]


const handleTouchStart = (e) => {
  setDragging(true);
  setDragY(e.touches[0].clientY);
};

const handleTouchMove = (e) => {
  if (dragging) {
    const newY = e.touches[0].clientY;
    const delta = newY - dragY;
    const newHeight = Math.max(0, window.innerHeight - newY);
    setDragY(delta);

    if (delta !== 0) {
      setIsOpen(newHeight > window.innerHeight / 2);
    }
  }
};

const handleTouchEnd = () => {
  setDragging(false);}
console.log(dragY);

const NavButton = ({link}) => {
return <NavLink exact to={link.href} className={({isActive})=>`flex gap-3  transition cursor-pointer  p-2  rounded-md items-center justify-between 
${isActive ? "text-white bg-slate-900 hover:bg-slate-900 font-semibold hover:text-white":"hover:bg-slate-200"}`}>
<div className="flex text-sm items-center gap-2">
<div className="">
  {link.icon}
</div>
{link.title}
</div>

</NavLink>
  }


  const SocialLink = ({link}) => {
    return <a href={link.href} className="flex gap-3 hover:bg-slate-300 transition cursor-pointer  p-2  rounded-md items-center justify-between">
      <div className="flex items-center gap-2 font-semibold ">
      <div className="text-base">
        {link.icon}
      </div>
       {link.title}
      </div>
      <HiOutlineArrowUpRight/>     
    </a>
      }

  return (
    <div className="bg-grid-[#80808012] font-mono text-sm relative flex w-screen overflow-hidden bg-white h-screen">
      <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      // onMouseDown={handleMouseDown}
      // onMouseMove={handleMouseMove}
      // onMouseUp={handleMouseUp}
      // onMouseLeave={handleMouseUp}
          style={{top: `${dragY}px`}}
          className="absolute z-30 lg:static h-[80vh] w-screen transition-all backdrop-blur lg:backdrop-blur-none duration-300 overflow-y-auto rounded-t-3xl lg:rounded-t-none flex flex-col gap-3  p-1 lg:w-64 lg:h-screen lg:bg-slate-50 bg-white/80  lg:border-r border">
        <div className="flex justify-center  lg:hidden">
          <div className="w-16 h-1 rounded-full bg-slate-800 animate-bounce mt-2"></div>
        </div>
        <div className="flex items-center gap-2">
        <a href="/" className="flex flex-1 hover:bg-slate-200 p-1 rounded-lg items-center gap-2">
          <img src="/selfai.png" alt="" className="w-12 h-12 rounded-md bg-slate-500" />
          <div className="leading-tight">
            <h1 className="font-semibold text-base">Tohir Babátúndé</h1>
            <h2>ui developer</h2>
          </div>
        </a>
        </div>  
        <div className="flex flex-col text-sm  ">
          {navLinks.map((link, index) => <NavButton key={index} link={link}/>)}
        </div>
        <div className="flex text-sm flex-col gap-1">
          <p className="px-2 text-slate-700">online</p>
          {socialLinks.map((link, index) => <SocialLink key={index} link={link}/>)}
        </div>
      </div>
      <div className="flex flex-col lg:p-6 pb-[6rem] flex-1 h-screen overflow-y-auto">
      {/* <div onClick={() => setNavOpen(open => !open)} className="flex w-full mb-4 items-center border-b p-1 text-xl bg-white/70 backdrop-blur shadow gap-4 sticky top-0 lg:hidden">
        <div className="w-10 h-10 flex justify-center items-center">
          <MdKeyboardCommandKey/>
        </div>
        <p className=" text-sm items-center">Tohir Babátúndé</p>
      </div> */}
        {children}
      </div>
    </div>
  )
}

export default Layout
