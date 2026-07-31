import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/api'
import { usePagedList } from '@/hooks/usePagedList'
import type { Alert, AlertStatus } from '@/api/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import FilterChips from '@/components/ui/FilterChips'
import AsyncState from '@/components/ui/AsyncState'
import ActiveFilters, { type ActiveFilter } from '@/components/ui/ActiveFilters'
import ScrollArea from '@/components/ui/ScrollArea'
import { absoluteTime, severityLabel, severityTone, statusLabel, statusTone } from '@/lib/format'
import { useAlertsStore } from '@/store/alerts'

/** 한 쪽 크기. 더 볼 것은 아래 더 보기로 이어 붙인다. */
const LIMIT = 50

type Filter = 'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'confirmed' | 'false_positive'

/*
  칩은 서버에 넘겨서 거른다. 화면에서 거르면 받아 둔 쪽 안에서만 걸러져 실제와 다른 목록이 된다.
  같은 이유로 칩에 건수도 붙이지 않는다. 받은 만큼만 셀 수 있어 사실과 달라진다.
  서버 status 는 값 하나만 받으므로, 예전 처리됨 칩은 확정과 오탐으로 나눈다.
*/
const CHIPS: [Filter, string][] = [
  ['all', '전체'],
  ['CRITICAL', '심각'],
  ['HIGH', '높음'],
  ['MEDIUM', '보통'],
  ['confirmed', '확정'],
  ['false_positive', '오탐'],
]

function filterParams(filter: Filter): { severity?: string; status?: AlertStatus } {
  if (filter === 'all') return {}
  if (filter === 'confirmed' || filter === 'false_positive') return { status: filter }
  return { severity: filter }
}

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

  const { rows, total, hasMore, loading, loadingMore, error, moreError, loadMore, reload } =
    usePagedList<Alert>(
      (page) =>
        api.alertPage({
          host: host ?? undefined,
          domain: domain ?? undefined,
          destIp: destIp ?? undefined,
          ...filterParams(filter),
          // 다음 쪽부터는 서버가 잡은 구간을 그대로 되돌려준다.
          from: page.from,
          to: page.to,
          limit: page.limit,
          offset: page.offset,
          withTotal: page.withTotal,
        }),
      [alertsVersion, host, domain, destIp, filter],
      LIMIT,
    )

  const hasDestFilter = Boolean(host || domain || destIp)

  const activeFilters: ActiveFilter[] = [
    ...(host ? [{ label: '호스트', value: host, onClear: () => clearParam('host') }] : []),
    ...(domain ? [{ label: '도메인', value: domain, onClear: () => clearParam('domain') }] : []),
    ...(destIp ? [{ label: '목적지 IP', value: destIp, onClear: () => clearParam('destIp') }] : []),
  ]

  const chips = CHIPS.map(([value, label]) => ({
    label,
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
          onRetry={reload}
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
          {moreError && (
            <div className="mt-[12px] text-center text-[12.5px] text-crit">{moreError}</div>
          )}
          <div className="mt-[14px] flex items-center justify-between gap-[12px]">
            <span className="font-mono text-[12px] text-faint">
              {total === null ? `${rows.length}건` : `${rows.length} / ${total}건`}
            </span>
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="cursor-pointer rounded-sm border border-line bg-surface px-[14px] py-[8px] text-[12.5px] font-semibold text-ink-2 disabled:cursor-default disabled:text-faint"
              >
                {loadingMore ? '불러오는 중' : '더 보기'}
              </button>
            )}
          </div>
        </AsyncState>
      </Card>
    </div>
  )
}

export default Threats
