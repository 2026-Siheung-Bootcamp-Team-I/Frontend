import { useMemo } from 'react'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import worldTopo from 'world-atlas/countries-110m.json'
import { api } from '@/api'
import { demoGeoDestinations } from '@/api/demo'
import type { GeoDestination } from '@/api/types'
import Card from '@/components/ui/Card'
import AsyncState from '@/components/ui/AsyncState'
import { useApi } from '@/hooks/useApi'
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

/**
 * 건수 비중으로 색을 정한다. 백엔드가 국가별 집계만 주고 심각도는 주지 않으므로
 * 상위 국가일수록 강한 색을 쓴다. 기준은 최다 국가 대비 비율.
 */
function countColor(count: number, max: number, p: Palette): string {
  if (max <= 0) return p.mid
  const ratio = count / max
  if (ratio >= 0.6) return p.crit
  if (ratio >= 0.25) return p.high
  return p.mid
}

/** 건수에 따라 마커 크기를 8~22px 로 키운다. */
function markerSize(count: number, max: number): number {
  if (max <= 0) return 8
  return 8 + Math.round((count / max) * 14)
}

function buildOption(dests: GeoDestination[], p: Palette): echarts.EChartsOption {
  const max = dests.reduce((m, d) => Math.max(m, d.count), 0)

  const lines = dests.map((d) => ({
    coords: [ORIGIN, [d.lng, d.lat]],
    lineStyle: { color: countColor(d.count, max, p) },
  }))

  const scatter = dests.map((d) => ({
    name: d.country,
    value: [d.lng, d.lat, d.count],
    symbolSize: markerSize(d.count, max),
    itemStyle: { color: countColor(d.count, max, p) },
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
        data: scatter,
        tooltip: {
          formatter: (params: { name?: string; value?: unknown }) => {
            const value = Array.isArray(params.value) ? params.value : []
            return `${params.name ?? ''}<br/>연결 ${value[2] ?? 0}건`
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
  const geo = useApi(() => api.geoDestinations())
  const p = palettes[theme]

  /**
   * 서버에 GeoIP DB 가 없으면 /events/geo 가 항상 빈 배열이라 지도가 통째로 비어 버린다.
   * 데모에서 빈 화면을 보이느니 예시 집계를 대신 그리고, 예시라는 사실을 화면에 밝힌다.
   */
  const sample = !geo.loading && geo.error === null && (geo.data?.length ?? 0) === 0

  // 백엔드가 정렬을 보장하지 않으므로 건수 내림차순으로 다시 세운다.
  const byCountry = useMemo(
    () => [...(sample ? demoGeoDestinations : (geo.data ?? []))].sort((a, b) => b.count - a.count),
    [geo.data, sample],
  )

  const option = useMemo(() => buildOption(byCountry, p), [byCountry, p])

  const maxCount = byCountry[0]?.count ?? 0
  const totalCount = useMemo(() => byCountry.reduce((sum, d) => sum + d.count, 0), [byCountry])

  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="flex items-center gap-[8px]">
          <div className="text-[18px] sm:text-[20px] font-bold text-ink tracking-[-0.01em]">
            위협 지도
          </div>
          {sample && (
            <span className="flex-shrink-0 text-[11px] font-semibold text-high bg-[var(--high-wash)] px-[8px] py-[2px] rounded-full whitespace-nowrap">
              예시 데이터
            </span>
          )}
        </div>
        <div className="mt-[6px] text-[13px] text-faint">
          {sample
            ? '서버에 집계된 외부 연결이 없어 예시 집계를 보여 줍니다. 실제 연결이 쌓이면 자동으로 바뀝니다.'
            : '최근 24시간 외부 연결의 목적지를 국가별로 봅니다. 사설 IP 는 제외됩니다.'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-[20px] items-start">
        <Card className="px-[10px] py-[10px] sm:px-[14px] sm:py-[14px]">
          {/* 비어 있으면 위에서 예시 집계로 채우므로 empty 상태는 나오지 않는다. */}
          <AsyncState loading={geo.loading} error={geo.error} onRetry={geo.refetch}>
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
            <div className="text-[14px] font-bold text-ink mb-[16px]">국가별 연결 건수</div>
            <AsyncState loading={geo.loading} error={geo.error} onRetry={geo.refetch}>
              <div className="flex flex-col gap-[13px]">
                {byCountry.map((row) => (
                  <div key={row.country} className="flex flex-col gap-[6px]">
                    <div className="flex justify-between gap-[10px] text-[13px]">
                      <span className="text-ink-2 truncate">{row.country}</span>
                      <span className="font-mono tabular-nums text-ink flex-shrink-0">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-[6px] rounded-xs bg-panel overflow-hidden">
                      <div
                        className="h-full rounded-xs bg-crit"
                        style={{ width: `${maxCount > 0 ? (row.count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </AsyncState>
          </Card>

          {/* 백엔드가 국가 집계만 주므로 개별 연결(호스트·IP·시각) 목록은 만들 수 없다. 요약으로 대체. */}
          <Card className="px-[16px] py-[18px] sm:px-[20px] sm:py-[20px]">
            <div className="text-[14px] font-bold text-ink mb-[16px]">요약</div>
            <AsyncState loading={geo.loading} error={geo.error} onRetry={geo.refetch}>
              <div className="flex flex-col gap-[14px]">
                <div className="flex justify-between items-baseline gap-[10px]">
                  <span className="text-[13px] text-ink-2">전체 연결</span>
                  <span className="font-mono tabular-nums text-[13px] text-ink flex-shrink-0">
                    {totalCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline gap-[10px]">
                  <span className="text-[13px] text-ink-2">관측 국가</span>
                  <span className="font-mono tabular-nums text-[13px] text-ink flex-shrink-0">
                    {byCountry.length}
                  </span>
                </div>
                <div className="flex justify-between items-baseline gap-[10px]">
                  <span className="text-[13px] text-ink-2">최다 목적지</span>
                  <span className="text-[13px] text-ink truncate">
                    {byCountry[0]?.country ?? '-'}
                  </span>
                </div>
              </div>
            </AsyncState>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ThreatMap
