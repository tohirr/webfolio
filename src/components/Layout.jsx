import Nav from "./Nav";

function Layout({children}) {


  return (
    <div className="lg:p-3 p-1 bg-zinc-900 font-mono text-sm relative flex lg:flex-row flex-col lg:gap-3 gap-1 w-screen overflow-hidden h-screen">
      <Nav/>
      <div className="bg-grid-[#80808012] bg-white rounded-2xl flex flex-col lg:p-6 lg:px-[6vw] pb-[6rem] flex-1 h-full overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export default Layout
