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
  UserWebhook,
  EnrollSecret,
  MyHosts,
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

  // 아래는 로그인 유저 개인(tenant) 설정이라 데모 폴백이 없다. 비로그인 시 호출하지 않는다.

  getWebhook: () => request<UserWebhook>('/me/webhook'),

  setWebhook: (webhookUrl: string) =>
    request<UserWebhook>('/me/webhook', { method: 'PUT', body: { webhookUrl } }),

  getEnrollSecret: () => request<EnrollSecret>('/tenant/enroll-secret'),

  rotateEnrollSecret: () => request<EnrollSecret>('/tenant/enroll-secret', { method: 'POST' }),

  myHosts: () => request<MyHosts>('/me/hosts'),

  registerHost: (host: string) => request<MyHosts>('/me/hosts', { method: 'POST', body: { host } }),

  unregisterHost: (host: string) =>
    request<void>(`/me/hosts/${encodeURIComponent(host)}`, { method: 'DELETE' }),
}
