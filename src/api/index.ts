import { queryString, request } from './client'
import { demoApi } from './demo'
import { useAuthStore } from '@/store/auth'
import type {
  Alert,
  AlertStatus,
  AlertSummary,
  AuthResponse,
  Correlation,
  DnsLookup,
  EdrEvent,
  EventSummary,
  GeoDestination,
  Host,
  HostSummary,
  Incident,
  IncidentTimeline,
  Lineage,
  RuleCatalogEntry,
  Topology,
  UserWebhook,
  WebhookTestResult,
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

type EventFilter = {
  host?: string
  type?: string
  /** 파일 해시 완전일치. 대소문자는 서버가 맞춘다. */
  sha256?: string
  /** epoch millis */
  from?: number
  to?: number
  /** 서버 기본 100, 상한 1000. */
  limit?: number
}

type Period = { from?: number; to?: number }

type TopologyFilter = Period & {
  /** 호스트·목적지 부분 일치. */
  q?: string
  /** 관계 수. 기본 200, 상한 1000. */
  limit?: number
}

type CorrelateOptions = Period & {
  limit?: number
  /** false 면 실시간 DNS 를 묻지 않는다(응답의 liveDns 가 null). */
  liveDns?: boolean
}

type IncidentFilter = Period & {
  status?: AlertStatus
  limit?: number
}

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

  /**
   * 탐지 룰 카탈로그. tenant 와 무관한 정적 참조 데이터라 화면이 한 번 받아 두고 쓴다.
   * 알림마다 룰 설명을 실어 보내지 않기 위해 백엔드가 따로 뺀 엔드포인트다.
   */
  rules: () => (isDemo() ? demoApi.rules() : request<RuleCatalogEntry[]>('/alerts/rules')),

  /** 알림 상세. 목록에 없는 sourceEvent 와 incidentId 가 여기서만 채워진다. */
  alert: (id: string) =>
    isDemo() ? demoApi.alert(id) : request<Alert>(`/alerts/${encodeURIComponent(id)}`),

  lineage: (id: string) =>
    isDemo() ? demoApi.lineage(id) : request<Lineage>(`/alerts/${encodeURIComponent(id)}/lineage`),

  /** 호스트 단위 프로세스 트리. 응답이 lineage 와 같아 같은 렌더러를 쓴다. */
  processTree: (host: string, period: Period = {}) =>
    isDemo()
      ? demoApi.processTree(host)
      : request<Lineage>(`/hosts/${encodeURIComponent(host)}/process-tree${queryString(period)}`),

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

  /** egress 토폴로지. 기본 최근 24시간, 관계 수 기본 200·상한 1000. */
  topology: (filter: TopologyFilter = {}) =>
    isDemo()
      ? demoApi.topology(filter)
      : request<Topology>(`/intelligence/topology${queryString(filter)}`),

  /** 도메인·IP 상관 분석. liveDns=false 면 실시간 조회를 건너뛴다. */
  correlate: (target: string, options: CorrelateOptions = {}) =>
    isDemo()
      ? demoApi.correlate(target)
      : request<Correlation>(`/intelligence/correlate${queryString({ target, ...options })}`),

  /** 지금 DNS 서버에 물어본다. 우리 이벤트와 무관한 조회 시점 값이다. */
  dnsLookup: (target: string) =>
    isDemo()
      ? demoApi.dnsLookup(target)
      : request<DnsLookup>(`/intelligence/dns-lookup${queryString({ target })}`),

  /** 사건 목록. 기본 최근 7일. alerts·lineage 는 여기서 null 이고 상세에서만 온다. */
  incidents: (filter: IncidentFilter = {}) =>
    isDemo() ? demoApi.incidents(filter) : request<Incident[]>(`/incidents${queryString(filter)}`),

  incident: (id: string) =>
    isDemo() ? demoApi.incident(id) : request<Incident>(`/incidents/${encodeURIComponent(id)}`),

  incidentTimeline: (id: string) =>
    isDemo()
      ? demoApi.incidentTimeline(id)
      : request<IncidentTimeline>(`/incidents/${encodeURIComponent(id)}/timeline`),

  triageIncident: (id: string, status: Extract<AlertStatus, 'confirmed' | 'false_positive'>) =>
    isDemo()
      ? demoApi.triageIncident(id, status)
      : request<Incident>(`/incidents/${encodeURIComponent(id)}/status`, {
          method: 'PATCH',
          body: { status },
        }),

  hosts: () => (isDemo() ? demoApi.hosts() : request<Host[]>('/hosts')),

  hostSummary: () => (isDemo() ? demoApi.hostSummary() : request<HostSummary>('/hosts/summary')),

  /** 수집된 개별 이벤트를 최신순으로. 유형 필터는 서버가 아니라 화면에서 거른다(아래 Events 페이지 주석). */
  events: (filter: EventFilter = {}) =>
    isDemo() ? demoApi.events(filter) : request<EdrEvent[]>(`/events${queryString(filter)}`),

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

  /**
   * 설치 링크 발급. 붙여넣을 한 줄 명령까지 서버가 만들어 준다.
   * 토큰이 짧게 살기 때문에(기본 24시간) 화면을 열 때가 아니라 사용자가 누를 때 부른다.
   */
  issueInstallLink: () => request<InstallLink>('/tenant/install-link', { method: 'POST' }),

  myHosts: () => request<MyHosts>('/me/hosts'),

  registerHost: (host: string) => request<MyHosts>('/me/hosts', { method: 'POST', body: { host } }),

  unregisterHost: (host: string) =>
    request<void>(`/me/hosts/${encodeURIComponent(host)}`, { method: 'DELETE' }),
}
