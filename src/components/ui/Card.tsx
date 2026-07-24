import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-surface border border-line rounded-[14px] shadow-[var(--shadow-1)] ${className}`}
    >
      {children}
    </div>
  )
}

export default Card
