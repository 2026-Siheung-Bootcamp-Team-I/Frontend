import { useMemo, useState } from 'react'
import { api } from '@/api'
import type { Alert } from '@/api/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import FilterChips from '@/components/ui/FilterChips'
import AsyncState from '@/components/ui/AsyncState'
import { useApi } from '@/hooks/useApi'
import {
  relativeTime,
  severityColors,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
} from '@/lib/format'

type Filter = 'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'handled'

const rowGrid = 'grid grid-cols-[14px_1fr_120px_84px_96px_72px] gap-[12px]'

/** 처리됨 = 트리아지로 open 을 벗어난 것(확정·오탐). */
function matches(alert: Alert, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'handled') return alert.status !== 'open'
  return alert.severity === filter
}

function Threats() {
  const [filter, setFilter] = useState<Filter>('all')
  const { data, loading, error, refetch } = useApi(() => api.alerts({ limit: 1000 }))

  const alerts = useMemo(() => data ?? [], [data])
  const rows = alerts.filter((a) => matches(a, filter))

  const count = (f: Filter) => alerts.filter((a) => matches(a, f)).length
  const chips = (
    [
      ['all', '전체'],
      ['CRITICAL', '심각'],
      ['HIGH', '높음'],
      ['MEDIUM', '보통'],
      ['handled', '처리됨'],
    ] as [Filter, string][]
  ).map(([value, label]) => ({
    label: `${label} ${count(value)}`,
    active: filter === value,
    onClick: () => setFilter(value),
  }))

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex justify-between items-end gap-[16px] flex-wrap">
        <div>
          <div className="text-[20px] font-bold text-ink tracking-[-0.01em]">위협</div>
          <div className="mt-[6px] text-[13px] text-faint">
            탐지된 위협을 심각도와 상태로 관리합니다.
          </div>
        </div>
        <FilterChips chips={chips} />
      </div>

      <Card className="px-[24px] py-[22px]">
        <AsyncState
          loading={loading}
          error={error}
          empty={rows.length === 0}
          emptyText="탐지된 위협이 없습니다"
          onRetry={refetch}
        >
          <div
            className={`${rowGrid} pt-2 pb-2 pl-[12px] border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
          >
            <span />
            <span>위협</span>
            <span>호스트</span>
            <span>심각도</span>
            <span>상태</span>
            <span className="text-right">탐지</span>
          </div>
          {rows.map((row, i) => {
            const color = severityColors[severityTone(row.severity)]
            return (
              <div
                key={row.id}
                className={`${rowGrid} items-center py-[12px] pl-[12px] border-l-[3px] ${
                  i === rows.length - 1 ? '' : 'border-b border-line-2'
                }`}
                style={{ borderLeftColor: color }}
              >
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: color }} />
                <span className="text-[13.5px] text-ink">{row.threatName}</span>
                <span className="font-mono text-[12px] text-mid">{row.host}</span>
                <Badge severity={severityTone(row.severity)} className="justify-self-start">
                  {severityLabel(row.severity)}
                </Badge>
                <Badge severity={statusTone(row.status)} className="justify-self-start">
                  {statusLabel(row.status)}
                </Badge>
                <span className="font-mono text-[11px] text-faint text-right">
                  {relativeTime(row.ts)}
                </span>
              </div>
            )
          })}
        </AsyncState>
      </Card>
    </div>
  )
}

export default Threats
