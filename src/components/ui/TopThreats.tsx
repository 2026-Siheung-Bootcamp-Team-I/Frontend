import type { AlertSummary } from '@/api/types'
import ProgressBar from './ProgressBar'
import { percentOf } from '@/lib/format'

/** 시안의 단계별 농도. 6번째부터는 마지막 값을 재사용한다. */
const opacities = [1, 0.82, 0.64, 0.46, 0.46]

type TopThreatsProps = {
  threats: AlertSummary['topThreats']
  total: number
  animate?: boolean
}

/** 카테고리별 위협 비중 막대. 백엔드가 이미 count 내림차순 상위 5개로 잘라서 준다. */
function TopThreats({ threats, total, animate = true }: TopThreatsProps) {
  return (
    <div className="flex flex-col gap-[15px]">
      {threats.map((threat, i) => (
        <ProgressBar
          key={threat.category}
          label={threat.category}
          percent={percentOf(threat.count, total)}
          duration={1 + i * 0.1}
          opacity={opacities[i] ?? 0.46}
          animate={animate}
        />
      ))}
    </div>
  )
}

export default TopThreats
