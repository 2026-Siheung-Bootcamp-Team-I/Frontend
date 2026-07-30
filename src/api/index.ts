import { queryString, request } from './client'
import { demoApi } from './demo'
import { useAuthStore } from '@/store/auth'
import type {
  Alert,
  AlertStatus,
  AlertSummary,
  AuthResponse,
  EventSummary,
  GeoDestination,
  Host,
  HostSummary,
  Lineage,
  UserWebhook,
  WebhookTestResult,
  EnrollSecret,
  InstallLink,
  MyHosts,
  ExecuteResult,
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

  /** 외부 연결 목적지 국가 집계. 백엔드는 alerts 가 아니라 events 를 기준으로 센다. */
  geoDestinations: () =>
    isDemo() ? demoApi.geoDestinations() : request<GeoDestination[]>('/events/geo'),

  /**
   * 실제 조치(kill). responder 를 직접 부르지 않고 반드시 api-service 를 경유한다
   * (api-service 가 Bearer 인증 + tenant 소유 확인 후 responder 로 프록시).
   * host 는 서버가 알림에서 가져오므로 클라이언트는 종료 대상 프로세스(target)만 보낸다.
   * 비로그인(데모)에서는 서버를 부르지 않고 성공한 셈 치고 답한다(예시임을 화면에 밝힌다).
   */
  executeKill: (id: string, target: string) =>
    isDemo()
      ? demoApi.executeKill(id, target)
      : request<ExecuteResult>(`/alerts/${encodeURIComponent(id)}/respond`, {
          method: 'POST',
          body: { target },
        }),

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

  /** 저장된 개인 webhook 으로 실제 발송을 시도한다. 등록이 됐는지 확인할 유일한 수단이다. */
  testWebhook: () => request<WebhookTestResult>('/me/webhook/test', { method: 'POST' }),

  /** /api/tenant/** 는 X-API-Key 가 필요한 경로다(client.ts 가 붙여준다). */
  getEnrollSecret: () => request<EnrollSecret>('/tenant/enroll-secret'),

  /**
   * 설치 링크 발급. 붙여넣을 한 줄 명령까지 서버가 만들어 준다.
   * 토큰이 짧게 살기 때문에(기본 24시간) 화면을 열 때가 아니라 사용자가 누를 때 부른다.
   */
  issueInstallLink: () => request<InstallLink>('/tenant/install-link', { method: 'POST' }),

  rotateEnrollSecret: () => request<EnrollSecret>('/tenant/enroll-secret', { method: 'POST' }),

  myHosts: () => request<MyHosts>('/me/hosts'),

  registerHost: (host: string) => request<MyHosts>('/me/hosts', { method: 'POST', body: { host } }),

  unregisterHost: (host: string) =>
    request<void>(`/me/hosts/${encodeURIComponent(host)}`, { method: 'DELETE' }),
}
