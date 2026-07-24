import { useMemo } from 'react'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import worldTopo from 'world-atlas/countries-110m.json'
import { api } from '@/api'
import type { AlertSeverity, GeoThreat } from '@/api/types'
import Card from '@/components/ui/Card'
import AsyncState from '@/components/ui/AsyncState'
import { useApi } from '@/hooks/useApi'
import { relativeTime, severityLabel } from '@/lib/format'
import { useThemeStore } from '@/store/theme'

// 세계지도는 world-atlas(topojson) 를 오프라인으로 조달해 한 번만 등록한다.
const worldGeo = feature(
  worldTopo as unknown as Topology,
  (worldTopo as unknown as Topology).objects.countries,
)
echarts.registerMap('world', worldGeo as never)

// 모든 연결의 출발지(감시 조직). 서울.
const ORIGIN: [number, number] = [126.978, 37.566]

type Palette = {
  area: string
  border: string
  text: string
  crit: string
  high: string
  mid: string
  accent: string
}

const palettes: Record<'dark' | 'light', Palette> = {
  dark: {
    area: '#1C2735',
    border: '#3C4B5E',
    text: '#C4CDD6',
    crit: '#F0645C',
    high: '#F2CB45',
    mid: '#93A0AD',
    accent: '#5B78FF',
  },
  light: {
    area: '#E7ECF3',
    border: '#B9C4D2',
    text: '#35404C',
    crit: '#E5484D',
    high: '#EAB308',
    mid: '#545E6B',
    accent: '#2B4DE0',
  },
}

function severityColor(severity: AlertSeverity, p: Palette): string {
  if (severity === 'CRITICAL') return p.crit
  if (severity === 'HIGH') return p.high
  return p.mid
}

function buildOption(threats: GeoThreat[], p: Palette): echarts.EChartsOption {
  const lines = threats.map((t) => ({
    coords: [ORIGIN, [t.lng, t.lat]],
    lineStyle: { color: severityColor(t.severity, p) },
  }))

  const scatter = threats.map((t) => ({
    name: t.country,
    value: [t.lng, t.lat, t.remoteIp],
    itemStyle: { color: severityColor(t.severity, p) },
  }))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: p.area,
      borderColor: p.border,
      textStyle: { color: p.text, fontSize: 12 },
    },
    geo: {
      map: 'world',
      roam: false,
      silent: true,
      itemStyle: {
        areaColor: p.area,
        borderColor: p.border,
        borderWidth: 1,
      },
      emphasis: { disabled: true },
      label: { show: false },
    },
    series: [
      {
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 1,
        effect: {
          show: true,
          period: 4,
          trailLength: 0.5,
          symbol: 'arrow',
          symbolSize: 8,
        },
        lineStyle: { width: 2.2, opacity: 0.95, curveness: 0.35 },
        data: lines,
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        rippleEffect: { brushType: 'stroke', scale: 4 },
        symbolSize: 11,
        data: scatter,
        tooltip: {
          formatter: (params: { name?: string; value?: unknown }) => {
            const value = Array.isArray(params.value) ? params.value : []
            return `${params.name ?? ''}<br/>${value[2] ?? ''}`
          },
        },
      },
      {
        // 출발지 마커
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        symbolSize: 10,
        itemStyle: { color: p.accent },
        data: [{ name: '서울 (감시 조직)', value: ORIGIN }],
      },
    ],
  }
}

function ThreatMap() {
  const theme = useThemeStore((s) => s.theme)
  const geo = useApi(() => api.geoThreats())
  const threats = useMemo(() => geo.data ?? [], [geo.data])
  const p = palettes[theme]

  const option = useMemo(() => buildOption(threats, p), [threats, p])

  const byCountry = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of threats) counts.set(t.country, (counts.get(t.country) ?? 0) + 1)
    return [...counts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
  }, [threats])

  const recent = useMemo(() => [...threats].sort((a, b) => b.ts - a.ts).slice(0, 5), [threats])
  const maxCount = byCountry[0]?.count ?? 0

  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="text-[18px] sm:text-[20px] font-bold text-ink tracking-[-0.01em]">
          위협 지도
        </div>
        <div className="mt-[6px] text-[13px] text-faint">
          악성 외부 연결(C2)의 목적지를 지도로 봅니다.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-[20px] items-start">
        <Card className="px-[10px] py-[10px] sm:px-[14px] sm:py-[14px]">
          <AsyncState
            loading={geo.loading}
            error={geo.error}
            empty={threats.length === 0}
            emptyText="외부 연결 위협이 없습니다"
            onRetry={geo.refetch}
          >
            <ReactECharts
              option={option}
              notMerge
              style={{ height: 560, width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </AsyncState>
        </Card>

        <div className="flex flex-col gap-[20px]">
          <Card className="px-[16px] py-[18px] sm:px-[20px] sm:py-[20px]">
            <div className="text-[14px] font-bold text-ink mb-[16px]">국가별 위협 건수</div>
            <AsyncState
              loading={geo.loading}
              error={geo.error}
              empty={byCountry.length === 0}
              emptyText="집계할 연결이 없습니다"
              onRetry={geo.refetch}
            >
              <div className="flex flex-col gap-[13px]">
                {byCountry.map((row) => (
                  <div key={row.country} className="flex flex-col gap-[6px]">
                    <div className="flex justify-between gap-[10px] text-[13px]">
                      <span className="text-ink-2 truncate">{row.country}</span>
                      <span className="font-mono tabular-nums text-ink flex-shrink-0">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-[6px] rounded-full bg-panel overflow-hidden">
                      <div
                        className="h-full rounded-full bg-crit"
                        style={{ width: `${maxCount > 0 ? (row.count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </AsyncState>
          </Card>

          <Card className="px-[16px] py-[18px] sm:px-[20px] sm:py-[20px]">
            <div className="text-[14px] font-bold text-ink mb-[16px]">최근 외부 연결</div>
            <AsyncState
              loading={geo.loading}
              error={geo.error}
              empty={recent.length === 0}
              emptyText="최근 연결이 없습니다"
              onRetry={geo.refetch}
            >
              <div className="flex flex-col gap-[14px]">
                {recent.map((t) => (
                  <div key={t.id} className="flex flex-col gap-[3px]">
                    <div className="flex justify-between items-baseline gap-[10px]">
                      <span className="font-mono text-[12px] text-mid truncate">{t.host}</span>
                      <span className="font-mono text-[11px] text-faint flex-shrink-0">
                        {relativeTime(t.ts)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline gap-[10px]">
                      <span className="text-[13px] text-ink truncate">
                        {t.country}
                        <span className="text-faint"> · {severityLabel(t.severity)}</span>
                      </span>
                      <span className="font-mono text-[11px] text-faint flex-shrink-0">
                        {t.remoteIp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </AsyncState>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ThreatMap
