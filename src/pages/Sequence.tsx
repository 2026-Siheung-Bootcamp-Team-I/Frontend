import { useState } from 'react'
import type { ReactNode } from 'react'
import Card from '@/components/ui/Card'
import AttackPath, { type AttackStep } from '@/components/ui/AttackPath'

function svg(children: ReactNode) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

const mailIcon = svg(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </>,
)

const scriptIcon = svg(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 9.5l2.5 2.5L7 14.5" />
    <path d="M12.5 15h4" />
  </>,
)

const credIcon = svg(
  <>
    <circle cx="8.5" cy="8.5" r="4.5" />
    <path d="M11.8 11.8L20 20" />
    <path d="M17 17l2.2-2.2" />
  </>,
)

const networkIcon = svg(
  <>
    <rect x="3" y="4" width="18" height="7" rx="1.6" />
    <rect x="3" y="13" width="18" height="7" rx="1.6" />
    <path d="M6.5 7.5h.01" />
    <path d="M6.5 16.5h.01" />
  </>,
)

const targetIcon = svg(
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 12l5.5-3" />
  </>,
)

const downloadIcon = svg(
  <>
    <path d="M12 4v10" />
    <path d="M8 11l4 4 4-4" />
    <path d="M5 19h14" />
  </>,
)

type Severity = 'crit' | 'high' | 'mid'

type Sequence = {
  dot: string
  host: string
  severity: Severity
  severityLabel: string
  title: string
  meta: string
  label: string
  steps: AttackStep[]
  recSuffix: string
}

const dotColor: Record<Severity, string> = {
  crit: 'var(--crit)',
  high: 'var(--high)',
  mid: 'var(--mid)',
}

const labelColor: Record<Severity, string> = {
  crit: 'text-crit',
  high: 'text-high',
  mid: 'text-mid',
}

const sequences: Sequence[] = [
  {
    dot: dotColor.crit,
    host: 'host-0472',
    severity: 'crit',
    severityLabel: '심각',
    title: '자격증명 탈취 의심',
    meta: '4단계 · 09:14',
    label: '자격증명 탈취 의심 시퀀스',
    recSuffix: ' 를 격리하고 스크립트 실행을 차단하세요.',
    steps: [
      {
        icon: mailIcon,
        title: '메일 첨부 실행',
        time: '09:14:02',
        color: 'var(--accent)',
        wash: 'var(--accent-wash)',
        strong: false,
        ring: false,
        connector: 'line',
      },
      {
        icon: scriptIcon,
        title: '스크립트 실행',
        time: '09:14:08',
        color: 'var(--high)',
        wash: 'var(--high-wash)',
        strong: false,
        ring: false,
        connector: 'line',
      },
      {
        icon: credIcon,
        title: '자격증명 접근',
        time: '09:14:11',
        color: 'var(--crit)',
        wash: 'var(--crit-wash)',
        strong: true,
        ring: true,
        connector: 'crit',
      },
      {
        icon: networkIcon,
        title: '외부 서버 연결',
        time: '09:14:15',
        color: 'var(--crit)',
        wash: 'var(--crit-wash)',
        strong: true,
        ring: false,
        connector: null,
      },
    ],
  },
  {
    dot: dotColor.high,
    host: 'host-1180',
    severity: 'high',
    severityLabel: '높음',
    title: '비정상 외부 통신',
    meta: '3단계 · 08:52',
    label: '비정상 외부 통신 시퀀스',
    recSuffix: ' 의 외부 연결을 차단하고 계정을 잠그세요.',
    steps: [
      {
        icon: credIcon,
        title: '원격 로그인',
        time: '08:52:10',
        color: 'var(--accent)',
        wash: 'var(--accent-wash)',
        strong: false,
        ring: false,
        connector: 'line',
      },
      {
        icon: targetIcon,
        title: '내부 포트 스캔',
        time: '08:53:40',
        color: 'var(--high)',
        wash: 'var(--high-wash)',
        strong: false,
        ring: false,
        connector: 'line',
      },
      {
        icon: networkIcon,
        title: '대량 외부 전송',
        time: '08:55:02',
        color: 'var(--crit)',
        wash: 'var(--crit-wash)',
        strong: true,
        ring: false,
        connector: null,
      },
    ],
  },
  {
    dot: dotColor.mid,
    host: 'host-0338',
    severity: 'mid',
    severityLabel: '보통',
    title: '서명 없는 실행',
    meta: '2단계 · 08:20',
    label: '서명 없는 실행 시퀀스',
    recSuffix: ' 에서 서명 없는 스크립트 실행을 차단하세요.',
    steps: [
      {
        icon: downloadIcon,
        title: '파일 다운로드',
        time: '08:20:04',
        color: 'var(--accent)',
        wash: 'var(--accent-wash)',
        strong: false,
        ring: false,
        connector: 'line',
      },
      {
        icon: scriptIcon,
        title: '서명 없는 실행',
        time: '08:20:22',
        color: 'var(--high)',
        wash: 'var(--high-wash)',
        strong: false,
        ring: false,
        connector: null,
      },
    ],
  },
]

function Sequence() {
  const [selected, setSelected] = useState(0)
  const seq = sequences[selected]

  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="text-[20px] font-bold text-ink tracking-[-0.01em]">시퀀스 분석</div>
        <div className="mt-[6px] text-[13px] text-faint">
          개별 행동을 시간순으로 이어 공격 경로로 재구성합니다.
        </div>
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-[20px] items-start">
        {/* sequence list */}
        <Card className="px-[24px] py-[22px] flex flex-col gap-[10px]">
          <div className="text-[13px] font-bold text-ink mb-1">탐지된 시퀀스</div>
          {sequences.map((s, i) => (
            <div
              key={s.host}
              onClick={() => setSelected(i)}
              className={`flex flex-col gap-[6px] p-[14px] rounded-[12px] cursor-pointer border ${
                i === selected
                  ? 'border-accent bg-[var(--accent-wash)]'
                  : 'border-line-2 bg-panel-2'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: s.dot }} />
                <span className="font-mono text-[12px] text-ink-2">{s.host}</span>
                <span className={`ml-auto text-[10.5px] font-semibold ${labelColor[s.severity]}`}>
                  {s.severityLabel}
                </span>
              </div>
              <div className="text-[13px] font-semibold text-ink">{s.title}</div>
              <div className="text-[11.5px] text-faint">{s.meta}</div>
            </div>
          ))}
        </Card>

        {/* selected sequence detail */}
        <Card className="px-[24px] py-[22px]">
          <AttackPath host={seq.host} label={seq.label} steps={seq.steps} />
          <div className="flex items-center gap-[16px] mt-[24px] px-[18px] py-[16px] bg-panel-2 border border-line-2 rounded-[12px] border-l-[3px] border-l-crit">
            <div className="flex-1">
              <div className="text-[12px] text-faint mb-1">권고 대응</div>
              <div className="text-[13.5px] leading-[1.5] text-ink">
                <span className="font-mono text-ink-2">{seq.host}</span>
                {seq.recSuffix}
              </div>
            </div>
            <span className="whitespace-nowrap text-[13px] font-semibold text-white bg-accent px-[18px] py-[10px] rounded-[10px] cursor-pointer">
              위협 확정
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Sequence
