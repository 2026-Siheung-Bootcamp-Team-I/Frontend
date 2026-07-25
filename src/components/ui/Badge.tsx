import type { ReactNode } from 'react'

type Severity = 'crit' | 'high' | 'mid' | 'accent' | 'good'

/*
  배경을 채우지 않고 점 + 얇은 테두리로 둔다. 표 한 화면에 배지가 수십 개 깔리는데
  채운 배경은 그만큼의 색 덩어리가 돼 정작 봐야 할 심각도 구분을 덮는다.
*/
const styles: Record<Severity, string> = {
  crit: 'text-crit border-[color-mix(in_srgb,var(--crit)_40%,transparent)]',
  high: 'text-high border-[color-mix(in_srgb,var(--high)_40%,transparent)]',
  mid: 'text-mid border-line',
  accent: 'text-accent border-[color-mix(in_srgb,var(--accent)_40%,transparent)]',
  good: 'text-good border-[color-mix(in_srgb,var(--good)_40%,transparent)]',
}

type BadgeProps = {
  severity: Severity
  children: ReactNode
  className?: string
}

function Badge({ severity, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-[5px] border px-[7px] py-[2px] rounded-xs text-[11px] font-semibold ${styles[severity]} ${className}`}
    >
      <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-current" />
      {children}
    </span>
  )
}

export default Badge
