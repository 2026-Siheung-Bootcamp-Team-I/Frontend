import { useMemo } from 'react'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import { api } from '@/api'
import type { Alert } from '@/api/types'
import Card from '@/components/ui/Card'
import AsyncState from '@/components/ui/AsyncState'
import { useApi } from '@/hooks/useApi'
import { useThemeStore } from '@/store/theme'

const trendPalettes = {
  dark: { text: '#93A0AD', grid: '#222C38', accent: '#5B78FF', wash: 'rgba(91, 120, 255, 0.22)' },
  light: { text: '#545E6B', grid: '#E4E8EE', accent: '#2B4DE0', wash: 'rgba(43, 77, 224, 0.16)' },
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 위협 탐지 추이 카드. 자체적으로 알림을 조회·집계해 어디서든 <ThreatTrendChart /> 로 쓴다. */
function ThreatTrendChart() {
  const trend = useApi(() => api.alerts({ limit: 1000 }))

  return (
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
  )
}

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

export default ThreatTrendChart
