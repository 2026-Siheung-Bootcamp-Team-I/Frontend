/**
 * 로그인 전 방문자에게 보여주는 데모 데이터.
 *
 * 랜딩에서 "대시보드 보기"로 들어온 사람이 빈 화면이나 로그인 벽 대신
 * 실제 사용 모습을 그대로 볼 수 있게 한다. 서버를 부르지 않고 이 모듈 안에서만 답한다.
 */

import type {
  Alert,
  AlertStatus,
  AlertSummary,
  EventSummary,
  ExecuteResult,
  GeoDestination,
  Host,
  HostSummary,
  Lineage,
} from './types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 모듈이 로드된 시각 기준. "12분 전"처럼 상대 시간이 자연스럽게 보이도록 매번 현재에 맞춘다. */
const now = Date.now()

/** 위협 유형 TOP 5 집계에만 쓰는 분류. 백엔드 Alert 에는 없는 필드라 여기서만 들고 있는다. */
type DemoAlert = Alert & { category: string }

const alerts: DemoAlert[] = [
  {
    id: 'demo-1',
    host: 'WIN-FIN-02',
    ruleId: 'ransomware_mass_encrypt',
    threatName: '문서 대량 암호화 시도',
    mitre: 'T1486',
    severity: 'CRITICAL',
    action: 'kill',
    ts: now - 12 * MINUTE,
    status: 'open',
    matched: ['확장자 .locked 로 변경된 파일 214개', '섀도 복사본 삭제 명령'],
    category: '악성코드',
  },
  {
    id: 'demo-2',
    host: 'WIN-DEV-01',
    ruleId: 'lsass_memory_access',
    threatName: 'LSASS 메모리 접근',
    mitre: 'T1003.001',
    severity: 'CRITICAL',
    action: 'kill',
    ts: now - 48 * MINUTE,
    status: 'open',
    matched: ['process rundll32.exe (parent cmd.exe)', 'lsass.exe 핸들 요청 및 덤프 파일 생성'],
    category: '권한 상승',
  },
  {
    id: 'demo-3',
    host: 'WIN-HR-03',
    ruleId: 'powershell_encoded_command',
    threatName: '인코딩된 PowerShell 명령 실행',
    mitre: 'T1059.001',
    severity: 'HIGH',
    action: 'kill',
    ts: now - 2 * HOUR,
    status: 'open',
    matched: ['process powershell.exe (parent winword.exe)', '-enc 인코딩 명령 실행'],
    category: '악성코드',
  },
  {
    id: 'demo-4',
    host: 'WIN-FIN-02',
    ruleId: 'c2_beacon',
    threatName: '외부 C2 서버 반복 연결',
    mitre: 'T1071.001',
    severity: 'HIGH',
    action: 'kill',
    ts: now - 3 * HOUR,
    status: 'open',
    matched: ['5분 간격 동일 도메인 연결 37회', '평판 없는 도메인'],
    category: '원격 접속',
  },
  {
    id: 'demo-5',
    host: 'WIN-OPS-01',
    ruleId: 'local_admin_created',
    threatName: '로컬 관리자 계정 생성',
    mitre: 'T1136.001',
    severity: 'HIGH',
    action: 'notify',
    ts: now - 9 * HOUR,
    status: 'open',
    matched: ['net user /add 실행', 'Administrators 그룹에 추가'],
    category: '권한 상승',
  },
  {
    id: 'demo-6',
    host: 'WIN-DEV-01',
    ruleId: 'scheduled_task_persistence',
    threatName: '예약 작업으로 지속성 확보',
    mitre: 'T1053.005',
    severity: 'MEDIUM',
    action: 'notify',
    ts: now - 20 * HOUR,
    status: 'confirmed',
    matched: ['schtasks /create 실행', '부팅 시 자동 실행 등록'],
    category: '권한 상승',
  },
  {
    id: 'demo-7',
    host: 'WIN-HR-03',
    ruleId: 'large_outbound_transfer',
    threatName: '대용량 외부 전송',
    mitre: 'T1567.002',
    severity: 'MEDIUM',
    action: 'notify',
    ts: now - 2 * DAY,
    status: 'false_positive',
    matched: ['외부 스토리지로 1.8GB 업로드'],
    category: '정보 유출',
  },
  {
    id: 'demo-8',
    host: 'WIN-OPS-02',
    ruleId: 'rdp_brute_force',
    threatName: 'RDP 무차별 대입 시도',
    mitre: 'T1110.001',
    severity: 'MEDIUM',
    action: 'notify',
    ts: now - 4 * DAY,
    status: 'confirmed',
    matched: ['1분간 로그인 실패 92회'],
    category: '원격 접속',
  },
  {
    id: 'demo-9',
    host: 'WIN-FIN-01',
    ruleId: 'usb_mass_copy',
    threatName: 'USB 대량 파일 복사',
    mitre: 'T1052.001',
    severity: 'MEDIUM',
    action: 'notify',
    ts: now - 5 * DAY,
    status: 'confirmed',
    matched: ['이동식 디스크로 파일 340개 복사'],
    category: '정보 유출',
  },
]

const hosts: Host[] = [
  {
    host: 'WIN-FIN-02',
    lastSeen: now - 40_000,
    status: 'critical',
    threats: 2,
    enrolled: true,
    agentSeen: now - 40_000,
  },
  {
    host: 'WIN-DEV-01',
    lastSeen: now - 90_000,
    status: 'critical',
    threats: 1,
    enrolled: true,
    agentSeen: now - 90_000,
  },
  {
    host: 'WIN-HR-03',
    lastSeen: now - 3 * MINUTE,
    status: 'warning',
    threats: 1,
    enrolled: true,
    agentSeen: now - 3 * MINUTE,
  },
  {
    host: 'WIN-OPS-01',
    lastSeen: now - 5 * MINUTE,
    status: 'warning',
    threats: 1,
    enrolled: true,
    agentSeen: now - 5 * MINUTE,
  },
  {
    host: 'WIN-OPS-02',
    lastSeen: now - 8 * MINUTE,
    status: 'healthy',
    threats: 0,
    enrolled: true,
    agentSeen: now - 8 * MINUTE,
  },
  {
    host: 'WIN-FIN-01',
    lastSeen: now - 11 * MINUTE,
    status: 'healthy',
    threats: 0,
    enrolled: true,
    agentSeen: now - 11 * MINUTE,
  },
  // 등록은 됐지만 아직 이벤트가 없는 기기. osquery 는 붙어 있는데 수집된 이벤트가 0건인 상태를
  // 데모에서도 보여주려고 lastSeen 은 0, agentSeen 은 최근 값으로 둔다.
  {
    host: 'WIN-MKT-01',
    lastSeen: 0,
    status: 'healthy',
    threats: 0,
    enrolled: true,
    agentSeen: now - 2 * MINUTE,
  },
]

/** 등록은 됐지만 이벤트가 한 번도 없는 기기. healthy 카운트에서 따로 떼어내는 기준이다. */
function isNoEvents(h: Host): boolean {
  return h.enrolled && h.lastSeen === 0
}

/**
 * 지도에 찍는 외부 연결 목적지. 백엔드 GET /api/events/geo 와 같은 국가별 집계 형태다.
 * 좌표는 국가 대표 좌표(백엔드 CountryCentroid 와 같은 기준).
 */
const geoDestinations: GeoDestination[] = [
  { country: 'Russia', countryCode: 'RU', lat: 55.75, lng: 37.62, count: 412 },
  { country: 'China', countryCode: 'CN', lat: 39.9, lng: 116.4, count: 268 },
  { country: 'United States', countryCode: 'US', lat: 38.9, lng: -77.0, count: 195 },
  { country: 'Netherlands', countryCode: 'NL', lat: 52.37, lng: 4.9, count: 87 },
  { country: 'Brazil', countryCode: 'BR', lat: -23.55, lng: -46.63, count: 54 },
  { country: 'Germany', countryCode: 'DE', lat: 52.52, lng: 13.4, count: 41 },
  { country: 'Vietnam', countryCode: 'VN', lat: 21.02, lng: 105.85, count: 23 },
]

/** 대시보드 공격 경로에 쓰는 계보. 알림별로 없으면 첫 알림 것을 돌려준다. */
const lineages: Record<string, Lineage> = {
  'demo-1': {
    nodes: [
      { id: 'n1', kind: 'process', label: 'outlook.exe' },
      { id: 'n2', kind: 'file', label: '견적서_최종.xlsm' },
      { id: 'n3', kind: 'process', label: 'excel.exe' },
      { id: 'n4', kind: 'process', label: 'powershell.exe' },
      { id: 'n5', kind: 'file', label: '문서 214개 암호화' },
    ],
    edges: [
      { from: 'n1', to: 'n2', rel: 'wrote' },
      { from: 'n2', to: 'n3', rel: 'spawned' },
      { from: 'n3', to: 'n4', rel: 'spawned' },
      { from: 'n4', to: 'n5', rel: 'wrote' },
    ],
  },
  'demo-2': {
    nodes: [
      { id: 'n1', kind: 'process', label: 'explorer.exe' },
      { id: 'n2', kind: 'process', label: 'cmd.exe' },
      { id: 'n3', kind: 'process', label: 'rundll32.exe' },
      { id: 'n4', kind: 'file', label: 'lsass.dmp' },
    ],
    edges: [
      { from: 'n1', to: 'n2', rel: 'spawned' },
      { from: 'n2', to: 'n3', rel: 'spawned' },
      { from: 'n3', to: 'n4', rel: 'wrote' },
    ],
  },
  'demo-3': {
    nodes: [
      { id: 'n1', kind: 'process', label: 'winword.exe' },
      { id: 'n2', kind: 'process', label: 'powershell.exe' },
      { id: 'n3', kind: 'network', label: '203.0.113.24:8443' },
    ],
    edges: [
      { from: 'n1', to: 'n2', rel: 'spawned' },
      { from: 'n2', to: 'n3', rel: 'connected' },
    ],
  },
  'demo-4': {
    nodes: [
      { id: 'n1', kind: 'process', label: 'svchost.exe' },
      { id: 'n2', kind: 'process', label: 'msiexec.exe' },
      { id: 'n3', kind: 'network', label: 'cdn-update-check.net' },
    ],
    edges: [
      { from: 'n1', to: 'n2', rel: 'spawned' },
      { from: 'n2', to: 'n3', rel: 'connected' },
    ],
  },
  'demo-5': {
    nodes: [
      { id: 'n1', kind: 'process', label: 'cmd.exe' },
      { id: 'n2', kind: 'process', label: 'net.exe' },
      { id: 'n3', kind: 'file', label: 'svc_backup 계정 등록' },
    ],
    edges: [
      { from: 'n1', to: 'n2', rel: 'spawned' },
      { from: 'n2', to: 'n3', rel: 'wrote' },
    ],
  },
}

/** 실제 서버처럼 잠깐 기다렸다 답한다. 로딩 상태가 한 프레임도 안 보이면 화면이 튄다. */
function respond<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 180))
}

type AlertFilter = {
  host?: string
  severity?: string
  status?: AlertStatus
  from?: number
  to?: number
  limit?: number
}

function inPeriod(ts: number, from?: number, to?: number): boolean {
  if (from !== undefined && ts < from) return false
  if (to !== undefined && ts > to) return false
  return true
}

/** 백엔드와 같은 순서(최신순)로 돌려준다. */
function filtered({ host, severity, status, from, to, limit }: AlertFilter): DemoAlert[] {
  const rows = alerts
    .filter((a) => (host ? a.host === host : true))
    .filter((a) => (severity ? a.severity === severity : true))
    .filter((a) => (status ? a.status === status : true))
    .filter((a) => inPeriod(a.ts, from, to))
    .sort((a, b) => b.ts - a.ts)
  return limit === undefined ? rows : rows.slice(0, limit)
}

function summarize(rows: DemoAlert[]): AlertSummary {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.category, (counts.get(row.category) ?? 0) + 1)

  return {
    total: rows.length,
    severity: {
      critical: rows.filter((a) => a.severity === 'CRITICAL').length,
      high: rows.filter((a) => a.severity === 'HIGH').length,
      medium: rows.filter((a) => a.severity === 'MEDIUM').length,
    },
    topThreats: [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  }
}

export const demoApi = {
  alerts: (filter: AlertFilter = {}) => respond<Alert[]>(filtered(filter)),

  alertSummary: (period: { from?: number; to?: number } = {}) =>
    respond(summarize(filtered(period))),

  lineage: (id: string) => respond(lineages[id] ?? lineages['demo-1']),

  /**
   * 데모에서도 판단 결과가 화면에 반영되도록 메모리 위 데이터를 바꾼다.
   * 새로고침하면 원래대로 돌아간다.
   */
  triage: (id: string, status: Extract<AlertStatus, 'confirmed' | 'false_positive'>) => {
    const target = alerts.find((a) => a.id === id)
    if (target) target.status = status
    return respond<Alert>(target ?? alerts[0])
  },

  /**
   * 실제 조치(kill) 흉내. 서버(responder)를 부르지 않고 성공한 셈 치고 답한다.
   * 데모에서 버튼이 눌리지도 않으면 이 기능이 있다는 걸 보여 줄 방법이 없어서 둔다.
   * responder 를 거치지 않으므로 executionId 는 없다.
   */
  executeKill: (id: string, target: string): Promise<ExecuteResult> => {
    const host = alerts.find((a) => a.id === id)?.host ?? alerts[0].host
    // 실제 조치는 왕복이 있어 즉답이 아니다. 버튼이 "실행 중" 을 거치도록 조금 더 기다린다.
    return new Promise((resolve) =>
      setTimeout(() => resolve({ host, target, status: 'KILLED', executionId: null }), 900),
    )
  },

  geoDestinations: (): Promise<GeoDestination[]> =>
    respond([...geoDestinations].sort((a, b) => b.count - a.count)),

  hosts: () => respond(hosts),

  hostSummary: (): Promise<HostSummary> =>
    respond({
      healthy: hosts.filter((h) => h.status === 'healthy' && !isNoEvents(h)).length,
      warning: hosts.filter((h) => h.status === 'warning').length,
      critical: hosts.filter((h) => h.status === 'critical').length,
      noEvents: hosts.filter(isNoEvents).length,
      total: hosts.length,
    }),

  eventSummary: (): Promise<EventSummary> =>
    respond({
      total: 18_402,
      byType: [
        { type: 'process', cnt: 11_860 },
        { type: 'file', cnt: 4_318 },
        { type: 'network', cnt: 2_224 },
      ],
    }),
}
