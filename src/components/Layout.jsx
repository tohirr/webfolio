import Home from "./Home";
import Nav from "./Nav";
import Projects from "./Projects";

function Layout({children}) {
  return (
    <div className="lg:p-2 bg-zinc-900 font-mono text-sm relative flex lg:flex-row flex-col lg:gap-2 gap-1 w-screen lg:overflow-hidden h-screen">
      <Nav/>
      <div className="bg-grid-[#80808012] bg-slate-100 rounded-2xl flex flex-col items-center  gap-4 lg:gap-6 lg:p-6 p-2 overflow-y-auto flex-1">
        <Home/>
        <Projects/>
      </div>
    </div>
  )
}

export default Layout
