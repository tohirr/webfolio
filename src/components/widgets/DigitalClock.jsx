import React from 'react'
import { useEffect } from 'react';
import { useState } from 'react';
import { useRef } from 'react';

export const DigitalClock = ({}) => {
    const windowSize = useRef([window.innerWidth, window.innerHeight]);
    const [time, setTime] = useState(new Date());
  
    const hours = time.getHours();
    const minutes = time.getMinutes();
   
    const mobileView = windowSize.current[0] < 768 

    useEffect(() => {
      // Update the time every second
      const interval = setInterval(() => {
        setTime(new Date());
      }, 1000);
  
      // Clear the interval when the component is unmounted
      return () => clearInterval(interval);
    }, []);
 const minutesArray = Array.from({ length: 60 }, (_, index) => index < 10? "0"+index : index);

    const formattedHour = `${hours < 10 ? '0' : ''}${hours}`;
    const formattedMinute = `${minutes < 10 ? '0' : ''}${minutes}:`;

  return (
      <div className="md:col-span-3 col-span-6  h-[9.5rem] relative overflow-hidden font-bold bg-[#0e0e0e] rounded-2xl text-white flex items-center justify-center  text-4xl">
          <div className='flex items-center'>
          <span className=''>{formattedHour}</span><span className='animate-pulse'>:</span>
            <div className='flex flex-col gap-2 justify-center  relative  transition-all'>
            <div className='absolute  h-[9.5rem] w-full bg-gradient-to-b from-[#0e0e0e] via-transparent to-[#0e0e0e] z-20'></div>
          <div
            className='flex relative flex-col  w-[46px] h-[44.06px]'>
            <div 
              style={{ transform: `translateY(${true ? minutes * -39.94 : minutes * -72}px)` }}
              className={`flex transition-all duration-1000  flex-col absolute `}>
                  {minutesArray.map((minute) => <span  key={minute}>{minute}</span>)}
                </div>
            </div>
        </div>
      </div>
          </div>

  )
}