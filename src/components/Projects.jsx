import { HiOutlineArrowUpRight } from "react-icons/hi2"
import { DigitalClock } from "./widgets/DigitalClock"
import { Battery } from "./widgets/Battery"
import { Weather } from "./widgets/Weather"

function Projects (){
return (
    <div className="lg:max-w-2xl p-2 flex flex-col gap-10">
        <div className="flex flex-col  rounded-lg rounded-b-2xl border bg-white shadow overflow-hidden">
        <img src="/titlebar.png" alt="" className="border-b " />
        <div className="flex flex-col relative ">
            <img src="/harvestgrove.png" alt="" className="object-cover w-full h-full" />      
            {/* <img src="/sect2.png" alt="" className="object-cover w-full h-full" />     
                   <img src="/sect3.png" alt="" className="object-cover w-full h-full" />
            <img src="/sect4.png" alt="" className="object-cover w-full h-full" />
            <img src="/sect5.png" alt="" className="object-cover w-full h-full" />

      <img src="/footer.png" alt="" className="object-cover w-full h-full" /> */}

            <a href="" className="absolute bottom-4 right-4 text-xs bg-white px-2 shadow border w-max p-1  rounded-md flex items-center gap-1"><span>harvestgrove</span>
          <HiOutlineArrowUpRight/>
        </a>

            </div></div>
            <div className="flex flex-col  gap-3 items-center rounded-xl border bg-slate-100 shadow">
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