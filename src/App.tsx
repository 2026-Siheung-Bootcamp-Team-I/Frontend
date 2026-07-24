import { lazy, Suspense, useEffect } from 'react'
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

// echarts 세계지도를 쓰는 페이지라 지연 로드해 별도 청크에서 온디맨드로 가져온다.
const ThreatMap = lazy(() => import('@/pages/ThreatMap'))

const pageFallback = (
  <div className="flex items-center justify-center py-[80px] text-[13px] text-faint">
    불러오는 중
  </div>
)

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
      {/* 대시보드는 로그인 없이도 열린다. 토큰이 없으면 데모 데이터를 그린다(src/api/demo.ts). */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        {/* 위협 지도도 데모(비로그인)에서 보여야 하므로 인증 밖에 둔다. */}
        <Route
          path="/map"
          element={
            <Suspense fallback={pageFallback}>
              <ThreatMap />
            </Suspense>
          }
        />
        <Route element={<RequireAuth />}>
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
