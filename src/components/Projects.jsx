import { HiOutlineArrowUpRight } from "react-icons/hi2"
import { MdKeyboardCommandKey } from "react-icons/md"
import { DigitalClock } from "./widgets/DigitalClock"

function Projects (){
return (
    <div className="lg:max-w-2xl p-2 flex flex-col gap-10">
        <div className="flex flex-col  gap-3 rounded-2xl border bg-white shadow">

        <div className="flex relative  rounded-3xl overflow-hidden ">
            <img src="/harvestgrove.png" alt="" className="object-cover w-full h-full" />
            <a href="" className="absolute bottom-4 right-4 text-xs bg-white px-2 shadow border w-max p-1  rounded-md flex items-center gap-1"><span>harvestgrove</span>
          <HiOutlineArrowUpRight/>
        </a>

            </div></div>
            <div className="flex flex-col p-3 gap-3 rounded-xl border bg-slate-100 shadow">
            <p className="text-xs bg-red-200 shadow border w-max p-1 px-2 rounded-md ">pandawidgtes.&#128214;</p>
            <div className=" relative grid  grid-cols-12 gap-4">
                <DigitalClock/>     
               <DigitalClock/>
                <DigitalClock/>
                <DigitalClock/>

            </div></div>            
</div>
)
}

export default Projects