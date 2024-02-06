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
import { IoIosArrowDown } from "react-icons/io";
import { SlSocialSpotify } from "react-icons/sl";


function App() {
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
{title:"threads", href:"/", icon:<SiThreads/>},
{title:"pinterest", href:"https://www.pinterest.com/tohirbabs/", icon:<ImPinterest2/>},]

const NavLink = ({link}) => {
return <a href={link.href} className="flex gap-3 hover:bg-slate-300 transition cursor-pointer  p-2  rounded-md items-center justify-between">
<div className="flex items-center gap-3">
<div className="text-base">
  {link.icon}
</div>
{link.title}
</div>
<IoIosArrowDown/>

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
    <div className="bg-grid-[#80808012] font-mono flex w-screen bg-white h-screen">
      <div className="w-72 h-screen bg-slate-100 p-2 border-r border">
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
      <div className="flex justify-center p-10 flex-1">
        <div className="max-w-2xl">
          <div className="p-5 bg-slate-50 shadow rounded-xl border flex flex-col gap-4">
          <p>Hi there!&#x1F44B;
            I'm <span className="font-semibold">Tohir</span>&#128060; , a ui developer</p>
            <ul className="flex flex-col gap-2">
              <li>- </li>
            </ul>
            <p> - "pure" in english, a ui developer, writer, art collector and audiophile, based in Lagos, Nigeria.&#127475;&#127468;</p>
          <p>I'm a frontend developer focused on building beautiful, snappy user interfaces and performant,
             scalable web applications. I develop things as a Senior Frontend Software Engineer at Bitvavo. 
             Previously, I worked as a Senior Frontend Software Engineer at heycar, Frontend Software Engineer at Yemeksepeti, 
            Fullstack Software Engineer at Sistas, Mobile Developer at Tanbula, and Specialist at Apple.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
