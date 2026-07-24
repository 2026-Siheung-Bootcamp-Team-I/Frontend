import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import type { Alert, HostSummary } from '@/api/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import AttackPath from '@/components/ui/AttackPath'
import AsyncState from '@/components/ui/AsyncState'
import TopThreats from '@/components/ui/TopThreats'
import TriageActions from '@/components/ui/TriageActions'
import { useApi } from '@/hooks/useApi'
import { daysAgo, relativeTime, severityColors, severityLabel, severityTone } from '@/lib/format'
import { toAttackSteps } from '@/lib/lineagePath'

const rowGrid = 'grid grid-cols-[14px_1fr_130px_88px_64px] gap-[12px]'

function Dashboard() {
  const open = useApi(() => api.alerts({ status: 'open', limit: 1000 }))
  const recent = useApi(() => api.alerts({ limit: 4 }))
  const week = useApi(() => api.alertSummary({ from: daysAgo(7) }))
  const prevWeek = useApi(() => api.alertSummary({ from: daysAgo(14), to: daysAgo(7) }))
  const hosts = useApi(() => api.hostSummary())

  const openAlerts = open.data ?? []
  const openCritical = openAlerts.filter((a) => a.severity === 'CRITICAL').length
  // 공격 경로는 가장 최근의 미판단 위협 하나를 대표로 보여준다(목록은 최신순).
  const featured = openAlerts[0] ?? null

  function reloadAlerts() {
    open.refetch()
    recent.refetch()
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-[16px]">
        <div className="bg-surface border border-line rounded-[12px] p-[18px] shadow-[var(--shadow-1)] border-l-[3px] border-l-crit">
          <div className="text-[12px] text-faint">미판단 위협</div>
          <AsyncState loading={open.loading} error={open.error} onRetry={open.refetch}>
            <div className="flex items-center gap-[9px] mt-[10px]">
              <span className="font-mono text-[28px] font-medium text-ink tabular-nums">
                {openAlerts.length}
              </span>
              {openCritical > 0 && (
                <Badge severity="crit" className="!py-[2px] !px-2">
                  심각 {openCritical}
                </Badge>
              )}
            </div>
          </AsyncState>
        </div>
        <div className="bg-surface border border-line rounded-[12px] p-[18px] shadow-[var(--shadow-1)]">
          <div className="text-[12px] text-faint">이번 주 탐지</div>
          <AsyncState loading={week.loading} error={week.error} onRetry={week.refetch}>
            <div className="flex items-baseline gap-[5px] mt-[10px]">
              <span className="font-mono text-[28px] font-medium text-ink tabular-nums">
                {week.data?.total ?? 0}
              </span>
              <WeekDelta current={week.data?.total} previous={prevWeek.data?.total} />
            </div>
          </AsyncState>
        </div>
      </div>

      {/* main grid */}
      <div className="grid grid-cols-[1.7fr_1fr] gap-[20px] items-start">
        {/* LEFT column */}
        <div className="flex flex-col gap-[20px]">
          <Card className="px-[24px] py-[22px]">
            <AsyncState
              loading={open.loading}
              error={open.error}
              empty={featured === null}
              emptyText="미판단 위협이 없습니다"
              onRetry={open.refetch}
            >
              {featured && <FeaturedPath alert={featured} onTriaged={reloadAlerts} />}
            </AsyncState>
          </Card>

          <Card className="px-[24px] py-[22px]">
            <div className="flex justify-between items-center mb-[14px]">
              <span className="text-[14px] font-bold text-ink">최근 탐지된 위협</span>
              <Link to="/threats" className="text-[12px] font-semibold !text-accent">
                전체 보기 →
              </Link>
            </div>
            <AsyncState
              loading={recent.loading}
              error={recent.error}
              empty={(recent.data ?? []).length === 0}
              emptyText="탐지된 위협이 없습니다"
              onRetry={recent.refetch}
            >
              <div
                className={`${rowGrid} py-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
              >
                <span />
                <span>위협</span>
                <span>호스트</span>
                <span>심각도</span>
                <span className="text-right">시간</span>
              </div>
              {(recent.data ?? []).map((row, i, all) => {
                const color = severityColors[severityTone(row.severity)]
                return (
                  <div
                    key={row.id}
                    className={`${rowGrid} items-center py-[12px] pl-[12px] border-l-[3px] ${
                      i === all.length - 1 ? '' : 'border-b border-line-2'
                    }`}
                    style={{ borderLeftColor: color }}
                  >
                    <span className="w-[7px] h-[7px] rounded-full" style={{ background: color }} />
                    <span className="text-[13.5px] text-ink">{row.threatName}</span>
                    <span className="font-mono text-[12px] text-mid">{row.host}</span>
                    <Badge severity={severityTone(row.severity)} className="justify-self-start">
                      {severityLabel(row.severity)}
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

        {/* RIGHT column */}
        <div className="flex flex-col gap-[20px]">
          <Card className="px-[24px] py-[22px]">
            <div className="text-[14px] font-bold text-ink mb-[18px]">엔드포인트 상태</div>
            <AsyncState loading={hosts.loading} error={hosts.error} onRetry={hosts.refetch}>
              {hosts.data && <HostDonut summary={hosts.data} />}
            </AsyncState>
          </Card>

          <Card className="px-[24px] py-[22px]">
            <div className="text-[14px] font-bold text-ink mb-[18px]">위협 유형 TOP 5</div>
            <AsyncState
              loading={week.loading}
              error={week.error}
              empty={(week.data?.topThreats ?? []).length === 0}
              emptyText="집계할 위협이 없습니다"
              onRetry={week.refetch}
            >
              {week.data && <TopThreats threats={week.data.topThreats} total={week.data.total} />}
            </AsyncState>
          </Card>
        </div>
      </div>
    </div>
  )
}

/** 지난주 대비 증감률. 지난주가 0이면 비교할 기준이 없어 표시하지 않는다. */
function WeekDelta({ current, previous }: { current?: number; previous?: number }) {
  if (current === undefined || !previous) return null
  const delta = Math.round(((current - previous) / previous) * 100)
  return (
    <span className={`text-[12px] ${delta >= 0 ? 'text-crit' : 'text-good'}`}>
      {delta >= 0 ? '+' : ''}
      {delta}%
    </span>
  )
}

function FeaturedPath({ alert, onTriaged }: { alert: Alert; onTriaged: () => void }) {
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

function HostDonut({ summary }: { summary: HostSummary }) {
  const total = summary.total
  const healthyEnd = total > 0 ? (summary.healthy / total) * 100 : 0
  const warningEnd = total > 0 ? healthyEnd + (summary.warning / total) * 100 : 0

  const legend = [
    { label: '정상', value: summary.healthy, color: 'bg-good' },
    { label: '주의', value: summary.warning, color: 'bg-high' },
    { label: '위험', value: summary.critical, color: 'bg-crit' },
  ]

  return (
    <div className="flex items-center gap-[22px]">
      <div
        className="relative w-[104px] h-[104px] flex-shrink-0 rounded-full"
        style={{
          background:
            total > 0
              ? `conic-gradient(var(--good) 0 ${healthyEnd}%, var(--high) ${healthyEnd}% ${warningEnd}%, var(--crit) ${warningEnd}% 100%)`
              : 'var(--panel)',
        }}
      >
        <div
          className="absolute inset-[-5px] rounded-full"
          style={
            {
              background:
                'conic-gradient(from 0deg, transparent 70%, var(--accent) 93%, transparent 100%)',
              WebkitMask:
                'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
              animation: 'edrRingSpin 5s linear infinite',
            } as CSSProperties
          }
        />
        <div className="absolute inset-[13px] rounded-full bg-surface flex flex-col items-center justify-center">
          <span className="font-mono text-[22px] font-medium text-ink tabular-nums leading-none">
            {total}
          </span>
          <span className="text-[10px] text-faint mt-[2px]">총 엔드포인트</span>
        </div>
      </div>
      <div className="flex flex-col gap-[11px] flex-1">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-[13px] text-ink-2 whitespace-nowrap">{item.label}</span>
            <span className="font-mono text-[13px] text-ink ml-auto tabular-nums">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
