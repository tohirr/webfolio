import Nav from "./Nav";

function Layout({children}) {
  return (
    <div className="lg:p-3 bg-zinc-900 font-mono text-sm relative flex lg:flex-row flex-col lg:gap-3 gap-1 w-screen lg:overflow-hidden lg:h-screen">
      <Nav/>
      <div className="bg-grid-[#80808012] bg-white rounded-t-3xl flex flex-col lg:p-6 lg:px-[6vw] pb-[6rem] lg:flex-1 ">
        {children}
      </div>
    </div>
  )
}

export default Layout
