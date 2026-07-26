import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import Card from '@/components/ui/Card'
import AsyncState from '@/components/ui/AsyncState'
import { useApi } from '@/hooks/useApi'
import { useAuthStore } from '@/store/auth'
import { hostStatusColor, hostStatusLabel, relativeTime } from '@/lib/format'
import type { Host } from '@/api/types'

type OsKey = 'macos' | 'windows'

type Step = { title: string; body: string; command?: string }

const OS_TABS: { key: OsKey; label: string }[] = [
  { key: 'macos', label: 'macOS' },
  { key: 'windows', label: 'Windows' },
]

/**
 * osquery 가 붙을 수집 서버 주소(--tls_hostname). 백엔드가 내려주는 값이 아니라 배포 환경마다 달라서
 * 빌드 시 주입한다. collector-service 의 기본값은 localhost:8443(dev)이라 그대로 쓰면 붙지 않는다.
 * 미설정이면 플레이스홀더를 보여주고 관리자에게 받도록 안내한다.
 */
const TLS_HOST_PLACEHOLDER = 'edrdog.example.com:30443'
const TLS_HOST: string = import.meta.env.VITE_OSQUERY_TLS_HOST || TLS_HOST_PLACEHOLDER

// 플래그 파일 전문. collector-service/osquery/osquery.*.flags 실측 기준이고 tls_hostname 만 주입한다.
// 화면에 붙여두는 이유: 실행 명령이 이 파일을 참조하는데 받을 경로가 어디에도 없어 사용자가 막힌다.
const MAC_FLAGS = `# EDRdog osquery 엔드포인트 플래그 (macOS). api-service 수집 TLS API 로 붙는다.
# 수집 쿼리(schedule)는 서버가 /api/osquery/config 로 내려주므로 여기엔 config 파일이 없다.

# --- TLS remote 플러그인 ---
--enroll_secret_path=/etc/osquery/enroll.secret
--tls_hostname=${TLS_HOST}
--tls_server_certs=/etc/osquery/osquery-server.pem

--config_plugin=tls
--config_tls_endpoint=/api/osquery/config
--config_refresh=60

--enroll_tls_endpoint=/api/osquery/enroll

--logger_plugin=tls
--logger_tls_endpoint=/api/osquery/log
--logger_tls_period=10
--disable_carver=true

# --- evented 테이블 ---
# 퍼블리셔마다 켜는 플래그가 따로 있다. 하나라도 빠지면 osquery 는 에러 없이 조용히 빈 결과를 준다.
--disable_events=false

# 프로세스 생성(es_process_events, EndpointSecurity)
# FDA(전체 디스크 접근)가 없으면 여기까지 맞춰도 조용히 빈 결과가 된다.
--disable_endpointsecurity=false

# 파일 변경(file_events, FSEvents)
--enable_file_events=true

# 아웃바운드 연결(socket_events, OpenBSM)
--disable_audit=false
--audit_allow_config=true
--audit_allow_sockets=true

--host_identifier=hostname
--disable_watchdog=true`

const WIN_FLAGS = `# EDRdog osquery 엔드포인트 플래그 (Windows). api-service 수집 TLS API 로 붙는다.
# 수집 쿼리(schedule)는 서버가 /api/osquery/config 로 내려주므로 여기엔 config 파일이 없다.

# --- TLS remote 플러그인 ---
--enroll_secret_path=C:\\ProgramData\\osquery\\enroll.secret
--tls_hostname=${TLS_HOST}
--tls_server_certs=C:\\ProgramData\\osquery\\osquery-server.pem

--config_plugin=tls
--config_tls_endpoint=/api/osquery/config
--config_refresh=60

--enroll_tls_endpoint=/api/osquery/enroll

--logger_plugin=tls
--logger_tls_endpoint=/api/osquery/log
--logger_tls_period=10
--disable_carver=true

# --- evented 테이블 ---
# 퍼블리셔마다 켜는 플래그가 따로 있다. 하나라도 빠지면 osquery 는 에러 없이 조용히 빈 결과를 준다.
# network 이벤트는 core osquery 에 실시간 소켓 테이블이 없어 Zeek 가 담당한다.
--disable_events=false

# 프로세스 생성(process_etw_events, ETW). 이 플래그가 없으면 Windows 수집은 전부 0건이다.
--enable_process_etw_events=true

# 파일 변경(file_events, NTFS USN 저널)
--enable_ntfs_event_publisher=true

--host_identifier=hostname
--disable_watchdog=true`

// 설치·수집 명령어는 백엔드 collector-service README(실측)의 osquery 경로 기준.
// 로그 수집 = osquery TLS → api-service. (kill 조치는 별도로 Fleet 사용)
const INSTALL_STEPS: Record<OsKey, Step[]> = {
  macos: [
    {
      title: 'osquery 설치',
      body: 'Homebrew로 osquery를 설치합니다.',
      command: 'brew install --cask osquery',
    },
    {
      title: 'enroll secret · 서버 인증서 배치',
      body: '위에서 발급한 enroll secret과 관리자에게 받은 서버 인증서를 아래 경로에 둡니다.\n/etc/osquery/enroll.secret\n/etc/osquery/osquery-server.pem',
    },
    {
      title: '플래그 파일 배치',
      body: '아래 내용을 그대로 /var/osquery/osquery.flags 로 저장합니다. 이 경로여야 합니다. launchd 데몬이 --flagfile=/var/osquery/osquery.flags 로 고정돼 있어서, 다른 경로에 두면 5번 실행 명령이 이 파일을 그냥 무시합니다.\n--tls_hostname 이 수집 서버 주소입니다. 이 값이 틀리면 osquery가 등록 단계에서 조용히 실패합니다.\n주석은 반드시 줄 전체로 쓰세요. 값 뒤에 # 을 붙이면 그 주석까지 값에 포함됩니다.',
      command: MAC_FLAGS,
    },
    {
      title: '전체 디스크 접근(FDA) 부여',
      body: '시스템 설정 → 개인정보 보호 및 보안 → 전체 디스크 접근 → "+" → Cmd+Shift+G 로 아래 바이너리를 추가합니다. (.app 번들이 아니라 그 안의 유닉스 바이너리)\n/opt/osquery/lib/osquery.app/Contents/MacOS/osqueryd',
    },
    {
      title: 'osquery 실행',
      body: 'launchd 데몬으로 실행합니다. 이 명령이 /var/osquery/io.osquery.agent.plist 를 LaunchDaemons 로 복사하고 load 합니다. 터미널에서 osqueryd 를 직접 띄우면 FDA 권한이 터미널 앱에 귀속돼 동작하지 않습니다.',
      command: 'sudo osqueryctl start',
    },
    {
      title: '재부팅 후 확인',
      body: 'FDA(TCC) 권한은 실행 중 세션에 즉시 반영되지 않습니다. 재부팅 후 exec 이벤트가 수집되는지 확인합니다. 수집이 시작되면 아래 4번 기기 상태에 이 기기가 나타납니다.',
    },
  ],
  windows: [
    {
      title: 'osquery 설치',
      body: 'winget으로 설치합니다. 설치 경로는 C:\\Program Files\\osquery\\ 이고, 데몬은 C:\\Program Files\\osquery\\osqueryd\\osqueryd.exe 입니다. PATH에는 등록되지 않습니다.',
      command: 'winget install --id osquery.osquery -e',
    },
    {
      title: 'enroll secret · 서버 인증서 배치',
      body: '위에서 발급한 enroll secret과 관리자에게 받은 서버 인증서를 C:\\ProgramData\\osquery\\ 아래에 둡니다.\nC:\\ProgramData\\osquery\\enroll.secret\nC:\\ProgramData\\osquery\\osquery-server.pem',
    },
    {
      title: '플래그 파일 배치',
      body: '아래 내용을 그대로 C:\\ProgramData\\osquery\\osquery.win.flags 로 저장합니다. 4번 실행 명령이 이 파일을 참조하므로 없으면 unable to open flagfile 로 멈춥니다.\n--tls_hostname 이 수집 서버 주소입니다. 이 값이 틀리면 osquery가 등록 단계에서 조용히 실패합니다.',
      command: WIN_FLAGS,
    },
    {
      title: 'osquery 실행',
      body: '관리자 권한 PowerShell에서 실행합니다. 프로세스 감시가 ETW라 관리자 권한이 필수입니다. osqueryd.exe는 PATH에 없으므로 전체 경로로 부릅니다.',
      command:
        '& "C:\\Program Files\\osquery\\osqueryd\\osqueryd.exe" --flagfile C:\\ProgramData\\osquery\\osquery.win.flags',
    },
    {
      title: '수집 확인',
      body: '수집이 시작되면 아래 4번 기기 상태에 이 기기가 나타납니다. 연결 여부는 그 표의 마지막 확인 시각으로 판단하세요. 네트워크·DNS 이벤트는 Zeek가 담당합니다.\nosqueryi로 확인하려면 osqueryd를 멈춘 뒤 아래처럼 플래그를 직접 주고 띄워야 합니다. osqueryd가 도는 중에 그냥 osqueryi를 열면 별개 프로세스라 자기 빈 버퍼를 보게 돼 항상 0건으로 나옵니다.',
      command:
        '& "C:\\Program Files\\osquery\\osqueryi.exe" --disable_events=false --enable_process_etw_events=true',
    },
  ],
}

// 네트워크 이벤트는 osquery 가 못 준다. macOS 의 socket_events 는 OpenBSM 기반이라 신형 macOS 에서
// 비고, Windows 는 실시간 소켓 테이블 자체가 없다. 그래서 Zeek 가 담당한다.
// 인증은 osquery 와 같다(같은 enroll secret / 서버 인증서 / host 이름) → 대시보드에서 한 기기로 합쳐진다.
const ZEEK_SHIPPER_URL =
  'https://raw.githubusercontent.com/2026-Siheung-Bootcamp-Team-I/Backend/main/collector-service/zeek/edrdog-zeek-shipper.py'

const ZEEK_STEPS: Step[] = [
  {
    title: 'Zeek 설치',
    body: '네트워크 트래픽을 분석해 연결 기록(conn.log)을 남기는 도구입니다.',
    command: 'brew install zeek',
  },
  {
    title: '캡처 시작',
    body: '로그는 실행한 디렉터리에 생깁니다. 이 터미널은 켜둔 채로 두세요.\n-C 는 빼면 안 됩니다. 맥의 네트워크 카드가 체크섬을 나중에 채우는 방식이라, 없으면 Zeek가 패킷을 전부 버립니다.\n인터페이스가 en0가 아닐 수 있습니다. route get default 로 확인하세요.',
    command:
      'mkdir -p ~/zeek-logs && cd ~/zeek-logs\nsudo zeek -C -i en0 LogAscii::use_json=T local',
  },
  {
    title: '전송기 내려받기',
    body: 'conn.log 를 읽어 수집 서버로 보내는 스크립트입니다. 위 2번에서 배치한 enroll secret과 서버 인증서를 그대로 씁니다.',
    command: `curl -fsSL ${ZEEK_SHIPPER_URL} -o ~/edrdog-zeek-shipper.py\nchmod +x ~/edrdog-zeek-shipper.py`,
  },
  {
    title: '전송기 실행',
    body: '새 터미널에서 실행합니다. enroll secret 파일이 root 전용이라 sudo가 필요합니다.\n"enroll 완료" 다음에 "발행 N건"이 찍히면 정상입니다.',
    command: `sudo ~/edrdog-zeek-shipper.py --conn-log ~/zeek-logs/conn.log --tls-host ${TLS_HOST}`,
  },
  {
    title: '수집 확인',
    body: 'Zeek는 연결이 끝난 뒤에 기록합니다. TCP 정상 종료 기준 약 5초 뒤입니다. 진행 중인 연결은 안 찍히니, 웹을 잠깐 쓰고 20초쯤 기다렸다가 확인하세요. 수집되면 위협 지도에 목적지 국가가 나타납니다.',
    command: 'tail -f ~/zeek-logs/conn.log',
  },
]

const INSTALL_SCRIPT_URL =
  'https://raw.githubusercontent.com/2026-Siheung-Bootcamp-Team-I/Backend/main/collector-service/scripts/edrdog-install-macos.sh'

const INSTALL_SCRIPT_URL_WIN =
  'https://raw.githubusercontent.com/2026-Siheung-Bootcamp-Team-I/Backend/main/collector-service/scripts/edrdog-install-windows.ps1'

/**
 * Windows 빠른 설치. 내려받아 내용을 확인한 뒤 실행하는 2줄 방식이다.
 * macOS 와 달리 사람이 승인할 권한(FDA)이 없어 서비스 등록까지 자동으로 끝난다.
 */
function quickInstallStepsWindows(secret: string): Step[] {
  const s = secret
  return [
    {
      title: '설치 스크립트 실행',
      body: '관리자 권한 PowerShell에서 실행합니다. osquery 설치, 서버 인증서 수신, 서비스 등록까지 한 번에 끝납니다.\n서버 인증서는 수집 포트에서 자동으로 받아오므로 따로 받을 필요가 없습니다.\n내려받은 스크립트는 Windows가 기본적으로 실행을 막으므로 -ExecutionPolicy Bypass로 그 실행만 허용합니다. 시스템 정책은 바뀌지 않습니다.',
      // .\edrdog-install.ps1 로 바로 부르면 기본 정책(Restricted)과 인터넷 파일 표시(MOTW)에 걸려
      // 실행 자체가 막힌다. 이 프로세스에만 Bypass 를 주는 형태로 부른다.
      command: `irm ${INSTALL_SCRIPT_URL_WIN} -OutFile edrdog-install.ps1\npowershell -ExecutionPolicy Bypass -File .\\edrdog-install.ps1 -TlsHost ${TLS_HOST} -EnrollSecret ${s}`,
    },
    {
      title: '수집 확인',
      body: '서비스가 Running이면 수집이 시작된 것입니다. 프로세스 감시가 ETW라 별도 권한 승인은 필요 없습니다.\n수집이 시작되면 아래 4번 기기 상태에 이 기기가 나타납니다.',
      command: 'Get-Service osqueryd',
    },
  ]
}

/**
 * macOS 한 줄 설치. 화면이 이미 아는 값(수집 서버 주소, enroll secret)을 명령에 채워 넣어
 * 사용자가 복사만 하면 되게 한다. 수동 절차는 아래 접이식에 그대로 남긴다.
 */
function quickInstallSteps(secret: string): Step[] {
  const s = secret
  return [
    {
      title: '설치 명령 한 줄 실행',
      body: '프로세스·파일 수집(osquery)과 네트워크 수집(Zeek)을 함께 설치하고 데몬으로 등록합니다.\n서버 인증서는 수집 포트에서 자동으로 받아오므로 따로 받을 필요가 없습니다.',
      command: `curl -fsSL ${INSTALL_SCRIPT_URL} | sudo bash -s -- \\\n  --tls-host ${TLS_HOST} \\\n  --enroll-secret ${s} \\\n  --with-zeek`,
    },
    {
      title: '전체 디스크 접근(FDA) 승인',
      body: '이 단계만 사람이 직접 해야 합니다. macOS가 사람 승인만 받도록 막아둔 권한이라 스크립트로 대신할 수 없습니다.\n시스템 설정 → 개인정보 보호 및 보안 → 전체 디스크 접근 → "+" → Cmd+Shift+G 로 아래 경로를 추가하세요. (.app 번들이 아니라 그 안의 유닉스 바이너리입니다)\n/opt/osquery/lib/osquery.app/Contents/MacOS/osqueryd',
    },
    {
      title: '재부팅 후 확인',
      body: 'FDA 권한은 실행 중인 프로세스에 즉시 반영되지 않습니다. 재부팅하면 수집이 시작되고, 아래 4번 기기 상태에 이 기기가 나타납니다.',
      command: 'sudo osqueryctl status',
    },
  ]
}

// 수집 종료. 설치(INSTALL_STEPS)와 대칭 구조이고, 경로는 collector-service의 osquery/*.flags 실측 기준.
// 1번만 하면 임시 중지, 끝까지 하면 완전 종료.
const STOP_STEPS: Record<OsKey, Step[]> = {
  macos: [
    {
      title: '에이전트 중지',
      body: '데몬을 중지합니다. 이 명령이 launchd 등록을 내리고 /Library/LaunchDaemons/io.osquery.agent.plist 까지 삭제하므로, 재부팅해도 다시 뜨지 않습니다.',
      command: 'sudo osqueryctl stop',
    },
    {
      title: 'Zeek 수집 중지 (설치 명령에 포함돼 있습니다)',
      // 설치 스크립트가 com.edrdog.zeek / com.edrdog.zeek-shipper 두 데몬을 등록한다.
      // 이걸 내리지 않으면 osquery 를 멈춰도 네트워크 이벤트는 계속 올라간다.
      body: 'osquery만 멈추면 Zeek는 계속 돌면서 연결 기록을 보냅니다. 한 줄 설치 명령을 썼다면 Zeek도 함께 깔려 있으니 이 단계까지 해야 수집이 완전히 멈춥니다.',
      command:
        'sudo launchctl unload -w /Library/LaunchDaemons/com.edrdog.zeek-shipper.plist\nsudo launchctl unload -w /Library/LaunchDaemons/com.edrdog.zeek.plist\nsudo rm -f /Library/LaunchDaemons/com.edrdog.zeek*.plist /usr/local/bin/edrdog-zeek-shipper.py\nsudo rm -rf /var/log/edrdog-zeek',
    },
    {
      title: '자동 시작 해제 (직접 등록한 경우만)',
      body: 'osqueryctl 대신 plist를 직접 복사해 load 했다면 이 명령으로 내립니다. 1번을 썼다면 이미 내려가 있으므로 건너뛰세요.',
      command: 'sudo launchctl unload -w /Library/LaunchDaemons/io.osquery.agent.plist',
    },
    {
      title: 'osquery 제거',
      body: 'Homebrew로 설치한 경우입니다.',
      command: 'brew uninstall --cask osquery',
    },
    {
      title: 'enroll secret · 인증서 · 플래그 파일 삭제',
      body: '남겨두면 osquery를 다시 설치했을 때 같은 값으로 그대로 재등록됩니다.',
      command:
        'sudo rm -f /etc/osquery/enroll.secret /etc/osquery/osquery-server.pem /var/osquery/osquery.flags',
    },
    {
      title: '전체 디스크 접근 회수',
      body: '시스템 설정 → 개인정보 보호 및 보안 → 전체 디스크 접근에서 osqueryd 항목을 제거합니다.',
    },
  ],
  windows: [
    {
      title: '에이전트 중지',
      body: '관리자 권한 PowerShell에서 실행합니다. 서비스로 등록하지 않고 osqueryd.exe를 직접 띄웠다면 Stop-Process -Name osqueryd -Force 를 씁니다.',
      command: 'Stop-Service osqueryd',
    },
    {
      title: '자동 시작 해제',
      body: '재부팅 후 서비스가 다시 뜨지 않게 시작 유형을 사용 안 함으로 바꿉니다.',
      command: 'Set-Service osqueryd -StartupType Disabled',
    },
    {
      title: 'osquery 제거',
      body: '설정 → 앱 → 설치된 앱에서 osquery를 제거합니다. winget으로 설치했다면 아래 명령으로도 제거됩니다.',
      command: 'winget uninstall osquery',
    },
    {
      title: 'enroll secret · 인증서 · 플래그 파일 삭제',
      // 플래그 파일 이름이 두 가지다. 설치 스크립트는 osquery.flags 로 쓰고,
      // 아래 수동 안내는 osquery.win.flags 로 쓴다. 어느 쪽으로 깔았든 지워지게 둘 다 넣는다.
      body: 'C:\\ProgramData\\osquery\\ 아래에 둔 파일을 지웁니다. 남겨두면 재설치 시 같은 값으로 그대로 재등록됩니다.\n설치 방식에 따라 플래그 파일 이름이 달라서 둘 다 지웁니다. 없는 파일은 그냥 넘어갑니다.',
      command:
        'Remove-Item -ErrorAction SilentlyContinue C:\\ProgramData\\osquery\\enroll.secret, C:\\ProgramData\\osquery\\osquery-server.pem, C:\\ProgramData\\osquery\\osquery.flags, C:\\ProgramData\\osquery\\osquery.win.flags',
    },
  ],
}

type FleetOsKey = 'macos' | 'windows'

// 2·7번과 탭을 맞춘다(macOS/Windows). Windows 는 조치 스크립트가 POSIX sh 라 아직 지원하지 않고,
// Linux 는 탭 대신 접이식으로 둔다(사내 서버 등 소수 사례).
const FLEET_OS_TABS: { key: FleetOsKey; label: string }[] = [
  { key: 'macos', label: 'macOS' },
  { key: 'windows', label: 'Windows' },
]

/**
 * 배포된 Fleet 서버 주소. 백엔드가 내려주는 값이 아직 없어 빌드 시 주입한다.
 *
 * 미설정이어도 예시가 아니라 운영 주소를 쓴다. 예시 주소가 그대로 나가면 6번 명령을 복사해도
 * 동작하지 않는데, 화면만 봐서는 그게 예시인지 알기 어렵다(실제로 배포본이 그 상태였다).
 * 다른 환경에 올릴 때는 VITE_FLEET_URL 로 덮어쓴다.
 */
const FLEET_URL: string =
  import.meta.env.VITE_FLEET_URL || 'https://fleet.edrdog-i-team.duckdns.org'

/**
 * kill(실제 조치)은 Fleet 의 run-script 로 실행된다. 수집용 osquery 와 별개로 fleetd(orbit) 등록이 필요하다.
 *
 * Fleet enroll secret 은 서버가 대신 읽어다 준다(GET /api/fleet/enroll-secret). 값을 받았으면
 * 패키지 생성 명령에 바로 박아 "값을 확인하는 단계" 자체를 없앤다. 못 받았을 때만(비로그인·Fleet 무응답)
 * fleetctl 로 직접 확인하는 단계를 끼운다.
 */
function fleetSteps(os: FleetOsKey, secret: string | null): Step[] {
  const type = os === 'macos' ? 'pkg' : 'msi'
  const install: Step =
    os === 'macos'
      ? {
          title: '대상 기기에 설치',
          body: '만들어진 pkg를 kill 대상 기기로 옮겨 설치합니다.',
          command: 'sudo installer -pkg fleet-osquery.pkg -target /',
        }
      : {
          title: '대상 기기에 설치',
          body: '만들어진 msi를 kill 대상 기기로 옮겨 관리자 권한으로 설치합니다.',
          command: 'msiexec /i fleet-osquery.msi /quiet',
        }

  const lookup: Step[] = secret
    ? []
    : [
        {
          title: 'Fleet enroll secret 확인',
          body: '1번의 EDRdog enroll secret과 다른 값입니다. 헷갈리기 쉬우니 주의하세요.\nEDRdog에 로그인하면 이 단계가 사라지고 다음 명령에 값이 채워집니다. 아래는 직접 확인하는 방법입니다.\n출력된 문자열을 다음 단계의 --enroll-secret 에 넣으세요.',
          command: `fleetctl config set --address ${FLEET_URL}\nfleetctl login\nfleetctl get enroll-secret`,
        },
      ]

  return [
    {
      title: 'fleetctl 설치',
      // "대상 기기가 아니라 작업용 PC" 라고만 쓰면 두 PC 가 달라야 하는 것처럼 읽히고,
      // 이 도구가 조치를 실행한다고 오해하게 된다. 둘 다 아니다.
      body: '설치 파일을 만드는 도구입니다. 아무 PC에서나 만들면 되고, kill 대상 기기 본인이어도 됩니다.\n이 도구가 조치를 실행하는 건 아닙니다. 조치는 아래에서 만든 파일을 설치한 기기로 전달됩니다.',
      command: 'npm install -g fleetctl',
    },
    ...lookup,
    {
      title: 'fleetd 패키지 생성',
      // --enable-scripts 가 빠지면 등록은 되는데 조치만 조용히 실패한다. 실기기에서 겪은 함정이라 명령에 포함한다.
      body: `실행하면 현재 디렉터리에 fleet-osquery.${type}가 생성됩니다.\n--enable-scripts가 빠지면 기기는 등록되지만 조치(kill)가 실행되지 않습니다.`,
      command: `fleetctl package --type=${type} --fleet-url=${FLEET_URL} --enroll-secret=${
        secret ?? '<FLEET_ENROLL_SECRET>'
      } --enable-scripts`,
    },
    install,
    {
      title: '등록 확인',
      body: 'Fleet 콘솔 Hosts 목록에 이 기기가 online으로 뜨면 완료입니다. 이때 호스트 이름이 알림에 표시되는 host와 같아야 조치가 그 기기로 전달됩니다.',
    },
  ]
}

// 하나라도 빠지면 "실행" 버튼이 눌려도 프로세스가 종료되지 않는다.
const KILL_REQUIREMENTS = [
  'fleetd(orbit)가 설치돼 Fleet 호스트 목록에 online으로 보일 것',
  'Fleet 서버의 스크립트 실행(run-script)이 켜져 있을 것 (Settings → Organization settings → Advanced)',
  'Fleet 서버가 https이고 인증서가 유효할 것. 자체 서명 인증서면 fleetd가 등록 단계에서 실패합니다.',
  '대상 기기가 macOS 또는 Windows일 것. 플랫폼에 맞는 조치 스크립트(sh / PowerShell)가 자동으로 선택됩니다.',
  '서버의 조치 실행 스위치가 켜져 있을 것. 이 스위치가 꺼져 있으면 위를 다 갖춰도 실제로는 아무것도 실행되지 않습니다(관리자 확인).',
]

const SLACK_STEPS = [
  'api.slack.com/apps 접속 → Create New App → From scratch 선택',
  '앱 이름 입력, 알림을 받을 워크스페이스 선택 후 생성',
  '좌측 메뉴 Incoming Webhooks → Activate Incoming Webhooks 켜기',
  'Add New Webhook to Workspace → 알림 받을 채널 선택 → Allow',
  '생성된 Webhook URL(https://hooks.slack.com/services/...) 복사 후 아래 입력칸에 붙여넣기',
]

// enroll secret 재발급 경고. 백엔드는 config/log 요청에서 node_key 만 검증하므로 기존 기기는 영향이 없다.
const ROTATE_WARNING =
  '이미 등록된 기기는 계속 수집됩니다. 아직 설치하지 않은 기기의 enroll.secret 파일을 모두 새 값으로 바꿔야 합니다.'

// lastSeen 이 이 시간을 넘으면 에이전트가 멈춘 것으로 본다. status(열린 alert 기준)와는 다른 축이다.
const STALE_MS = 10 * 60_000

function CopyButton({ text, onError }: { text: string; onError: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    // 비보안 컨텍스트(http://192.168.x.x:5173)에서는 navigator.clipboard 자체가 없어 TypeError 가 난다.
    // 버튼이 무반응으로 죽지 않도록 동기 예외와 reject 를 모두 잡아 수동 복사로 안내한다.
    try {
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
        .catch(onError)
    } catch {
      onError()
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-sm border border-line px-[10px] py-[5px] text-[12px] font-semibold text-mid hover:text-ink-2 hover:bg-panel cursor-pointer transition-colors"
    >
      {copied ? '복사됨' : '복사'}
    </button>
  )
}

/** display 를 주면 화면에는 그 값을 보여주고 복사는 command 원문으로 한다(enroll secret 마스킹용). */
function CommandBlock({ command, display }: { command: string; display?: string }) {
  const [copyFailed, setCopyFailed] = useState(false)

  return (
    <div className="mt-[10px] rounded-sm border border-line bg-panel-2 px-[12px] py-[9px]">
      <div className="flex items-center gap-[10px]">
        <code className="grow overflow-x-auto whitespace-pre font-mono text-[12.5px] text-good">
          {display ?? command}
        </code>
        <CopyButton text={command} onError={() => setCopyFailed(true)} />
      </div>
      {copyFailed && (
        <div className="mt-[8px] text-[12px] text-high">
          클립보드를 쓸 수 없는 환경입니다. 위 내용을 직접 선택해 복사하세요.
        </div>
      )}
    </div>
  )
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border border-line text-[12px] font-semibold text-mid">
      {n}
    </span>
  )
}

function OsTabs<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: K; label: string }[]
  value: K
  onChange: (key: K) => void
}) {
  return (
    <div className="inline-flex gap-[3px] rounded-md border border-line-2 p-[3px]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-xs px-[16px] py-[6px] text-[13px] font-semibold cursor-pointer transition-colors ${
            value === tab.key
              ? 'bg-[var(--accent-wash)] text-accent'
              : 'text-mid hover:text-ink-2 hover:bg-panel'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="mt-[18px] flex flex-col gap-[18px]">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-[12px]">
          <StepNumber n={i + 1} />
          <div className="grow min-w-0">
            <div className="text-[13.5px] font-semibold text-ink">{step.title}</div>
            <div className="mt-[4px] whitespace-pre-line text-[13px] text-mid leading-[1.6]">
              {step.body}
            </div>
            {step.command && <CommandBlock command={step.command} />}
          </div>
        </li>
      ))}
    </ol>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
      <div className="text-[14px] font-bold text-ink">{title}</div>
      <div className="mt-[6px] text-[13px] text-faint leading-[1.6]">{description}</div>
      <div className="mt-[16px]">{children}</div>
    </Card>
  )
}

function LoginHint() {
  return (
    <div className="rounded-sm border border-dashed border-line px-[16px] py-[14px] text-[13px] text-mid leading-[1.6]">
      로그인하면 여기서 바로 발급·저장·등록할 수 있습니다.{' '}
      <Link to="/login" className="font-semibold !text-accent">
        로그인
      </Link>
    </div>
  )
}

/** 섹션 사이 의존 관계처럼 놓치면 알림이 사라지는 전제를 강조하는 안내 박스. */
function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-line bg-panel-2 px-[14px] py-[12px] text-[13px] text-mid leading-[1.6]">
      {children}
    </div>
  )
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-sm bg-accent px-[18px] py-[9px] text-[13px] font-semibold !text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-sm border border-line px-[16px] py-[9px] text-[13px] font-semibold text-mid hover:text-ink-2 hover:bg-panel disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
    >
      {children}
    </button>
  )
}

/** 등록한 host 이름이 실제 관측된 이름과 일치하는지. 불일치면 알림이 조용히 사라진다. */
function ObservedBadge({ observed }: { observed: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-xs border border-line px-[7px] py-[3px] text-[11px] font-semibold ${
        observed ? 'text-good' : 'text-high'
      }`}
    >
      {observed ? '관측됨' : '관측된 적 없음 (오타 의심)'}
    </span>
  )
}

type ChecklistItem = { label: string; detail: string; done: boolean }

function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <div className="flex flex-col gap-[8px]">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-[10px] rounded-sm border border-line bg-panel-2 px-[12px] py-[9px]"
        >
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: item.done ? 'var(--good)' : 'var(--mid)' }}
          />
          <span className="grow text-[13px] text-ink-2">{item.label}</span>
          <span className={`shrink-0 text-[12px] ${item.done ? 'text-good' : 'text-faint'}`}>
            {item.detail}
          </span>
        </div>
      ))}
    </div>
  )
}

// enroll secret 발급/조회. 이 값을 엔드포인트 osquery enroll.secret 에 넣으면 그 기기가 내 조직으로 등록된다.
// AsyncState 를 secret 표시 영역에만 두는 이유: 재발급 후 refetch 로 로딩에 들어가도 이 패널이
// 언마운트되지 않아야 busy·에러 문구가 유지된다.
function EnrollSecretPanel({
  secret,
  loading,
  error,
  refetch,
}: {
  secret: string | null
  loading: boolean
  error: string | null
  refetch: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [mutErr, setMutErr] = useState<string | null>(null)

  const rotate = async () => {
    // 재발급은 되돌릴 수 없고 미설치 기기의 enroll.secret 을 전부 갈아야 해서 한 번 확인받는다.
    if (secret && !window.confirm(`enroll secret을 재발급할까요?\n\n${ROTATE_WARNING}`)) return
    setBusy(true)
    setMutErr(null)
    try {
      await api.rotateEnrollSecret()
      setRevealed(false)
      refetch()
    } catch (e) {
      setMutErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <AsyncState loading={loading} error={error} onRetry={refetch}>
        {secret ? (
          // 기본은 마스킹. 화면 공유 중에 노출되면 조직 전체의 기기 등록 권한이 새어 나간다.
          <CommandBlock
            command={secret}
            display={revealed ? undefined : '•'.repeat(secret.length)}
          />
        ) : (
          <div className="text-[13px] text-mid">불러오는 중…</div>
        )}
      </AsyncState>
      <div className="mt-[12px] flex flex-wrap items-center gap-[12px]">
        <PrimaryButton onClick={rotate} disabled={busy || loading}>
          {busy ? '재발급 중' : '재발급'}
        </PrimaryButton>
        {secret && (
          <SecondaryButton onClick={() => setRevealed((v) => !v)}>
            {revealed ? '가리기' : '보기'}
          </SecondaryButton>
        )}
      </div>
      {secret && <div className="mt-[10px] text-[12px] text-faint">재발급 시 {ROTATE_WARNING}</div>}
      {mutErr && <div className="mt-[8px] text-[12px] text-crit">{mutErr}</div>}
    </div>
  )
}

/** 개인·조직 webhook 이 저장 방식만 다르고 입력·검증은 같아서 onSave 로만 갈라 쓴다. */
function WebhookForm({
  initial,
  onSave,
  onSaved,
  showTest = false,
}: {
  initial: string | null
  onSave: (url: string) => Promise<unknown>
  /** 저장된 값을 부모에 알린다. 재조회로 폼을 다시 그리면 저장 안내가 바로 사라져서 refetch 를 쓰지 않는다. */
  onSaved: (url: string) => void
  showTest?: boolean
}) {
  const [url, setUrl] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mutErr, setMutErr] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const valid = url.startsWith('https://hooks.slack.com/')

  const save = async () => {
    setBusy(true)
    setSaved(false)
    setMutErr(null)
    try {
      await onSave(url)
      setSaved(true)
      onSaved(url)
    } catch (e) {
      setMutErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // 저장된 webhook 으로 실제 발송을 시도한다. 입력칸의 값이 아니라 서버에 저장된 값이 대상이다.
  const runTest = async () => {
    setTesting(true)
    setTestMsg(null)
    try {
      const res = await api.testWebhook()
      setTestMsg(
        res.ok
          ? { ok: true, text: `테스트 알림을 보냈습니다. Slack 응답 ${res.status}` }
          : { ok: false, text: `전송에 실패했습니다. Slack 응답 ${res.status}` },
      )
    } catch (e) {
      setTestMsg({ ok: false, text: (e as Error).message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-[8px] sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setSaved(false)
          }}
          placeholder="https://hooks.slack.com/services/..."
          className="grow rounded-sm border border-line bg-panel-2 px-[12px] py-[9px] text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <PrimaryButton onClick={save} disabled={busy || !valid}>
          {busy ? '저장 중' : '저장'}
        </PrimaryButton>
        {showTest && (
          <SecondaryButton onClick={runTest} disabled={testing}>
            {testing ? '보내는 중' : '테스트 알림 보내기'}
          </SecondaryButton>
        )}
      </div>
      {url.length > 0 && !valid && (
        <div className="mt-[8px] text-[12px] text-high">
          https://hooks.slack.com/ 로 시작하는 URL을 입력하세요.
        </div>
      )}
      {saved && <div className="mt-[8px] text-[12px] text-good">저장되었습니다.</div>}
      {mutErr && <div className="mt-[8px] text-[12px] text-crit">{mutErr}</div>}
      {showTest && (
        <div className="mt-[8px] text-[12px] text-faint">
          테스트는 저장된 webhook으로 보냅니다. 입력만 하고 저장하지 않으면 이전 값으로 갑니다.
        </div>
      )}
      {testMsg && (
        <div className={`mt-[6px] text-[12px] ${testMsg.ok ? 'text-good' : 'text-crit'}`}>
          {testMsg.text}
        </div>
      )}
    </div>
  )
}

// select 의 "직접 입력" 항목. 공백은 hostname 에 올 수 없어 실제 호스트 이름과 절대 겹치지 않는다.
const MANUAL_OPTION = '__직접 입력__'

function MyHostsPanel({
  observed,
  myHosts,
  loading,
  error,
  refetch,
}: {
  observed: Host[]
  myHosts: string[]
  loading: boolean
  error: string | null
  refetch: () => void
}) {
  const [choice, setChoice] = useState('')
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyHost, setBusyHost] = useState<string | null>(null)
  const [mutErr, setMutErr] = useState<string | null>(null)

  const observedNames = observed.map((h) => h.host)
  const candidates = observedNames.filter((name) => !myHosts.includes(name))
  const name = (choice === MANUAL_OPTION ? manual : choice).trim()
  // 관측 목록에 없는 이름은 오타일 가능성이 크다. 라우팅이 tenantId+host 완전 일치라 한 글자만 틀려도 알림이 사라진다.
  const unobserved = name.length > 0 && !observedNames.includes(name)

  const register = async () => {
    if (!name) return
    if (
      unobserved &&
      !window.confirm(
        `'${name}'은 아직 관측되지 않은 호스트입니다.\n\n이름이 정확하지 않으면 알림이 전달되지 않습니다. 그래도 등록할까요?`,
      )
    )
      return
    setBusy(true)
    setMutErr(null)
    try {
      await api.registerHost(name)
      setChoice('')
      setManual('')
      refetch()
    } catch (e) {
      setMutErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // 확인 없이 연타하면 두 번째 요청이 404 를 받는다. busy 로 버튼도 함께 잠근다.
  const unregister = async (target: string) => {
    if (
      !window.confirm(`'${target}' 등록을 해제할까요?\n\n해제하면 이 기기의 알림이 오지 않습니다.`)
    )
      return
    setBusyHost(target)
    setMutErr(null)
    try {
      await api.unregisterHost(target)
      refetch()
    } catch (e) {
      setMutErr((e as Error).message)
    } finally {
      setBusyHost(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-[8px] sm:flex-row">
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="grow rounded-sm border border-line bg-panel-2 px-[12px] py-[9px] text-[13px] text-ink focus:border-accent focus:outline-none cursor-pointer"
        >
          <option value="">관측된 기기에서 선택</option>
          {candidates.map((host) => (
            <option key={host} value={host}>
              {host}
            </option>
          ))}
          <option value={MANUAL_OPTION}>직접 입력</option>
        </select>
        <PrimaryButton onClick={register} disabled={busy || name.length === 0}>
          {busy ? '등록 중' : '등록'}
        </PrimaryButton>
      </div>

      {choice === MANUAL_OPTION && (
        <input
          type="text"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="본인 기기의 hostname (터미널에서 hostname 명령)"
          className="mt-[8px] w-full rounded-sm border border-line bg-panel-2 px-[12px] py-[9px] text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
      )}

      {candidates.length === 0 && choice !== MANUAL_OPTION && (
        <div className="mt-[8px] text-[12px] text-faint">
          아직 선택할 수 있는 관측 기기가 없습니다. 위 2번 설치를 마치면 목록에 나타납니다.
        </div>
      )}
      {unobserved && (
        <div className="mt-[8px] text-[12px] text-high leading-[1.6]">
          아직 관측되지 않은 호스트입니다. 이름이 정확하지 않으면 알림이 전달되지 않습니다.
        </div>
      )}
      {mutErr && <div className="mt-[8px] text-[12px] text-crit">{mutErr}</div>}

      <div className="mt-[14px]">
        <AsyncState
          loading={loading}
          error={error}
          empty={myHosts.length === 0}
          emptyText="아직 등록한 기기가 없습니다."
          onRetry={refetch}
        >
          <div className="flex flex-col gap-[8px]">
            {myHosts.map((host) => (
              <div
                key={host}
                className="flex flex-wrap items-center gap-[12px] rounded-sm border border-line bg-panel-2 px-[12px] py-[9px]"
              >
                <span className="grow font-mono text-[13px] text-ink-2">{host}</span>
                <ObservedBadge observed={observedNames.includes(host)} />
                <button
                  type="button"
                  onClick={() => unregister(host)}
                  disabled={busyHost !== null}
                  className="shrink-0 text-[12px] font-semibold text-mid hover:text-crit disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {busyHost === host ? '해제 중' : '해제'}
                </button>
              </div>
            ))}
          </div>
        </AsyncState>
      </div>
    </div>
  )
}

const statusGrid = 'grid grid-cols-[1fr_100px_100px_80px] gap-[12px]'

function HostStatusPanel({
  hosts,
  loading,
  error,
  refetch,
}: {
  hosts: Host[]
  loading: boolean
  error: string | null
  refetch: () => void
}) {
  const now = Date.now()

  return (
    <div>
      <div className="flex items-center justify-between gap-[12px]">
        <span className="text-[12px] text-faint">
          여기 표시된 이름이 알림 라우팅이 대조하는 값입니다. 5번에서 이 이름 그대로 등록하세요.
        </span>
        <SecondaryButton onClick={refetch} disabled={loading}>
          {loading ? '불러오는 중' : '새로고침'}
        </SecondaryButton>
      </div>

      <div className="mt-[14px]">
        <AsyncState
          loading={loading}
          error={error}
          empty={hosts.length === 0}
          emptyText="아직 관측된 기기가 없습니다. 수집이 시작되면 여기에 표시됩니다."
          onRetry={refetch}
        >
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div
                className={`${statusGrid} pb-[8px] border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
              >
                <span>호스트</span>
                <span>상태</span>
                <span>연결</span>
                <span className="text-right">마지막 확인</span>
              </div>
              {hosts.map((h, i) => (
                <div
                  key={h.host}
                  className={`${statusGrid} items-center py-[11px] ${
                    i === hosts.length - 1 ? '' : 'border-b border-line-2'
                  }`}
                >
                  <span className="font-mono text-[13px] text-ink-2">{h.host}</span>
                  <span className="flex items-center gap-[7px] text-[12.5px] text-mid">
                    <span
                      className="h-[7px] w-[7px] rounded-full"
                      style={{ background: hostStatusColor(h.status) }}
                    />
                    {hostStatusLabel(h.status)}
                  </span>
                  <span
                    className={`text-[12.5px] ${
                      now - h.lastSeen > STALE_MS ? 'text-high' : 'text-mid'
                    }`}
                  >
                    {now - h.lastSeen > STALE_MS ? '연결 끊김' : '연결됨'}
                  </span>
                  <span className="font-mono text-[11px] text-faint text-right">
                    {relativeTime(h.lastSeen)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AsyncState>
      </div>

      <div className="mt-[14px] text-[12px] text-faint leading-[1.6]">
        상태는 열린 알림의 심각도로만 매기므로 에이전트가 멈춰도 알림이 없으면 계속 정상으로
        보입니다. 에이전트가 살아 있는지는 마지막 확인 시각(연결 열)으로 판단하세요.
      </div>
    </div>
  )
}

function Onboarding() {
  const [os, setOs] = useState<OsKey>('macos')
  const [fleetOs, setFleetOs] = useState<FleetOsKey>('macos')
  const [stopOs, setStopOs] = useState<OsKey>('macos')
  const loggedIn = useAuthStore((s) => s.token !== null)

  // 체크리스트·호스트 선택·관측 배지가 같은 응답을 봐야 해서 조회를 이 위치에서 한 번만 한다.
  // 비로그인 상태의 개인 설정 API 는 401 이라 아예 부르지 않는다(화면은 LoginHint 로 대체된다).
  const observedQ = useApi(() => api.hosts())
  const myHostsQ = useApi(() => (loggedIn ? api.myHosts() : Promise.resolve(null)), [loggedIn])
  const secretQ = useApi(
    () => (loggedIn ? api.getEnrollSecret() : Promise.resolve(null)),
    [loggedIn],
  )
  const webhookQ = useApi(() => (loggedIn ? api.getWebhook() : Promise.resolve(null)), [loggedIn])
  // Fleet enroll secret 은 tenant 값이 아니라 Fleet 인스턴스 값이라 조회 경로가 따로다.
  const fleetSecretQ = useApi(
    () => (loggedIn ? api.fleetEnrollSecret() : Promise.resolve(null)),
    [loggedIn],
  )

  // 저장 직후 값. 저장 뒤 재조회하면 폼이 다시 마운트되면서 "저장되었습니다" 가 즉시 사라져서,
  // 체크리스트만 이 값으로 갱신하고 폼은 건드리지 않는다.
  const [justSavedWebhook, setJustSavedWebhook] = useState<string | null>(null)

  const observed = observedQ.data ?? []
  const observedNames = observed.map((h) => h.host)
  const myHosts = myHostsQ.data?.hosts ?? []
  const secret = secretQ.data?.enrollSecret ?? null
  const webhookUrl = justSavedWebhook ?? webhookQ.data?.webhookUrl ?? null

  // 등록했지만 그 이름으로 관측된 적이 없는 기기. 오타로 알림이 사라지고 있다는 신호다.
  const unmatched = myHosts.filter((host) => !observedNames.includes(host)).length

  const checklist: ChecklistItem[] = [
    {
      label: '관측된 기기',
      detail: `${observed.length}대`,
      done: observed.length > 0,
    },
    {
      label: '내 기기 등록',
      detail:
        unmatched > 0 ? `${myHosts.length}대 (관측 미확인 ${unmatched}대)` : `${myHosts.length}대`,
      done: myHosts.length > 0 && unmatched === 0,
    },
    {
      label: '개인 webhook',
      detail: webhookUrl ? '등록됨' : '미등록',
      done: webhookUrl !== null,
    },
  ]

  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="text-[18px] sm:text-[20px] font-bold text-ink tracking-[-0.01em]">
          수집 알림 연동
        </div>
        <div className="mt-[6px] text-[13px] text-faint leading-[1.6]">
          기기당 1회 설치·등록을 마치면 이벤트 수집과 실제 조치가 동작합니다. 조치(kill) 실행은 폴링
          방식이라 반영까지 수십 초가 걸릴 수 있습니다.
        </div>
      </div>

      {loggedIn && (
        <SectionCard
          title="연동 체크리스트"
          description="탐지 알림이 전달되려면 개인 webhook 과 내 기기 등록이 둘 다 갖춰져야 합니다. 하나라도 비어 있으면 알림은 조용히 사라집니다."
        >
          <Checklist items={checklist} />
        </SectionCard>
      )}

      <SectionCard
        title="1. enroll secret"
        description="기기를 내 조직으로 등록시키는 값입니다. 2번 설치 명령에 이미 들어 있어 따로 옮겨 적을 필요는 없습니다."
      >
        {loggedIn ? (
          <EnrollSecretPanel
            secret={secret}
            loading={secretQ.loading}
            error={secretQ.error}
            refetch={secretQ.refetch}
          />
        ) : (
          <LoginHint />
        )}
      </SectionCard>

      <SectionCard
        title="2. 기기 설치 및 로그 수집"
        description="OS를 선택해 설치·수집 명령어를 확인하세요. 서버 인증서는 관리자에게 받고, 플래그 파일은 화면의 내용을 그대로 저장하면 됩니다."
      >
        <OsTabs tabs={OS_TABS} value={os} onChange={setOs} />

        {os === 'macos' ? (
          <>
            {secret ? (
              <StepList steps={quickInstallSteps(secret)} />
            ) : (
              <div className="mt-[16px] text-[13px] text-high leading-[1.6]">
                로그인하면 내 조직의 enroll secret이 채워진 설치 명령이 나타납니다.
              </div>
            )}
            <details className="mt-[20px] group">
              <summary className="cursor-pointer text-[12.5px] text-faint hover:text-mid">
                수동으로 설치하기 (설치 명령이 실패했을 때)
              </summary>
              <div className="mt-[10px]">
                <StepList steps={INSTALL_STEPS.macos} />
              </div>
            </details>
          </>
        ) : (
          <>
            {secret ? (
              <StepList steps={quickInstallStepsWindows(secret)} />
            ) : (
              <div className="mt-[16px] text-[13px] text-high leading-[1.6]">
                로그인하면 내 조직의 enroll secret이 채워진 설치 명령이 나타납니다.
              </div>
            )}
            <details className="mt-[20px]">
              <summary className="cursor-pointer text-[12.5px] text-faint hover:text-mid">
                수동으로 설치하기 (설치 스크립트가 실패했을 때)
              </summary>
              <div className="mt-[10px]">
                <StepList steps={INSTALL_STEPS.windows} />
              </div>
            </details>
          </>
        )}

        {TLS_HOST === TLS_HOST_PLACEHOLDER && (
          <div className="mt-[14px] text-[12px] text-high leading-[1.6]">
            수집 서버 주소가 아직 설정되지 않아 플래그 파일의 --tls_hostname은 예시 값입니다. 실제
            주소는 관리자에게 받아 바꿔서 저장하세요.
          </div>
        )}

        <div className="mt-[28px] text-[13px] font-semibold text-ink-2">
          네트워크 이벤트 수집 (Zeek, 선택)
        </div>
        <div className="mt-[8px] text-[12px] text-faint leading-[1.6]">
          osquery는 네트워크 연결을 실시간으로 주지 못합니다. macOS는 관련 기능이 OS에서 사실상
          제거됐고, Windows는 해당 테이블 자체가 없습니다. 그래서 연결 기록만 Zeek가 담당합니다.
          여기까지 하면 위협 지도가 실제 데이터로 채워집니다. 안 해도 프로세스·파일 탐지는 그대로
          동작합니다.
        </div>
        {os === 'macos' ? (
          <details className="mt-[14px]">
            <summary className="cursor-pointer text-[12.5px] text-faint hover:text-mid">
              수동으로 설치하기 (위 설치 명령이 이미 포함합니다)
            </summary>
            <div className="mt-[10px]">
              <StepList steps={ZEEK_STEPS} />
            </div>
          </details>
        ) : (
          <div className="mt-[12px] text-[12px] text-high leading-[1.6]">
            Windows용 안내는 아직 준비되지 않았습니다. 같은 방식으로 붙일 수 있지만 검증되지
            않았습니다.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="3. Slack 알림 연결"
        description="Slack Incoming Webhook을 발급받아 등록하면 탐지 알림이 이 채널로 전달됩니다."
      >
        <NoteBox>
          webhook만 등록하면 알림은 오지 않습니다. 아래{' '}
          <span className="text-ink-2">5번 내 기기 등록</span>
          까지 마쳐야 그 기기의 알림이 이 채널로 전달됩니다.
        </NoteBox>

        <div className="mt-[18px] text-[13px] font-semibold text-ink-2">Webhook 발급 방법</div>
        <ol className="mt-[10px] flex flex-col gap-[10px]">
          {SLACK_STEPS.map((step, i) => (
            <li key={step} className="flex gap-[12px]">
              <StepNumber n={i + 1} />
              <span className="grow text-[13px] text-mid leading-[1.6] self-center">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-[18px] text-[13px] font-semibold text-ink-2">내 Webhook URL</div>
        <div className="mt-[6px] text-[12px] text-faint leading-[1.6]">
          5번에서 내가 등록한 host의 알림이 이 채널로 갑니다.
        </div>
        <div className="mt-[10px]">
          {loggedIn ? (
            <AsyncState
              loading={webhookQ.loading}
              error={webhookQ.error}
              onRetry={webhookQ.refetch}
            >
              <WebhookForm
                initial={webhookUrl}
                onSave={api.setWebhook}
                onSaved={setJustSavedWebhook}
                showTest
              />
            </AsyncState>
          ) : (
            <LoginHint />
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="4. 기기 상태"
        description="조직에서 관측 중인 기기입니다. 5번에 입력할 정확한 host 이름을 여기서 확인하세요."
      >
        <HostStatusPanel
          hosts={observed}
          loading={observedQ.loading}
          error={observedQ.error}
          refetch={observedQ.refetch}
        />
      </SectionCard>

      <SectionCard
        title="5. 내 기기 등록"
        description="등록한 host의 탐지 알림이 내 Slack Webhook으로 전달됩니다."
      >
        <NoteBox>
          알림 라우팅은 host 이름 <span className="text-ink-2">완전 일치</span>로 동작합니다. 4번
          목록에서 고르면 항상 일치하고, 직접 입력한 이름이 한 글자라도 다르면 알림이 조용히
          사라집니다. 3번의 webhook도 함께 등록해야 알림이 옵니다.
        </NoteBox>

        <div className="mt-[16px]">
          {loggedIn ? (
            <MyHostsPanel
              observed={observed}
              myHosts={myHosts}
              loading={myHostsQ.loading}
              error={myHostsQ.error}
              refetch={myHostsQ.refetch}
            />
          ) : (
            <LoginHint />
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="6. kill 대상 기기 Fleet 등록"
        description="알림의 '실행' 버튼으로 프로세스를 실제 종료하려면 대상 기기가 Fleet에 등록돼 있어야 합니다."
      >
        <NoteBox>
          2번의 osquery 설치는 <span className="text-ink-2">로그 수집</span>용이고, 여기 fleetd
          설치는 <span className="text-ink-2">kill 실행</span>용이라 별개입니다. 두 가지를 모두
          마쳐야 탐지부터 조치까지 동작합니다.
        </NoteBox>

        <div className="mt-[18px]">
          <OsTabs tabs={FLEET_OS_TABS} value={fleetOs} onChange={setFleetOs} />
        </div>
        <StepList steps={fleetSteps(fleetOs, fleetSecretQ.data?.secret ?? null)} />

        {/*
          값을 못 받으면 위 목록에 "Fleet enroll secret 확인" 단계가 살아나 직접 확인하는 방법을
          그대로 안내한다. 여기에 경고를 하나 더 띄우면 같은 말을 두 번 하는 셈이라 두지 않는다.
        */}

        {/* --fleet-url 은 미설정이어도 운영 주소가 들어가므로 "예시 값" 경고를 띄우지 않는다. */}

        <div className="mt-[24px] text-[13px] font-semibold text-ink-2">kill 가능 조건</div>
        <ul className="mt-[10px] flex flex-col gap-[8px]">
          {KILL_REQUIREMENTS.map((req) => (
            <li key={req} className="flex gap-[10px] text-[13px] text-mid leading-[1.6]">
              <span className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-line" />
              <span className="grow">{req}</span>
            </li>
          ))}
        </ul>

        <div className="mt-[18px] text-[12px] text-faint leading-[1.6]">
          등록 여부는 Fleet 콘솔 Hosts 목록에서 확인합니다. 위 4번 기기 상태는 osquery 수집 기준이라
          Fleet 등록 여부와는 다릅니다. Fleet은 폴링 방식이라 등록 직후나 조치 실행 후 반영까지 수십
          초가 걸릴 수 있습니다.
        </div>
      </SectionCard>

      <SectionCard
        title="7. 수집 종료"
        description="이 기기의 이벤트 수집을 멈춥니다. 1번만 하면 임시 중지, 끝까지 하면 완전 종료입니다."
      >
        <OsTabs tabs={OS_TABS} value={stopOs} onChange={setStopOs} />
        <StepList steps={STOP_STEPS[stopOs]} />

        <div className="mt-[24px] text-[13px] font-semibold text-ink-2">enroll secret 회전</div>
        <div className="mt-[10px]">
          <NoteBox>
            1번에서 secret을 재발급해도 {ROTATE_WARNING} 이미 등록된 기기의 수집을 끊으려면 위
            절차로 에이전트를 직접 중지해야 합니다.
          </NoteBox>
        </div>

        <div className="mt-[18px] text-[12px] text-faint leading-[1.6]">
          수집은 그대로 두고 알림만 끊으려면 5번 내 기기 등록에서 해당 host를 해제하세요. kill
          조치까지 끊으려면 Fleet에서 그 호스트의 fleetd도 별도로 제거해야 합니다.
        </div>
      </SectionCard>
    </div>
  )
}

export default Onboarding
