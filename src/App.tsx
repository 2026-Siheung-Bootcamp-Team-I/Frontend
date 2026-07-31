import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { useThemeStore } from '@/store/theme'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Onboarding from '@/pages/Onboarding'
import Threats from '@/pages/Threats'
import Endpoints from '@/pages/Endpoints'
import EndpointDetail from '@/pages/EndpointDetail'
import Events from '@/pages/Events'
import Incidents from '@/pages/Incidents'
import IncidentDetail from '@/pages/IncidentDetail'

// echarts 세계지도를 쓰는 페이지라 지연 로드해 별도 청크에서 온디맨드로 가져온다.
const Intelligence = lazy(() => import('@/pages/Intelligence'))

const ThreatMap = lazy(() => import('@/pages/ThreatMap'))

const Lookup = lazy(() => import('@/pages/Lookup'))

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
        {/* 온보딩 안내는 로그인 없이도 열려야 하므로 인증 밖에 둔다. */}
        <Route path="/onboarding" element={<Onboarding />} />
        {/* 데이터 조회 탭은 모두 로그인 없이 데모(예시)로 열린다. 토큰이 있으면 실데이터. */}
        <Route path="/threats" element={<Threats />} />
        <Route path="/endpoints" element={<Endpoints />} />
        <Route path="/endpoints/:host" element={<EndpointDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route
          path="/intelligence"
          element={
            <Suspense fallback={pageFallback}>
              <Intelligence />
            </Suspense>
          }
        />
        <Route
          path="/lookup"
          element={
            <Suspense fallback={pageFallback}>
              <Lookup />
            </Suspense>
          }
        />
        <Route
          path="/map"
          element={
            <Suspense fallback={pageFallback}>
              <ThreatMap />
            </Suspense>
          }
        />
        {/*
          없어진 탭들. 북마크와 예전 링크가 죽지 않도록 흡수한 화면으로 보낸다.
          위협 지도와 요약 보기는 관계 분석·대시보드의 섹션이 됐고, 시퀀스 분석은 사건이 대신한다.
        */}
        <Route path="/report" element={<Navigate to="/dashboard" replace />} />
        <Route path="/sequence" element={<Navigate to="/incidents" replace />} />
        <Route path="/operations" element={<Navigate to="/onboarding" replace />} />
      </Route>
    </Routes>
  )
}

export default App
