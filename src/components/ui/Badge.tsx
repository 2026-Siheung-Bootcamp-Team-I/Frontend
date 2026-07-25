import type { ReactNode } from 'react'

type Severity = 'crit' | 'high' | 'mid' | 'accent' | 'good'

const styles: Record<Severity, string> = {
  crit: 'text-crit bg-[var(--crit-wash)]',
  high: 'text-high bg-[var(--high-wash)]',
  mid: 'text-mid bg-panel',
  accent: 'text-accent bg-[var(--accent-wash)]',
  good: 'text-good bg-[color-mix(in_srgb,var(--good)_16%,transparent)]',
}

type BadgeProps = {
  severity: Severity
  children: ReactNode
  className?: string
}

function Badge({ severity, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`text-[11px] font-semibold px-[9px] py-[3px] rounded-xs ${styles[severity]} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
