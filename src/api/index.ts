import { queryString, request } from './client'
import { demoApi } from './demo'
import { useAuthStore } from '@/store/auth'
import type {
  Alert,
  AlertStatus,
  AlertSummary,
  AuthResponse,
  EventSummary,
  GeoThreat,
  Host,
  HostSummary,
  Lineage,
} from './types'

type AlertFilter = {
  host?: string
  severity?: string
  status?: AlertStatus
  /** epoch millis */
  from?: number
  to?: number
  limit?: number
}

type Period = { from?: number; to?: number }

/**
 * 로그인 전에는 서버를 부르지 않고 데모 데이터를 돌려준다.
 * 토큰이 없으면 어차피 401 이고, 랜딩에서 넘어온 방문자에게는 빈 화면보다 데모가 낫다.
 */
function isDemo(): boolean {
  return useAuthStore.getState().token === null
}

export const api = {
  signup: (email: string, password: string, orgName?: string) =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: { email, password, orgName },
      auth: false,
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  alerts: (filter: AlertFilter = {}) =>
    isDemo() ? demoApi.alerts(filter) : request<Alert[]>(`/alerts${queryString(filter)}`),

  alertSummary: (period: Period = {}) =>
    isDemo()
      ? demoApi.alertSummary(period)
      : request<AlertSummary>(`/alerts/summary${queryString(period)}`),

  lineage: (id: string) =>
    isDemo() ? demoApi.lineage(id) : request<Lineage>(`/alerts/${encodeURIComponent(id)}/lineage`),

  triage: (id: string, status: Extract<AlertStatus, 'confirmed' | 'false_positive'>) =>
    isDemo()
      ? demoApi.triage(id, status)
      : request<Alert>(`/alerts/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),

  geoThreats: () => (isDemo() ? demoApi.geoThreats() : request<GeoThreat[]>('/alerts/geo')),

  hosts: () => (isDemo() ? demoApi.hosts() : request<Host[]>('/hosts')),

  hostSummary: () => (isDemo() ? demoApi.hostSummary() : request<HostSummary>('/hosts/summary')),

  eventSummary: (period: Period = {}) =>
    isDemo()
      ? demoApi.eventSummary()
      : request<EventSummary>(`/events/summary${queryString(period)}`),
}
