import type { CSSProperties, ReactNode } from 'react'
import ScrollArea from '@/components/ui/ScrollArea'

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
      <div className="flex flex-wrap justify-between items-center gap-[10px] mb-[24px]">
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
      <ScrollArea label="공격 경로 단계">
        {/*
          아이콘·이름·설명을 각각 한 줄(그리드 행)로 깔아야 이름이 몇 줄로 접히든 설명 줄이 나란히 선다.
          단계마다 세로 스택을 쓰면 긴 이름 하나 때문에 그 칸만 설명이 내려앉는다.
        */}
        <div
          className="grid items-start relative gap-y-[10px]"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(120px, 1fr))` }}
        >
          {steps.map((step) => (
            <div key={step.title} className="relative flex justify-center">
              <div
                className="w-[52px] h-[52px] rounded-md flex items-center justify-center"
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
              {step.connector && (
                <Connector color={step.connector === 'crit' ? 'var(--crit)' : 'var(--line)'} />
              )}
            </div>
          ))}
          {/* 프로세스 이름은 공백 없는 긴 한 단어라 wrap-anywhere 로 강제로 접어야 옆 칸을 침범하지 않는다. */}
          {steps.map((step) => (
            <span
              key={step.title}
              className={`px-[6px] text-[12.5px] text-center leading-[1.35] wrap-anywhere ${
                step.strong ? 'font-bold text-crit' : 'font-semibold text-ink'
              }`}
            >
              {step.title}
            </span>
          ))}
          {steps.map((step) => (
            <span
              key={step.title}
              className="px-[6px] font-mono text-[10.5px] text-faint text-center"
            >
              {step.caption}
            </span>
          ))}
        </div>
      </ScrollArea>
    </>
  )
}

export default AttackPath
