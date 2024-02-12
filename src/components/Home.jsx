function Home () {
    return (
    <div className="lg:max-w-2xl p-2 flex flex-col gap-10">
     
      <div className="lg:p-3 p-1 text-sm lg:text-base bg-slate-50 shadow rounded-2xl border flex flex-col gap-4">
        <p className="text-xs bg-red-200 shadow border w-max p-1 px-2 rounded-md ">about_me.md</p>
        {/* <div className="flex justify-center">
        <img src="/dev_panda.png" alt="" className="w-72" />

        </div> */}
      <p>Hi there!&#x1F44B;
        I'm <span className="font-semibold">Tohir</span>&#128060; , a ui developer focused on building beautiful, snappy user interfaces and performant,
         scalable web applications.</p>
         
        <ul className="flex flex-col gap-2 p-2 rounded-xl bg-slate-300 ">
          <li className="flex gap-2"><span className="w-max flex"> - 🔭 </span><span>currently building web widgets @ pandawidgets.com</span> </li>   
          <li>- &#127891; in my final year studying engineering at Unilag</li>
          <li>- &#9997; I write <strike className="italic">frequently</strike>  whenever i feel the muse</li>
          <li>- &#128172; love chatting about technology, movies and music</li>
          {/* <li>- 🤔 I'm looking for help with Typescript and React</li> */}
          <li>- &#129504; learning Typescript and skateboarding</li>
          <li>- 😄 pronouns he/him</li>
          <li>- &#127475;&#127468; based in lagos, Nigeria </li>
          <li>- ⚡ fun fact: i blink alot less than average</li>
        </ul>
    </div>
    <div className="flex flex-col gap-3">
        <p>currently...</p>
        <div className=" grid grid-cols-12  lg:gap-5 gap-2">
            <div className="flex flex-col gap-2 lg:p-3 p-1 col-span-6 rounded-xl border bg-white shadow">
            <p className="text-xs bg-red-200 shadow border w-max p-1 px-2 rounded-md ">reading.&#128214;</p>
            <div className="flex relative  rounded-lg lg:h-[26rem] h-[16rem] overflow-hidden bg-slate-600">
            <img src="/stormlight.jpeg" alt="" className="object-cover w-full h-full" />
            </div></div>
            <div className="flex flex-col gap-2 lg:p-3 p-1 col-span-6 rounded-xl border bg-white shadow">
            <p className="text-xs bg-red-200 shadow border w-max p-1 px-2 rounded-md ">watching.&#127871;</p>
            <div className="flex relative  rounded-lg lg:h-[26rem] h-[16rem] overflow-hidden bg-slate-600">

            <img src="/succession.jpeg" alt="" className="object-cover w-full h-full" />
            </div></div>
            
        </div>
    </div>
</div>)
}

export default Home;
