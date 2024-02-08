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


import { NavLink } from 'react-router-dom';


function Layout({children}) {
  const [navOpen, setNavOpen] = useState(false)
 const navLinks = [{title:"home", href:"/", icon:<MdKeyboardCommandKey/>},
,{title:"writing", href:"/writing", icon:<LuPenTool/>},
{title:"projects", href:"/projects", icon:<HiOutlineSparkles/>},
{title:"tools", href:"/tools", icon:<FiTool/>},
{title:"bookmarks", href:"/bookmarks", icon:<BiBookmarkAltPlus/>},]

const socialLinks = [
  {title:"gmail", href:"https://github.com/TohirBabs", icon:<SiGmail/>},  
  {title:"github", href:"https://github.com/TohirBabs", icon:<TfiGithub/>},
{title:"X/twitter", href:"https://twitter.com/BabsTohir", icon:<FaXTwitter/>},
{title:"whatsapp", href:"https://twitter.com/BabsTohir", icon:<FaWhatsapp/>},

,{title:"linkedin", href:"https://www.linkedin.com/in/tohir-babs-6a0045167/", icon:<LuLinkedin/>},
{title:"spotify", href:"https://open.spotify.com/user/e48xr1tcz09muuqh1oski4qme", icon:<SlSocialSpotify/>},
{title:"threads", href:"https://www.threads.net/@dev_panda42", icon:<SiThreads/>},
{title:"pinterest", href:"https://www.pinterest.com/tohirbabs/", icon:<ImPinterest2/>},]

const NavButton = ({link}) => {
return <NavLink exact to={link.href} className={({isActive})=>`flex gap-3 hover:bg-slate-300 transition cursor-pointer  p-2  rounded-md items-center justify-between ${isActive ? "text-white bg-slate-900 hover:bg-slate-900 hover:text-white":""}`}>
<div className="flex items-center gap-3">
<div className="text-base">
  {link.icon}
</div>
{link.title}
</div>

</NavLink>
  }


  const SocialLink = ({link}) => {
    return <a href={link.href} className="flex gap-3 hover:bg-slate-300 transition cursor-pointer  p-2  rounded-md items-center justify-between">
      <div className="flex items-center gap-3">
      <div className="text-base">
        {link.icon}
      </div>
    {link.title}
      </div>
    <HiOutlineArrowUpRight/>
      
    </a>
      }

  return (
    <div className="bg-grid-[#80808012] font-mono relative flex w-screen overflow-hidden bg-white h-screen">
      <div
      style={{bottom: navOpen ? "0":"-100vh"}}
       className="absolute z-10 lg:static h-[80vh] w-screen transition-all backdrop-blur lg:backdrop-blur-none duration-300 overflow-y-auto rounded-t-3xl lg:rounded-t-none lg:p-3 p-2 lg:w-72 lg:h-screen bg-slate-200/90  lg:border-r border">
        <div className="flex justify-center pb-2 lg:hidden">
          <div className="w-16 h-1 rounded-full bg-slate-300 "></div>
        </div>
        <a href="/" className="flex hover:bg-slate-300 p-2 rounded-xl items-center gap-2">
          <img src="/selfai.png" alt="" className="w-12 h-12 rounded-md bg-slate-500" />
          <div className="leading-tight">
            <h1 className="font-semibold text-lg">Tohir Babátúndé</h1>
            <h2>ui developer</h2>
          </div>
        </a>
        <div className="flex flex-col text-sm gap-1 py-4 ">
          {navLinks.map((link, index) => <NavButton key={index} link={link}/>)}
        </div>
        <div className="flex text-sm flex-col gap-1 py-4">
          <p className="px-2 text-slate-700">online</p>
          {socialLinks.map((link, index) => <SocialLink key={index} link={link}/>)}
        </div>
      </div>
      <div className="flex flex-col items-center lg:p-6  flex-1 h-screen overflow-y-auto">
      <div onClick={() => setNavOpen(open => !open)} className="flex w-full mb-4 items-center border-b p-1 text-xl bg-white/50 backdrop-blur-sm shadow gap-4 sticky top-0 lg:hidden">
        <div className="w-10 h-10 flex justify-center items-center">
          <MdKeyboardCommandKey/>
        </div>
        <p className=" text-sm items-center">Tohir Babátúndé</p>
      </div>
        {children}
      </div>
    </div>
  )
}

export default Layout
