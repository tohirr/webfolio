import { HiOutlineArrowUpRight } from "react-icons/hi2";
import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import Nav from "./Nav";

function Layout({children}) {
  
  const [isOpen, setIsOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);




const handleTouchStart = (e) => {
  setDragging(true);
  setDragY(e.touches[0].clientY);
};

const handleTouchMove = (e) => {
  if (dragging) {
    const newY = e.touches[0].screenY;
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


  return (
    <div className="bg-grid-[#80808012] font-mono text-sm relative flex w-screen overflow-hidden bg-white h-screen">
      <Nav/>
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
