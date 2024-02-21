import React from 'react'
import { useEffect } from 'react';
import { useState } from 'react';
import { BsLightningChargeFill } from "react-icons/bs";

export const Battery = () => {
  const [batteryLevel, setBatteryLevel] = useState(37)
  const [chargeOrDischargeTime, setChargeOrDischargeTime] = useState(0)
  const [charging, setCharging] = useState(false)
  const formatTime = (time) => (time < 10 ? `0${time}` : time); 
  const getHoursMinutesSeconds = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60;
    return { hours, minutes, seconds };
  };

  useEffect(() => {
    // Update the time every second
    const interval = setInterval(() => {
      setBatteryLevel((batteryLevel + 1)%100);
    }, 5000);

    // Clear the interval when the component is unmounted
    return () => clearInterval(interval);
  }, [batteryLevel]);
  
  return (
      <div className="md:col-span-3 col-span-6 h-[9rem] w-[9rem] relative overflow-hidden  bg-[#0e0e0e] rounded-3xl text-white flex items-center justify-center ">
          <div className='flex-col items-center w-full h-full justify-center flex  gap-2'>
            <span className='text-2xl text-center font-semibold'>{batteryLevel}%</span>
            <div className='h-[25%] w-[60%] rounded-md bg-[#d9d9d9]/50  flex items-center justify-center overflow-hidden relative'>
          <div style={{ width: `${batteryLevel}%` }} className='h-full absolute rounded-r-md left-0 transition-all duration-1000 bg-[#d9d9d9]'></div>
          <div className='absolute h-3 rounded-r-sm w-1 bg-[#d9d9d9]/50 -right-1'></div>
            <BsLightningChargeFill className='z-10 text-xl text-[#0e0e0e]'/>
            </div>
            {/* <span className=' text-xs text-center'>{formatTime(hours)}hrs {formatTime(minutes)}mins left</span> */}
         </div>
</div>

  )
}