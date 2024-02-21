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
    <div className=" max-w-2xl">

        <div className="flex items-center justify-center rounded-lg relative rounded-b-2xl py-16 px-10  bg-white shadow overflow-hidden">
        <img src="/field.png" alt="" className="absolute top-0 h-full" />
<div className="bg-white z-10 rounded-lg">
<img src="/titlebar.png" alt="" className="border-b " />    

<img src="/harvestgrove.png" alt="" className="object-cover w-full h-full" />      


</div>

            <a href="https://harvestgrover.vercel.app/" className="absolute bottom-4 right-4 text-xs bg-slate-200 text-black hover:bg-green-300 transition shadow border border-slate-50 w-max p-1  rounded-md flex items-center gap-1"><span>harvestgrove</span>
            <div className="p-1  text-white bg-green-800 rounded">
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
            <div className="flex flex-col  rounded-lg rounded-b-2xl border-4 border-slate-600  shadow overflow-hidden">
        {/* <img src="/titlebard.png" alt="" celassName="border-b " /> */}
        <div className="flex flex-col relative ">
            <img src="/gal.png" alt="" className="object-cover w-full h-full" />      
            <img src="/gal2.png" alt="" className="object-cover w-full h-full" />

            <a href="" className="absolute bottom-4 right-4 text-xs bg-white px-2 shadow border w-max p-1  rounded-md flex items-center gap-1"><span>harvestgrove</span>
          <HiOutlineArrowUpRight/>
        </a>
        </div></div>          
</div>
)
}

export default Projects