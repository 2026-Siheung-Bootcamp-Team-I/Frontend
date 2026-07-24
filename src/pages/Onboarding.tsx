import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import Card from '@/components/ui/Card'
import AsyncState from '@/components/ui/AsyncState'
import { useApi } from '@/hooks/useApi'
import { useAuthStore } from '@/store/auth'
import { hostStatusColor, hostStatusLabel, relativeTime } from '@/lib/format'

type OsKey = 'macos' | 'windows'

const OS_TABS: { key: OsKey; label: string }[] = [
  { key: 'macos', label: 'macOS' },
  { key: 'windows', label: 'Windows' },
]

// 설치·수집 명령어는 백엔드 collector-service README(실측)의 osquery 경로 기준.
// 로그 수집 = osquery TLS → api-service. (kill 조치는 별도로 Fleet 사용)
const INSTALL_STEPS: Record<OsKey, { title: string; body: string; command?: string }[]> = {
  macos: [
    {
      title: 'osquery 설치',
      body: 'Homebrew로 osquery를 설치합니다.',
      command: 'brew install --cask osquery',
    },
    {
      title: 'enroll secret · 서버 인증서 배치',
      body: '위에서 발급한 enroll secret과 서버 인증서를 아래 경로에 둡니다.\n/etc/osquery/enroll.secret\n/etc/osquery/osquery-server.pem',
    },
    {
      title: '전체 디스크 접근(FDA) 부여',
      body: '시스템 설정 → 개인정보 보호 및 보안 → 전체 디스크 접근 → "+" → Cmd+Shift+G 로 아래 바이너리를 추가합니다. (.app 번들이 아니라 그 안의 유닉스 바이너리)\n/opt/osquery/lib/osquery.app/Contents/MacOS/osqueryd',
    },
    {
      title: 'osquery 실행',
      body: 'launchd 데몬으로 실행합니다. 포그라운드로 띄우면 FDA 권한이 터미널 앱에 귀속돼 동작하지 않습니다. (osqueryctl로 데몬 등록 후 sudo osqueryctl start 도 가능)',
      command: 'sudo osqueryd --flagfile /etc/osquery/osquery.mac.flags',
    },
    {
      title: '재부팅 후 확인',
      body: 'FDA(TCC) 권한은 실행 중 세션에 즉시 반영되지 않습니다. 재부팅 후 exec 이벤트가 수집되는지 확인합니다.',
    },
  ],
  windows: [
    {
      title: 'osquery 설치',
      body: 'osquery Windows 패키지를 설치합니다. 설치 후 기본 경로는 C:\\ProgramData\\osquery\\ 입니다.',
    },
    {
      title: 'enroll secret · 서버 인증서 배치',
      body: '위에서 발급한 enroll secret과 서버 인증서를 C:\\ProgramData\\osquery\\ 아래에 둡니다.',
    },
    {
      title: 'osquery 실행',
      body: '관리자 권한 PowerShell에서 실행합니다. 프로세스 감시가 ETW라 관리자 권한이 필수입니다.',
      command: 'osqueryd.exe --flagfile C:\\ProgramData\\osquery\\osquery.win.flags',
    },
    {
      title: '수집 확인',
      body: 'osqueryi.exe에서 아래 쿼리로 프로세스 이벤트가 들어오는지 확인합니다. 네트워크·DNS 이벤트는 Zeek가 담당합니다.',
      command: 'SELECT DISTINCT type FROM process_etw_events;',
    },
  ],
}

const SLACK_STEPS = [
  'api.slack.com/apps 접속 → Create New App → From scratch 선택',
  '앱 이름 입력, 알림을 받을 워크스페이스 선택 후 생성',
  '좌측 메뉴 Incoming Webhooks → Activate Incoming Webhooks 켜기',
  'Add New Webhook to Workspace → 알림 받을 채널 선택 → Allow',
  '생성된 Webhook URL(https://hooks.slack.com/services/...) 복사 후 아래 입력칸에 붙여넣기',
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-[7px] border border-line px-[10px] py-[5px] text-[12px] font-semibold text-mid hover:text-ink-2 hover:bg-panel cursor-pointer transition-colors"
    >
      {copied ? '복사됨' : '복사'}
    </button>
  )
}

function CommandBlock({ command }: { command: string }) {
  return (
    <div className="mt-[10px] flex items-center gap-[10px] rounded-[9px] border border-line bg-panel-2 px-[12px] py-[9px]">
      <code className="grow overflow-x-auto whitespace-pre font-mono text-[12.5px] text-good">
        {command}
      </code>
      <CopyButton text={command} />
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
    <div className="rounded-[9px] border border-dashed border-line px-[16px] py-[14px] text-[13px] text-mid leading-[1.6]">
      로그인하면 여기서 바로 발급·저장·등록할 수 있습니다.{' '}
      <Link to="/login" className="font-semibold !text-accent">
        로그인
      </Link>
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
      className="shrink-0 rounded-[9px] bg-accent px-[18px] py-[9px] text-[13px] font-semibold !text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {children}
    </button>
  )
}

// enroll secret 발급/조회. 이 값을 엔드포인트 osquery enroll.secret 에 넣으면 그 기기가 내 조직으로 등록된다.
function EnrollSecretPanel() {
  const { data, loading, error, refetch } = useApi(() => api.getEnrollSecret())
  const [busy, setBusy] = useState(false)
  const [mutErr, setMutErr] = useState<string | null>(null)

  const secret = data?.enrollSecret ?? null

  const rotate = async () => {
    setBusy(true)
    setMutErr(null)
    try {
      await api.rotateEnrollSecret()
      refetch()
    } catch (e) {
      setMutErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AsyncState loading={loading} error={error} onRetry={refetch}>
      {secret ? (
        <CommandBlock command={secret} />
      ) : (
        <div className="text-[13px] text-mid">아직 발급된 enroll secret이 없습니다.</div>
      )}
      <div className="mt-[12px] flex items-center gap-[12px]">
        <PrimaryButton onClick={rotate} disabled={busy}>
          {busy ? '발급 중' : secret ? '재발급' : '발급'}
        </PrimaryButton>
        {secret && (
          <span className="text-[12px] text-faint">재발급하면 이전 secret은 무효화됩니다.</span>
        )}
      </div>
      {mutErr && <div className="mt-[8px] text-[12px] text-crit">{mutErr}</div>}
    </AsyncState>
  )
}

function WebhookForm({ initial }: { initial: string | null }) {
  const [url, setUrl] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mutErr, setMutErr] = useState<string | null>(null)

  const valid = url.startsWith('https://hooks.slack.com/')

  const save = async () => {
    setBusy(true)
    setSaved(false)
    setMutErr(null)
    try {
      await api.setWebhook(url)
      setSaved(true)
    } catch (e) {
      setMutErr((e as Error).message)
    } finally {
      setBusy(false)
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
          className="grow rounded-[9px] border border-line bg-panel-2 px-[12px] py-[9px] text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <PrimaryButton onClick={save} disabled={busy || !valid}>
          {busy ? '저장 중' : '저장'}
        </PrimaryButton>
      </div>
      {url.length > 0 && !valid && (
        <div className="mt-[8px] text-[12px] text-high">
          https://hooks.slack.com/ 로 시작하는 URL을 입력하세요.
        </div>
      )}
      {saved && <div className="mt-[8px] text-[12px] text-good">저장되었습니다.</div>}
      {mutErr && <div className="mt-[8px] text-[12px] text-crit">{mutErr}</div>}
    </div>
  )
}

function WebhookPanel() {
  const { data, loading, error, refetch } = useApi(() => api.getWebhook())

  return (
    <AsyncState loading={loading} error={error} onRetry={refetch}>
      <WebhookForm initial={data?.webhookUrl ?? null} />
    </AsyncState>
  )
}

function MyHostsPanel() {
  const { data, loading, error, refetch } = useApi(() => api.myHosts())
  const [host, setHost] = useState('')
  const [busy, setBusy] = useState(false)
  const [mutErr, setMutErr] = useState<string | null>(null)

  const hosts = data?.hosts ?? []

  const register = async () => {
    const name = host.trim()
    if (!name) return
    setBusy(true)
    setMutErr(null)
    try {
      await api.registerHost(name)
      setHost('')
      refetch()
    } catch (e) {
      setMutErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const unregister = async (name: string) => {
    setMutErr(null)
    try {
      await api.unregisterHost(name)
      refetch()
    } catch (e) {
      setMutErr((e as Error).message)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-[8px] sm:flex-row">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="등록할 host 이름 (예: WIN-FIN-02)"
          className="grow rounded-[9px] border border-line bg-panel-2 px-[12px] py-[9px] text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <PrimaryButton onClick={register} disabled={busy || host.trim().length === 0}>
          {busy ? '등록 중' : '등록'}
        </PrimaryButton>
      </div>
      {mutErr && <div className="mt-[8px] text-[12px] text-crit">{mutErr}</div>}
      <div className="mt-[14px]">
        <AsyncState
          loading={loading}
          error={error}
          empty={hosts.length === 0}
          emptyText="아직 등록한 기기가 없습니다."
          onRetry={refetch}
        >
          <div className="flex flex-col gap-[8px]">
            {hosts.map((name) => (
              <div
                key={name}
                className="flex items-center gap-[12px] rounded-[9px] border border-line bg-panel-2 px-[12px] py-[9px]"
              >
                <span className="grow font-mono text-[13px] text-ink-2">{name}</span>
                <button
                  type="button"
                  onClick={() => unregister(name)}
                  className="shrink-0 text-[12px] font-semibold text-mid hover:text-crit cursor-pointer transition-colors"
                >
                  해제
                </button>
              </div>
            ))}
          </div>
        </AsyncState>
      </div>
    </div>
  )
}

const statusGrid = 'grid grid-cols-[1fr_110px_80px] gap-[12px]'

function HostStatusPanel() {
  const { data, loading, error, refetch } = useApi(() => api.hosts())
  const hosts = data ?? []

  return (
    <AsyncState
      loading={loading}
      error={error}
      empty={hosts.length === 0}
      emptyText="아직 관측된 기기가 없습니다. 설치·등록을 마치면 여기에 online 상태로 표시됩니다."
      onRetry={refetch}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[420px]">
          <div
            className={`${statusGrid} pb-[8px] border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
          >
            <span>호스트</span>
            <span>상태</span>
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
              <span className="font-mono text-[11px] text-faint text-right">
                {relativeTime(h.lastSeen)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AsyncState>
  )
}

function Onboarding() {
  const [os, setOs] = useState<OsKey>('macos')
  const loggedIn = useAuthStore((s) => s.token !== null)

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

      <SectionCard
        title="1. enroll secret 발급"
        description="이 값을 엔드포인트의 osquery enroll.secret에 넣으면 그 기기가 내 조직으로 등록됩니다."
      >
        {loggedIn ? <EnrollSecretPanel /> : <LoginHint />}
      </SectionCard>

      <SectionCard
        title="2. 기기 설치 및 로그 수집"
        description="OS를 선택해 설치·수집 명령어를 확인하세요. 서버 인증서·플래그 파일은 관리자가 제공합니다."
      >
        <div className="inline-flex gap-[3px] rounded-[10px] border border-line-2 p-[3px]">
          {OS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setOs(tab.key)}
              className={`rounded-[8px] px-[16px] py-[6px] text-[13px] font-semibold cursor-pointer transition-colors ${
                os === tab.key
                  ? 'bg-[var(--accent-wash)] text-accent'
                  : 'text-mid hover:text-ink-2 hover:bg-panel'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ol className="mt-[18px] flex flex-col gap-[18px]">
          {INSTALL_STEPS[os].map((step, i) => (
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
      </SectionCard>

      <SectionCard
        title="3. Slack 알림 연결"
        description="Slack Incoming Webhook을 발급받아 등록하면 탐지 알림이 이 채널로 전달됩니다."
      >
        <div className="text-[13px] font-semibold text-ink-2">Webhook 발급 방법</div>
        <ol className="mt-[10px] flex flex-col gap-[10px]">
          {SLACK_STEPS.map((step, i) => (
            <li key={step} className="flex gap-[12px]">
              <StepNumber n={i + 1} />
              <span className="grow text-[13px] text-mid leading-[1.6] self-center">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-[18px] text-[13px] font-semibold text-ink-2">Webhook URL</div>
        <div className="mt-[10px]">{loggedIn ? <WebhookPanel /> : <LoginHint />}</div>
      </SectionCard>

      <SectionCard
        title="4. 내 기기 등록"
        description="등록한 host의 탐지 알림이 내 Slack Webhook으로 전달됩니다."
      >
        {loggedIn ? <MyHostsPanel /> : <LoginHint />}
      </SectionCard>

      <SectionCard title="5. 기기 상태" description="조직에서 관측 중인 기기의 상태입니다.">
        <HostStatusPanel />
      </SectionCard>
    </div>
  )
}

export default Onboarding
