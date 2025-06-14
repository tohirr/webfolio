import { TfiGithub } from "react-icons/tfi";
import { FaWhatsapp, FaXTwitter } from "react-icons/fa6";
// import { ImPinterest2 } from "react-icons/im";
// import { IoMdArrowDropupCircle } from "react-icons/io";
import { SiGmail} from "react-icons/si";
import { LuLinkedin } from "react-icons/lu";
import { SlSocialSpotify } from "react-icons/sl";
// import { useSwipeable } from "react-swipeable";
import { HiOutlineArrowUpRight } from "react-icons/hi2";
// import { NavLink } from 'react-router-dom';
// import { useState } from "react";
// import { useRef } from "react";



const Nav = () => {
// const [navOpen, setNavOpen] = useState(false)


  //   const navLinks = [
  //     {title:"read_me", href:"/", icon:"🏠"},
  //     {title:"projects", href:"/projects", icon:"✨"},
  //   {title:"writing", href:"/writing", icon:"✒︎"},
  //   {title:"tools", href:"/tools", icon:"🔧"},
  //   {title:"bookmarks", href:"/bookmarks", icon:"🔖"},
  // ]
    
    const socialLinks = [
    {title:"gmail", href:"https://mail.google.com/mail/u/0/?fs=1&to=tohirbabs@gmail.com&su=SUBJECT&body=BODY&tf=cm", icon:<SiGmail/>},  
    {title:"github", href:"https://github.com/TohirBabs", icon:<TfiGithub/>},
    {title:"X/twitter", href:"https://twitter.com/tohir_dev", icon:<FaXTwitter/>},
    {title:"whatsapp", href:"https://wa.link/l4h8xz", icon:<FaWhatsapp/>},
    {title:"linkedin", href:"https://www.linkedin.com/in/tohir-babs-6a0045167/", icon:<LuLinkedin/>},
    {title:"spotify", href:"https://open.spotify.com/user/e48xr1tcz09muuqh1oski4qme", icon:<SlSocialSpotify/>},
    // {title:"threads", href:"https://www.threads.net/@dev_panda42", icon:<SiThreads/>},
    // {title:"pinterest", href:"https://www.pinterest.com/tohirbabs/", icon:<ImPinterest2/>},
]
    


// const NavButton = ({link}) => {
//     return <NavLink exact to={link.href} className={({isActive})=>`flex gap-3  transition cursor-pointer  p-2 rounded-md items-center justify-between 
//     ${!isActive ? "text-white  hover:bg-zinc-800 ":"hover:bg-zinc-400 font-semibold bg-zinc-400"}`}>
//     <div className="flex text-xs items-center gap-1 lg:gap-2">
//     <div className="">
//       {link.icon}
//     </div>
//     {link.title}
//     </div>    
//     </NavLink>
//       }   
      const SocialLink = ({link}) => {
        return <a href={link.href} className="flex lg:gap-3 gap-1 text-white hover:bg-zinc-800 transition cursor-pointer  p-2  rounded-md items-center justify-between">
          <div className="flex items-center gap-2  ">
          <div className="text-lg">
            {link.icon}
          </div>
          <p className="hidden lg:flex text-xs">           {link.title}</p>
          </div>
          <HiOutlineArrowUpRight className="hidden lg:flex "/>     
        </a>
          }
    
    return (
        <div
          className=" lg:static  w-full duration-300 transition-all overflow-hidden lg:overflow-visible flex flex-col lg:w-64 lg:h-screen sticky top-0">
        
        <div
              className="flex  items-center text-white">

        <a href="/" className="flex justify-between w-full flex-1  hover:bg-zinc-800 p-2 px-3 lg:p-2 rounded-lg items-center gap-2">

          <div className="leading-snug">
            <h1 className=" text-lg">Tohir Babátúndé</h1>
            <h2 className="text-white/70 "> ui developer</h2>
          </div>

          <img src="alien-emoji.svg" alt="" className="w-10 h-10  rounded-lg bg-zinc-200" />


        </a>

        {/* <div style={{transform: !navOpen ? "rotate(180deg)":""}} onClick={()=> setNavOpen((prevState) => !prevState)} className="w-10 lg:hidden h-10 text-2xl flex items-center transition-all duration-300 justify-center">
        <IoMdArrowDropupCircle/>

        </div> */}
        </div>  
        <div
        className="flex w-full transition-all flex-col overflow-x-auto lg:pt-6 lg:gap-8">
        {/* <div className="flex  gap-1 flex-col py-2">
          {navLinks.map((link, index) => <NavButton key={index} link={link}/>)}
        </div> */}
        <div className="flex text-sm lg:flex-col gap-3 p-1 px-2 lg:px-0 ">
          <p className="px-2 text-zinc-500 hidden lg:flex">@ online</p>
          {socialLinks.map((link, index) => <SocialLink key={index} link={link}/>)}
        </div>
        </div>
        
      </div>
    )
}

export default Nav
