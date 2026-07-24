import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

/** 토큰이 없으면 로그인 화면으로 보낸다. 로그인 후 원래 가려던 곳으로 돌아오도록 경로를 넘긴다. */
function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}

export default RequireAuth
