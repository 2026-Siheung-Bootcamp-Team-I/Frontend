import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import type {
  Correlation,
  CorrelationNodeKind,
  DnsLookupStatus,
  ForwardLookup,
  RelationOrigin,
  ReverseLookup,
  TopologyNode,
} from '@/api/types'
import AsyncState from '@/components/ui/AsyncState'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import RelationGraph, {
  type GraphEdge,
  type GraphNode,
  type GraphTone,
} from '@/components/ui/RelationGraph'
import { useApi } from '@/hooks/useApi'
import { absoluteTime } from '@/lib/format'

type NodeVariant = 'solid' | 'outline' | 'dashed'
type EdgeLine = 'solid' | 'dashed' | 'dotted'

type EdgeStyle = { tone: GraphTone; line: EdgeLine }

/**
 * 엣지 출처. 셋을 같게 보여주면 추측이 관측으로 읽힌다. 색과 선 모양을 둘 다 갈라 놓는다.
 */
const originMeta: Record<RelationOrigin, EdgeStyle & { label: string; note: string }> = {
  OBSERVED: {
    label: '관측',
    note: '수집한 이벤트에 그대로 있던 사실입니다.',
    tone: 'ink',
    line: 'solid',
  },
  INFERRED: {
    label: '추정',
    note: '관측 두 건을 시각과 IP 로 이어 붙인 추측입니다. 근거는 아래에 적습니다.',
    tone: 'high',
    line: 'dashed',
  },
  LIVE_DNS: {
    label: '실시간 DNS',
    note: '지금 물어본 결과입니다. 조회 시점 상태일 뿐 우리 관측이 아닙니다.',
    tone: 'accent',
    line: 'dotted',
  },
}

const relationLabels: Record<string, string> = {
  RESOLVED_TO: '이름 해석',
  ALIAS_OF: '별칭',
  CONNECTED_VIA: '경유 연결',
  QUERIED: 'DNS 질의',
  CONNECTED: '연결',
  PTR_CANDIDATE: 'PTR 후보',
}

/** 모르는 관계 유형은 감추지 말고 원문 그대로 보여준다. */
function relationLabel(relation: string): string {
  return relationLabels[relation] ?? relation
}

type NodeStyle = { caption: string; tone: GraphTone; variant: NodeVariant }

const corrNodeMeta: Record<CorrelationNodeKind, NodeStyle> = {
  HOST: { caption: '엔드포인트', tone: 'accent', variant: 'outline' },
  PROCESS: { caption: '프로세스', tone: 'high', variant: 'outline' },
  DOMAIN: { caption: '도메인', tone: 'ink', variant: 'outline' },
  IP: { caption: 'IP', tone: 'mid', variant: 'outline' },
  // PTR 이름은 우리가 관측한 적 없는 후보라 점선으로 확정을 피한다.
  PTR_NAME: { caption: 'PTR 후보', tone: 'mid', variant: 'dashed' },
}

const dnsStatusMeta: Record<
  DnsLookupStatus,
  { label: string; tone: 'good' | 'mid' | 'crit'; note: string }
> = {
  OK: { label: '조회 성공', tone: 'good', note: '' },
  NOT_FOUND: {
    label: '기록 없음',
    tone: 'mid',
    note: 'DNS 서버가 그런 이름은 없다고 답했습니다. 조회 자체는 성공했습니다.',
  },
  FAILED: {
    label: '조회 실패',
    tone: 'crit',
    note: '묻지 못했습니다. 기록이 없다는 뜻이 아닙니다.',
  },
}

function dnsStatus(status: string) {
  return (
    dnsStatusMeta[status as DnsLookupStatus] ?? { label: status, tone: 'mid' as const, note: '' }
  )
}

function corrGraphNodes(correlation: Correlation): GraphNode[] {
  return correlation.nodes.map((node) => {
    const meta = corrNodeMeta[node.kind] ?? corrNodeMeta.DOMAIN
    const isTarget = node.value === correlation.target.value
    return {
      id: node.id,
      caption: meta.caption,
      label: node.value,
      sublabel: isTarget ? '조회 대상' : undefined,
      tone: meta.tone,
      variant: isTarget ? 'solid' : meta.variant,
      tooltip: [
        meta.caption,
        node.value,
        node.kind === 'PTR_NAME'
          ? 'PTR 이 답한 이름 후보입니다. IP 의 이름이 아닙니다.'
          : isTarget
            ? '지금 조회한 대상입니다.'
            : '',
      ].filter(Boolean),
    }
  })
}

function corrGraphEdges(correlation: Correlation): GraphEdge[] {
  const labelOf = new Map(correlation.nodes.map((node) => [node.id, node.value]))
  return correlation.edges.map((edge) => {
    const origin = originMeta[edge.origin]
    return {
      from: edge.from,
      to: edge.to,
      label: relationLabel(edge.relation),
      line: origin.line,
      tone: origin.tone,
      emphasis: edge.origin === 'OBSERVED',
      tooltip: [
        `${labelOf.get(edge.from) ?? edge.from} → ${labelOf.get(edge.to) ?? edge.to}`,
        `관계 ${relationLabel(edge.relation)}`,
        `출처 ${origin.label}`,
        origin.note,
        `관측 ${edge.observations}건`,
        edge.firstSeen === null ? '관측 시각 없음' : `처음 관측 ${absoluteTime(edge.firstSeen)}`,
        edge.lastSeen === null ? '' : `마지막 관측 ${absoluteTime(edge.lastSeen)}`,
        edge.basis ? `근거 ${edge.basis}` : '',
      ].filter(Boolean),
    }
  })
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

function DnsAddressList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <div className="text-[12.5px] text-faint">{empty}</div>
  return (
    <div className="flex flex-wrap gap-[6px]">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-xs bg-panel px-[8px] py-[3px] font-mono text-[12px] text-ink-2"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function LookupBlock({
  title,
  note,
  status,
  error,
  children,
}: {
  title: string
  note: string
  status: string
  error: string | null
  children: React.ReactNode
}) {
  const meta = dnsStatus(status)
  return (
    <div className="flex flex-col gap-[9px]">
      <div className="flex flex-wrap items-center justify-between gap-[8px]">
        <span className="text-[12.5px] font-semibold text-ink">{title}</span>
        <Badge severity={meta.tone}>{meta.label}</Badge>
      </div>
      <div className="text-[11.5px] leading-[1.6] text-faint">{note}</div>
      {meta.note && <div className="text-[12px] leading-[1.6] text-ink-2">{meta.note}</div>}
      {/* FAILED 는 왜 못 물었는지가 판단 근거라 error 를 그대로 보여준다. */}
      {status === 'FAILED' && error && (
        <div className="rounded-sm border border-line bg-panel px-[10px] py-[7px] font-mono text-[11.5px] text-crit">
          {error}
        </div>
      )}
      {status === 'OK' && children}
    </div>
  )
}

function LiveDnsCard({
  forward,
  reverse,
}: {
  forward: ForwardLookup | null
  reverse: ReverseLookup | null
}) {
  return (
    <Card className="flex flex-col gap-[16px] px-[16px] py-[18px]">
      <div>
        <div className="text-[13px] font-bold text-ink">실시간 DNS 조회</div>
        <div className="mt-[5px] text-[11.5px] leading-[1.6] text-faint">
          조회 버튼을 누른 시점에 DNS 서버에 물어본 결과입니다. 우리가 수집한 이벤트와는 무관합니다.
        </div>
      </div>

      {forward && (
        <LookupBlock
          title="정방향 조회"
          note="이 도메인이 지금 어느 주소를 가리키는지."
          status={forward.status}
          error={forward.error}
        >
          <DnsAddressList items={forward.addresses} empty="응답에 주소가 없습니다" />
        </LookupBlock>
      )}

      {reverse && (
        <LookupBlock
          title="PTR 후보"
          note="PTR 이름은 IP 소유자가 임의로 적을 수 있습니다. 이 IP 의 이름이 아니라 후보로만 봅니다."
          status={reverse.status}
          error={reverse.error}
        >
          <DnsAddressList items={reverse.ptrNames} empty="응답에 이름이 없습니다" />
        </LookupBlock>
      )}

      {!forward && !reverse && (
        <div className="text-[12.5px] text-faint">이 대상에는 조회 결과가 없습니다.</div>
      )}
    </Card>
  )
}

/** INFERRED 는 무엇을 근거로 이었는지까지 봐야 믿을지 말지 정할 수 있다. */
function InferredBasis({ correlation }: { correlation: Correlation }) {
  const labelOf = new Map(correlation.nodes.map((node) => [node.id, node.value]))
  const inferred = correlation.edges.filter((edge) => edge.origin === 'INFERRED')
  if (inferred.length === 0) return null

  return (
    <div className="flex flex-col gap-[8px] border-t border-line-2 pt-[14px]">
      <div className="text-[12px] font-semibold text-ink-2">추정 관계의 근거</div>
      {inferred.map((edge, i) => (
        <div key={`${edge.from}-${edge.to}-${i}`} className="text-[12px] leading-[1.6] text-faint">
          <span className="font-mono text-ink-2">
            {labelOf.get(edge.from) ?? edge.from} → {labelOf.get(edge.to) ?? edge.to}
          </span>
          <span className="mx-[6px]">{relationLabel(edge.relation)}</span>
          <span>{edge.basis ?? '근거가 함께 오지 않았습니다'}</span>
        </div>
      ))}
    </div>
  )
}

/** 조회 예시 칩. 지어낸 값을 두면 관측된 목적지로 오해하므로 토폴로지에서만 가져온다. */
function useDestinationExamples(): string[] {
  const topology = useApi(() => api.topology({ limit: 50 }))
  return useMemo(
    () =>
      (topology.data?.nodes ?? [])
        .filter((node: TopologyNode) => node.kind === 'destination')
        .slice(0, 6)
        .map((node) => node.label),
    [topology.data],
  )
}

function Lookup() {
  const [input, setInput] = useState('')
  const [target, setTarget] = useState('')
  const examples = useDestinationExamples()

  const correlation = useApi(
    () => (target ? api.correlate(target, { liveDns: true }) : Promise.resolve(null)),
    [target],
  )

  const data = correlation.data
  const nodes = useMemo(() => (data ? corrGraphNodes(data) : []), [data])
  const edges = useMemo(() => (data ? corrGraphEdges(data) : []), [data])

  const lookup = (value: string) => {
    const trimmed = value.trim()
    setInput(trimmed)
    setTarget(trimmed)
  }

  return (
    <div className="flex flex-col gap-[32px]">
      <div>
        <div className="text-[18px] font-bold tracking-[-0.01em] text-ink sm:text-[20px]">
          IP·도메인 조회
        </div>
        <div className="mt-[6px] text-[13px] text-faint">
          IP 나 도메인 하나가 우리 관측에서 무엇과 이어져 있는지 봅니다. 관측된 사실과 추측, 지금
          물어본 결과를 갈라 그립니다.
        </div>
      </div>

      <section className="flex flex-col gap-[16px]">
        <Card className="flex flex-col gap-[14px] px-[16px] py-[16px]">
          <form
            className="flex flex-col gap-[8px] sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              lookup(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="도메인 또는 IP"
              aria-label="상관 분석 대상"
              className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-[11px] py-[9px] font-mono text-[12.5px] text-ink placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={input.trim() === ''}
              className="rounded-sm border border-line bg-panel px-[16px] py-[9px] font-sans text-[12.5px] font-semibold text-ink-2 disabled:text-faint enabled:cursor-pointer"
            >
              조회
            </button>
          </form>

          {examples.length > 0 && (
            <div className="flex flex-wrap items-center gap-[7px]">
              <span className="text-[11.5px] text-faint">관측된 목적지</span>
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => lookup(example)}
                  className="cursor-pointer rounded-full border border-line bg-panel px-[11px] py-[5px] font-mono text-[11.5px] text-ink-2"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </Card>

        {target === '' ? (
          <Card className="px-[16px] py-[28px] text-center text-[12.5px] text-faint">
            대상을 입력하면 관계를 그립니다.
          </Card>
        ) : (
          <div className="grid grid-cols-1 items-start gap-[16px] lg:grid-cols-[minmax(0,1fr)_300px]">
            <Card className="px-[12px] py-[14px] sm:px-[16px]">
              <AsyncState
                loading={correlation.loading}
                error={correlation.error}
                onRetry={correlation.refetch}
              >
                {data && (
                  <div className="flex flex-col gap-[14px]">
                    <div className="flex flex-wrap items-center gap-[10px] px-[4px]">
                      <Badge severity="accent">{data.target.kind === 'IP' ? 'IP' : '도메인'}</Badge>
                      <span className="font-mono text-[13px] text-ink">{data.target.value}</span>
                      <span className="text-[12px] text-faint">
                        관측 이벤트 {data.observedEvents.toLocaleString()}건
                      </span>
                      <Link
                        to={`/threats?${data.target.kind === 'IP' ? 'destIp' : 'domain'}=${encodeURIComponent(data.target.value)}`}
                        className="ml-auto text-[12px] font-semibold text-accent hover:underline"
                      >
                        이 목적지의 위협 보기
                      </Link>
                    </div>

                    {/* 관측이 0 이면 그래프만 비워 두지 않고 무엇이 없는 것인지 말한다. */}
                    {data.observedEvents === 0 && (
                      <div className="flex flex-col gap-[4px] rounded-sm border border-line bg-panel px-[14px] py-[11px]">
                        <div className="text-[12.5px] font-semibold text-ink-2">
                          우리가 관측한 적 없는 대상입니다
                        </div>
                        <div className="text-[12.5px] leading-[1.6] text-faint">
                          이 대상이 들어간 이벤트가 수집 기록에 없습니다. 아래에 관계가 그려진다면
                          지금 물어본 DNS 결과이지 우리 관측이 아닙니다.
                        </div>
                      </div>
                    )}

                    {nodes.length === 0 ? (
                      <div className="py-[36px] text-center text-[12.5px] text-faint">
                        그릴 관계가 없습니다
                      </div>
                    ) : (
                      <RelationGraph
                        nodes={nodes}
                        edges={edges}
                        height={400}
                        label={`${data.target.value} 상관 관계 그래프`}
                      />
                    )}

                    <InferredBasis correlation={data} />
                  </div>
                )}
              </AsyncState>
            </Card>

            <div className="flex flex-col gap-[16px]">
              <Card className="flex flex-col gap-[14px] px-[16px] py-[18px]">
                <LegendTitle>노드</LegendTitle>
                <div className="flex flex-col gap-[10px]">
                  {(Object.keys(corrNodeMeta) as CorrelationNodeKind[]).map((kind) => (
                    <LegendRow
                      key={kind}
                      mark={
                        <NodeMark
                          tone={corrNodeMeta[kind].tone}
                          variant={corrNodeMeta[kind].variant}
                        />
                      }
                      label={corrNodeMeta[kind].caption}
                      note={kind === 'PTR_NAME' ? 'IP 의 이름이 아니라 후보입니다' : undefined}
                    />
                  ))}
                  <LegendRow
                    mark={<NodeMark tone="accent" variant="solid" />}
                    label="조회 대상"
                    note="테두리가 굵은 카드입니다"
                  />
                </div>

                <LegendTitle>관계의 출처</LegendTitle>
                <div className="flex flex-col gap-[10px]">
                  {(Object.keys(originMeta) as RelationOrigin[]).map((origin) => (
                    <LegendRow
                      key={origin}
                      mark={
                        <LineMark tone={originMeta[origin].tone} line={originMeta[origin].line} />
                      }
                      label={originMeta[origin].label}
                      note={originMeta[origin].note}
                    />
                  ))}
                </div>
                <div className="text-[11.5px] leading-[1.6] text-faint">
                  같은 두 점 사이라도 출처가 다르면 관계를 따로 그립니다.
                </div>
              </Card>

              {correlation.loading || !data ? null : data.liveDns ? (
                <LiveDnsCard forward={data.liveDns.forward} reverse={data.liveDns.reverse} />
              ) : (
                <Card className="px-[16px] py-[18px] text-[12.5px] leading-[1.6] text-faint">
                  실시간 DNS 조회를 하지 않았습니다.
                </Card>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default Lookup
