import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import ScrollArea from '@/components/ui/ScrollArea'

export type ChainStep = {
  /** 단계 이름. 칸 위에 작게 붙는다. */
  label: string
  /** 굵게 보여줄 값. null 이면 그 단계를 찾지 못한 것이라 칸만 남기고 비운다. */
  value: string | null
  /** 값 아래 작게 붙는 보조 정보(룰 id, 시각 등). */
  sub?: string
  /** 지금 보고 있는 위치. */
  active?: boolean
  /** 확실히 특정한 게 아니라 추정으로 이은 단계. */
  estimated?: boolean
  /** 추정 배지 문구. 확신 정도가 단계마다 다를 때만 준다. 기본은 '추정'. */
  estimatedLabel?: string
  /** 추정·미확인 이유나 이 단계를 읽는 데 필요한 설명. 띠 아래에 한 줄로 붙는다. */
  note?: string
  /** 이 단계로 갈 수 있는 경로. 열리지 않을 곳이면 주지 않는다(링크가 아예 안 생긴다). */
  to?: string
}

/**
 * 알림이 어디서 왔고 어디로 이어지는지 한 줄로 잇는 띠.
 * 못 찾은 단계도 칸을 남겨야 사슬이 어디서 끊겼는지 보이고,
 * 추정으로 이은 단계는 확실한 단계와 다르게 그려야 추정이 사실로 읽히지 않는다.
 */
function EvidenceChain({ steps }: { steps: ChainStep[] }) {
  const notes = steps.filter((step) => step.note)

  return (
    <div>
      <ScrollArea label="증거 사슬">
        <div className="flex items-stretch py-[2px]">
          {steps.map((step, i) => (
            <Fragment key={step.label}>
              {i > 0 && <Arrow />}
              <Cell step={step} />
            </Fragment>
          ))}
        </div>
      </ScrollArea>
      {notes.length > 0 && (
        <div className="mt-[8px] flex flex-col gap-[3px]">
          {notes.map((step) => (
            <div key={step.label} className="text-[11.5px] leading-[1.5] text-faint">
              {step.label} · {step.note}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Cell({ step }: { step: ChainStep }) {
  const missing = step.value === null

  return (
    <div
      className={`flex min-w-0 shrink-0 grow basis-[152px] flex-col gap-[4px] rounded-md border px-[11px] py-[9px] ${
        step.active ? 'border-accent bg-[var(--accent-wash)]' : 'border-line-2 bg-panel'
      } ${missing || step.estimated ? 'border-dashed' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-[5px]">
        <span className={`text-[10.5px] ${step.active ? 'text-accent' : 'text-faint'}`}>
          {step.label}
        </span>
        {step.estimated && (
          <span className="rounded-full border border-line px-[6px] text-[10px] text-mid">
            {step.estimatedLabel ?? '추정'}
          </span>
        )}
      </div>
      {/* 값은 호스트명·룰 id 처럼 길 수 있다. 잘라내면 조사에 필요한 부분이 사라지므로 접는다. */}
      {missing ? (
        <span className="text-[12.5px] text-faint">찾지 못함</span>
      ) : step.to ? (
        <Link to={step.to} className="text-[12.5px] font-bold wrap-anywhere hover:underline">
          {step.value}
        </Link>
      ) : (
        <span className="text-[12.5px] font-bold text-ink wrap-anywhere">{step.value}</span>
      )}
      {step.sub && (
        <span className="font-mono text-[10.5px] text-faint wrap-anywhere">{step.sub}</span>
      )}
    </div>
  )
}

function Arrow() {
  return (
    <div aria-hidden className="flex w-[24px] shrink-0 items-center justify-center text-faint">
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <path
          d="M1 5h14M11 1l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export default EvidenceChain
