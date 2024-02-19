import { TfiGithub } from "react-icons/tfi";
import { FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { ImPinterest2 } from "react-icons/im";
import { IoMdArrowDropupCircle } from "react-icons/io";
import { SiGmail, SiThreads } from "react-icons/si";
import { LuLinkedin } from "react-icons/lu";
import { SlSocialSpotify } from "react-icons/sl";
import { useSwipeable } from "react-swipeable";
import { HiOutlineArrowUpRight } from "react-icons/hi2";
import { NavLink } from 'react-router-dom';
import { useState } from "react";
import { useRef } from "react";



const Nav = () => {
const [navOpen, setNavOpen] = useState(false)


    const navLinks = [
      {title:"projects", href:"/projects", icon:"✨"},
      {title:"read_me", href:"/", icon:"🏠"},
    {title:"writing", href:"/writing", icon:"✒︎"},
    {title:"tools", href:"/tools", icon:"🔧"},
    {title:"bookmarks", href:"/bookmarks", icon:"🔖"},
  ]
    
    const socialLinks = [
    {title:"gmail", href:"https://github.com/TohirBabs", icon:<SiGmail/>},  
    {title:"github", href:"https://github.com/TohirBabs", icon:<TfiGithub/>},
    {title:"X/twitter", href:"https://twitter.com/BabsTohir", icon:<FaXTwitter/>},
    {title:"whatsapp", href:"https://twitter.com/BabsTohir", icon:<FaWhatsapp/>},
    {title:"linkedin", href:"https://www.linkedin.com/in/tohir-babs-6a0045167/", icon:<LuLinkedin/>},
    {title:"spotify", href:"https://open.spotify.com/user/e48xr1tcz09muuqh1oski4qme", icon:<SlSocialSpotify/>},
    // {title:"threads", href:"https://www.threads.net/@dev_panda42", icon:<SiThreads/>},
    // {title:"pinterest", href:"https://www.pinterest.com/tohirbabs/", icon:<ImPinterest2/>},
]
    


const NavButton = ({link}) => {
    return <NavLink exact to={link.href} className={({isActive})=>`flex gap-3  transition cursor-pointer  p-2 rounded-md items-center justify-between 
    ${!isActive ? "text-white  hover:bg-zinc-800 ":"hover:bg-zinc-400 font-semibold bg-zinc-400"}`}>
    <div className="flex text-xs items-center gap-1 lg:gap-2">
    <div className="">
      {link.icon}
    </div>
    {link.title}
    </div>
    
    </NavLink>
      }
    
    
      const SocialLink = ({link}) => {
        return <a href={link.href} className="flex gap-3 text-white hover:bg-zinc-800 transition cursor-pointer  p-2  rounded-md items-center justify-between">
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
        <div
          className=" lg:static  w-full duration-300 transition-all overflow-hidden lg:overflow-visible flex flex-col lg:w-64 lg:h-screen sticky top-0">
        
        <div
              className="flex  items-center text-white">

        <a href="/" className="flex w-full flex-1 hover:bg-zinc-800 p-2 lg:p-0 rounded-lg items-center gap-2">
                                <img src="/selfai.png" alt="" className="w-10 h-10 rounded-lg bg-zinc-200" />

          <div className="leading-snug">

            <h1 className=" text-lg">Tohir Babátúndé</h1>
            <h2 className="text-white/70 ">ui developer</h2>
          </div>

        </a>
        <div style={{transform: !navOpen ? "rotate(180deg)":""}} onClick={()=> setNavOpen((prevState) => !prevState)} className="w-10 lg:hidden h-10 text-2xl flex items-center transition-all duration-300 justify-center">
        <IoMdArrowDropupCircle/>

        </div>
        </div>  
        <div
         style={{height: navOpen ?"500px":"0px"}} 
        className="flex w-full  transition-all flex-col overflow-x-auto lg:pt-6 p-2  gap-8">
        <div className="flex  gap-1 flex-col py-2">
          {navLinks.map((link, index) => <NavButton key={index} link={link}/>)}
        </div>
        <div className="flex text-sm flex-col gap-1  ">
          <p className="px-2 text-zinc-700">online</p>
          {socialLinks.map((link, index) => <SocialLink key={index} link={link}/>)}
        </div>
        </div>
        
      </div>
    )
}

export default Nav