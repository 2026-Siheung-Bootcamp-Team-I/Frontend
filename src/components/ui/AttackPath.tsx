import type { CSSProperties, ReactNode } from 'react'

export type AttackStep = {
  icon: ReactNode
  title: string
  /** 단계 아래 작게 붙는 부가 설명(노드 종류·시각 등) */
  caption: string
  color: string
  wash: string
  strong: boolean
  ring: boolean
  connector: 'line' | 'crit' | null
}

function Connector({ color }: { color: string }) {
  return (
    <div className="absolute top-[24px] left-[calc(50%+30px)] w-[calc(100%-60px)] h-[6px] flex items-center">
      <div className="flex-1 h-[2px]" style={{ background: color }} />
      <div
        className="w-[6px] h-[6px] rotate-45 -ml-1 flex-shrink-0"
        style={{ borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }}
      />
    </div>
  )
}

type AttackPathProps = {
  host: string
  label: string
  steps: AttackStep[]
}

function AttackPath({ host, label, steps }: AttackPathProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-[24px]">
        <div className="flex flex-col gap-[3px]">
          <span className="text-[14px] font-bold text-ink">공격 경로 재구성</span>
          <span className="text-[12px] text-faint">
            <span className="font-mono">{host}</span> · {label}
          </span>
        </div>
        <span className="inline-flex items-center gap-[7px] text-[11.5px] font-semibold text-accent bg-[var(--accent-wash)] px-[11px] py-1 rounded-full">
          dry-run · 실행 안 됨
        </span>
      </div>
      <div
        className="grid items-start relative"
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
      >
        {steps.map((step) => (
          <div key={step.title} className="flex flex-col items-center gap-[10px] relative">
            <div
              className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center"
              style={
                {
                  border: `1.8px solid ${step.color}`,
                  background: step.wash,
                  color: step.color,
                  boxShadow: step.ring ? `0 0 0 4px ${step.wash}` : undefined,
                } as CSSProperties
              }
            >
              {step.icon}
            </div>
            <span
              className={`text-[12.5px] text-center ${
                step.strong ? 'font-bold text-crit' : 'font-semibold text-ink'
              }`}
            >
              {step.title}
            </span>
            <span className="font-mono text-[10.5px] text-faint">{step.caption}</span>
            {step.connector && (
              <Connector color={step.connector === 'crit' ? 'var(--crit)' : 'var(--line)'} />
            )}
          </div>
        ))}
      </div>
    </>
  )
}

export default AttackPath
