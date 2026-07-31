import { useEffect, useId, useMemo, useRef, useState } from 'react'
import ScrollArea from '@/components/ui/ScrollArea'
import { useThemeStore } from '@/store/theme'

/** 화면 색 토큰 이름. 그래프도 CSS 변수만 쓴다. */
export type GraphTone = 'ink' | 'mid' | 'faint' | 'accent' | 'high' | 'crit' | 'good'

export type GraphNode = {
  id: string
  /** 카드 위에 작게 대문자로 붙는 분류. 예: ENDPOINT, DESTINATION, DOMAIN GROUP */
  caption: string
  /** 카드 안 굵은 본문. */
  label: string
  /** 본문 아래 한 줄. 없으면 그리지 않는다. */
  sublabel?: string
  tone: GraphTone
  /** solid = 테두리를 tone 색으로 굵게(강조), outline = 기본 테두리, dashed = 점선 테두리 */
  variant?: 'solid' | 'outline' | 'dashed'
  tooltip?: string[]
}

export type GraphEdge = {
  from: string
  to: string
  /** 선 가운데에 박스로 뜬다. */
  label?: string
  /**
   * 선 모양. 확신의 세기가 다른 관계를 갈라 그리는 수단이라 boolean 하나로는 모자란다
   * (관측/추정/실시간 조회처럼 셋으로 갈리는 경우가 있다).
   */
  line?: 'solid' | 'dashed' | 'dotted'
  tone?: GraphTone
  /** 굵게. 눈이 먼저 가야 하는 관계에만. */
  emphasis?: boolean
  tooltip?: string[]
}

type RelationGraphProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  height?: number
  /** 스크린리더용. 그래프가 무엇을 그린 것인지. */
  label: string
}

const TONES = ['ink', 'ink-2', 'mid', 'faint', 'accent', 'high', 'crit', 'good'] as const

const SURFACES = ['surface', 'panel', 'line'] as const

type Tokens = Record<(typeof TONES)[number] | (typeof SURFACES)[number] | 'mono' | 'sans', string>

/** 지금 적용된 테마의 CSS 변수 실측값. 테마가 바뀌면 다시 읽어야 한다. */
function readTokens(): Tokens {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string) => style.getPropertyValue(`--${name}`).trim()
  const entries = [...TONES, ...SURFACES].map((name) => [name, read(name)])
  return { ...Object.fromEntries(entries), mono: read('mono'), sans: read('sans') } as Tokens
}

/** 카드 폭은 고정, 높이는 내용이 정한다. 열 간격은 엣지 라벨 박스가 들어갈 만큼 벌린다. */
const CARD_W = 176
const COL_GAP = 112
const ROW_GAP = 26
const PAD = { x: 24, y: 28 }
const CARD_PAD = 12
const CAPTION_H = 15
const LABEL_LH = 16
const SUB_LH = 14
const SUB_GAP = 4
const PORT_R = 3.5

type Fonts = { caption: string; label: string; sub: string; edge: string }

function fontsOf(t: Tokens): Fonts {
  return {
    caption: `600 9.5px ${t.sans}`,
    label: `700 12.5px ${t.mono}`,
    sub: `10.5px ${t.sans}`,
    edge: `500 10px ${t.sans}`,
  }
}

let measurer: CanvasRenderingContext2D | null = null

/** 한글과 영문이 섞이면 글자 수로는 폭을 못 재서 카드 밖으로 넘친다. 실제 폭을 잰다. */
function measure(text: string, font: string): number {
  measurer ??= document.createElement('canvas').getContext('2d')
  if (!measurer) return text.length * 7
  measurer.font = font
  return measurer.measureText(text).width
}

/** 넘치는 값은 자르지 않고 접는다. 잘린 호스트명은 어느 장비인지 알 수 없게 된다. */
function wrap(text: string, font: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  const flush = () => {
    if (line) lines.push(line)
    line = ''
  }

  for (const word of text.split(' ')) {
    const joined = line ? `${line} ${word}` : word
    if (measure(joined, font) <= max) {
      line = joined
      continue
    }
    flush()
    if (measure(word, font) <= max) {
      line = word
      continue
    }
    // 호스트명·도메인은 공백이 없어 단어 단위로는 안 접힌다. 글자 단위로 채운다.
    for (const ch of word) {
      if (line && measure(line + ch, font) > max) flush()
      line += ch
    }
  }
  flush()
  return lines.length > 0 ? lines : ['']
}

/**
 * 흐름 방향으로 열을 나눈다. 들어오는 엣지가 없는 노드가 0열이고, 따라가며 한 칸씩 민다.
 *
 * 힘 배치를 쓰지 않는 이유: 힘 배치는 컨테이너 밖으로 퍼져도 되돌리지 않아 노드가 경계에서
 * 잘린다. 이 그래프들은 방향이 있는 얕은 그래프라 열로 세우면 잘림도 없고 무엇이 무엇으로
 * 나갔는지도 그대로 읽힌다.
 */
function columnsOf(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
  const ids = new Set(nodes.map((n) => n.id))
  const incoming = new Set(edges.filter((e) => ids.has(e.from)).map((e) => e.to))
  const next = new Map<string, string[]>()
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue
    next.set(edge.from, [...(next.get(edge.from) ?? []), edge.to])
  }

  const depth = new Map<string, number>()
  const queue = nodes.filter((n) => !incoming.has(n.id)).map((n) => n.id)
  // 전부가 순환에 걸려 시작점이 없으면 첫 노드를 뿌리로 삼는다.
  if (queue.length === 0 && nodes.length > 0) queue.push(nodes[0].id)
  for (const id of queue) depth.set(id, 0)
  for (let i = 0; i < queue.length; i++) {
    const from = queue[i]
    for (const to of next.get(from) ?? []) {
      if (depth.has(to)) continue
      depth.set(to, (depth.get(from) ?? 0) + 1)
      queue.push(to)
    }
  }

  // 어디에도 닿지 않은 노드는 맨 뒤 열에 세운다. 감추면 관계가 없다는 사실이 사라진다.
  const last = Math.max(0, ...depth.values())
  const columns: string[][] = []
  for (const node of nodes) {
    const at = depth.get(node.id) ?? last
    ;(columns[at] ??= []).push(node.id)
  }
  return columns.filter((c) => c && c.length > 0)
}

type Card = GraphNode & {
  x: number
  y: number
  h: number
  lines: string[]
  subLines: string[]
}

type Layout = { cards: Card[]; width: number; height: number }

/**
 * 한 열에 세울 최대 개수.
 *
 * 실데이터는 균형 잡힌 그래프가 아니다. 엔드포인트 하나가 목적지 수백 곳으로 뻗는 별 모양이라
 * 깊이대로만 세우면 한 열에 전부 쌓여 높이가 수만 픽셀이 된다. 넘치면 옆으로 접는다.
 * 가로는 ScrollArea 가 받아 주지만 세로로 길어지면 화면 밖으로 나가 훑을 수가 없다.
 */
const MAX_ROWS = 8

/** 긴 열을 옆 열로 접는다. 같은 깊이가 여러 열이 되지만 좌표는 노드별이라 선은 그대로 이어진다. */
function foldColumns(columns: string[][]): string[][] {
  return columns.flatMap((column) => {
    if (column.length <= MAX_ROWS) return [column]
    const folded: string[][] = []
    for (let i = 0; i < column.length; i += MAX_ROWS) folded.push(column.slice(i, i + MAX_ROWS))
    return folded
  })
}

/** 열 배치를 픽셀 좌표로. 카드마다 높이가 달라서 한 열 안에서는 쌓고, 열을 세로 가운데에 맞춘다. */
function positionsOf(
  nodes: GraphNode[],
  rawColumns: string[][],
  fonts: Fonts,
  minHeight: number,
): Layout {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const inner = CARD_W - CARD_PAD * 2
  const columns = foldColumns(rawColumns)

  const sized = columns.map((column) =>
    column.flatMap((id) => {
      const node = byId.get(id)
      if (!node) return []
      const lines = wrap(node.label, fonts.label, inner)
      const subLines = node.sublabel ? wrap(node.sublabel, fonts.sub, inner) : []
      const h =
        CARD_PAD * 2 +
        CAPTION_H +
        lines.length * LABEL_LH +
        (subLines.length > 0 ? SUB_GAP + subLines.length * SUB_LH : 0)
      return [{ node, lines, subLines, h }]
    }),
  )

  const columnHeights = sized.map(
    (column) => column.reduce((sum, c) => sum + c.h, 0) + ROW_GAP * Math.max(0, column.length - 1),
  )
  const height = Math.max(minHeight, Math.max(0, ...columnHeights) + PAD.y * 2)

  const cards: Card[] = []
  sized.forEach((column, ci) => {
    const x = PAD.x + ci * (CARD_W + COL_GAP)
    let y = (height - columnHeights[ci]) / 2
    for (const c of column) {
      cards.push({ ...c.node, x, y, h: c.h, lines: c.lines, subLines: c.subLines })
      y += c.h + ROW_GAP
    }
  })

  const width = PAD.x * 2 + columns.length * CARD_W + Math.max(0, columns.length - 1) * COL_GAP
  return { cards, width, height }
}

/**
 * 같은 두 점 사이에 관계가 여럿일 수 있다(출처가 다르면 따로 온다).
 * 곡선을 벌려 두지 않으면 겹쳐 그려져 하나로 읽힌다.
 */
function bowsOf(edges: GraphEdge[]): number[] {
  const seen = new Map<string, number>()
  return edges.map((edge) => {
    const key = [edge.from, edge.to].sort().join(' ')
    const nth = seen.get(key) ?? 0
    seen.set(key, nth + 1)
    const step = Math.ceil(nth / 2) * 26
    return nth % 2 === 0 ? step : -step
  })
}

type Wire = {
  edge: GraphEdge
  d: string
  mid: { x: number; y: number }
}

function wiresOf(edges: GraphEdge[], cards: Card[], fonts: Fonts): Wire[] {
  const at = new Map(cards.map((c) => [c.id, c]))
  const bows = bowsOf(edges)

  const wires = edges.flatMap((edge, i) => {
    const from = at.get(edge.from)
    const to = at.get(edge.to)
    if (!from || !to) return []

    const sx = from.x + CARD_W + 5
    const sy = from.y + from.h / 2
    const tx = to.x - 5
    const ty = to.y + to.h / 2
    // 뒤로 가는 관계(순환)는 제어점을 그대로 두면 카드 위를 지난다. 아래로 크게 돌린다.
    const back = tx <= sx
    const bow = bows[i] + (back ? 56 : 0)
    const k = back ? 96 : Math.max(52, (tx - sx) / 2)

    return [
      {
        edge,
        d: `M ${sx} ${sy} C ${sx + k} ${sy + bow}, ${tx - k} ${ty + bow}, ${tx} ${ty}`,
        mid: { x: (sx + tx) / 2, y: (sy + ty) / 2 + bow * 0.75 },
      },
    ]
  })

  return spreadLabels(wires, fonts)
}

/** 라벨 상자의 세로 여유. 이보다 가까우면 글자가 포개져 하나만 읽힌다. */
const LABEL_GAP = 21

/**
 * 열이 정렬돼 있어 관계들의 중점이 한자리에 몰린다. 그대로 두면 라벨이 서로를 덮는다.
 * 가로로 실제 겹치는 것만 골라 위아래로 번갈아 밀어 떼어 놓는다.
 */
function spreadLabels(wires: Wire[], fonts: Fonts): Wire[] {
  const placed: { x: number; y: number; w: number }[] = []

  return wires.map((wire) => {
    if (!wire.edge.label) return wire
    const w = measure(wire.edge.label, fonts.edge) + 14
    const overlaps = (y: number) =>
      placed.some((p) => Math.abs(p.y - y) < LABEL_GAP && Math.abs(p.x - wire.mid.x) < (p.w + w) / 2)

    let y = wire.mid.y
    for (let step = 1; overlaps(y) && step <= 12; step++) {
      y = wire.mid.y + (step % 2 === 1 ? 1 : -1) * Math.ceil(step / 2) * LABEL_GAP
    }
    placed.push({ x: wire.mid.x, y, w })
    return { ...wire, mid: { x: wire.mid.x, y } }
  })
}

const DASH: Record<NonNullable<GraphEdge['line']>, string | undefined> = {
  solid: undefined,
  dashed: '6 4',
  dotted: '1.5 4',
}

type Tip = { x: number; y: number; lines: string[] } | null

/** 확대 아이콘. 네 모서리가 바깥으로 벌어지는 모양. */
function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3H3v6M15 3h6v6M15 21h6v-6M9 21H3v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}

/**
 * 관계를 카드와 곡선으로 그린다. 토폴로지와 상관 분석이 같은 렌더러를 쓰도록
 * 두 응답을 페이지에서 이 형태로 옮겨 넘긴다.
 */
function RelationGraph({ nodes, edges, height = 460, label }: RelationGraphProps) {
  const theme = useThemeStore((s) => s.theme)
  const [tokens, setTokens] = useState<Tokens>(readTokens)
  const wrapper = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [tip, setTip] = useState<Tip>(null)
  // useId 는 콜론을 넣는데 url(#...) 참조에서 걸린다.
  const uid = useId().replace(/:/g, '')

  const [fullscreen, setFullscreen] = useState(false)
  const overlayBox = useRef<HTMLDivElement>(null)
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 })
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // data-theme 는 App(부모)의 effect 가 붙인다. 부모 effect 는 나중에 돌므로 다음 프레임에 읽는다.
    const id = requestAnimationFrame(() => setTokens(readTokens()))
    return () => cancelAnimationFrame(id)
  }, [theme])

  // 컨테이너보다 좁으면 가운데로 모아야 해서 실제 폭을 알아야 한다.
  useEffect(() => {
    const el = wrapper.current
    if (!el) return
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    setWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  // 오버레이가 펼쳐진 크기를 재서 그래프를 그 크기에 맞게 다시 배치한다.
  useEffect(() => {
    if (!fullscreen) return
    const el = overlayBox.current
    if (!el) return
    const update = () => setOverlaySize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [fullscreen])

  // Esc 로 닫기. 오버레이가 열려 있을 때만 붙인다.
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // 열려 있는 동안 뒤 화면이 스크롤되지 않게 막는다.
  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [fullscreen])

  function openFullscreen() {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setTip(null)
    setFullscreen(true)
  }

  function closeFullscreen() {
    setFullscreen(false)
    setTip(null)
    opener.current?.focus()
  }

  const fonts = useMemo(() => fontsOf(tokens), [tokens])
  const layout = useMemo(
    () => positionsOf(nodes, columnsOf(nodes, edges), fonts, height),
    [nodes, edges, fonts, height],
  )
  const wires = useMemo(() => wiresOf(edges, layout.cards, fonts), [edges, layout, fonts])

  const fsLayout = useMemo(
    () => positionsOf(nodes, columnsOf(nodes, edges), fonts, overlaySize.height || height),
    [nodes, edges, fonts, overlaySize.height, height],
  )
  const fsWires = useMemo(() => wiresOf(edges, fsLayout.cards, fonts), [edges, fsLayout, fonts])

  const showTip = (containerRef: typeof wrapper) => (lines: string[]) => (e: { clientX: number; clientY: number }) => {
    const box = containerRef.current?.getBoundingClientRect()
    if (!box || lines.length === 0) return
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, lines })
  }

  /** 카드·곡선 렌더러. 기본 뷰와 오버레이가 같은 그림을 다른 크기로 그리는 데 함께 쓴다. */
  function renderSvg(layoutData: Layout, wiresData: Wire[], boxWidth: number, idPrefix: string, tipOn: typeof wrapper) {
    const shift = Math.max(0, (boxWidth - layoutData.width) / 2)
    const onMove = showTip(tipOn)
    return (
      <svg
        width={boxWidth}
        height={layoutData.height}
        viewBox={`0 0 ${boxWidth} ${layoutData.height}`}
        onMouseLeave={() => setTip(null)}
      >
        <defs>
          <pattern id={`${idPrefix}-dots`} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={tokens.line} />
          </pattern>
          {TONES.map((tone) => (
            <marker
              key={tone}
              id={`${idPrefix}-arrow-${tone}`}
              markerWidth="7"
              markerHeight="7"
              refX="7"
              refY="3.5"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0 0 L7 3.5 L0 7 Z" fill={tokens[tone]} />
            </marker>
          ))}
        </defs>

        <rect width={boxWidth} height={layoutData.height} fill={`url(#${idPrefix}-dots)`} opacity={0.6} />

        <g transform={`translate(${shift} 0)`}>
          {wiresData.map((wire, i) => {
            const tone = wire.edge.tone ?? 'mid'
            const tips = wire.edge.tooltip ?? (wire.edge.label ? [wire.edge.label] : [])
            return (
              <g key={`${wire.edge.from}-${wire.edge.to}-${i}`} onMouseMove={onMove(tips)}>
                <path
                  d={wire.d}
                  fill="none"
                  stroke={tokens[tone]}
                  strokeWidth={wire.edge.emphasis ? 2.2 : 1.2}
                  strokeDasharray={DASH[wire.edge.line ?? 'solid']}
                  strokeLinecap="round"
                  markerEnd={`url(#${idPrefix}-arrow-${tone})`}
                  opacity={0.9}
                />
                {/* 1px 선은 마우스로 짚기 어렵다. 안 보이는 굵은 선을 겹쳐 판정을 넓힌다. */}
                <path d={wire.d} fill="none" stroke="transparent" strokeWidth={14} />
              </g>
            )
          })}

          {wiresData.map((wire, i) => {
            if (!wire.edge.label) return null
            const w = measure(wire.edge.label, fonts.edge) + 14
            return (
              <g key={`label-${wire.edge.from}-${wire.edge.to}-${i}`}>
                <rect
                  x={wire.mid.x - w / 2}
                  y={wire.mid.y - 9}
                  width={w}
                  height={18}
                  rx={2}
                  fill={tokens.surface}
                  stroke={tokens.line}
                />
                <text
                  x={wire.mid.x}
                  y={wire.mid.y + 3.5}
                  textAnchor="middle"
                  fill={tokens.mid}
                  fontFamily={tokens.sans}
                  fontSize={10}
                  fontWeight={500}
                >
                  {wire.edge.label}
                </text>
              </g>
            )
          })}

          {layoutData.cards.map((card) => {
            const variant = card.variant ?? 'outline'
            const stroke = variant === 'solid' ? tokens[card.tone] : tokens.line
            const labelTop = card.y + CARD_PAD + CAPTION_H
            const subTop = labelTop + card.lines.length * LABEL_LH + SUB_GAP
            return (
              <g
                key={card.id}
                onMouseMove={onMove(card.tooltip ?? [card.label])}
                style={{ cursor: 'default' }}
              >
                <rect
                  x={card.x}
                  y={card.y}
                  width={CARD_W}
                  height={card.h}
                  rx={4}
                  fill={tokens.surface}
                  stroke={stroke}
                  strokeWidth={variant === 'solid' ? 1.6 : 1}
                  strokeDasharray={variant === 'dashed' ? '4 3' : undefined}
                />
                <text
                  x={card.x + CARD_PAD}
                  y={card.y + CARD_PAD + 9}
                  fill={tokens.faint}
                  fontFamily={tokens.sans}
                  fontSize={9.5}
                  fontWeight={600}
                  letterSpacing="0.08em"
                >
                  {card.caption.toUpperCase()}
                </text>
                {card.lines.map((line, i) => (
                  <text
                    key={i}
                    x={card.x + CARD_PAD}
                    y={labelTop + 12 + i * LABEL_LH}
                    fill={tokens.ink}
                    fontFamily={tokens.mono}
                    fontSize={12.5}
                    fontWeight={700}
                  >
                    {line}
                  </text>
                ))}
                {card.subLines.map((line, i) => (
                  <text
                    key={i}
                    x={card.x + CARD_PAD}
                    y={subTop + 10 + i * SUB_LH}
                    fill={tokens.mid}
                    fontFamily={tokens.sans}
                    fontSize={10.5}
                  >
                    {line}
                  </text>
                ))}
                {/* 엣지가 드나드는 포트. 선이 카드 어디에 붙는지 눈에 보여야 한다. */}
                <circle
                  cx={card.x}
                  cy={card.y + card.h / 2}
                  r={PORT_R}
                  fill={tokens.surface}
                  stroke={stroke}
                  strokeWidth={1.2}
                />
                <circle
                  cx={card.x + CARD_W}
                  cy={card.y + card.h / 2}
                  r={PORT_R}
                  fill={tokens.surface}
                  stroke={stroke}
                  strokeWidth={1.2}
                />
              </g>
            )
          })}
        </g>
      </svg>
    )
  }

  const boxWidth = Math.max(width, layout.width)
  const fsBoxWidth = Math.max(overlaySize.width, fsLayout.width)

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={openFullscreen}
        aria-label={`${label} 크게 보기`}
        className="absolute right-0 top-0 z-10 flex items-center gap-[5px] rounded-sm border border-line bg-surface px-[8px] py-[5px] text-[11.5px] font-semibold text-mid hover:text-ink-2 cursor-pointer"
      >
        <ExpandIcon />
        크게 보기
      </button>

      <div role="img" aria-label={label}>
        <ScrollArea label={label}>
          {/* 폭을 재기 전에 그리면 배치가 한 번 튄다. 한 프레임 기다린다. */}
          {width > 0 && renderSvg(layout, wires, boxWidth, uid, wrapper)}
        </ScrollArea>
      </div>

      {tip && !fullscreen && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 max-w-[280px] rounded-sm border border-line bg-surface px-[9px] py-[6px] text-[11.5px] leading-[1.5] text-ink-2 shadow-[var(--shadow-1)]"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
        >
          {tip.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[20px]">
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.5)]" onClick={closeFullscreen} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${label} 크게 보기`}
            className="relative flex h-full w-full flex-col rounded-md border border-line bg-surface p-[18px] shadow-[var(--shadow-2)]"
          >
            <div className="flex items-center justify-between pb-[12px]">
              <span className="text-[12.5px] font-semibold text-ink-2">{label}</span>
              <button
                type="button"
                onClick={closeFullscreen}
                aria-label="닫기"
                className="flex items-center justify-center rounded-sm p-[5px] text-mid hover:text-ink-2 cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <div ref={overlayBox} className="relative min-h-0 flex-1">
              <ScrollArea label={label}>
                {overlaySize.width > 0 &&
                  renderSvg(fsLayout, fsWires, fsBoxWidth, `${uid}-fs`, overlayBox)}
              </ScrollArea>
              {tip && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute z-10 max-w-[280px] rounded-sm border border-line bg-surface px-[9px] py-[6px] text-[11.5px] leading-[1.5] text-ink-2 shadow-[var(--shadow-1)]"
                  style={{ left: tip.x + 14, top: tip.y + 14 }}
                >
                  {tip.lines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RelationGraph
