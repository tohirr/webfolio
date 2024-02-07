import { MdKeyboardCommandKey } from "react-icons/md";
import { TfiGithub } from "react-icons/tfi";
import { FaXTwitter } from "react-icons/fa6";
import { ImPinterest2 } from "react-icons/im";
import { HiOutlineArrowUpRight } from "react-icons/hi2";
import { HiOutlineSparkles } from "react-icons/hi2";
import { SiGmail, SiThreads } from "react-icons/si";
import { LuPenTool,LuLinkedin } from "react-icons/lu";
import { BiBookmarkAltPlus } from "react-icons/bi";
import { FiTool } from "react-icons/fi";
import { SlSocialSpotify } from "react-icons/sl";
import { useState } from "react";
import { Outlet } from "react-router-dom";


function Root() {
  const [navOpen, setNavOpen] = useState(false)
 const navLinks = [{title:"home", href:"/home", icon:<MdKeyboardCommandKey/>},
,{title:"writing", href:"/writing", icon:<LuPenTool/>},
{title:"projects", href:"/projects", icon:<HiOutlineSparkles/>},
{title:"tools", href:"/tools", icon:<FiTool/>},
{title:"bookmarks", href:"/bookmarks", icon:<BiBookmarkAltPlus/>},]

const socialLinks = [
  {title:"gmail", href:"https://github.com/TohirBabs", icon:<SiGmail/>},  
  {title:"github", href:"https://github.com/TohirBabs", icon:<TfiGithub/>},
{title:"x/twitter", href:"https://twitter.com/BabsTohir", icon:<FaXTwitter/>}
,{title:"linkedin", href:"https://www.linkedin.com/in/tohir-babs-6a0045167/", icon:<LuLinkedin/>},
{title:"spotify", href:"https://open.spotify.com/user/e48xr1tcz09muuqh1oski4qme", icon:<SlSocialSpotify/>},
{title:"threads", href:"https://www.threads.net/@dev_panda42", icon:<SiThreads/>},
{title:"pinterest", href:"https://www.pinterest.com/tohirbabs/", icon:<ImPinterest2/>},]

const NavLink = ({link}) => {
return <a href={link.href} className="flex gap-3 hover:bg-slate-300 transition cursor-pointer  p-2  rounded-md items-center justify-between">
<div className="flex items-center gap-3">
<div className="text-base">
  {link.icon}
</div>
{link.title}
</div>

</a>
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
       className="absolute lg:static h-[80vh] w-screen transition-all  duration-300 overflow-y-auto rounded-t-2xl lg:rounded-t-none p-3 lg:w-72 lg:h-screen bg-slate-100  lg:border-r border">
        <div className="flex justify-center pt-2 pb-4 lg:hidden">
          <div className="w-20 h-2 rounded-full bg-slate-300 "></div>
        </div>
        <a href="/" className="flex hover:bg-slate-300 p-2 rounded-xl items-center gap-2">
          <img src="/selfai.png" alt="" className="w-12 h-12 rounded-md bg-slate-500" />
          <div className="leading-tight">
            <h1 className="font-semibold text-lg">Tohir Babátúndé</h1>
            <h2>ui developer</h2>
          </div>
        </a>
        <div className="flex flex-col text-sm gap-1 py-6 ">
          {navLinks.map((link, index) => <NavLink key={index} link={link}/>)}
        </div>
        <div className="flex text-sm flex-col gap-1 py-4">
          <p className="px-2 text-slate-700">online</p>
          {socialLinks.map((link, index) => <SocialLink key={index} link={link}/>)}
        </div>
      </div>
      <div className="flex justify-center lg:p-16  flex-1 h-screen overflow-y-auto">
        <Outlet/>
        <div className="lg:max-w-2xl">
          <div onClick={() => setNavOpen(open => !open)} className="flex items-center border-b p-2 text-xl bg-white shadow gap-4 lg:hidden">
            <div className="w-10 h-10 flex justify-center items-center">
              <MdKeyboardCommandKey/>
            </div>
            <p className="font-semibold items-center">Tohir Babátúndé</p>
          </div>
          <div className="p-6 m- text-sm lg:text-base bg-slate-50 shadow rounded-xl border flex flex-col gap-4">
            <p className="text-xs bg-red-200 shadow border w-max p-1 px-2 rounded-md ">about_me.md</p>
            {/* <div className="flex justify-center">
            <img src="/dev_panda.png" alt="" className="w-72" />

            </div> */}
          <p>Hi there!&#x1F44B;
            I'm <span className="font-semibold">Tohir</span>&#128060; , a ui developer focused on building beautiful, snappy user interfaces and performant,
             scalable web applications.</p>
            <ul className="flex flex-col gap-2">
              <li>- 🔭 currently building web widgets @ pandawidgets.com</li>   
              <li>- &#127891; in my final year studying engineering at Unilag</li>
              <li>- &#9997; I write <strike className="italic">frequently</strike>  whenever i feel the muse</li>
              <li>- &#128172; love chatting about technology, movies and music</li>
              {/* <li>- 🤔 I'm looking for help with Typescript and React</li> */}
              <li>- &#129504; learning Typescript and skateboarding</li>
              <li>- 😄 pronouns he/him</li>
              <li>- &#127475;&#127468; based in lagos, Nigeria </li>
              <li>- ⚡ fun fact: i blink alot less than average</li>


            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Root
