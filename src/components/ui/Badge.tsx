import type { ReactNode } from 'react'

type Severity = 'crit' | 'high' | 'mid'

const styles: Record<Severity, string> = {
  crit: 'text-crit bg-[var(--crit-wash)]',
  high: 'text-high bg-[var(--high-wash)]',
  mid: 'text-mid bg-panel',
}

type BadgeProps = {
  severity: Severity
  children: ReactNode
  className?: string
}

function Badge({ severity, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`text-[11px] font-semibold px-[9px] py-[3px] rounded-full ${styles[severity]} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
