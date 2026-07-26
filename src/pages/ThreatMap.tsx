import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import worldTopo from 'world-atlas/countries-110m.json'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import type { GeoDestination } from '@/api/types'
import Card from '@/components/ui/Card'
import AsyncState from '@/components/ui/AsyncState'
import { useApi } from '@/hooks/useApi'
import { useThemeStore } from '@/store/theme'

/**
 * 지도 가운데에 둘 경도. 한국(127°E)에서 보는 지도라 태평양 중심으로 돌린다.
 * 정확히 127 로 두면 이음매(중심에서 180° 떨어진 경도)가 53°W 라 브라질이 좌우로 잘린다.
 * 150 이면 이음매가 대서양 30°W 로 떨어져 아메리카·아프리카가 온전하다(그린란드만 나뉜다).
 */
const CENTER_LNG = 150

/** 경도를 지도 중심 기준으로 옮겨 [-180,180] 안에 넣는다. 마커·연결선 좌표에 쓴다. */
function rotate(lng: number): number {
  return ((lng - CENTER_LNG + 540) % 360) - 180
}

type Ring = number[][]

/** 링의 경도에서 ±360 점프를 펴서 연속된 값으로 만든다. 자르려면 먼저 이어져 있어야 한다. */
function unwrap(ring: Ring): Ring {
  const out: Ring = [[...ring[0]]]
  for (let i = 1; i < ring.length; i++) {
    const prev = out[i - 1][0]
    let lng = ring[i][0]
    while (lng - prev > 180) lng -= 360
    while (prev - lng > 180) lng += 360
    out.push([lng, ring[i][1]])
  }
  return out
}

/** x = edge 를 기준으로 한쪽 반평면만 남긴다(Sutherland–Hodgman). */
function clip(ring: Ring, edge: number, keepLeft: boolean): Ring {
  const inside = (p: number[]) => (keepLeft ? p[0] <= edge : p[0] >= edge)
  const out: Ring = []
  for (let i = 0; i < ring.length; i++) {
    const cur = ring[i]
    const prev = ring[(i - 1 + ring.length) % ring.length]
    if (inside(cur) !== inside(prev)) {
      const t = (edge - prev[0]) / (cur[0] - prev[0])
      out.push([edge, prev[1] + t * (cur[1] - prev[1])])
    }
    if (inside(cur)) out.push(cur)
  }
  return out
}

/** 펴면서 [-180,180] 밖으로 나간 조각을 제자리로 되돌리고 링을 닫는다. */
function normalize(ring: Ring): Ring {
  const xs = ring.map((p) => p[0])
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2
  const shift = -360 * Math.round(mid / 360)
  const moved = shift === 0 ? ring : ring.map(([x, y]) => [x + shift, y])
  return [...moved, [...moved[0]]]
}

/** 링 하나를 날짜변경선에서 잘라 [왼쪽, 오른쪽] 으로 준다. 안 걸치면 한쪽만 채운다. */
function splitRing(ring: Ring): [Ring | null, Ring | null] {
  // 닫는 점은 클리핑에서 중복되므로 뗀다. 편 뒤에 중심만큼 옮겨야 이음매가 제자리에 생긴다.
  const u = unwrap(ring.slice(0, -1)).map(([x, y]) => [x - CENTER_LNG, y])
  const xs = u.map((p) => p[0])
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  // 편 좌표계에서 날짜변경선은 180 + 360n. 링 폭이 360 이하라 걸쳐도 한 줄뿐이다.
  const edge = 180 + 360 * (Math.floor((lo - 180) / 360) + 1)
  if (edge <= lo || edge >= hi) return [normalize(u), null]
  const left = clip(u, edge, true)
  const right = clip(u, edge, false)
  return [left.length >= 3 ? normalize(left) : null, right.length >= 3 ? normalize(right) : null]
}

/**
 * world-atlas 110m 은 러시아·피지·남극처럼 날짜변경선을 넘는 나라를 폴리곤 하나에 담아 둔다.
 * echarts geo 는 경위도를 평면에 그대로 찍으므로 179°→-179° 로 건너뛰는 변이 지도를 가로지르는
 * 띠로 그려진다. 등록 전에 ±180° 에서 잘라 두 폴리곤으로 나눈다.
 *
 * 구멍(내부 링)은 왼쪽 조각에 붙인다. 지금 데이터에서 날짜변경선을 넘는 폴리곤은 모두 구멍이
 * 없어 문제가 되지 않는다.
 */
function splitPolygon(poly: Ring[]): Ring[][] {
  const left: Ring[] = []
  const right: Ring[] = []
  for (const ring of poly) {
    const [l, r] = splitRing(ring)
    if (l) left.push(l)
    if (r) right.push(r)
  }
  return [left, right].filter((rings) => rings.length > 0)
}

type PolyGeometry =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] }

/** 나라 하나를 중심 경도 기준으로 돌리고 이음매에서 잘라 놓는다. */
function recenter(geometry: PolyGeometry): PolyGeometry {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return { type: 'MultiPolygon', coordinates: polys.flatMap(splitPolygon) }
}

// 세계지도는 world-atlas(topojson) 를 오프라인으로 조달해 한 번만 등록한다.
const worldGeo = feature(
  worldTopo as unknown as Topology,
  (worldTopo as unknown as Topology).objects.countries,
) as unknown as { features: { geometry: PolyGeometry }[] }

for (const f of worldGeo.features) f.geometry = recenter(f.geometry)

echarts.registerMap('world', worldGeo as never)

// 모든 연결의 출발지(감시 조직). 서울. 지도와 같은 기준으로 돌려 놓는다.
const ORIGIN: [number, number] = [rotate(126.978), 37.566]

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
    coords: [ORIGIN, [rotate(d.lng), d.lat]],
    lineStyle: { color: countColor(d.count, max, p) },
  }))

  const scatter = dests.map((d) => ({
    name: d.country,
    value: [rotate(d.lng), d.lat, d.count],
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
      // 작은 나라(한국·싱가포르 등)를 읽을 수 있게 확대만 허용. 드래그 이동은 막는다.
      roam: 'scale',
      scaleLimit: { min: 1, max: 6 },
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

/**
 * 휠 클릭 드래그로 지도를 이동시킨다.
 * roam 이 'scale' 이라 좌클릭 드래그는 막혀 있는데, 확대한 뒤 다른 지역을 보려면 이동이 필요하다.
 */
function useMiddleDragPan(
  box: React.RefObject<HTMLDivElement | null>,
  chart: React.RefObject<ReactECharts | null>,
  ready: boolean,
) {
  useEffect(() => {
    const dom = box.current
    if (!dom) return

    let last: { x: number; y: number } | null = null

    const down = (e: MouseEvent) => {
      if (e.button !== 1) return
      e.preventDefault() // 크롬 기본 자동 스크롤 방지
      last = { x: e.clientX, y: e.clientY }
    }
    const move = (e: MouseEvent) => {
      if (!last) return
      // 차트는 다시 만들어질 수 있으므로 이벤트마다 현재 인스턴스를 집는다.
      chart.current?.getEchartsInstance()?.dispatchAction({
        type: 'geoRoam',
        componentType: 'geo',
        geoIndex: 0,
        dx: e.clientX - last.x,
        dy: e.clientY - last.y,
      })
      last = { x: e.clientX, y: e.clientY }
    }
    const up = () => {
      last = null
    }

    dom.addEventListener('mousedown', down)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      dom.removeEventListener('mousedown', down)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [box, chart, ready])
}

function ThreatMap() {
  const theme = useThemeStore((s) => s.theme)
  const geo = useApi(() => api.geoDestinations())
  const p = palettes[theme]

  // 백엔드가 정렬을 보장하지 않으므로 건수 내림차순으로 다시 세운다.
  const byCountry = useMemo(
    () => [...(geo.data ?? [])].sort((a, b) => b.count - a.count),
    [geo.data],
  )
  /*
    비어 있어도 예시 집계로 채우지 않는다. 비로그인 데모는 demoApi 가 실제로 값을 주므로
    폴백이 걸리는 건 "로그인했는데 아직 수집 전" 인 경우뿐인데, 거기서 남의 나라 탐지 건수를
    보여주면 자기 조직 데이터로 오해하고 정작 필요한 안내(에이전트 연결)가 가려진다.
  */
  const empty = byCountry.length === 0

  const option = useMemo(() => buildOption(byCountry, p), [byCountry, p])

  const boxRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReactECharts | null>(null)
  useMiddleDragPan(boxRef, chartRef, !empty)

  // 확대·이동한 지도를 처음 배율과 위치로 되돌린다. 멀리 끌고 간 뒤 돌아올 방법이 이것뿐이다.
  const resetView = () =>
    chartRef.current?.getEchartsInstance()?.setOption({ geo: { center: null, zoom: 1 } })

  const maxCount = byCountry[0]?.count ?? 0
  const totalCount = useMemo(() => byCountry.reduce((sum, d) => sum + d.count, 0), [byCountry])

  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="text-[18px] sm:text-[20px] font-bold text-ink tracking-[-0.01em]">
          위협 지도
        </div>
        <div className="mt-[6px] text-[13px] text-faint">
          최근 24시간 외부 연결의 목적지를 국가별로 봅니다. 사설 IP 는 제외됩니다.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-[20px] items-start">
        <Card className="px-[10px] py-[10px] sm:px-[14px] sm:py-[14px]">
          <AsyncState loading={geo.loading} error={geo.error} onRetry={geo.refetch}>
            {empty ? (
              <div className="flex flex-col items-center justify-center gap-[8px] py-[140px] px-[20px] text-center">
                <div className="text-[14px] font-semibold text-ink-2">
                  아직 수집된 외부 연결이 없습니다
                </div>
                <div className="text-[13px] leading-[1.6] text-faint max-w-[42ch]">
                  엔드포인트를 연결하면 외부로 나간 연결의 목적지가 여기에 그려집니다. 서버에 GeoIP
                  DB 가 없으면 연결이 쌓여도 비어 있습니다.
                </div>
                <Link
                  to="/onboarding"
                  className="mt-[8px] text-[12.5px] font-semibold !text-ink-2 border border-line bg-surface px-[14px] py-[8px] rounded-sm"
                >
                  수집 알림 연동
                </Link>
              </div>
            ) : (
              <div ref={boxRef} className="relative">
                <button
                  type="button"
                  onClick={resetView}
                  className="absolute top-[6px] right-[6px] z-[1] text-[12px] font-semibold text-ink-2 border border-line bg-surface px-[10px] py-[5px] rounded-sm cursor-pointer font-sans"
                >
                  원위치
                </button>
                <ReactECharts
                  ref={chartRef}
                  option={option}
                  notMerge
                  style={{ height: 560, width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </div>
            )}
          </AsyncState>
        </Card>

        <div className="flex flex-col gap-[20px]">
          <Card className="px-[16px] py-[18px] sm:px-[20px] sm:py-[20px]">
            <div className="text-[14px] font-bold text-ink mb-[16px]">국가별 연결 건수</div>
            <AsyncState
              loading={geo.loading}
              error={geo.error}
              empty={empty}
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
            <AsyncState
              loading={geo.loading}
              error={geo.error}
              empty={empty}
              emptyText="집계할 연결이 없습니다"
              onRetry={geo.refetch}
            >
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
