import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // 라우트가 바뀌면 드로어를 닫는다
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // ESC 키로 드로어 닫기 (열려 있을 때만 리스너 등록)
  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  // 드로어가 열려 있는 동안 body 스크롤 잠금
  useEffect(() => {
    if (!menuOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [menuOpen])

  return (
    <div className="flex min-h-screen bg-bg font-sans text-ink transition-colors">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenuOpen={() => setMenuOpen(true)} />
        <div className="px-[16px] pt-[18px] pb-[32px] lg:px-[28px] lg:pt-[26px] lg:pb-[40px]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AppLayout
