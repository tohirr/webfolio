import React from 'react'
import { useEffect } from 'react';
import { useState } from 'react';
import { useRef } from 'react';

export const DigitalClock = ({}) => {
    const windowSize = useRef([window.innerWidth, window.innerHeight]);
    const [minutes, setMinutes] = useState(12);
  
   

    useEffect(() => {
      // Update the time every second
      const interval = setInterval(() => {
        setMinutes((minutes + 1)%60);
      }, 3000);
  
      // Clear the interval when the component is unmounted
      return () => clearInterval(interval);
    }, [minutes]);
 const minutesArray = Array.from({ length: 60 }, (_, index) => index < 10? "0"+index : index);
console.log(minutes);

  return (
      <div className="md:col-span-3 col-span-6  h-[8rem] w-[8rem] relative overflow-hidden font-bold bg-[#0e0e0e] rounded-3xl text-white flex items-center justify-center  text-3xl">
          <div className='flex items-center'>
          <span className=''>09</span><span className='animate-pulse'>:</span>
            <div className='flex flex-col gap-2 justify-center  relative  transition-all'>
            <div className='absolute  h-[9.5rem] w-full bg-gradient-to-b from-[#0e0e0e] via-transparent to-[#0e0e0e] z-20'></div>
          <div
            className='flex relative flex-col  w-[38px] h-[36px]'>
            <div 
              style={{ transform: `translateY(${minutes * -36 }px)` }}
              className={`flex transition-all duration-1000  flex-col absolute `}>
                  {minutesArray.map((minute) => <span  key={minute}>{minute}</span>)}
                </div>
            </div>
        </div>
      </div>
          </div>

  )
}