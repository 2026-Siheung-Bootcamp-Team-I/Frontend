import { useState } from 'react'
import { api } from '@/api'
import type { Alert } from '@/api/types'
import Card from '@/components/ui/Card'
import AttackPath from '@/components/ui/AttackPath'
import AsyncState from '@/components/ui/AsyncState'
import TriageActions from '@/components/ui/TriageActions'
import { useApi } from '@/hooks/useApi'
import { clockTime, severityColors, severityLabel, severityTone } from '@/lib/format'
import { toAttackSteps } from '@/lib/lineagePath'

const labelColor = {
  crit: 'text-crit',
  high: 'text-high',
  mid: 'text-mid',
  accent: 'text-accent',
  good: 'text-good',
}

function Sequence() {
  const list = useApi(() => api.alerts({ limit: 100 }))
  const alerts = list.data ?? []

  // 고른 알림이 목록에서 사라지면(재조회 등) 자연히 첫 항목으로 되돌아간다.
  const [pickedId, setPickedId] = useState<string | null>(null)
  const selected = alerts.find((a) => a.id === pickedId) ?? alerts[0] ?? null
  const selectedId = selected?.id ?? null

  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="text-[20px] font-bold text-ink tracking-[-0.01em]">시퀀스 분석</div>
        <div className="mt-[6px] text-[13px] text-faint">
          개별 행동을 시간순으로 이어 공격 경로로 재구성합니다.
        </div>
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-[20px] items-start">
        <Card className="px-[24px] py-[22px] flex flex-col gap-[10px]">
          <div className="text-[13px] font-bold text-ink mb-1">탐지된 시퀀스</div>
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
                  className={`flex flex-col gap-[6px] p-[14px] rounded-[12px] cursor-pointer border text-left font-sans ${
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
        </Card>

        <Card className="px-[24px] py-[22px]">
          {selected ? (
            <SequenceDetail alert={selected} onTriaged={list.refetch} />
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

function SequenceDetail({ alert, onTriaged }: { alert: Alert; onTriaged: () => void }) {
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
      <TriageActions alert={alert} onTriaged={onTriaged} />
    </>
  )
}

export default Sequence
