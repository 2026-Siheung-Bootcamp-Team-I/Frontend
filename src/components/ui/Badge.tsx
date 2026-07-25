import type { ReactNode } from 'react'

type Severity = 'crit' | 'high' | 'mid' | 'accent' | 'good'

/*
  점 + 옅은 tint + 같은 색 테두리. 셋 다 필요하다.
  tint 없이 테두리만 두면 라이트에서 색 정체성이 약해지고(흰 배경이 배지 안까지 이어져
  덩어리로 안 읽힌다), tint 만 두면 경계가 흐려진다. tint 는 dark 14~16% / light 파스텔이라
  표에 수십 개가 깔려도 색 덩어리가 되지 않는다.
  라이트의 글자색은 tint 위에서 4.6:1 이상이 나오는 어두운 값을 쓴다(index.css 참고).
*/
const styles: Record<Severity, string> = {
  crit: 'text-crit bg-[var(--crit-wash)] border-[color-mix(in_srgb,var(--crit)_40%,transparent)]',
  high: 'text-high bg-[var(--high-wash)] border-[color-mix(in_srgb,var(--high)_40%,transparent)]',
  mid: 'text-mid bg-panel border-line',
  accent:
    'text-accent bg-[var(--accent-wash)] border-[color-mix(in_srgb,var(--accent)_40%,transparent)]',
  good: 'text-good bg-[var(--good-wash)] border-[color-mix(in_srgb,var(--good)_40%,transparent)]',
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
