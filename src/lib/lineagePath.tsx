import type { Lineage, LineageNode } from '@/api/types'
import type { AttackStep } from '@/components/ui/AttackPath'
import { fileIcon, networkIcon, processIcon } from '@/components/ui/icons'

const icons = {
  process: processIcon,
  network: networkIcon,
  file: fileIcon,
}

const kindLabels = {
  process: '프로세스',
  network: '외부 연결',
  file: '파일',
}

/** 뒤로 갈수록 심각해지는 시안 색을 그대로 쓴다. 마지막 단계가 crit, 그 앞이 high. */
function tone(index: number, length: number) {
  if (index === length - 1) return { color: 'var(--crit)', wash: 'var(--crit-wash)', strong: true }
  if (index === length - 2) return { color: 'var(--high)', wash: 'var(--high-wash)', strong: false }
  return { color: 'var(--accent)', wash: 'var(--accent-wash)', strong: false }
}

/**
 * 노드를 인과 순서(부모 -> 자식)로 편다.
 *
 * 백엔드 nodes 는 이벤트 시간순 dedup 이라 첫 이벤트가 `process=winword, parent=explorer` 면
 * winword 가 explorer 보다 앞에 온다. 화면은 공격이 퍼진 순서를 보여야 하므로
 * edges 를 따라 부모 없는 노드부터 체인을 이어 붙인다. edges 로 닿지 않는 노드는 원래 순서로 뒤에 남긴다.
 */
function inCausalOrder(lineage: Lineage): LineageNode[] {
  const byId = new Map(lineage.nodes.map((n) => [n.id, n]))
  const child = new Map<string, string>()
  const hasParent = new Set<string>()
  for (const edge of lineage.edges) {
    if (!child.has(edge.from)) child.set(edge.from, edge.to)
    hasParent.add(edge.to)
  }

  const ordered: LineageNode[] = []
  const seen = new Set<string>()
  const push = (id: string) => {
    // 사이클이 있어도 seen 검사로 멈춘다.
    for (let cur: string | undefined = id; cur && !seen.has(cur); cur = child.get(cur)) {
      seen.add(cur)
      const node = byId.get(cur)
      if (node) ordered.push(node)
    }
  }

  for (const node of lineage.nodes) {
    if (!hasParent.has(node.id)) push(node.id)
  }
  for (const node of lineage.nodes) {
    if (!seen.has(node.id)) ordered.push(node)
  }
  return ordered
}

/**
 * 실제 조치(kill)의 대상 프로세스. 공격 경로 인과 순서상 마지막 process 노드를
 * 가장 위험한 단계로 보고 그 label 을 종료 대상으로 쓴다. process 노드가 없으면 null.
 */
export function killTarget(lineage: Lineage): string | null {
  const procs = inCausalOrder(lineage).filter((n) => n.kind === 'process')
  return procs.length ? procs[procs.length - 1].label : null
}

/**
 * lineage 그래프를 공격 경로 단계로 편다. 분기는 표현하지 않고 한 줄 경로로 잇는다.
 * 단계가 많으면 앞부분을 잘라 마지막 maxSteps 개만 보여준다.
 */
export function toAttackSteps(lineage: Lineage, maxSteps = 5): AttackStep[] {
  const nodes: LineageNode[] = inCausalOrder(lineage).slice(-maxSteps)

  return nodes.map((node, i) => {
    const { color, wash, strong } = tone(i, nodes.length)
    const isLast = i === nodes.length - 1
    return {
      icon: icons[node.kind] ?? processIcon,
      title: node.label,
      caption: kindLabels[node.kind] ?? node.kind,
      color,
      wash,
      strong,
      ring: isLast,
      connector: isLast ? null : i === nodes.length - 2 ? 'crit' : 'line',
    }
  })
}
