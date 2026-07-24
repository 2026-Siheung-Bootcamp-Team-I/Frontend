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

/** 악성 외부 연결(C2)의 목적지. 지도 시각화용으로 좌표를 포함한다. */
export type GeoThreat = {
  id: string
  host: string
  remoteIp: string
  country: string
  lat: number
  lng: number
  severity: AlertSeverity
  /** epoch millis */
  ts: number
}

export type AuthResponse = {
  token: string
  userId: number
  tenantId: number
  email: string
  role: string
}
