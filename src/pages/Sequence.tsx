import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/api'
import type { Alert, ExecuteStatus } from '@/api/types'
import Card from '@/components/ui/Card'
import AttackPath from '@/components/ui/AttackPath'
import AsyncState from '@/components/ui/AsyncState'
import TriageActions from '@/components/ui/TriageActions'
import { useApi } from '@/hooks/useApi'
import { clockTime, killTarget, severityColors, severityLabel, severityTone } from '@/lib/format'
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
  const alerts = list.data ?? []

  // 대시보드의 "자세히" 가 ?alert= 로 딥링크한다. 목록에서 직접 고르면 그쪽이 우선한다.
  const [searchParams] = useSearchParams()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const targetId = pickedId ?? searchParams.get('alert')
  // 고른 알림이 목록에서 사라지면(재조회 등) 자연히 첫 항목으로 되돌아간다.
  const selected = alerts.find((a) => a.id === targetId) ?? alerts[0] ?? null
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
        <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px] flex flex-col gap-[10px]">
          <div className="text-[13px] font-bold text-ink mb-1">탐지된 시퀀스</div>
          {/* 1열로 쌓일 때는 목록이 길어져 상세가 밀리므로 높이를 제한한다. 2열(xl)이 되면 푼다. */}
          <div className="flex flex-col gap-[10px] max-h-[320px] overflow-y-auto xl:max-h-none xl:overflow-visible">
            <AsyncState
              loading={list.loading}
              error={list.error}
              empty={alerts.length === 0}
              emptyText="탐지된 시퀀스가 없습니다"
              onRetry={list.refetch}
            >
              {alerts.map((alert) => {
                const tone = severityTone(alert.severity)
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => setPickedId(alert.id)}
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
                    <div className="text-[11.5px] text-faint">{clockTime(alert.ts)}</div>
                  </button>
                )
              })}
            </AsyncState>
          </div>
        </Card>

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
      {/* 권고 대응이 kill 인 알림만 실제 조치(프로세스 종료)를 실행할 수 있다. */}
      {alert.action === 'kill' && <RealAction alert={alert} />}
    </>
  )
}

/** responder 실행 결과 status 별 안내 문구와 색. */
const execResult: Record<ExecuteStatus, { text: string; tone: 'good' | 'high' | 'crit' | 'mid' }> = {
  KILLED: { text: '프로세스를 종료했습니다.', tone: 'good' },
  NO_MATCH: { text: '대상 프로세스를 찾지 못했습니다.', tone: 'mid' },
  TIMEOUT: { text: '응답 시간이 초과됐습니다.', tone: 'high' },
  FAILED: { text: '실행에 실패했습니다.', tone: 'crit' },
  COOLDOWN: { text: '쿨다운 중입니다. 잠시 후 다시 시도하세요.', tone: 'mid' },
  DISABLED: { text: '서버에서 실제 조치가 꺼져 있습니다.', tone: 'mid' },
}

const toneClass = {
  good: 'text-good',
  high: 'text-high',
  crit: 'text-crit',
  mid: 'text-mid',
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
    <div className="mt-[12px] px-[14px] py-[14px] sm:px-[18px] sm:py-[16px] bg-panel-2 border border-line-2 rounded-md border-l-[3px] border-l-high">
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
          {phase === 'confirm' && (
            <div className="mt-[6px] text-[12.5px] font-semibold text-high">
              되돌릴 수 없습니다. 확인하겠습니까?
            </div>
          )}
          {result && (
            <div
              className={`mt-[6px] text-[12.5px] font-semibold ${toneClass[execResult[result].tone]}`}
            >
              결과: {execResult[result].text}
            </div>
          )}
          {isDemo && (
            <div className="mt-[6px] text-[12px] text-faint">
              데모에서는 실제 조치가 실행되지 않습니다. 로그인 후 이용하세요.
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
                확인
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={ask}
              disabled={isDemo || !target || phase === 'pending'}
              className="flex-1 sm:flex-none whitespace-nowrap text-[13px] font-semibold text-white bg-high px-[18px] py-[10px] rounded-sm cursor-pointer font-sans disabled:opacity-60 disabled:cursor-default"
            >
              {phase === 'pending' ? '실행 중' : '실제 조치 실행'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sequence
