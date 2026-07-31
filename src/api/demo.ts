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
  Correlation,
  DnsLookup,
  EdrEvent,
  EventSummary,
  ExecuteResult,
  ForwardLookup,
  GeoDestination,
  Host,
  HostSummary,
  Incident,
  IncidentTimeline,
  IncidentTimelineEntry,
  Lineage,
  ReverseLookup,
  RuleCatalogEntry,
  SourceEvent,
  Topology,
  TopologyEdge,
  TopologyNode,
} from './types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 모듈이 로드된 시각 기준. "12분 전"처럼 상대 시간이 자연스럽게 보이도록 매번 현재에 맞춘다. */
const now = Date.now()

/** 위협 유형 TOP 5 집계에만 쓰는 분류. 백엔드 Alert 에는 없는 필드라 여기서만 들고 있는다. */
type DemoAlert = Alert & { category: string }

/**
 * domain/destIp/sourceEvent 는 목록에서 대부분 비어 있다. 알림마다 손으로 세 필드를 다 적으면
 * 하나가 늘 때마다 9곳을 고쳐야 하니, 빈 기본값을 깔고 실제로 관측된 것만 덮어쓴다.
 */
function alert(
  base: Omit<DemoAlert, 'domain' | 'destIp' | 'sourceEvent' | 'incidentId'> &
    Partial<Pick<DemoAlert, 'domain' | 'destIp'>>,
): DemoAlert {
  // incidentId 는 목록에서 항상 null 이다. 실제 값은 사건에 속한 알림에 한해 상세 조회에서만 채운다.
  return { domain: '', destIp: '', sourceEvent: null, incidentId: null, ...base }
}

const alerts: DemoAlert[] = [
  alert({
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
  }),
  alert({
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
  }),
  alert({
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
    // 같은 사건 안에서 관측된 목적지(l7/dns 이벤트). 판정 근거 자체는 프로세스/명령행이라도
    // 이 사건에서 실제로 연결된 곳이 있으면 domain/destIp 는 채워 둔다.
    domain: 'telemetry-sync.io',
    destIp: '198.51.100.72',
  }),
  alert({
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
    domain: 'cdn-update-check.net',
    destIp: '185.220.101.47',
  }),
  alert({
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
  }),
  alert({
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
  }),
  alert({
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
  }),
  alert({
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
  }),
  alert({
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
  }),
]

/** id 로 알림 하나를 찾는다. 데모 안에서는 항상 존재가 보장된 id 만 넘긴다. */
function findAlert(id: string): DemoAlert {
  const found = alerts.find((a) => a.id === id)
  if (!found) throw new Error(`no demo alert for ${id}`)
  return found
}

/**
 * category 는 백엔드 Alert 에 없는 데모 전용 필드라 응답 직전에 떼어낸다.
 * incidentId 는 호출부가 명시할 때만 채운다(목록은 항상 null, 상세만 실제 사건 id 를 넘긴다).
 */
function toAlert(d: DemoAlert, sourceEvent: SourceEvent | null, incidentId: string | null = null): Alert {
  return {
    id: d.id,
    host: d.host,
    ruleId: d.ruleId,
    threatName: d.threatName,
    mitre: d.mitre,
    severity: d.severity,
    action: d.action,
    ts: d.ts,
    status: d.status,
    matched: d.matched,
    domain: d.domain,
    destIp: d.destIp,
    sourceEvent,
    incidentId,
  }
}

/**
 * 탐지 룰 카탈로그. 화면이 알림의 ruleId 로 여기서 설명을 찾아 붙이므로 위 alerts 에 쓰인
 * ruleId 를 전부 덮어야 한다. threatName/category 는 alerts 에서 쓰는 값과 같게 맞춘다.
 */
const ruleCatalog: RuleCatalogEntry[] = [
  {
    ruleId: 'ransomware_mass_encrypt',
    threatName: '문서 대량 암호화 시도',
    category: '악성코드',
    mitre: 'T1486',
    description:
      '짧은 시간 안에 다수의 파일이 알려진 랜섬웨어 확장자로 연속 변경되고, 섀도 복사본 삭제 명령이 함께 관측되면 발화한다.',
  },
  {
    ruleId: 'lsass_memory_access',
    threatName: 'LSASS 메모리 접근',
    category: '권한 상승',
    mitre: 'T1003.001',
    description: 'lsass.exe 프로세스 메모리에 대한 핸들 요청과 함께 덤프 파일 생성이 관측되면 발화한다.',
  },
  {
    ruleId: 'powershell_encoded_command',
    threatName: '인코딩된 PowerShell 명령 실행',
    category: '악성코드',
    mitre: 'T1059.001',
    description:
      'PowerShell 이 -enc/-EncodedCommand 옵션으로 실행되고, 상위 프로세스가 평소 스크립트를 실행하지 않는 프로세스(문서 편집기 등)일 때 발화한다.',
  },
  {
    ruleId: 'c2_beacon',
    threatName: '외부 C2 서버 반복 연결',
    category: '원격 접속',
    mitre: 'T1071.001',
    description:
      '일정한 간격으로 동일 도메인·IP 에 반복 연결하면서 목적지의 평판 정보가 없거나 낮을 때 발화한다.',
  },
  {
    ruleId: 'local_admin_created',
    threatName: '로컬 관리자 계정 생성',
    category: '권한 상승',
    mitre: 'T1136.001',
    description: 'net user /add 로 계정이 생성된 직후 같은 계정이 Administrators 그룹에 추가되면 발화한다.',
  },
  {
    ruleId: 'scheduled_task_persistence',
    threatName: '예약 작업으로 지속성 확보',
    category: '권한 상승',
    mitre: 'T1053.005',
    description:
      'schtasks /create 로 예약 작업이 등록되고, 부팅 또는 로그온 시 자동 실행되도록 트리거가 설정되면 발화한다.',
  },
  {
    ruleId: 'large_outbound_transfer',
    threatName: '대용량 외부 전송',
    category: '정보 유출',
    mitre: 'T1567.002',
    description: '짧은 시간 안에 단일 프로세스가 외부로 임계치 이상의 데이터를 전송하면 발화한다.',
  },
  {
    ruleId: 'rdp_brute_force',
    threatName: 'RDP 무차별 대입 시도',
    category: '원격 접속',
    mitre: 'T1110.001',
    description: '짧은 시간 창 안에서 동일 계정 또는 호스트를 대상으로 RDP 로그인 실패가 임계치 이상 반복되면 발화한다.',
  },
  {
    ruleId: 'usb_mass_copy',
    threatName: 'USB 대량 파일 복사',
    category: '정보 유출',
    mitre: 'T1052.001',
    description: '이동식 디스크로 짧은 시간 안에 다수의 파일이 복사되면 발화한다.',
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
    platform: 'windows',
    // 토폴로지 host:WIN-FIN-02 노드와 같은 값(CRITICAL+HIGH 열린 알림 2건).
    riskScore: 92,
  },
  {
    host: 'WIN-DEV-01',
    lastSeen: now - 90_000,
    status: 'critical',
    threats: 1,
    enrolled: true,
    agentSeen: now - 90_000,
    platform: 'windows',
    // 토폴로지 host:WIN-DEV-01 노드와 같은 값(CRITICAL 열린 알림 1건).
    riskScore: 78,
  },
  {
    host: 'WIN-HR-03',
    lastSeen: now - 3 * MINUTE,
    status: 'warning',
    threats: 1,
    enrolled: true,
    agentSeen: now - 3 * MINUTE,
    platform: 'windows',
    // 토폴로지 host:WIN-HR-03 노드와 같은 값(HIGH 열린 알림 1건).
    riskScore: 65,
  },
  {
    host: 'WIN-OPS-01',
    lastSeen: now - 5 * MINUTE,
    status: 'warning',
    threats: 1,
    enrolled: true,
    agentSeen: now - 5 * MINUTE,
    platform: 'windows',
    // WIN-HR-03 과 같은 조건(HIGH 열린 알림 1건)이라 같은 값.
    riskScore: 65,
  },
  {
    host: 'WIN-OPS-02',
    lastSeen: now - 8 * MINUTE,
    status: 'healthy',
    threats: 0,
    enrolled: true,
    agentSeen: now - 8 * MINUTE,
    platform: 'windows',
    riskScore: 0,
  },
  {
    host: 'WIN-FIN-01',
    lastSeen: now - 11 * MINUTE,
    status: 'healthy',
    threats: 0,
    enrolled: true,
    agentSeen: now - 11 * MINUTE,
    platform: 'windows',
    // 토폴로지 host:WIN-FIN-01 노드와 같은 값(열린 알림 없음).
    riskScore: 0,
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
    platform: 'windows',
    riskScore: 0,
  },
  // OS 구분이 화면에 드러나야 해서 하나는 macOS 로 둔다.
  {
    host: 'MAC-DESIGN-01',
    lastSeen: now - 5 * MINUTE,
    status: 'healthy',
    threats: 0,
    enrolled: true,
    agentSeen: now - 5 * MINUTE,
    platform: 'darwin',
    // 토폴로지 host:MAC-DESIGN-01 노드와 같은 값(열린 알림 없음).
    riskScore: 0,
  },
]

/** 등록은 됐지만 이벤트가 한 번도 없는 기기. healthy 카운트에서 따로 떼어내는 기준이다. */
function isNoEvents(h: Host): boolean {
  return h.enrolled && h.lastSeen === 0
}

/**
 * 수집 이벤트. 유형마다 채워지는 필드가 달라서 빈 상태를 기본으로 두고 필요한 것만 덮어쓴다.
 * 빈 값 표기는 백엔드와 같게 맞춘다(문자열은 '', 수치는 null).
 *
 * extra 는 백엔드가 아직 최상위 필드로 펴지 않은 키다. 원본 detail 에만 실려서
 * "새 키는 detail 에서 확인한다"는 동작을 데모에서도 그대로 보여준다.
 */
/**
 * 백엔드는 host·ts·type·process·pid·parent·destIp·destPort 조합으로 이벤트 id 를 결정적으로 만든다.
 * 형식은 UUID 가 아니어도 되고, 같은 관측이면 항상 같은 id 가 나오는 게 중요하다.
 */
function eventId(
  e: Pick<EdrEvent, 'host' | 'ts' | 'type' | 'process' | 'pid' | 'parent' | 'destIp' | 'destPort'>,
): string {
  return ['evt', e.host, e.ts, e.type, e.process, e.pid, e.parent, e.destIp, e.destPort].join(':')
}

function event(
  base: Partial<EdrEvent> & Pick<EdrEvent, 'host' | 'type' | 'ts'>,
  extra: Record<string, unknown> = {},
): EdrEvent {
  const e: EdrEvent = {
    id: '',
    process: '',
    parent: '',
    cmdline: '',
    pid: null,
    ppid: null,
    destIp: '',
    // 이 필드만 없음을 0 으로 표현한다. 백엔드 destPort 가 nullable 이 아니다.
    destPort: 0,
    protocol: null,
    domain: '',
    sha256: '',
    action: null,
    dnsRecordType: null,
    dnsAnswers: null,
    dnsResponseCode: null,
    tlsVersion: null,
    alpn: null,
    l7Protocol: null,
    httpMethod: null,
    httpPath: null,
    httpUserAgent: null,
    httpStatusCode: null,
    detail: '',
    // 수집에서 적재까지의 지연. 화면이 ts 와 ingestedAt 을 구분해 보여주는지 확인하려고 살짝 벌린다.
    ingestedAt: base.ts + 1_400,
    ...base,
  }
  return { ...e, id: eventId(e), detail: detailOf(e, extra) }
}

/** 원본 detail 은 평탄화된 필드를 되돌린 값이다. 손으로 두 벌을 적으면 반드시 어긋난다. */
function detailOf(e: EdrEvent, extra: Record<string, unknown>): string {
  const raw: Record<string, unknown> = {
    pid: e.pid,
    ppid: e.ppid,
    protocol: e.protocol,
    action: e.action,
    dns_record_type: e.dnsRecordType,
    dns_answers: e.dnsAnswers,
    dns_response_code: e.dnsResponseCode,
    tls_version: e.tlsVersion,
    alpn: e.alpn,
    l7_protocol: e.l7Protocol,
    http_method: e.httpMethod,
    http_path: e.httpPath,
    http_user_agent: e.httpUserAgent,
    http_status_code: e.httpStatusCode,
    ...extra,
  }
  for (const key of Object.keys(raw)) {
    if (raw[key] === null) delete raw[key]
  }
  return JSON.stringify(raw)
}

/**
 * 위 alerts 와 같은 사건을 이벤트 쪽에서 본 모습이다. 두 화면이 따로 놀지 않도록
 * 호스트·프로세스·시각을 알림과 맞춘다. WIN-MKT-01 은 등록만 되고 수집이 없는 기기라 여기 없다.
 */
const events: EdrEvent[] = [
  event(
    {
      host: 'WIN-FIN-02',
      type: 'file',
      ts: now - 11 * MINUTE,
      process: 'powershell.exe',
      pid: 6120,
      action: 'WRITE',
      sha256: '9f2c4b7e5a1d8c30f6b94e27ad5138c0e4b7a291d6c85f3027ae94b1d8c605f3',
    },
    { path: 'C:\\Users\\finance\\분기보고서.xlsx.locked' },
  ),
  event({
    host: 'WIN-FIN-02',
    type: 'process',
    ts: now - 12 * MINUTE,
    process: 'powershell.exe',
    parent: 'excel.exe',
    pid: 6120,
    ppid: 4488,
    cmdline: 'powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA',
  }),
  event({
    host: 'WIN-FIN-02',
    type: 'l7',
    ts: now - 13 * MINUTE,
    process: 'powershell.exe',
    pid: 6120,
    destIp: '185.220.101.47',
    destPort: 443,
    protocol: 'tcp',
    domain: 'cdn-update-check.net',
    l7Protocol: 'TLS',
    tlsVersion: 'TLSv1.3',
    alpn: ['h2', 'http/1.1'],
  }),
  event({
    host: 'WIN-FIN-02',
    type: 'network',
    ts: now - 14 * MINUTE,
    process: 'powershell.exe',
    pid: 6120,
    destIp: '185.220.101.47',
    destPort: 8443,
    protocol: 'tcp',
  }),
  event(
    {
      host: 'WIN-DEV-01',
      type: 'file',
      ts: now - 47 * MINUTE,
      process: 'rundll32.exe',
      pid: 3312,
      action: 'CREATE',
      sha256: 'c1d0a83f47b2e9560d3a17c8b64f2093e5a7d18c40b6f92371ce8a5d0b34f671',
    },
    { path: 'C:\\Windows\\Temp\\lsass.dmp' },
  ),
  event({
    host: 'WIN-DEV-01',
    type: 'process',
    ts: now - 48 * MINUTE,
    process: 'rundll32.exe',
    parent: 'cmd.exe',
    pid: 3312,
    ppid: 2204,
    cmdline: 'rundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump 712 lsass.dmp full',
  }),
  event({
    host: 'WIN-HR-03',
    type: 'l7',
    ts: now - 2 * HOUR,
    process: 'powershell.exe',
    pid: 5044,
    destIp: '198.51.100.72',
    destPort: 80,
    protocol: 'tcp',
    domain: 'telemetry-sync.io',
    l7Protocol: 'HTTP',
    httpMethod: 'POST',
    httpPath: '/api/v1/collect',
    httpUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PowerShell/5.1',
    httpStatusCode: 200,
  }),
  event({
    host: 'WIN-HR-03',
    type: 'dns',
    ts: now - 2 * HOUR - 4 * MINUTE,
    process: 'powershell.exe',
    pid: 5044,
    domain: 'telemetry-sync.io',
    dnsRecordType: 'A',
    dnsAnswers: ['198.51.100.72', '198.51.100.73'],
    dnsResponseCode: 0,
  }),
  event({
    host: 'WIN-HR-03',
    type: 'process',
    ts: now - 2 * HOUR - 6 * MINUTE,
    process: 'powershell.exe',
    parent: 'winword.exe',
    pid: 5044,
    ppid: 3980,
    cmdline: 'powershell.exe -ExecutionPolicy Bypass -File %TEMP%\\update.ps1',
  }),
  // 조회 실패(NXDOMAIN). 응답 코드 0 과 3 이 화면에서 구분되는지 보려고 둔다.
  event({
    host: 'WIN-FIN-01',
    type: 'dns',
    ts: now - 5 * HOUR,
    process: 'chrome.exe',
    pid: 8820,
    domain: 'internal-report.corp.local',
    dnsRecordType: 'AAAA',
    dnsAnswers: [],
    dnsResponseCode: 3,
  }),
  event({
    host: 'WIN-OPS-01',
    type: 'process',
    ts: now - 9 * HOUR,
    process: 'net.exe',
    parent: 'cmd.exe',
    pid: 4712,
    ppid: 2204,
    cmdline: 'net.exe user svc_backup P@ssw0rd! /add',
  }),
  // pid 를 관측하지 못한 이벤트. 0 이 아니라 빈 값으로 보여야 한다.
  event({
    host: 'WIN-OPS-02',
    type: 'network',
    ts: now - 18 * HOUR,
    process: 'svchost.exe',
    destIp: '10.20.4.11',
    destPort: 53,
    protocol: 'udp',
  }),
  // macOS 는 DNS 질의가 mDNSResponder 를 거쳐 나가 에이전트가 프로세스를 특정하지 못한다.
  // process 를 채우지 않고 비워 두는 게 event() 기본값 그대로라 여기선 base 에도 안 적는다.
  event({
    host: 'MAC-DESIGN-01',
    type: 'dns',
    ts: now - 5 * MINUTE,
    domain: 'api.apple.com',
    dnsRecordType: 'A',
    dnsAnswers: ['17.248.135.14'],
    dnsResponseCode: 0,
  }),
]

/** host+type 은 지금 데이터셋에서 항상 유일하다. 알림·사건 쪽에서 원본 이벤트를 다시 찾을 때 쓴다. */
function findEvent(host: string, type: string): EdrEvent {
  const found = events.find((e) => e.host === host && e.type === type)
  if (!found) throw new Error(`no demo event for ${host}/${type}`)
  return found
}

function toSourceEvent(e: EdrEvent, matchedBy: SourceEvent['matchedBy']): SourceEvent {
  return {
    id: e.id,
    host: e.host,
    type: e.type,
    ts: e.ts,
    process: e.process,
    parent: e.parent,
    cmdline: e.cmdline,
    destIp: e.destIp,
    destPort: e.destPort,
    domain: e.domain,
    detail: e.detail,
    sha256: e.sha256,
    matchedBy,
  }
}

/**
 * 알림 상세에서만 채워지는 원본 이벤트. demo-6~9 는 events 배열에 짝이 되는 이벤트가 없어서
 * null 로 둔다(원본을 못 찾은 경우를 화면이 어떻게 그리는지 보여주는 데도 쓰인다).
 *
 * matchedBy 는 확신이 강한 순서대로 두 단계를 섞어 둔다. summary(프로세스·부모·목적지 등 구체적 값까지 일치) >
 * rule_type(이벤트 종류만 일치).
 */
const sourceEvents: Record<string, SourceEvent | null> = {
  'demo-1': toSourceEvent(findEvent('WIN-FIN-02', 'file'), 'summary'),
  'demo-2': toSourceEvent(findEvent('WIN-DEV-01', 'file'), 'summary'),
  // 판정 근거는 명령행이지만, 원본을 특정한 건 그 사건에서 관측된 목적지(telemetry-sync.io)다.
  // domain/destIp 가 alert 의 값과 정확히 일치하니(37 회 중 하나로 추정한 demo-4와 달리) summary 급 확신이다.
  'demo-3': toSourceEvent(findEvent('WIN-HR-03', 'l7'), 'summary'),
  // c2_beacon 은 37 회 중 하나로 특정한 것이라 종류만 맞은 rule_type 이다.
  'demo-4': toSourceEvent(findEvent('WIN-FIN-02', 'l7'), 'rule_type'),
  'demo-5': toSourceEvent(findEvent('WIN-OPS-01', 'process'), 'summary'),
  'demo-6': null,
  'demo-7': null,
  'demo-8': null,
  'demo-9': null,
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

/**
 * 호스트 프로세스 트리 / 사건 계보에서 같이 쓰는 계보 데이터.
 * 노드 id 는 proc:이름:pid, pid 를 관측 못 했으면 proc:이름 형태로 둘 다 섞어 쓴다.
 */
const finRansomwareTree: Lineage = {
  nodes: [
    { id: 'proc:excel.exe:4488', kind: 'process', label: 'excel.exe' },
    { id: 'proc:powershell.exe:6120', kind: 'process', label: 'powershell.exe' },
    { id: 'file:분기보고서.xlsx.locked', kind: 'file', label: '분기보고서.xlsx.locked' },
    { id: 'net:cdn-update-check.net', kind: 'network', label: 'cdn-update-check.net' },
  ],
  edges: [
    { from: 'proc:excel.exe:4488', to: 'proc:powershell.exe:6120', rel: 'spawned' },
    { from: 'proc:powershell.exe:6120', to: 'file:분기보고서.xlsx.locked', rel: 'wrote' },
    { from: 'proc:powershell.exe:6120', to: 'net:cdn-update-check.net', rel: 'connected' },
  ],
}

const devLsassTree: Lineage = {
  nodes: [
    { id: 'proc:cmd.exe:2204', kind: 'process', label: 'cmd.exe' },
    { id: 'proc:rundll32.exe:3312', kind: 'process', label: 'rundll32.exe' },
    { id: 'file:lsass.dmp', kind: 'file', label: 'lsass.dmp' },
  ],
  edges: [
    { from: 'proc:cmd.exe:2204', to: 'proc:rundll32.exe:3312', rel: 'spawned' },
    { from: 'proc:rundll32.exe:3312', to: 'file:lsass.dmp', rel: 'wrote' },
  ],
}

const hrEncodedTree: Lineage = {
  nodes: [
    // winword.exe 는 부모로만 관측돼 자신의 pid 는 못 잡았다.
    { id: 'proc:winword.exe', kind: 'process', label: 'winword.exe' },
    { id: 'proc:powershell.exe:5044', kind: 'process', label: 'powershell.exe' },
    { id: 'net:telemetry-sync.io', kind: 'network', label: 'telemetry-sync.io' },
  ],
  edges: [
    { from: 'proc:winword.exe', to: 'proc:powershell.exe:5044', rel: 'spawned' },
    { from: 'proc:powershell.exe:5044', to: 'net:telemetry-sync.io', rel: 'connected' },
  ],
}

const opsAdminTree: Lineage = {
  nodes: [
    { id: 'proc:cmd.exe:2204', kind: 'process', label: 'cmd.exe' },
    { id: 'proc:net.exe:4712', kind: 'process', label: 'net.exe' },
    { id: 'file:svc_backup 계정 등록', kind: 'file', label: 'svc_backup 계정 등록' },
  ],
  edges: [
    { from: 'proc:cmd.exe:2204', to: 'proc:net.exe:4712', rel: 'spawned' },
    { from: 'proc:net.exe:4712', to: 'file:svc_backup 계정 등록', rel: 'wrote' },
  ],
}

/** 호스트 단위 프로세스 트리. 이벤트가 없는 호스트(WIN-OPS-02, WIN-FIN-01, WIN-MKT-01, MAC-DESIGN-01)는 비워 둔다. */
const processTrees: Record<string, Lineage> = {
  'WIN-FIN-02': finRansomwareTree,
  'WIN-DEV-01': devLsassTree,
  'WIN-HR-03': hrEncodedTree,
  'WIN-OPS-01': opsAdminTree,
}

/* ── Incidents: 알림을 프로세스 계보로 묶은 사건 ─────────────────────────────────── */

type IncidentFilter = {
  status?: AlertStatus
  from?: number
  to?: number
  limit?: number
}

type IncidentBase = Omit<Incident, 'alerts' | 'lineage'>

/** 트리아지가 데모 안에서 바뀌어야 해서 mutable 배열로 둔다(triage 와 같은 이유). */
const incidents: IncidentBase[] = [
  {
    id: 'incident-1',
    host: 'WIN-FIN-02',
    status: 'open',
    severity: 'CRITICAL',
    firstTs: now - 3 * HOUR,
    lastTs: now - 11 * MINUTE,
    alertCount: 2,
    rootProcess: 'excel.exe',
    ruleIds: ['ransomware_mass_encrypt', 'c2_beacon'],
    threatNames: ['문서 대량 암호화 시도', '외부 C2 서버 반복 연결'],
    mitre: ['T1486', 'T1071.001'],
  },
  {
    id: 'incident-2',
    host: 'WIN-DEV-01',
    status: 'open',
    severity: 'CRITICAL',
    firstTs: now - 48 * MINUTE,
    lastTs: now - 47 * MINUTE,
    alertCount: 1,
    rootProcess: 'cmd.exe',
    ruleIds: ['lsass_memory_access'],
    threatNames: ['LSASS 메모리 접근'],
    mitre: ['T1003.001'],
  },
  {
    id: 'incident-3',
    host: 'WIN-HR-03',
    status: 'open',
    severity: 'HIGH',
    firstTs: now - 2 * HOUR - 6 * MINUTE,
    lastTs: now - 2 * HOUR,
    alertCount: 1,
    rootProcess: 'winword.exe',
    ruleIds: ['powershell_encoded_command'],
    threatNames: ['인코딩된 PowerShell 명령 실행'],
    mitre: ['T1059.001'],
  },
  {
    id: 'incident-4',
    host: 'WIN-DEV-01',
    status: 'confirmed',
    severity: 'MEDIUM',
    firstTs: now - 20 * HOUR,
    lastTs: now - 20 * HOUR,
    alertCount: 1,
    // 원본 이벤트를 못 찾았다. 서버가 지어내지 않으니 빈 문자열 그대로 둔다.
    rootProcess: '',
    ruleIds: ['scheduled_task_persistence'],
    threatNames: ['예약 작업으로 지속성 확보'],
    mitre: ['T1053.005'],
  },
  {
    id: 'incident-5',
    host: 'WIN-OPS-01',
    status: 'open',
    severity: 'HIGH',
    firstTs: now - 9 * HOUR,
    lastTs: now - 9 * HOUR,
    alertCount: 1,
    rootProcess: 'cmd.exe',
    ruleIds: ['local_admin_created'],
    threatNames: ['로컬 관리자 계정 생성'],
    mitre: ['T1136.001'],
  },
]

const incidentAlertIds: Record<string, string[]> = {
  'incident-1': ['demo-1', 'demo-4'],
  'incident-2': ['demo-2'],
  'incident-3': ['demo-3'],
  'incident-4': ['demo-6'],
  'incident-5': ['demo-5'],
}

/**
 * 알림 상세의 incidentId 조회용 역참조. demo-7~9 처럼 어느 사건에도 속하지 않은 알림은
 * 여기 없어서 lookup 이 undefined 를 주고, 화면은 그걸 null 로 받아 "사건 보기"를 감춘다.
 */
const incidentIdByAlertId: Record<string, string> = Object.fromEntries(
  Object.entries(incidentAlertIds).flatMap(([incidentId, alertIds]) =>
    alertIds.map((alertId) => [alertId, incidentId]),
  ),
)

const incidentLineage: Record<string, Lineage> = {
  'incident-1': finRansomwareTree,
  'incident-2': devLsassTree,
  'incident-3': hrEncodedTree,
  // rootProcess 와 마찬가지로 원본을 못 찾은 사건이라 계보도 비어 있다.
  'incident-4': { nodes: [], edges: [] },
  'incident-5': opsAdminTree,
}

function eventEntry(e: EdrEvent): IncidentTimelineEntry {
  return {
    eventId: e.id,
    ts: e.ts,
    kind: 'event',
    type: e.type,
    process: e.process || null,
    pid: e.pid,
    parent: e.parent || null,
    cmdline: e.cmdline || null,
    destIp: e.destIp || null,
    destPort: e.destPort,
    domain: e.domain || null,
    alertId: null,
    ruleId: null,
    threatName: null,
    severity: null,
  }
}

function alertEntry(a: DemoAlert): IncidentTimelineEntry {
  return {
    // 알림 줄은 alertId 로 짚으므로 eventId 는 항상 null 이다.
    eventId: null,
    ts: a.ts,
    kind: 'alert',
    type: null,
    process: null,
    pid: null,
    parent: null,
    cmdline: null,
    destIp: a.destIp || null,
    destPort: null,
    domain: a.domain || null,
    alertId: a.id,
    ruleId: a.ruleId,
    threatName: a.threatName,
    severity: a.severity,
  }
}

/** 시간 오름차순, 같은 시각이면 event 가 alert 보다 먼저. 체인 밖 이벤트는 넣지 않는다. */
const incidentTimelines: Record<string, IncidentTimelineEntry[]> = {
  'incident-1': [
    alertEntry(findAlert('demo-4')),
    eventEntry(findEvent('WIN-FIN-02', 'network')),
    eventEntry(findEvent('WIN-FIN-02', 'l7')),
    eventEntry(findEvent('WIN-FIN-02', 'process')),
    alertEntry(findAlert('demo-1')),
    eventEntry(findEvent('WIN-FIN-02', 'file')),
  ],
  'incident-2': [
    eventEntry(findEvent('WIN-DEV-01', 'process')),
    alertEntry(findAlert('demo-2')),
    eventEntry(findEvent('WIN-DEV-01', 'file')),
  ],
  'incident-3': [
    eventEntry(findEvent('WIN-HR-03', 'process')),
    eventEntry(findEvent('WIN-HR-03', 'dns')),
    eventEntry(findEvent('WIN-HR-03', 'l7')),
    alertEntry(findAlert('demo-3')),
  ],
  // 원본 이벤트가 없어 알림 하나만 있다.
  'incident-4': [alertEntry(findAlert('demo-6'))],
  'incident-5': [eventEntry(findEvent('WIN-OPS-01', 'process')), alertEntry(findAlert('demo-5'))],
}

function inIncidentPeriod(i: IncidentBase, from?: number, to?: number): boolean {
  return inPeriod(i.lastTs, from, to)
}

function filteredIncidents({ status, from, to, limit }: IncidentFilter): IncidentBase[] {
  const rows = incidents
    .filter((i) => (status ? i.status === status : true))
    .filter((i) => inIncidentPeriod(i, from, to))
    .sort((a, b) => b.lastTs - a.lastTs)
  return limit === undefined ? rows : rows.slice(0, limit)
}

function toIncidentSummary(i: IncidentBase): Incident {
  return { ...i, alerts: null, lineage: null }
}

function toIncidentDetail(i: IncidentBase): Incident {
  const ids = incidentAlertIds[i.id] ?? []
  return {
    ...i,
    alerts: ids.map((id) => toAlert(findAlert(id), sourceEvents[id] ?? null, i.id)),
    lineage: incidentLineage[i.id] ?? { nodes: [], edges: [] },
  }
}

/* ── Intelligence: 토폴로지 / 상관 분석 / DNS 조회 ───────────────────────────────── */

type TopologyFilter = {
  q?: string
  from?: number
  to?: number
  limit?: number
}

const topologyNodes: TopologyNode[] = [
  {
    id: 'host:WIN-FIN-02',
    kind: 'endpoint',
    label: 'WIN-FIN-02',
    destKind: null,
    group: null,
    riskScore: 92,
    openAlerts: 2,
    members: null,
  },
  {
    id: 'host:WIN-DEV-01',
    kind: 'endpoint',
    label: 'WIN-DEV-01',
    destKind: null,
    group: null,
    riskScore: 78,
    openAlerts: 1,
    members: null,
  },
  {
    id: 'host:WIN-HR-03',
    kind: 'endpoint',
    label: 'WIN-HR-03',
    destKind: null,
    group: null,
    riskScore: 65,
    openAlerts: 1,
    members: null,
  },
  {
    id: 'host:WIN-FIN-01',
    kind: 'endpoint',
    label: 'WIN-FIN-01',
    destKind: null,
    group: null,
    // 열린 알림이 없어 0. Host.riskScore 와 같은 계산이라 값도 같아야 한다.
    riskScore: 0,
    openAlerts: 0,
    members: null,
  },
  {
    id: 'host:MAC-DESIGN-01',
    kind: 'endpoint',
    label: 'MAC-DESIGN-01',
    destKind: null,
    group: null,
    // 열린 알림이 없어 0. Host.riskScore 와 같은 계산이라 값도 같아야 한다.
    riskScore: 0,
    openAlerts: 0,
    members: null,
  },
  {
    id: 'group:cdn-update-check.net',
    kind: 'domainGroup',
    label: 'cdn-update-check.net',
    destKind: null,
    group: null,
    riskScore: null,
    openAlerts: null,
    members: 1,
  },
  {
    id: 'dest:cdn-update-check.net',
    kind: 'destination',
    label: 'cdn-update-check.net',
    destKind: 'domain',
    group: 'group:cdn-update-check.net',
    riskScore: null,
    openAlerts: null,
    members: null,
  },
  // 도메인을 못 잡고 IP 만 관측된 목적지. destKind: 'ip' 는 이름이 없다는 뜻이 아니라 못 잡았다는 뜻이다.
  {
    id: 'dest:185.220.101.47',
    kind: 'destination',
    label: '185.220.101.47',
    destKind: 'ip',
    group: null,
    riskScore: null,
    openAlerts: null,
    members: null,
  },
  {
    id: 'dest:telemetry-sync.io',
    kind: 'destination',
    label: 'telemetry-sync.io',
    destKind: 'domain',
    group: null,
    riskScore: null,
    openAlerts: null,
    members: null,
  },
  {
    id: 'dest:api.apple.com',
    kind: 'destination',
    label: 'api.apple.com',
    destKind: 'domain',
    group: null,
    riskScore: null,
    openAlerts: null,
    members: null,
  },
]

/** alerts: 0 은 관측만 된 관계(점선), alerts > 0 은 조사 대상(실선)이라 화면이 반드시 갈라 그려야 한다. */
const topologyEdges: TopologyEdge[] = [
  {
    from: 'host:WIN-FIN-02',
    to: 'dest:cdn-update-check.net',
    events: 41,
    alerts: 1,
    protocols: ['TLS'],
    lastSeen: now - 13 * MINUTE,
  },
  {
    from: 'host:WIN-FIN-02',
    to: 'dest:185.220.101.47',
    events: 12,
    alerts: 1,
    protocols: ['tcp'],
    lastSeen: now - 14 * MINUTE,
  },
  {
    from: 'host:WIN-HR-03',
    to: 'dest:telemetry-sync.io',
    events: 6,
    alerts: 1,
    protocols: ['HTTP'],
    lastSeen: now - 2 * HOUR,
  },
  // 같은 목적지라도 이 호스트는 알림 없이 관측만 됐다.
  {
    from: 'host:WIN-DEV-01',
    to: 'dest:cdn-update-check.net',
    events: 3,
    alerts: 0,
    protocols: ['TLS'],
    lastSeen: now - 6 * HOUR,
  },
  {
    from: 'host:MAC-DESIGN-01',
    to: 'dest:api.apple.com',
    events: 18,
    alerts: 0,
    protocols: ['TLS'],
    lastSeen: now - 5 * MINUTE,
  },
  {
    from: 'host:WIN-FIN-01',
    to: 'dest:telemetry-sync.io',
    events: 1,
    alerts: 0,
    protocols: ['HTTP'],
    lastSeen: now - 9 * DAY,
  },
]

/** 실제 전체 관계 수는 이보다 많다(truncated: true 로 화면이 알 수 있게). */
const TOPOLOGY_TOTAL_RELATIONS = 9

function buildTopology({ q, from, to, limit }: TopologyFilter): Topology {
  const labelOf = (id: string) => topologyNodes.find((n) => n.id === id)?.label ?? ''
  const matchesQuery = (e: TopologyEdge) =>
    !q ||
    labelOf(e.from).toLowerCase().includes(q.toLowerCase()) ||
    labelOf(e.to).toLowerCase().includes(q.toLowerCase())

  const edges = topologyEdges.filter(matchesQuery).slice(0, limit ?? topologyEdges.length)

  const nodeIds = new Set<string>()
  for (const e of edges) {
    nodeIds.add(e.from)
    nodeIds.add(e.to)
    const group = topologyNodes.find((n) => n.id === e.to)?.group
    if (group) nodeIds.add(group)
  }

  return {
    from: from ?? now - DAY,
    to: to ?? now,
    totalRelations: TOPOLOGY_TOTAL_RELATIONS,
    shownRelations: edges.length,
    truncated: edges.length < TOPOLOGY_TOTAL_RELATIONS,
    nodes: topologyNodes.filter((n) => nodeIds.has(n.id)),
    edges,
  }
}

function isIp(target: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(target)
}

const forwardLookups: Record<string, ForwardLookup> = {
  'cdn-update-check.net': { status: 'OK', addresses: ['185.220.101.47'], error: null },
  'api.apple.com': { status: 'OK', addresses: ['17.248.135.14'], error: null },
  'telemetry-sync.io': { status: 'OK', addresses: ['198.51.100.72', '198.51.100.73'], error: null },
  // WIN-FIN-01 에서 실제로 NXDOMAIN 이 관측된 도메인과 맞춘다.
  'internal-report.corp.local': { status: 'NOT_FOUND', addresses: [], error: null },
  'expired-cert-host.example': { status: 'FAILED', addresses: [], error: '조회 시간 초과' },
}

const reverseLookups: Record<string, ReverseLookup> = {
  '185.220.101.47': { status: 'OK', ptrNames: ['cdn47.bulletproof-host.ru'], error: null },
  '17.248.135.14': { status: 'OK', ptrNames: ['api-04-lb.g.aaplimg.com'], error: null },
}

function buildDnsLookup(target: string): DnsLookup {
  if (isIp(target)) {
    const reverse = reverseLookups[target] ?? { status: 'NOT_FOUND' as const, ptrNames: [], error: null }
    return { target: { kind: 'IP', value: target }, forward: null, reverse }
  }
  const forward = forwardLookups[target] ?? {
    status: 'FAILED' as const,
    addresses: [],
    error: '알 수 없는 대상',
  }
  return { target: { kind: 'DOMAIN', value: target }, forward, reverse: null }
}

/**
 * OBSERVED/INFERRED/LIVE_DNS 를 같은 두 노드 사이에도 따로 넣어 출처를 구분한다.
 * INFERRED 에만 basis 를 채운다.
 */
const correlationData: Record<string, Omit<Correlation, 'liveDns'>> = {
  'cdn-update-check.net': {
    target: { kind: 'DOMAIN', value: 'cdn-update-check.net' },
    observedEvents: 41,
    nodes: [
      { id: 'domain:cdn-update-check.net', kind: 'DOMAIN', value: 'cdn-update-check.net' },
      { id: 'ip:185.220.101.47', kind: 'IP', value: '185.220.101.47' },
      { id: 'host:WIN-FIN-02', kind: 'HOST', value: 'WIN-FIN-02' },
      { id: 'host:WIN-DEV-01', kind: 'HOST', value: 'WIN-DEV-01' },
      { id: 'process:powershell.exe', kind: 'PROCESS', value: 'powershell.exe' },
      { id: 'ptr_name:cdn47.bulletproof-host.ru', kind: 'PTR_NAME', value: 'cdn47.bulletproof-host.ru' },
    ],
    edges: [
      {
        from: 'domain:cdn-update-check.net',
        to: 'ip:185.220.101.47',
        relation: 'RESOLVED_TO',
        origin: 'OBSERVED',
        observations: 37,
        firstSeen: now - 3 * HOUR,
        lastSeen: now - 13 * MINUTE,
        basis: null,
      },
      {
        from: 'domain:cdn-update-check.net',
        to: 'ip:185.220.101.47',
        relation: 'RESOLVED_TO',
        origin: 'LIVE_DNS',
        observations: 0,
        firstSeen: null,
        lastSeen: null,
        basis: null,
      },
      {
        from: 'host:WIN-FIN-02',
        to: 'process:powershell.exe',
        relation: 'CONNECTED_VIA',
        origin: 'OBSERVED',
        observations: 1,
        firstSeen: now - 14 * MINUTE,
        lastSeen: now - 11 * MINUTE,
        basis: null,
      },
      {
        from: 'process:powershell.exe',
        to: 'ip:185.220.101.47',
        relation: 'CONNECTED',
        origin: 'OBSERVED',
        observations: 12,
        firstSeen: now - 14 * MINUTE,
        lastSeen: now - 13 * MINUTE,
        basis: null,
      },
      // WIN-DEV-01 은 DNS 질의를 못 잡고 같은 IP 로의 연결만 잡혀서 도메인 연관은 추정이다.
      {
        from: 'host:WIN-DEV-01',
        to: 'domain:cdn-update-check.net',
        relation: 'QUERIED',
        origin: 'INFERRED',
        observations: 3,
        firstSeen: now - 6 * HOUR,
        lastSeen: now - 6 * HOUR,
        basis: 'IP 185.220.101.47 접속 시각과 대조해 동일 도메인 질의로 추정',
      },
      {
        from: 'ip:185.220.101.47',
        to: 'ptr_name:cdn47.bulletproof-host.ru',
        relation: 'PTR_CANDIDATE',
        origin: 'LIVE_DNS',
        observations: 0,
        firstSeen: null,
        lastSeen: null,
        basis: null,
      },
    ],
  },
  'api.apple.com': {
    target: { kind: 'DOMAIN', value: 'api.apple.com' },
    observedEvents: 1,
    nodes: [
      { id: 'domain:api.apple.com', kind: 'DOMAIN', value: 'api.apple.com' },
      { id: 'ip:17.248.135.14', kind: 'IP', value: '17.248.135.14' },
      { id: 'host:MAC-DESIGN-01', kind: 'HOST', value: 'MAC-DESIGN-01' },
      { id: 'process:mdnsresponder', kind: 'PROCESS', value: 'mDNSResponder' },
    ],
    edges: [
      {
        from: 'domain:api.apple.com',
        to: 'ip:17.248.135.14',
        relation: 'RESOLVED_TO',
        origin: 'OBSERVED',
        observations: 1,
        firstSeen: now - 5 * MINUTE,
        lastSeen: now - 5 * MINUTE,
        basis: null,
      },
      {
        from: 'domain:api.apple.com',
        to: 'ip:17.248.135.14',
        relation: 'RESOLVED_TO',
        origin: 'LIVE_DNS',
        observations: 0,
        firstSeen: null,
        lastSeen: null,
        basis: null,
      },
      // macOS 원본 DNS 이벤트는 process 가 비어 있다(mDNSResponder 경유). 서버가 대표 프로세스로 되짚는다.
      {
        from: 'host:MAC-DESIGN-01',
        to: 'process:mdnsresponder',
        relation: 'CONNECTED_VIA',
        origin: 'INFERRED',
        observations: 1,
        firstSeen: now - 5 * MINUTE,
        lastSeen: now - 5 * MINUTE,
        basis: 'DNS 이벤트의 process 가 비어 있어(mDNSResponder 경유) 대표 프로세스로 추정',
      },
    ],
  },
}

function buildCorrelation(target: string): Correlation {
  const base = correlationData[target]
  if (base) return { ...base, liveDns: buildDnsLookup(target) }

  // 모르는 대상은 관측 이력이 없다는 사실 그대로 돌려준다.
  return {
    target: { kind: isIp(target) ? 'IP' : 'DOMAIN', value: target },
    observedEvents: 0,
    nodes: [],
    edges: [],
    liveDns: buildDnsLookup(target),
  }
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

type EventFilter = {
  host?: string
  type?: string
  sha256?: string
  from?: number
  to?: number
  limit?: number
}

export const demoApi = {
  alerts: (filter: AlertFilter = {}) => respond<Alert[]>(filtered(filter)),

  /** 탐지 룰 카탈로그. tenant 와 무관한 정적 참조 데이터라 필터 없이 전부 돌려준다. */
  rules: (): Promise<RuleCatalogEntry[]> => respond(ruleCatalog),

  /** 알림 상세. 목록에 없는 sourceEvent·incidentId 가 여기서만 채워진다. */
  alert: (id: string) => {
    const target = alerts.find((a) => a.id === id) ?? alerts[0]
    return respond(
      toAlert(target, sourceEvents[target.id] ?? null, incidentIdByAlertId[target.id] ?? null),
    )
  },

  /** 이벤트 한 건. 실제 서버는 없는 id 에 404 를 주니 여기서도 못 찾으면 던진다. */
  event: (id: string) => {
    const target = events.find((e) => e.id === id)
    if (!target) throw new Error(`no demo event for ${id}`)
    return respond<EdrEvent>(target)
  },

  /** 백엔드와 같은 조건·같은 순서(최신순). limit 기본값도 서버(100)와 맞춘다. */
  events: ({ host, type, sha256, from, to, limit = 100 }: EventFilter = {}) => {
    const rows = events
      .filter((e) => (host ? e.host === host : true))
      .filter((e) => (type ? e.type === type : true))
      .filter((e) => (sha256 ? e.sha256 === sha256.toLowerCase() : true))
      .filter((e) => inPeriod(e.ts, from, to))
      .sort((a, b) => b.ts - a.ts)
    return respond<EdrEvent[]>(rows.slice(0, limit))
  },

  alertSummary: (period: { from?: number; to?: number } = {}) =>
    respond(summarize(filtered(period))),

  lineage: (id: string) => respond(lineages[id] ?? lineages['demo-1']),

  /** 호스트 단위 프로세스 트리. lineage 와 응답 모양이 같아 같은 렌더러를 쓴다. */
  processTree: (host: string) => respond(processTrees[host] ?? { nodes: [], edges: [] }),

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

  /** egress 토폴로지. */
  topology: (filter: TopologyFilter = {}): Promise<Topology> => respond(buildTopology(filter)),

  /** 도메인·IP 상관 분석. */
  correlate: (target: string): Promise<Correlation> => respond(buildCorrelation(target)),

  /** 지금 DNS 서버에 물어본 결과. */
  dnsLookup: (target: string): Promise<DnsLookup> => respond(buildDnsLookup(target)),

  /** 사건 목록. alerts·lineage 는 여기서 null 이고 상세에서만 온다. */
  incidents: (filter: IncidentFilter = {}): Promise<Incident[]> =>
    respond(filteredIncidents(filter).map(toIncidentSummary)),

  incident: (id: string): Promise<Incident> => {
    const target = incidents.find((i) => i.id === id) ?? incidents[0]
    return respond(toIncidentDetail(target))
  },

  incidentTimeline: (id: string): Promise<IncidentTimeline> => {
    const target = incidents.find((i) => i.id === id) ?? incidents[0]
    return respond({ id: target.id, host: target.host, entries: incidentTimelines[target.id] ?? [] })
  },

  /** 알림 트리아지와 같은 이유로 메모리 위 데이터를 바꾼다. 새로고침하면 원래대로 돌아간다. */
  triageIncident: (
    id: string,
    status: Extract<AlertStatus, 'confirmed' | 'false_positive'>,
  ): Promise<Incident> => {
    const target = incidents.find((i) => i.id === id)
    if (target) target.status = status
    return respond(toIncidentDetail(target ?? incidents[0]))
  },
}
