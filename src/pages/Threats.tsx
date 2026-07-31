import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/api'
import type { Alert } from '@/api/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import FilterChips from '@/components/ui/FilterChips'
import AsyncState from '@/components/ui/AsyncState'
import ActiveFilters, { type ActiveFilter } from '@/components/ui/ActiveFilters'
import ScrollArea from '@/components/ui/ScrollArea'
import { useApi } from '@/hooks/useApi'
import { absoluteTime, severityLabel, severityTone, statusLabel, statusTone } from '@/lib/format'
import { useAlertsStore } from '@/store/alerts'

type Filter = 'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'handled'

// 위협 / MITRE / 호스트 / 목적지 / 심각도 / 상태 / 근거 / 탐지 시각
const rowGrid = 'grid grid-cols-[1fr_92px_116px_130px_78px_86px_48px_142px] gap-[12px]'

/**
 * 판정 근거에 실제로 관측된 목적지. 둘 다 없으면 관측되지 않은 것이므로 지어내지 않고 '-' 로 밝힌다.
 * 둘 다 있으면 도메인을 주로, IP 를 보조로 함께 보여준다(하나로 뭉개지 않는다).
 */
function Destination({ domain, destIp }: { domain: string; destIp: string }) {
  if (!domain && !destIp) return <span className="text-faint">-</span>
  return (
    <span className="min-w-0">
      {domain && <span className="block truncate font-mono text-[12px] text-ink-2">{domain}</span>}
      {destIp && (
        <span className={`block truncate font-mono text-[11px] ${domain ? 'text-faint' : 'text-ink-2'}`}>
          {destIp}
        </span>
      )}
    </span>
  )
}

/** 처리됨 = 트리아지로 open 을 벗어난 것(확정·오탐). */
function matches(alert: Alert, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'handled') return alert.status !== 'open'
  return alert.severity === filter
}

function Threats() {
  const [filter, setFilter] = useState<Filter>('all')
  const alertsVersion = useAlertsStore((s) => s.version)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  // 다른 화면(관계 분석, IP·도메인 조회)에서 좁혀 들어오는 경로가 있어 되돌아갈 길을 준다.
  const canGoBack = window.history.length > 1
  const host = searchParams.get('host')
  const domain = searchParams.get('domain')
  const destIp = searchParams.get('destIp')

  // 해제는 그 조건만 지운다. 나머지 조건은 남아야 한다.
  function clearParam(key: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(key)
      return next
    })
  }

  const { data, loading, error, refetch } = useApi(
    () =>
      api.alerts({
        host: host ?? undefined,
        domain: domain ?? undefined,
        destIp: destIp ?? undefined,
        limit: 1000,
      }),
    [alertsVersion, host, domain, destIp],
  )

  const alerts = useMemo(() => data ?? [], [data])
  const rows = alerts.filter((a) => matches(a, filter))
  const hasDestFilter = Boolean(host || domain || destIp)

  const activeFilters: ActiveFilter[] = [
    ...(host ? [{ label: '호스트', value: host, onClear: () => clearParam('host') }] : []),
    ...(domain ? [{ label: '도메인', value: domain, onClear: () => clearParam('domain') }] : []),
    ...(destIp ? [{ label: '목적지 IP', value: destIp, onClear: () => clearParam('destIp') }] : []),
  ]

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
      <div className="flex flex-col items-start gap-[16px] sm:flex-row sm:justify-between sm:items-end">
        <div>
          <div className="text-[18px] sm:text-[20px] font-bold text-ink tracking-[-0.01em]">
            위협
          </div>
          <div className="mt-[6px] text-[13px] text-faint">
            탐지된 위협을 심각도와 상태로 관리합니다.
          </div>
        </div>
        <FilterChips chips={chips} />
      </div>

      <ActiveFilters filters={activeFilters} onBack={canGoBack ? () => navigate(-1) : undefined} />

      <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
        <AsyncState
          loading={loading}
          error={error}
          empty={rows.length === 0}
          emptyText={hasDestFilter ? '이 조건에서 탐지된 위협이 없습니다' : '탐지된 위협이 없습니다'}
          onRetry={refetch}
        >
          <ScrollArea label="위협 목록">
            <div className="min-w-[980px]">
              <div
                className={`${rowGrid} pt-2 pb-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
              >
                <span>위협</span>
                <span>MITRE</span>
                <span>호스트</span>
                <span>목적지</span>
                <span>심각도</span>
                <span>상태</span>
                <span className="text-right">근거</span>
                <span className="text-right">탐지 시각</span>
              </div>
              {rows.map((row, i) => (
                <div
                  key={row.id}
                  className={`${rowGrid} items-center py-[10px] ${
                    i === rows.length - 1 ? '' : 'border-b border-line-2'
                  }`}
                >
                  {/* 한글 위협명 아래에 detector 룰 원문을 깐다. 조사할 때 실제로 대조하는 값은 ruleId 다. */}
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-ink">{row.threatName}</span>
                    <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                      {row.ruleId}
                    </span>
                  </span>
                  <span className="font-mono text-[11.5px] text-mid">{row.mitre ?? '—'}</span>
                  <span className="font-mono text-[12px] text-mid">{row.host}</span>
                  <Destination domain={row.domain} destIp={row.destIp} />
                  <Badge severity={severityTone(row.severity)} className="justify-self-start">
                    {severityLabel(row.severity)}
                  </Badge>
                  <Badge severity={statusTone(row.status)} className="justify-self-start">
                    {statusLabel(row.status)}
                  </Badge>
                  <span className="text-right font-mono text-[12px] text-mid">
                    {row.matched.length}
                  </span>
                  <span className="text-right font-mono text-[11px] text-faint">
                    {absoluteTime(row.ts)}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </AsyncState>
      </Card>
    </div>
  )
}

export default Threats
