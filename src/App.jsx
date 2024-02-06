import { MdKeyboardCommandKey } from "react-icons/md";
function App() {

  return (
    <div className="bg-grid-[#80808012] font-mono flex w-screen bg-white h-screen">
      <div className="w-72 h-screen bg-slate-100 border-r border">
        <div className="flex p-3 items-center gap-2">
          <img src="/selfai.png" alt="" className="w-12 h-12 rounded-md bg-slate-500" />
          <div className="leading-tight">
            <h1 className="font-semibold text-lg">Tohir Babátúndé</h1>
            <h2>ui developer</h2>
          </div>
        </div>
        <div className="flex flex-col gap-2 py-4 p-2">
          <button className="flex gap-3 capitalize p-2 border rounded-md items-center">
            <MdKeyboardCommandKey className=""/>
            home
          </button>
        </div>
      </div>
      <div className="flex justify-center p-10 flex-1">
        <div className="max-w-2xl">
          <div className="p-5 bg-white shadow rounded-lg border max-w-xl">
            <p>I'm a frontend developer focused on building beautiful, snappy user interfaces and performant, scalable web applications</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
