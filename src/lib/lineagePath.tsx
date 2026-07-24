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
 * lineage 그래프를 공격 경로 단계로 편다. 백엔드가 노드를 이벤트 시간순으로 dedup 해서 주므로
 * 그 순서를 그대로 한 줄 경로로 쓴다(분기는 표현하지 않는다).
 * 단계가 많으면 앞부분을 잘라 마지막 maxSteps 개만 보여준다.
 */
export function toAttackSteps(lineage: Lineage, maxSteps = 5): AttackStep[] {
  const nodes: LineageNode[] = lineage.nodes.slice(-maxSteps)

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
