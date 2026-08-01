/** api-service(백엔드) 응답 DTO. 필드명·값은 백엔드 record 와 1:1로 맞춘다. */

/** detector 가 발행하는 severity 원문. */
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM'

/** 트리아지 status. open 은 적재 초기값, PATCH 로는 confirmed/false_positive 만 보낼 수 있다. */
export type AlertStatus = 'open' | 'confirmed' | 'false_positive'

/**
 * 판정을 유발한 원본 이벤트. GET /api/alerts/{id} 에서만 채워지고 목록에는 없다.
 */
export type SourceEvent = {
  /** 이벤트를 짚는 결정적 id. /api/events 와 사건 전개에서 같은 값이 나온다. */
  id: string
  host: string
  type: string
  /** epoch millis */
  ts: number
  process: string
  parent: string
  cmdline: string
  destIp: string
  /** 네트워크 이벤트가 아니면 0. */
  destPort: number
  domain: string
  detail: string
  sha256: string
  /**
   * 이 이벤트를 무엇으로 특정했는지. 확신이 강한 순서로 summary > rule_type 둘뿐이다.
   * 둘 다 못 짚으면 시각으로 추측하지 않고 sourceEvent 자체가 null 로 온다.
   * 백엔드가 단계를 늘릴 수 있어 유니온으로 좁히지 않는다.
   */
  matchedBy: string
}

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
  /** 판정 근거에 실제로 관측된 목적지 도메인. 없으면 빈 문자열. */
  domain: string
  /** 판정 근거에 실제로 관측된 목적지 IP. 없으면 빈 문자열. */
  destIp: string
  /** 목록이거나 원본 이벤트를 못 찾았으면 null. */
  sourceEvent: SourceEvent | null
  /**
   * 이 알림이 속한 사건. 목록이면 null이고, 상세여도 사건 조회 기본 기간(최근 7일)을 벗어난
   * 알림이면 null이다. 그 사건은 사건 목록에도 안 보이므로 화면은 사건으로 가는 길을 감춰야 한다.
   */
  incidentId: string | null
}

/**
 * 탐지 룰 카탈로그. GET /api/alerts/rules.
 * 알림마다 실려 오지 않는 정적 참조 데이터라 화면이 한 번 받아 두고 ruleId 로 찾아 쓴다.
 */
export type RuleCatalogEntry = {
  ruleId: string
  threatName: string
  category: string
  mitre: string
  /** 이 룰이 언제 발화하는지. detector 판정 로직을 그대로 옮긴 문장이다. */
  description: string
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
  /** 에이전트가 보고한 OS. darwin | windows. 미등록이면 빈 문자열. */
  platform: string
  /**
   * 0..100. 기간 내 열린 알림을 severity 로 가중합한 값이다.
   * 알림이 없으면 0 이고 null 이 아니다. 관측하지 못한 게 아니라 열린 알림이 없다는 실제 결과다.
   * 토폴로지 엔드포인트 노드의 riskScore 와 같은 계산이라 두 화면이 같은 숫자를 낸다.
   */
  riskScore: number
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
 * GET /api/events 의 개별 수집 이벤트.
 *
 * type 은 process/network/file/dns/l7 이지만 유니온으로 좁히지 않는다. 수집 요소는 계속 늘어나고,
 * 모르는 유형이 왔을 때 타입 에러 대신 원문 그대로 보여주는 편이 조사에 쓸모 있다.
 *
 * 값이 없는 문자열 필드는 ClickHouse 기본값 때문에 null 이 아니라 빈 문자열로 온다.
 * 반대로 pid/포트/코드 같은 수치는 관측하지 못하면 null 이다(0 은 실제로 0인 경우다).
 */
export type EdrEvent = {
  /** 이벤트를 짚는 결정적 id. 알림의 원본 이벤트·사건 전개에서 같은 값이 나온다. */
  id: string
  host: string
  type: string
  /** epoch millis. 엔드포인트에서 이벤트가 일어난 시각. */
  ts: number
  process: string
  parent: string
  cmdline: string
  pid: number | null
  ppid: number | null
  destIp: string
  /** 네트워크 이벤트가 아니면 0. 이 필드만은 null 이 아니라 0 으로 온다. */
  destPort: number
  /** tcp | udp */
  protocol: string | null
  domain: string
  sha256: string
  /** 파일 이벤트의 동작. CREATE | WRITE | RENAME | DELETE */
  action: string | null
  /** A, AAAA 등 */
  dnsRecordType: string | null
  dnsAnswers: string[] | null
  /** 0 이 성공이라 "없음"(null)과 반드시 구분해서 다뤄야 한다. */
  dnsResponseCode: number | null
  tlsVersion: string | null
  /** 핸드셰이크에서 제시된 프로토콜 목록이라 배열이다. */
  alpn: string[] | null
  /** TLS | HTTP */
  l7Protocol: string | null
  httpMethod: string | null
  httpPath: string | null
  httpUserAgent: string | null
  httpStatusCode: number | null
  /**
   * 평탄화되기 전 원본 JSON 문자열. 위 필드는 여기서 뽑아낸 값이라 파싱할 필요가 없고,
   * 백엔드가 새 키를 수집하기 시작했을 때 화면 수정 없이 확인할 수단으로만 쓴다.
   */
  detail: string
  /** epoch millis. 서버에 적재된 시각. 파싱하지 못하면 null. */
  ingestedAt: number | null
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
  /** 에이전트에 내려보낸 명령 id. 실행 전에 끝난 DISABLED/COOLDOWN 이면 null. */
  executionId: string | null
}

/* ── Intelligence: egress 토폴로지 (GET /api/intelligence/topology) ───────────────── */

/** endpoint = 우리 기기, destination = 나간 목적지, domainGroup = 같은 등록가능 도메인끼리 묶은 것. */
export type TopologyNodeKind = 'endpoint' | 'destination' | 'domainGroup'

export type TopologyNode = {
  /** host:<이름> | dest:<목적지> | group:<도메인> */
  id: string
  kind: TopologyNodeKind
  label: string
  /**
   * destination 노드만. domain | ip.
   * ip 는 도메인을 못 잡았다는 뜻이지 이름이 없다는 뜻이 아니다. 서버가 이름을 지어 붙이지 않는다.
   */
  destKind: string | null
  /** destination 이 속한 domainGroup 노드 id. 묶이지 않았으면 null. */
  group: string | null
  /** endpoint 노드만. 0..100. */
  riskScore: number | null
  /** endpoint 노드만. */
  openAlerts: number | null
  /** domainGroup 노드만. 묶인 목적지 수. */
  members: number | null
}

export type TopologyEdge = {
  from: string
  to: string
  events: number
  /** 0 이면 관측만 된 관계다. 0 보다 크면 조사 대상이라 화면에서 반드시 갈라 그린다. */
  alerts: number
  protocols: string[]
  /** epoch millis */
  lastSeen: number
}

export type Topology = {
  /** epoch millis. 조회 구간. */
  from: number
  to: number
  totalRelations: number
  shownRelations: number
  /** true 면 화면에 "이게 전부가 아니다"를 반드시 알려야 한다. */
  truncated: boolean
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}

/* ── Intelligence: IP·도메인 상관 (GET /api/intelligence/correlate) ───────────────── */

export type CorrelationNodeKind = 'DOMAIN' | 'IP' | 'HOST' | 'PROCESS' | 'PTR_NAME'

/**
 * 엣지의 출처. 셋을 같게 보여주면 추측이 관측으로 읽힌다.
 * OBSERVED  수집한 이벤트에 그대로 있던 사실
 * INFERRED  관측 두 건을 시간·IP 로 이어 붙인 추측 (basis 에 근거)
 * LIVE_DNS  지금 물어본 결과. 조회 시점 상태일 뿐 우리 이벤트와 무관하다
 */
export type RelationOrigin = 'OBSERVED' | 'INFERRED' | 'LIVE_DNS'

export type RelationType =
  | 'RESOLVED_TO'
  | 'ALIAS_OF'
  | 'CONNECTED_VIA'
  | 'QUERIED'
  | 'CONNECTED'
  | 'PTR_CANDIDATE'

export type CorrelationNode = {
  /** <kind 소문자>:<value> */
  id: string
  kind: CorrelationNodeKind
  value: string
}

export type CorrelationEdge = {
  from: string
  to: string
  relation: RelationType
  origin: RelationOrigin
  observations: number
  /** epoch millis. 관측이 없으면(LIVE_DNS) null. */
  firstSeen: number | null
  lastSeen: number | null
  /** INFERRED 를 무엇으로 이었는지. 다른 origin 이면 null. */
  basis: string | null
}

export type DnsLookupStatus = 'OK' | 'NOT_FOUND' | 'FAILED'

/**
 * NOT_FOUND 는 서버가 "그런 이름 없다"고 답한 것(조회는 성공),
 * FAILED 는 타임아웃 등으로 묻지 못한 것이다. 둘을 같게 그리면 없는 사실이 생긴다.
 */
export type ForwardLookup = {
  status: DnsLookupStatus
  addresses: string[]
  error: string | null
}

export type ReverseLookup = {
  status: DnsLookupStatus
  /** PTR 이 답한 이름. IP 소유자가 아무 이름이나 적을 수 있어 IP 의 이름이 아니라 후보다. */
  ptrNames: string[]
  error: string | null
}

export type CorrelateTarget = {
  kind: 'DOMAIN' | 'IP'
  value: string
}

export type DnsLookup = {
  target: CorrelateTarget
  /** 대상이 도메인일 때만. */
  forward: ForwardLookup | null
  /** 대상이 IP 일 때만. */
  reverse: ReverseLookup | null
}

export type Correlation = {
  target: CorrelateTarget
  /** 0 이면 "우리가 관측한 적 없음"을 화면에 명시해야 한다. */
  observedEvents: number
  nodes: CorrelationNode[]
  edges: CorrelationEdge[]
  /** liveDns=false 로 조회했으면 null. */
  liveDns: DnsLookup | null
}

/* ── Incidents (/api/incidents) ──────────────────────────────────────────────────── */

/**
 * 같은 공격 체인으로 묶인 알림들. 알림을 프로세스 계보로 묶어 조회 시점에 계산한다.
 * id 가 결정적이라 알림이 하나 더 붙어도 여기 단 트리아지 status 는 유지된다.
 */
export type Incident = {
  id: string
  host: string
  status: AlertStatus
  severity: AlertSeverity
  /** epoch millis */
  firstTs: number
  lastTs: number
  alertCount: number
  /** 빈 문자열이면 원본 이벤트를 못 찾은 것이다. 서버가 지어내지 않는다. */
  rootProcess: string
  ruleIds: string[]
  threatNames: string[]
  mitre: string[]
  /** 목록에서는 null. 상세에서만 채워진다. */
  alerts: Alert[] | null
  /** 목록에서는 null. 노드 id 는 proc:이름:pid, pid 를 관측 못 했으면 proc:이름. */
  lineage: Lineage | null
}

/**
 * 사건 전개 한 줄. kind 가 event 면 관측된 이벤트, alert 면 그 위에서 난 판정이다.
 * 체인 밖 이벤트는 담기지 않는다. 같은 시각이면 이벤트가 알림보다 먼저 온다.
 */
export type IncidentTimelineEntry = {
  /** 이벤트 줄을 짚는 id. 알림 줄은 alertId 로 짚으므로 null 이다. */
  eventId: string | null
  /** epoch millis */
  ts: number
  kind: 'event' | 'alert'
  type: string | null
  process: string | null
  pid: number | null
  parent: string | null
  cmdline: string | null
  destIp: string | null
  destPort: number | null
  domain: string | null
  alertId: string | null
  ruleId: string | null
  threatName: string | null
  severity: string | null
}

export type IncidentTimeline = {
  id: string
  host: string
  entries: IncidentTimelineEntry[]
}

/* ── 통합 검색 (GET /api/search) ─────────────────────────────────────────────── */

/**
 * 드롭다운 한 줄에 필요한 것만 담긴 알림. 목록 응답의 부분집합이라
 * status·action·matched·domain·destIp·sourceEvent·incidentId 가 없다.
 * 상세가 필요하면 id 로 GET /api/alerts/{id} 를 따로 부른다.
 */
export type SearchAlert = Pick<
  Alert,
  'id' | 'host' | 'ruleId' | 'threatName' | 'mitre' | 'severity' | 'ts'
>

/**
 * 이벤트 부분집합. host 와 ts 는 표시용이 아니라 이동용이다.
 * 이벤트 id 는 저장된 값이 아니라 행을 접어 만든 것이라 상세 조회에 셋 다 있어야 한다.
 */
export type SearchEvent = Pick<
  EdrEvent,
  'id' | 'host' | 'ts' | 'type' | 'process' | 'cmdline' | 'domain' | 'destIp' | 'sha256'
>

/**
 * 잘림은 종류마다 따로 온다. 호스트는 다 왔는데 이벤트만 잘리는 경우가 흔해서
 * 한 벌로 묶으면 어느 쪽이 잘렸는지 화면이 말할 수 없다.
 */
export type SearchSection<T> = {
  items: T[]
  hasMore: boolean
}

export type SearchResults = {
  /** 앞뒤 공백만 뗀 질의어. */
  query: string
  /** epoch millis. 세 섹션 공통 구간이라 "없음"과 "이 기간에는 없음"을 갈라 말해야 한다. */
  from: number
  to: number
  hosts: SearchSection<Host>
  alerts: SearchSection<SearchAlert>
  events: SearchSection<SearchEvent>
}

export type AuthResponse = {
  token: string
  userId: number
  tenantId: number
  email: string
  role: string
}
