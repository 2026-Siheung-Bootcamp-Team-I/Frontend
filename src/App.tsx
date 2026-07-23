import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Threats from '@/pages/Threats'
import Endpoints from '@/pages/Endpoints'
import Sequence from '@/pages/Sequence'
import Report from '@/pages/Report'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/threats" element={<Threats />} />
        <Route path="/endpoints" element={<Endpoints />} />
        <Route path="/sequence" element={<Sequence />} />
        <Route path="/report" element={<Report />} />
      </Route>
    </Routes>
  )
}

export default App
