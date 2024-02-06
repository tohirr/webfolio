import { MdKeyboardCommandKey } from "react-icons/md";
import { TfiGithub } from "react-icons/tfi";
import { FaSquareXTwitter } from "react-icons/fa6";
import { ImLinkedin } from "react-icons/im";
function App() {

 const navLinks = [{title:"home", href:"/", icon:<MdKeyboardCommandKey/>},
,{title:"writing", href:"/", icon:<MdKeyboardCommandKey/>},
{title:"projects", href:"/", icon:<MdKeyboardCommandKey/>},
{title:"tools", href:"/", icon:<MdKeyboardCommandKey/>},
{title:"bookmarks", href:"/", icon:<MdKeyboardCommandKey/>},]


const socialLinks = [{title:"github", href:"/", icon:<MdKeyboardCommandKey/>},
{title:"x/twitter", href:"/", icon:<MdKeyboardCommandKey/>}
,{title:"linkedin", href:"/", icon:<MdKeyboardCommandKey/>},
{title:"threads", href:"/", icon:<MdKeyboardCommandKey/>},
{title:"pinterest", href:"/", icon:<MdKeyboardCommandKey/>},]

  const NavLink = ({link}) => {
return <a href={link.href} className="flex gap-3 cursor-pointer  p-2  rounded-md items-center">
  <div className="text-base">
    {link.icon}
  </div>
{link.title}
</a>
  }

  return (
    <div className="bg-grid-[#80808012] font-mono flex w-screen bg-white h-screen">
      <div className="w-72 h-screen bg-slate-100 p-3 border-r border">
        <div className="flex  items-center gap-2">
          <img src="/selfai.png" alt="" className="w-12 h-12 rounded-md bg-slate-500" />
          <div className="leading-tight">
            <h1 className="font-semibold text-lg">Tohir Babátúndé</h1>
            <h2>ui developer</h2>
          </div>
        </div>
        <div className="flex flex-col text-sm gap-2 py-6 ">
          {navLinks.map((link, index) => <NavLink key={index} link={link}/>)}
          
        </div>
        <div className="flex text-sm flex-col gap-2 py-6">
          <p className="px-2 text-slate-700">online</p>
          <a className="flex gap-3  p-2  rounded-md items-center">
            <TfiGithub className="text-base"/>
            github
          </a>
          <a className="flex gap-3  p-2  rounded-md items-center">
            <FaSquareXTwitter className="text-base"/>
            x/twitter
          </a><a className="flex gap-3  p-2  rounded-md items-center">
            <ImLinkedin className="text-base"/>
            linkedin
          </a>
        </div>
      </div>
      <div className="flex justify-center p-10 flex-1">
        <div className="max-w-2xl">
          <div className="p-5 bg-white shadow rounded-xl border flex flex-col gap-4">
          <p>Hi there! &#x1F44B; ...<br/>
            I'm Tohir - "pure" in english, a ui developer, writer, art collector, audiophile , based in Lagos, Nigeria.</p>
<p>I'm a frontend developer focused on building beautiful, snappy user interfaces and performant, scalable web applications</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
