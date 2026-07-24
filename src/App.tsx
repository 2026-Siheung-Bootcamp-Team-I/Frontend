import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/RequireAuth'
import { useThemeStore } from '@/store/theme'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Threats from '@/pages/Threats'
import Endpoints from '@/pages/Endpoints'
import Sequence from '@/pages/Sequence'
import Report from '@/pages/Report'

function App() {
  const theme = useThemeStore((s) => s.theme)

  // 로그인·랜딩까지 포함해 모든 화면에 테마가 적용되도록 최상위에서 한 번만 반영한다.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/threats" element={<Threats />} />
          <Route path="/endpoints" element={<Endpoints />} />
          <Route path="/sequence" element={<Sequence />} />
          <Route path="/report" element={<Report />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
