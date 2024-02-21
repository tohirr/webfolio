import { HiOutlineArrowUpRight } from "react-icons/hi2"
import { DigitalClock } from "./widgets/DigitalClock"
import { Battery } from "./widgets/Battery"
import { Weather } from "./widgets/Weather"
import { NavLink } from "react-router-dom"

function Projects (){

const NavButton = ({link}) => {
  return <NavLink exact to={link.href} className={({isActive})=>`flex gap-3  transition cursor-pointer  p-4  rounded-full items-center justify-between 
  ${!isActive ? "text-black  hover:bg-zinc-800 bg-zinc-300 ":"hover:bg-zinc-800 font-semibold bg-zinc-800 text-white"}`}>
  <div className="flex text-xs items-center gap-1">
  <div className="">
    {link.icon}
  </div>
  {link.title}
  </div>
  
  </NavLink>
    }
  const navLinks = [
  {title:"projects", href:"/projects", icon:"✨"},
  {title:"read_me", href:"/", icon:"🏠"},
  {title:"writing", href:"/writing", icon:"✒︎"},
  {title:"tools", href:"/tools", icon:"🔧"},
  {title:"bookmarks", href:"/bookmarks", icon:"🔖"},]
  
return (
    <div className=" max-w-2xl flex flex-col gap-4 lg:gap-10">

        <div className="flex items-center justify-center  relative lg:rounded-2xl rounded-xl lg:py-16 lg:px-10 py-6 px-4 pb-10  bg-white shadow overflow-hidden">
        <img src="/field.png" alt="" className="absolute top-0 h-full" />
<div className="bg-white z-10 rounded-lg">
<img src="/titlebar.png" alt="" className="border-b " />    

<img src="/harvestgrove.png" alt="" className="object-cover w-full h-full" />      


</div>

            <a href="https://harvestgrover.vercel.app/" className="absolute lg:bottom-4 lg:right-4 bottom-1 right-1 text-xs bg-slate-200 text-black hover:bg-green-300 transition shadow border border-slate-50 w-max p-1  rounded-md flex items-center gap-1"><span>harvestgrove</span>
            <div className="p-1  text-white bg-green-800 rounded">
            <HiOutlineArrowUpRight />

            </div>
        </a></div>
        <div className="flex items-center justify-center relative lg:rounded-2xl rounded-lg lg:py-16 lg:px-10  shadow overflow-hidden">
        {/* <img src="/field.png" alt="" className="absolute top-0 h-full w-full" /> */}
<div className="bg-white  rounded-xl overflow-hidden">
<img src="/titlebar.png" alt="" className="border-b " />    

<img src="/gallaria.png" alt="" className="object-cover w-full h-full" />      
<img src="/gallaria2.png" alt="" className="object-cover w-full h-full" />      


</div>

            <a href="https://harvestgrover.vercel.app/" className="absolute  lg:bottom-4 lg:right-4 bottom-1 right-1 text-xs bg-slate-200 text-black hover:bg-red-300 transition shadow border border-slate-50 w-max p-1   rounded-md flex items-center gap-1">
              <span>galaria</span>
            <div className="p-1  text-white bg-red-800 rounded">
            <HiOutlineArrowUpRight />

            </div>
        </a></div>
            <div className="flex flex-col  gap-3 ">
            <p className="text-xs bg-red-200 m-3 shadow border w-max p-1 px-2 rounded-md ">pandawidgtes.&#128214;</p>
            <div className=" relative flex max-w-[20rem] lg:max-w-none justify-center gap-4 flex-wrap">
              <DigitalClock/>     
               <Battery />
              <Weather/>
            </div></div>  
                   
</div>
)
}

export default Projects