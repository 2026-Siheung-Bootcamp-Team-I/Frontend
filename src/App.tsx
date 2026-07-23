import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Placeholder from '@/pages/Placeholder'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/threats"
          element={
            <Placeholder title="위협" description="탐지된 위협을 심각도와 상태로 관리합니다." />
          }
        />
        <Route
          path="/endpoints"
          element={
            <Placeholder
              title="엔드포인트"
              description="에이전트가 관측 중인 호스트의 상태입니다."
            />
          }
        />
        <Route
          path="/sequence"
          element={
            <Placeholder
              title="시퀀스 분석"
              description="개별 행동을 시간순으로 이어 공격 경로로 재구성합니다."
            />
          }
        />
        <Route
          path="/report"
          element={<Placeholder title="요약 보기" description="분석 결과를 요약해 제공합니다." />}
        />
      </Route>
    </Routes>
  )
}

export default App
