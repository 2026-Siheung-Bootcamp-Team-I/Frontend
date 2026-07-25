/** api-service(백엔드) 응답 DTO. 필드명·값은 백엔드 record 와 1:1로 맞춘다. */

/** detector 가 발행하는 severity 원문. */
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM'

/** 트리아지 status. open 은 적재 초기값, PATCH 로는 confirmed/false_positive 만 보낼 수 있다. */
export type AlertStatus = 'open' | 'confirmed' | 'false_positive'

export type Alert = {
  id: string
  host: string
  ruleId: string
  /** ruleId 를 화면 표시용 한글로 옮긴 값. 미등록 ruleId 는 원문. */
  threatName: string
  mitre: string | null
  severity: AlertSeverity
  /** 권고 대응 문구(dry-run, 실행 안 됨). */
  action: string | null
  /** epoch millis */
  ts: number
  status: AlertStatus
  matched: string[]
}

export type AlertSummary = {
  total: number
  severity: { critical: number; high: number; medium: number }
  topThreats: { category: string; count: number }[]
}

export type LineageNode = {
  id: string
  kind: 'process' | 'file' | 'network'
  label: string
}

export type LineageEdge = {
  from: string
  to: string
  rel: 'spawned' | 'wrote' | 'connected'
}

export type Lineage = {
  nodes: LineageNode[]
  edges: LineageEdge[]
}

export type HostStatus = 'healthy' | 'warning' | 'critical'

export type Host = {
  host: string
  /** epoch millis */
  lastSeen: number
  status: HostStatus
  /** 열린 alert 수 */
  threats: number
}

export type HostSummary = {
  healthy: number
  warning: number
  critical: number
  total: number
}

/** 내 개인 Slack webhook. 미설정이면 webhookUrl 이 null. */
export type UserWebhook = {
  userId: number
  webhookUrl: string | null
}

/**
 * 조직(tenant) 공용 Slack webhook. 백엔드 AlertRouter 의 fallback 채널이다.
 * 호스트 소유자의 개인 webhook 이 없을 때만 쓰이고, 이것도 없으면 알림 발송 자체가 skip 된다.
 */
export type TenantWebhook = {
  tenantId: number
  webhookUrl: string | null
}

/**
 * POST /api/me/webhook/test 성공 응답. status 는 Slack 이 돌려준 HTTP 코드다.
 * 실패는 4xx/5xx + {"error": ...} 라 request() 가 ApiError 로 던진다.
 */
export type WebhookTestResult = {
  ok: boolean
  status: number
}

/** tenant enroll secret. 미발급이면 enrollSecret 이 null. */
export type EnrollSecret = {
  tenantId: number
  enrollSecret: string | null
}

/** 내가 소유 등록한 host 목록. 이 host 들의 탐지 알림이 내 webhook 으로 라우팅된다. */
export type MyHosts = {
  hosts: string[]
}

/** ClickHouse 집계라 cnt 가 문자열로 올 수 있다. */
export type EventSummary = {
  total: number
  byType: { type: string; cnt: number | string }[]
}

/**
 * 외부 연결 목적지를 국가로 묶은 집계. GET /api/events/geo 응답 그대로다.
 * 백엔드가 개별 연결이 아니라 국가 단위로 세어 주므로 host·IP·시각은 없다.
 * 사설 IP 는 제외되고, 서버에 GeoIP DB 가 없으면 빈 배열이 온다.
 */
export type GeoDestination = {
  country: string
  /** ISO2 국가 코드 */
  countryCode: string
  lat: number
  lng: number
  count: number
}

/** responder-service 실제 조치(kill) 결과. status 는 KillOutcome + 실행기 상태. */
export type ExecuteStatus = 'KILLED' | 'NO_MATCH' | 'TIMEOUT' | 'FAILED' | 'COOLDOWN' | 'DISABLED'

export type ExecuteResult = {
  host: string
  target: string
  status: ExecuteStatus
  /** Fleet 실행 id. 없으면 null. */
  executionId: string | null
}

export type AuthResponse = {
  token: string
  userId: number
  tenantId: number
  email: string
  role: string
}
