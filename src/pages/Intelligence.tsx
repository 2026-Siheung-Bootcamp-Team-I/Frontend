import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import type { Topology, TopologyNode } from '@/api/types'
import ActiveFilters, { type ActiveFilter } from '@/components/ui/ActiveFilters'
import AsyncState from '@/components/ui/AsyncState'
import Card from '@/components/ui/Card'
import RelationGraph, {
  type GraphEdge,
  type GraphNode,
  type GraphTone,
} from '@/components/ui/RelationGraph'
import Select from '@/components/ui/Select'
import { useApi } from '@/hooks/useApi'
import { absoluteTime, unknownable } from '@/lib/format'

const LIMITS = [
  { value: '50', label: '50개' },
  { value: '100', label: '100개' },
  { value: '200', label: '200개' },
  { value: '500', label: '500개' },
]

/** 서버 기본값과 맞춘다. */
/**
 * 서버 기본값은 200 이지만 그만큼을 한 그림에 넣으면 읽을 수가 없다.
 * 실제로 엔드포인트 하나가 목적지 200곳으로 뻗어 카드가 200장 깔린다. 좁혀서 보는 게 조사에 맞다.
 * 더 봐야 하면 관계 수를 올리거나 검색으로 범위를 좁히라고 위 배너가 안내한다.
 */
const DEFAULT_LIMIT = '50'

type NodeVariant = 'solid' | 'outline' | 'dashed'
type EdgeLine = 'solid' | 'dashed' | 'dotted'

function endpointSublabel(node: TopologyNode): string | undefined {
  const parts: string[] = []
  if (node.riskScore !== null) parts.push(`위험 ${node.riskScore}`)
  if (node.openAlerts) parts.push(`알림 ${node.openAlerts}`)
  return parts.length ? parts.join(' · ') : undefined
}

function topologyGraphNodes(nodes: TopologyNode[]): GraphNode[] {
  return nodes.map((node) => {
    if (node.kind === 'endpoint') {
      return {
        id: node.id,
        caption: '엔드포인트',
        label: node.label,
        sublabel: endpointSublabel(node),
        tone: 'accent',
        // 알림이 있는 엔드포인트가 조사 시작점이다.
        variant: (node.openAlerts ?? 0) > 0 ? 'solid' : 'outline',
        tooltip: [
          '엔드포인트',
          node.label,
          `위험도 ${unknownable(node.riskScore)}`,
          `열린 알림 ${unknownable(node.openAlerts)}`,
        ],
      }
    }
    if (node.kind === 'destination') {
      // destKind 가 ip 면 도메인을 잡지 못한 것이다. 서버가 이름을 지어 붙이지 않으므로 화면도 IP 그대로 둔다.
      const isIp = node.destKind === 'ip'
      return {
        id: node.id,
        caption: '목적지',
        label: node.label,
        sublabel: isIp ? 'IP (도메인 미확인)' : undefined,
        tone: 'mid',
        variant: 'outline',
        tooltip: [
          '목적지',
          node.label,
          isIp
            ? '이 연결에서는 도메인을 잡지 못해 IP 로만 남았습니다.'
            : '이벤트에 도메인이 함께 남은 연결입니다.',
        ],
      }
    }
    return {
      id: node.id,
      caption: '도메인 묶음',
      label: node.label,
      sublabel: `목적지 ${unknownable(node.members)}개`,
      tone: 'high',
      variant: 'outline',
      tooltip: ['도메인 묶음', node.label, `묶인 목적지 ${unknownable(node.members)}개`],
    }
  })
}

function topologyGraphEdges(topology: Topology): GraphEdge[] {
  const labelOf = new Map(topology.nodes.map((node) => [node.id, node.label]))
  return topology.edges.map((edge) => {
    // 알림이 하나라도 있으면 조사 대상이다. 관측만 된 관계와 반드시 갈라 그린다.
    const alerted = edge.alerts > 0
    return {
      from: edge.from,
      to: edge.to,
      label: alerted ? `이벤트 ${edge.events} · 알림 ${edge.alerts}` : `이벤트 ${edge.events}`,
      line: alerted ? 'solid' : 'dashed',
      tone: alerted ? 'crit' : 'mid',
      emphasis: alerted,
      tooltip: [
        `${labelOf.get(edge.from) ?? edge.from} → ${labelOf.get(edge.to) ?? edge.to}`,
        alerted ? '알림이 난 관계입니다' : '관측만 된 관계입니다',
        `이벤트 ${edge.events}건 · 알림 ${edge.alerts}건`,
        edge.protocols.length ? `프로토콜 ${edge.protocols.join(', ')}` : '프로토콜 미상',
        `마지막 관측 ${absoluteTime(edge.lastSeen)}`,
      ],
    }
  })
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <div className="text-[15px] font-bold text-ink tracking-[-0.01em]">{title}</div>
      <div className="mt-[5px] text-[12.5px] leading-[1.6] text-faint">{note}</div>
    </div>
  )
}

function LegendTitle({ children }: { children: string }) {
  return <div className="text-[11.5px] font-semibold text-faint">{children}</div>
}

function LegendRow({ mark, label, note }: { mark: React.ReactNode; label: string; note?: string }) {
  return (
    <div className="flex items-start gap-[9px]">
      <span className="mt-[3px] flex h-[12px] w-[22px] shrink-0 items-center justify-center">
        {mark}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] text-ink-2">{label}</span>
        {note && (
          <span className="mt-[2px] block text-[11.5px] leading-[1.55] text-faint">{note}</span>
        )}
      </span>
    </div>
  )
}

/** 그래프 노드가 카드라서 범례 견본도 작은 사각 테두리로 둔다. */
function NodeMark({ tone, variant = 'outline' }: { tone: GraphTone; variant?: NodeVariant }) {
  const stroke = `var(--${tone})`
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden>
      <rect
        x="1"
        y="1"
        width="18"
        height="10"
        rx="2.5"
        fill="none"
        stroke={stroke}
        strokeWidth={variant === 'solid' ? 2 : 1}
        strokeDasharray={variant === 'dashed' ? '3 2.5' : undefined}
      />
    </svg>
  )
}

function LineMark({ tone, line }: { tone: GraphTone; line: EdgeLine }) {
  const dash = line === 'dashed' ? '5 3' : line === 'dotted' ? '1.5 3' : undefined
  return (
    <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden>
      <line
        x1="1"
        y1="4"
        x2="21"
        y2="4"
        stroke={`var(--${tone})`}
        strokeWidth="2"
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 그래프 노드는 링크가 아니라서, 목적지에서 위협 목록으로 넘어갈 길을 목록으로 따로 둔다. */
function DestinationLinks({ nodes }: { nodes: TopologyNode[] }) {
  const destinations = nodes.filter((node) => node.kind === 'destination')
  if (destinations.length === 0) return null

  return (
    <Card className="flex flex-col gap-[10px] px-[16px] py-[16px]">
      <div className="text-[12.5px] font-semibold text-ink-2">목적지 목록</div>
      <div className="text-[11.5px] leading-[1.6] text-faint">
        목적지를 눌러 이 목적지 때문에 난 위협을 봅니다.
      </div>
      <div className="flex flex-wrap gap-[8px]">
        {destinations.map((node) => (
          <Link
            key={node.id}
            to={`/threats?${node.destKind === 'ip' ? 'destIp' : 'domain'}=${encodeURIComponent(node.label)}`}
            className="rounded-full border border-line bg-panel px-[11px] py-[5px] font-mono text-[11.5px] text-ink-2 hover:border-accent hover:text-accent"
          >
            {node.label}
          </Link>
        ))}
      </div>
    </Card>
  )
}

/** 응답이 잘렸으면 반드시 알린다. 알리지 않으면 이게 전부라고 읽힌다. */
function TruncatedNotice({ total, shown }: { total: number; shown: number }) {
  return (
    <div className="flex flex-col gap-[4px] rounded-sm border border-[color-mix(in_srgb,var(--high)_40%,transparent)] bg-[var(--high-wash)] px-[14px] py-[11px]">
      <div className="text-[12.5px] font-semibold text-high">일부만 표시하고 있습니다</div>
      <div className="text-[12.5px] leading-[1.6] text-ink-2">
        조회 구간의 관계 {total.toLocaleString()}건 중 {shown.toLocaleString()}건만 그렸습니다. 관계
        수를 늘리거나 검색으로 범위를 좁히세요.
      </div>
    </div>
  )
}

function Intelligence() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(DEFAULT_LIMIT)

  const topology = useApi(
    () => api.topology({ q: query || undefined, limit: Number(limit) }),
    [query, limit],
  )

  const data = topology.data
  const nodes = useMemo(() => (data ? topologyGraphNodes(data.nodes) : []), [data])
  const edges = useMemo(() => (data ? topologyGraphEdges(data) : []), [data])

  const filters: ActiveFilter[] = query
    ? [
        {
          label: '검색',
          value: query,
          onClear: () => {
            setSearch('')
            setQuery('')
          },
        },
      ]
    : []

  return (
    <div className="flex flex-col gap-[32px]">
      <div>
        <div className="text-[18px] font-bold tracking-[-0.01em] text-ink sm:text-[20px]">
          관계 분석
        </div>
        <div className="mt-[6px] text-[13px] text-faint">
          엔드포인트가 외부로 어디까지 나갔는지 전체를 봅니다.
        </div>
      </div>

      <section className="flex flex-col gap-[16px]">
        <SectionTitle
          title="egress 토폴로지"
          note="엔드포인트에서 외부로 나간 연결을 목적지별로 묶어 그립니다."
        />

        <Card className="flex flex-col gap-[12px] px-[16px] py-[16px]">
          <div className="flex flex-col gap-[10px] sm:flex-row sm:items-end">
            <form
              className="flex min-w-0 flex-1 flex-col gap-[7px]"
              onSubmit={(e) => {
                e.preventDefault()
                setQuery(search.trim())
              }}
            >
              <span className="text-[11.5px] font-semibold text-faint">호스트·목적지 검색</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="부분 일치. 입력 후 Enter"
                aria-label="호스트 또는 목적지 검색"
                className="w-full rounded-sm border border-line bg-surface px-[11px] py-[8px] font-mono text-[12.5px] text-ink placeholder:font-sans placeholder:text-faint"
              />
            </form>
            <div className="w-full sm:w-[140px]">
              <Select label="관계 수" value={limit} options={LIMITS} onChange={setLimit} />
            </div>
          </div>

          <div className="text-[11.5px] text-faint">
            조회 구간{' '}
            <span className="font-mono text-mid">
              {data ? `${absoluteTime(data.from)} ~ ${absoluteTime(data.to)}` : '불러오는 중'}
            </span>
          </div>

          <ActiveFilters filters={filters} />
        </Card>

        {data?.truncated && (
          <TruncatedNotice total={data.totalRelations} shown={data.shownRelations} />
        )}

        <div className="grid grid-cols-1 items-start gap-[16px] lg:grid-cols-[260px_minmax(0,1fr)]">
          <Card className="flex flex-col gap-[14px] px-[16px] py-[18px]">
            <LegendTitle>노드</LegendTitle>
            <div className="flex flex-col gap-[10px]">
              <LegendRow mark={<NodeMark tone="accent" />} label="엔드포인트" />
              <LegendRow
                mark={<NodeMark tone="mid" />}
                label="목적지"
                note="도메인을 잡지 못한 연결은 IP 그대로 둡니다"
              />
              <LegendRow
                mark={<NodeMark tone="high" />}
                label="도메인 묶음"
                note="같은 등록 도메인끼리 묶은 것"
              />
              <LegendRow
                mark={<NodeMark tone="accent" variant="solid" />}
                label="알림 있는 엔드포인트"
                note="테두리가 굵은 카드입니다"
              />
            </div>

            <LegendTitle>관계</LegendTitle>
            <div className="flex flex-col gap-[10px]">
              <LegendRow
                mark={<LineMark tone="mid" line="dashed" />}
                label="관측만 된 관계"
                note="알림 없이 연결만 있었습니다"
              />
              <LegendRow
                mark={<LineMark tone="crit" line="solid" />}
                label="알림 있는 관계"
                note="조사 대상입니다"
              />
            </div>

            <div className="text-[11.5px] leading-[1.6] text-faint">
              선 위 숫자는 이벤트 수와 알림 수입니다. 주고받은 트래픽 양이 아닙니다.
            </div>
          </Card>

          <Card className="px-[10px] py-[10px] sm:px-[14px] sm:py-[14px]">
            <AsyncState
              loading={topology.loading}
              error={topology.error}
              empty={nodes.length === 0}
              emptyText={
                query ? '검색 조건에 맞는 연결이 없습니다' : '조회 구간에 외부 연결이 없습니다'
              }
              onRetry={topology.refetch}
            >
              <RelationGraph
                nodes={nodes}
                edges={edges}
                height={520}
                label="egress 토폴로지 그래프"
              />
            </AsyncState>
          </Card>
        </div>

        <DestinationLinks nodes={data?.nodes ?? []} />
      </section>
    </div>
  )
}

export default Intelligence
