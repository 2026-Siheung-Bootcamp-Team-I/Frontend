import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-bg font-sans text-ink transition-colors">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <div className="px-[28px] pt-[26px] pb-[40px]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AppLayout
