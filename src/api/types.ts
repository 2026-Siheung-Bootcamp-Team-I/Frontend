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
  /** epoch millis. events 최신 ts. 이벤트가 없으면 0(등록만 되고 아직 수집이 없는 경우) */
  lastSeen: number
  status: HostStatus
  /** 열린 alert 수 */
  threats: number
  /** 조직에 등록된 기기인가. false 면 예전 관측 데이터뿐 정식 등록은 안 된 기기다. */
  enrolled: boolean
  /** epoch millis. osquery 가 서버에 마지막으로 붙은 시각. 미등록이면 0 */
  agentSeen: number
}

export type HostSummary = {
  /** 이벤트가 있고 열린 알림이 없는 기기 */
  healthy: number
  warning: number
  critical: number
  /** 전체. healthy + warning + critical + noEvents 와 같다. */
  total: number
  /** 등록됐지만 이벤트가 한 번도 없는 기기 */
  noEvents: number
}

/** 내 개인 Slack webhook. 미설정이면 webhookUrl 이 null. */
export type UserWebhook = {
  userId: number
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

/**
 * 설치 링크 발급 응답.
 *
 * 명령줄은 서버가 조립해서 준다. 화면이 주소와 토큰을 이어 붙이면 서버 주소나 경로가 바뀔 때
 * 프론트도 같이 고쳐야 하고, 어긋나면 사용자가 붙여넣은 명령이 조용히 틀린 곳을 가리킨다.
 * 그래서 macosCommand/windowsCommand 는 손대지 않고 그대로 보여준다.
 */
export type InstallLink = {
  token: string
  /** ISO-8601. 기본 24시간이라 화면에 남은 시간을 알려줘야 한다. */
  expiresAt: string
  macosCommand: string
  windowsCommand: string
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
