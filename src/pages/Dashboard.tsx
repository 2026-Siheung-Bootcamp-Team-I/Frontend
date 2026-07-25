import { lazy, Suspense, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import type { Alert, HostSummary } from '@/api/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import AttackPath from '@/components/ui/AttackPath'
import AsyncState from '@/components/ui/AsyncState'
import ScrollArea from '@/components/ui/ScrollArea'
import TopThreats from '@/components/ui/TopThreats'
import TriageActions from '@/components/ui/TriageActions'
import { useApi } from '@/hooks/useApi'
import { absoluteTime, daysAgo, severityLabel, severityTone } from '@/lib/format'
import { toAttackSteps } from '@/lib/lineagePath'
import { useAlertsStore } from '@/store/alerts'
import { useAuthStore } from '@/store/auth'

// 위협(2줄) / 호스트 / 심각도 / 탐지 시각
const rowGrid = 'grid grid-cols-[1fr_124px_84px_142px] gap-[12px]'

// echarts 를 쓰는 차트는 지연 경계로 두어 별도 청크에서 온디맨드로 로드한다.
const ThreatTrendChart = lazy(() => import('@/components/ui/ThreatTrendChart'))

const chartFallback = (
  <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
    <div className="flex items-center justify-center h-[292px] text-[13px] text-faint">
      불러오는 중
    </div>
  </Card>
)

function Dashboard() {
  // 트리아지가 일어나면 알림 관련 조회를 다시 돈다.
  const alertsVersion = useAlertsStore((s) => s.version)
  // 로그인 전이면 api 가 데모 데이터를 돌려준다(src/api/demo.ts). 배너로 그 사실을 알린다.
  const demo = useAuthStore((s) => s.token === null)
  const open = useApi(() => api.alerts({ status: 'open', limit: 1000 }), [alertsVersion])
  const recent = useApi(() => api.alerts({ limit: 4 }), [alertsVersion])
  const week = useApi(() => api.alertSummary({ from: daysAgo(7) }))
  const prevWeek = useApi(() => api.alertSummary({ from: daysAgo(14), to: daysAgo(7) }))
  const hosts = useApi(() => api.hostSummary())

  const openAlerts = open.data ?? []
  const openCritical = openAlerts.filter((a) => a.severity === 'CRITICAL').length
  // 공격 경로는 가장 최근의 미판단 위협 하나를 대표로 보여준다(목록은 최신순).
  const featured = openAlerts[0] ?? null

  /*
    서버는 정상인데 등록된 호스트가 하나도 없으면 아직 에이전트가 아무것도 보내지 않은 상태다.
    요청 실패와 달리 사용자가 할 일이 "에이전트 설치"로 분명하므로 안내 화면으로 대체한다.
  */
  if (!demo && !hosts.loading && !hosts.error && hosts.data?.total === 0) {
    return (
      <NotCollected
        onRetry={() => {
          hosts.refetch()
          open.refetch()
          recent.refetch()
          week.refetch()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {demo && <DemoBanner />}
      {/* stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
        <div className="bg-surface border border-line rounded-md p-[18px]">
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
        <div className="bg-surface border border-line rounded-md p-[18px]">
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
      {/*
        2열은 xl 부터. lg(1024) 에서는 사이드바 224px 이 함께 나타나 콘텐츠가 744px 로 줄어드는데,
        그 폭을 둘로 쪼개면 어느 쪽도 충분하지 않다.
        fr 은 minmax(auto, fr) 이라 콘텐츠가 트랙을 밀어내므로 minmax(0, fr) 로 고정한다.
      */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-[20px] items-start">
        {/* LEFT column */}
        <div className="flex flex-col gap-[20px]">
          <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
            <AsyncState
              loading={open.loading}
              error={open.error}
              empty={featured === null}
              emptyText="미판단 위협이 없습니다"
              onRetry={open.refetch}
            >
              {featured && <FeaturedPath alert={featured} />}
            </AsyncState>
          </Card>

          <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
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
              <ScrollArea label="최근 탐지된 위협 목록">
                <div className="min-w-[620px]">
                  <div
                    className={`${rowGrid} py-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
                  >
                    <span>위협</span>
                    <span>호스트</span>
                    <span>심각도</span>
                    <span className="text-right">탐지 시각</span>
                  </div>
                  {(recent.data ?? []).map((row, i, all) => (
                    <div
                      key={row.id}
                      className={`${rowGrid} items-center py-[10px] ${
                        i === all.length - 1 ? '' : 'border-b border-line-2'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-ink">
                          {row.threatName}
                        </span>
                        <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                          {row.ruleId}
                        </span>
                      </span>
                      <span className="font-mono text-[12px] text-mid">{row.host}</span>
                      <Badge severity={severityTone(row.severity)} className="justify-self-start">
                        {severityLabel(row.severity)}
                      </Badge>
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

        {/* RIGHT column */}
        <div className="flex flex-col gap-[20px]">
          <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
            <div className="text-[14px] font-bold text-ink mb-[18px]">엔드포인트 상태</div>
            <AsyncState loading={hosts.loading} error={hosts.error} onRetry={hosts.refetch}>
              {hosts.data && <HostDonut summary={hosts.data} />}
            </AsyncState>
          </Card>

          <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
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

      {/* 위협 탐지 추이 (full-width) */}
      <Suspense fallback={chartFallback}>
        <ThreatTrendChart />
      </Suspense>
    </div>
  )
}

/** 로그인 전에 보이는 화면이 실제 데이터가 아님을 알린다. */
function DemoBanner() {
  return (
    <div className="flex flex-col gap-[10px] sm:flex-row sm:items-center sm:gap-[16px] px-[16px] py-[14px] bg-panel-2 border border-line-2 rounded-md">
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold text-ink">데모 데이터를 보고 있습니다</div>
        <div className="text-[12.5px] text-mid mt-[3px] leading-[1.5]">
          로그인하면 내 조직의 실제 탐지 결과로 바뀝니다.
        </div>
      </div>
      <Link
        to="/login"
        className="text-center whitespace-nowrap text-[13px] font-semibold !text-white bg-accent px-[18px] py-[10px] rounded-sm"
      >
        로그인
      </Link>
    </div>
  )
}

/** 로그인은 됐지만 에이전트가 아직 아무 데이터도 보내지 않은 상태. */
function NotCollected({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="px-[20px] py-[40px] sm:px-[32px] sm:py-[56px]">
      <div className="flex flex-col items-center text-center gap-[10px] max-w-[440px] mx-auto">
        <span className="text-[15px] font-bold text-ink">아직 수집 전입니다</span>
        <p className="text-[13.5px] text-mid leading-[1.6]">
          연결된 엔드포인트가 없습니다. 감시할 장비에 EDRdog 에이전트를 설치하고 실행하면 수집이
          시작됩니다. 첫 이벤트가 들어오면 이 화면이 채워집니다.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-[8px] text-[13px] font-semibold text-ink-2 border border-line bg-surface px-[18px] py-[10px] rounded-sm cursor-pointer font-sans"
        >
          다시 확인
        </button>
      </div>
    </Card>
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

function FeaturedPath({ alert }: { alert: Alert }) {
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
      <TriageActions alert={alert} detailTo={`/sequence?alert=${encodeURIComponent(alert.id)}`} />
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
    <div className="flex items-center gap-[16px] sm:gap-[22px]">
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
      <div className="flex flex-col gap-[11px] flex-1 min-w-0">
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
