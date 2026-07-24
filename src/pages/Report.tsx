import { useMemo } from 'react'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import { api } from '@/api'
import type { Alert } from '@/api/types'
import Card from '@/components/ui/Card'
import AsyncState from '@/components/ui/AsyncState'
import TopThreats from '@/components/ui/TopThreats'
import { useApi } from '@/hooks/useApi'
import { daysAgo, percentOf } from '@/lib/format'
import { useThemeStore } from '@/store/theme'

/** collector 가 붙이는 이벤트 type. 미등록 값은 원문 그대로 보여준다. */
const eventTypeLabels: Record<string, string> = {
  process: '프로세스 실행',
  network: '네트워크 연결',
  file: '파일 생성·수정',
  script: '스크립트 실행',
}

function Report() {
  const week = useApi(() => api.alertSummary({ from: daysAgo(7) }))
  const open = useApi(() => api.alerts({ status: 'open', limit: 1000 }))
  const events = useApi(() => api.eventSummary({ from: daysAgo(1) }))
  const trend = useApi(() => api.alerts({ limit: 1000 }))

  const stats = [
    { label: '이번 주 탐지', value: week.data?.total, state: week, crit: false },
    { label: '미판단', value: open.data?.length, state: open, crit: true },
    { label: '심각', value: week.data?.severity.critical, state: week, crit: true },
  ]

  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="text-[18px] sm:text-[20px] font-bold text-ink tracking-[-0.01em]">
          요약 보기
        </div>
        <div className="mt-[6px] text-[13px] text-faint">
          에이전트가 관측한 이벤트와 탐지된 위협을 요약합니다.
        </div>
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`px-[16px] py-[18px] sm:px-[24px] sm:py-[22px] ${s.crit ? 'border-l-[3px] border-l-crit' : ''}`}
          >
            <div className="text-[12px] text-faint">{s.label}</div>
            <AsyncState loading={s.state.loading} error={s.state.error} onRetry={s.state.refetch}>
              <div className="flex items-baseline gap-[5px] mt-[10px]">
                <span className="font-mono text-[28px] font-medium text-ink tabular-nums">
                  {s.value ?? 0}
                </span>
                <span className="text-[12px] text-mid">건</span>
              </div>
            </AsyncState>
          </Card>
        ))}
      </div>

      <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
        <div className="flex justify-between items-center mb-[18px]">
          <span className="text-[14px] font-bold text-ink">위협 탐지 추이</span>
          <span className="text-[11.5px] text-faint">최근 7일</span>
        </div>
        <AsyncState
          loading={trend.loading}
          error={trend.error}
          empty={(trend.data ?? []).length === 0}
          emptyText="집계할 위협이 없습니다"
          onRetry={trend.refetch}
        >
          <TrendChart alerts={trend.data ?? []} />
        </AsyncState>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[20px] items-start">
        <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
          <div className="text-[14px] font-bold text-ink mb-[18px]">위협 유형 TOP 5</div>
          <AsyncState
            loading={week.loading}
            error={week.error}
            empty={(week.data?.topThreats ?? []).length === 0}
            emptyText="집계할 위협이 없습니다"
            onRetry={week.refetch}
          >
            {week.data && (
              <TopThreats threats={week.data.topThreats} total={week.data.total} animate={false} />
            )}
          </AsyncState>
        </Card>

        <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
          <div className="flex justify-between items-center mb-[18px]">
            <span className="text-[14px] font-bold text-ink">이벤트 유형별 건수</span>
            <span className="text-[11.5px] text-faint">최근 24시간</span>
          </div>
          <AsyncState
            loading={events.loading}
            error={events.error}
            empty={(events.data?.byType ?? []).length === 0}
            emptyText="수집된 이벤트가 없습니다"
            onRetry={events.refetch}
          >
            <EventCounts byType={events.data?.byType ?? []} />
          </AsyncState>
        </Card>
      </div>
    </div>
  )
}

const trendPalettes = {
  dark: { text: '#93A0AD', grid: '#222C38', accent: '#5B78FF', wash: 'rgba(91, 120, 255, 0.22)' },
  light: { text: '#545E6B', grid: '#E4E8EE', accent: '#2B4DE0', wash: 'rgba(43, 77, 224, 0.16)' },
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 전체 알림을 최근 7일 일 단위로 버킷 집계해 area 라인으로 그린다. */
function TrendChart({ alerts }: { alerts: Alert[] }) {
  const theme = useThemeStore((s) => s.theme)
  const p = trendPalettes[theme]

  const { labels, counts } = useMemo(() => {
    const now = Date.now()
    const start = new Date(now - 6 * DAY_MS)
    start.setHours(0, 0, 0, 0)
    const startMs = start.getTime()

    const buckets = new Array(7).fill(0) as number[]
    for (const a of alerts) {
      const i = Math.floor((a.ts - startMs) / DAY_MS)
      if (i >= 0 && i < 7) buckets[i] += 1
    }

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startMs + i * DAY_MS)
      return `${d.getMonth() + 1}/${d.getDate()}`
    })
    return { labels: days, counts: buckets }
  }, [alerts])

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme === 'dark' ? '#141C24' : '#FFFFFF',
      borderColor: p.grid,
      textStyle: { color: p.text, fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: { color: p.text, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: p.grid, type: 'dashed' } },
      axisLabel: { color: p.text, fontSize: 11 },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbolSize: 5,
        data: counts,
        lineStyle: { color: p.accent, width: 2 },
        itemStyle: { color: p.accent },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: p.wash },
            { offset: 1, color: 'rgba(0,0,0,0)' },
          ]),
        },
      },
    ],
  }

  return <ReactECharts option={option} notMerge style={{ height: 240, width: '100%' }} />
}

/** 막대 길이는 가장 많은 type 을 100%로 잡은 상대 비율. 백엔드가 cnt 내림차순으로 준다. */
function EventCounts({ byType }: { byType: { type: string; cnt: number | string }[] }) {
  const counts = byType.map((row) => ({ type: row.type, count: Number(row.cnt) }))
  const max = Math.max(...counts.map((c) => c.count))

  return (
    <div className="flex flex-col gap-[15px]">
      {counts.map((row) => (
        <div key={row.type} className="flex flex-col gap-[7px]">
          <div className="flex justify-between gap-[10px] text-[13px]">
            <span className="text-ink-2 truncate">{eventTypeLabels[row.type] ?? row.type}</span>
            <span className="font-mono tabular-nums text-ink flex-shrink-0">
              {row.count.toLocaleString()}
            </span>
          </div>
          <div className="h-[7px] rounded-full bg-panel overflow-hidden">
            <div
              className="h-full rounded-full bg-good"
              style={{ width: `${percentOf(row.count, max)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default Report
