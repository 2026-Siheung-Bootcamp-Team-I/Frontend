import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/api'
import type { Alert, ExecuteStatus } from '@/api/types'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import AttackPath from '@/components/ui/AttackPath'
import AsyncState from '@/components/ui/AsyncState'
import TriageActions from '@/components/ui/TriageActions'
import { useApi } from '@/hooks/useApi'
import {
  clockTime,
  killTarget,
  severityColors,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
} from '@/lib/format'
import { toAttackSteps } from '@/lib/lineagePath'
import { useAlertsStore } from '@/store/alerts'
import { useAuthStore } from '@/store/auth'

const labelColor = {
  crit: 'text-crit',
  high: 'text-high',
  mid: 'text-mid',
  accent: 'text-accent',
  good: 'text-good',
}

function Sequence() {
  const alertsVersion = useAlertsStore((s) => s.version)
  const list = useApi(() => api.alerts({ limit: 100 }), [alertsVersion])
  const alerts = useMemo(() => list.data ?? [], [list.data])
  /**
   * 아직 판단하지 않은 것과 처리를 마친 것을 아예 다른 목록으로 나눈다. 한 목록에 이어 두면
   * 조치가 됐는지 확인하려고 매번 아래로 내려야 한다. 처리한 것도 지우지 않는다.
   * 무엇을 어떻게 처리했는지 남아 있어야 하기 때문.
   */
  const openAlerts = useMemo(() => alerts.filter((a) => a.status === 'open'), [alerts])
  const doneAlerts = useMemo(() => alerts.filter((a) => a.status !== 'open'), [alerts])

  // 대시보드의 "자세히" 가 ?alert= 로 딥링크한다. 목록에서 직접 고르면 그쪽이 우선한다.
  const [searchParams] = useSearchParams()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const targetId = pickedId ?? searchParams.get('alert')
  // 고른 알림이 목록에서 사라지면(재조회 등) 아직 판단하지 않은 첫 건으로 되돌아간다.
  const selected = alerts.find((a) => a.id === targetId) ?? openAlerts[0] ?? alerts[0] ?? null
  const selectedId = selected?.id ?? null

  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="text-[18px] sm:text-[20px] font-bold text-ink tracking-[-0.01em]">
          시퀀스 분석
        </div>
        <div className="mt-[6px] text-[13px] text-faint">
          개별 행동을 시간순으로 이어 공격 경로로 재구성합니다.
        </div>
      </div>

      {/* 대시보드와 같은 이유로 2열은 xl 부터. 상세 카드가 트랙을 밀어내지 않도록 minmax(0, 1fr). */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-[20px] items-start">
        {/* 2열일 때는 목록을 붙박아 둔다. 오른쪽 상세를 길게 훑어도 처리 결과가 화면에 남는다. */}
        <div className="flex flex-col gap-[16px] xl:sticky xl:top-[16px]">
          <AlertList
            title="탐지된 시퀀스"
            alerts={openAlerts}
            selectedId={selectedId}
            onPick={setPickedId}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            emptyText="탐지된 시퀀스가 없습니다"
          />
          <AlertList
            title="처리된 시퀀스"
            alerts={doneAlerts}
            selectedId={selectedId}
            onPick={setPickedId}
            loading={list.loading}
            error={list.error}
            onRetry={list.refetch}
            emptyText="아직 처리한 시퀀스가 없습니다"
            done
          />
        </div>

        <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
          {selected ? (
            <SequenceDetail alert={selected} />
          ) : (
            <AsyncState loading={list.loading} error={null} empty emptyText="시퀀스를 선택하세요">
              {null}
            </AsyncState>
          )}
        </Card>
      </div>
    </div>
  )
}

type AlertListProps = {
  title: string
  alerts: Alert[]
  selectedId: string | null
  onPick: (id: string) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  emptyText: string
  /** 처리된 목록이면 판단 결과와 조치 대상 프로세스를 함께 보여준다. */
  done?: boolean
}

/** 좌측 시퀀스 목록 한 덩이. 탐지된 것과 처리된 것이 같은 모양을 쓰되 done 으로만 갈린다. */
function AlertList({
  title,
  alerts,
  selectedId,
  onPick,
  loading,
  error,
  onRetry,
  emptyText,
  done = false,
}: AlertListProps) {
  return (
    <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px] flex flex-col gap-[10px]">
      <div className="mb-1 flex items-center gap-[8px]">
        <span className="text-[13px] font-bold text-ink">{title}</span>
        {alerts.length > 0 && (
          <span className="font-mono text-[12px] text-faint">{alerts.length}</span>
        )}
      </div>
      {/*
        두 목록이 세로로 쌓이므로 각자 높이를 제한한다. 그래야 아래 목록(처리된 시퀀스)이
        화면 밖으로 밀리지 않는다. 2열에서는 뷰포트 비례라 큰 화면일수록 더 많이 보인다.
      */}
      <div className="flex flex-col gap-[10px] max-h-[320px] overflow-y-auto xl:max-h-[32vh]">
        <AsyncState
          loading={loading}
          error={error}
          empty={alerts.length === 0}
          emptyText={emptyText}
          onRetry={onRetry}
        >
          {alerts.map((alert) => {
            const tone = severityTone(alert.severity)
            // 오탐으로 접은 건 조치한 게 아니므로 대상 프로세스를 달지 않는다.
            const target = alert.status === 'confirmed' ? killTarget(alert.matched) : null
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => onPick(alert.id)}
                className={`flex flex-col gap-[6px] p-[14px] rounded-md cursor-pointer border text-left font-sans ${
                  alert.id === selectedId
                    ? 'border-accent bg-[var(--accent-wash)]'
                    : 'border-line-2 bg-panel-2'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-[7px] h-[7px] rounded-full"
                    style={{ background: severityColors[tone] }}
                  />
                  <span className="font-mono text-[12px] text-ink-2">{alert.host}</span>
                  <span className={`ml-auto text-[10.5px] font-semibold ${labelColor[tone]}`}>
                    {severityLabel(alert.severity)}
                  </span>
                </div>
                <div className="text-[13px] font-semibold text-ink">{alert.threatName}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-faint">{clockTime(alert.ts)}</span>
                  {done && (
                    <Badge severity={statusTone(alert.status)} className="ml-auto">
                      {statusLabel(alert.status)}
                    </Badge>
                  )}
                </div>
                {done && target && (
                  <div className="truncate text-[11.5px] text-faint">
                    대상 <span className="font-mono text-ink-2">{target}</span>
                  </div>
                )}
              </button>
            )
          })}
        </AsyncState>
      </div>
    </Card>
  )
}

function SequenceDetail({ alert }: { alert: Alert }) {
  const { data, loading, error, refetch } = useApi(() => api.lineage(alert.id), [alert.id])
  const steps = data ? toAttackSteps(data) : []

  return (
    <>
      <AsyncState
        loading={loading}
        error={error}
        empty={steps.length === 0}
        emptyText="이 알림 시각 주변에 재구성할 이벤트가 없습니다"
        onRetry={refetch}
      >
        <AttackPath host={alert.host} label={`${alert.threatName} 시퀀스`} steps={steps} />
      </AsyncState>
      <TriageActions alert={alert} />
      {/*
        실행 가능한 조치는 프로세스 종료 하나뿐이다. notify(MEDIUM)는 조치 대상이 아니라
        버튼을 띄우지 않는다.

        isolate 를 함께 받는 이유: 격리는 아직 구현이 없어(방화벽으로 끊으면 Fleet 연결도
        끊겨 되돌릴 수단이 사라진다) 당분간 프로세스 종료로 대신한다. detector 는 이미
        CRITICAL 을 kill 로 권고하도록 바꿨고(Alert.java), isolate 는 데모 데이터에만 남아 있다.
        실제로 격리를 붙이면 이 분기와 함께 권고를 되돌린다.
      */}
      {(alert.action === 'kill' || alert.action === 'isolate') && <RealAction alert={alert} />}
    </>
  )
}

/** responder 실행 결과 status 별 안내 문구와 색. */
const execResult: Record<ExecuteStatus, { text: string; tone: 'good' | 'high' | 'crit' | 'mid' }> =
  {
    KILLED: { text: '프로세스를 종료했습니다.', tone: 'good' },
    NO_MATCH: { text: '대상 프로세스를 찾지 못했습니다.', tone: 'mid' },
    TIMEOUT: { text: '응답 시간이 초과됐습니다.', tone: 'high' },
    FAILED: { text: '실행에 실패했습니다.', tone: 'crit' },
    COOLDOWN: { text: '쿨다운 중입니다. 잠시 후 다시 시도하세요.', tone: 'mid' },
    DISABLED: { text: '서버에서 실제 조치가 꺼져 있습니다.', tone: 'mid' },
  }

/** 결과 배지 배경. 작은 글씨 한 줄이면 조치가 됐는지 눈에 안 띈다. */
const resultBox = {
  good: 'bg-good/15 text-good border border-good/30',
  high: 'bg-high/15 text-high border border-high/30',
  crit: 'bg-crit/15 text-crit border border-crit/30',
  mid: 'bg-panel text-mid border border-line',
}

/** 실제 조치(kill) 실행. 확인 단계를 거친 뒤 api-service 를 경유해 실행한다. */
function RealAction({ alert }: { alert: Alert }) {
  const isDemo = useAuthStore((s) => s.token) === null
  // 종료 대상 프로세스는 alert.matched 의 실행 체인 말단 프로세스. 없으면 실행 불가.
  const target = killTarget(alert.matched)
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'pending'>('idle')
  const [result, setResult] = useState<ExecuteStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  function ask() {
    setResult(null)
    setError(null)
    setPhase('confirm')
  }

  async function run() {
    if (!target) return
    setPhase('pending')
    setError(null)
    try {
      const res = await api.executeKill(alert.id, target)
      setResult(res.status)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPhase('idle')
    }
  }

  return (
    <div className="mt-[12px] px-[14px] py-[14px] sm:px-[18px] sm:py-[16px] bg-panel-2 border border-line-2 rounded-md">
      <div className="flex flex-col gap-[10px] sm:flex-row sm:items-center sm:gap-[16px]">
        <div className="flex-1">
          <div className="text-[12px] text-faint mb-1">실제 조치 (프로세스 종료)</div>
          <div className="text-[13.5px] leading-[1.5] text-ink">
            {target ? (
              <>
                <span className="font-mono text-ink-2">{alert.host}</span> 에서{' '}
                <span className="font-mono text-ink-2">{target}</span> 프로세스를 종료합니다.
              </>
            ) : (
              '종료할 프로세스를 찾지 못했습니다.'
            )}
          </div>
          {result && (
            <div
              className={`mt-[10px] inline-flex items-center gap-[8px] px-[12px] py-[8px] rounded-sm text-[13px] font-semibold ${resultBox[execResult[result].tone]}`}
            >
              <span>{result === 'KILLED' ? '✓' : '!'}</span>
              <span>{execResult[result].text}</span>
            </div>
          )}
          {result === 'KILLED' && (
            <div className="mt-[6px] text-[12px] text-faint leading-[1.5]">
              이 알림은 처리 완료(confirmed)로 바뀌었습니다. 열린 알림 목록에서는 사라집니다.
            </div>
          )}
          {isDemo && (
            <div className="mt-[6px] text-[12px] text-faint">
              데모라 실제로 종료하지는 않습니다. 예시 결과만 보여 줍니다.
            </div>
          )}
          {error && <div className="mt-[6px] text-[12px] text-crit">{error}</div>}
        </div>

        <div className="flex gap-[10px]">
          {phase === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="flex-1 sm:flex-none whitespace-nowrap text-[13px] font-semibold text-ink-2 border border-line px-[16px] py-[10px] rounded-sm cursor-pointer font-sans"
              >
                취소
              </button>
              <button
                type="button"
                onClick={run}
                className="flex-1 sm:flex-none whitespace-nowrap text-[13px] font-semibold text-white bg-crit px-[18px] py-[10px] rounded-sm cursor-pointer font-sans"
              >
                정말 종료하시겠습니까?
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={ask}
              disabled={!target || phase === 'pending' || result === 'KILLED'}
              className="flex-1 sm:flex-none whitespace-nowrap text-[13px] font-semibold text-white bg-high px-[18px] py-[10px] rounded-sm cursor-pointer font-sans disabled:opacity-60 disabled:cursor-default"
            >
              {phase === 'pending'
                ? '실행 중'
                : result === 'KILLED'
                  ? '조치 완료'
                  : '실제 조치 실행'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sequence
