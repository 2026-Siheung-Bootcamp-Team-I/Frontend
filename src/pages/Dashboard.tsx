import type { CSSProperties } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import AttackPath, { type AttackStep } from '@/components/ui/AttackPath'

const steps: AttackStep[] = [
  {
    title: '메일 첨부 실행',
    time: '09:14:02',
    color: 'var(--accent)',
    wash: 'var(--accent-wash)',
    strong: false,
    ring: false,
    connector: 'line',
    icon: (
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
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    ),
  },
  {
    title: '스크립트 실행',
    time: '09:14:08',
    color: 'var(--high)',
    wash: 'var(--high-wash)',
    strong: false,
    ring: false,
    connector: 'line',
    icon: (
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
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 9.5l2.5 2.5L7 14.5" />
        <path d="M12.5 15h4" />
      </svg>
    ),
  },
  {
    title: '자격증명 접근',
    time: '09:14:11',
    color: 'var(--crit)',
    wash: 'var(--crit-wash)',
    strong: true,
    ring: true,
    connector: 'crit',
    icon: (
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
        <circle cx="8.5" cy="8.5" r="4.5" />
        <path d="M11.8 11.8L20 20" />
        <path d="M17 17l2.2-2.2" />
      </svg>
    ),
  },
  {
    title: '외부 서버 연결',
    time: '09:14:15',
    color: 'var(--crit)',
    wash: 'var(--crit-wash)',
    strong: true,
    ring: false,
    connector: null,
    icon: (
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
        <rect x="3" y="4" width="18" height="7" rx="1.6" />
        <rect x="3" y="13" width="18" height="7" rx="1.6" />
        <path d="M6.5 7.5h.01" />
        <path d="M6.5 16.5h.01" />
      </svg>
    ),
  },
]

type ThreatRow = {
  dot: string
  title: string
  host: string
  severity: 'crit' | 'high' | 'mid'
  severityLabel: string
  time: string
  last?: boolean
}

const threatRows: ThreatRow[] = [
  {
    dot: 'var(--crit)',
    title: '관리자 권한 상승 시도',
    host: 'host-0472',
    severity: 'crit',
    severityLabel: '심각',
    time: '2분 전',
  },
  {
    dot: 'var(--crit)',
    title: '자격증명 접근 탐지',
    host: 'host-0472',
    severity: 'crit',
    severityLabel: '심각',
    time: '5분 전',
  },
  {
    dot: 'var(--high)',
    title: '비정상 외부 연결',
    host: 'host-1180',
    severity: 'high',
    severityLabel: '높음',
    time: '12분 전',
  },
  {
    dot: 'var(--mid)',
    title: '알 수 없는 서명 파일 실행',
    host: 'host-0338',
    severity: 'mid',
    severityLabel: '보통',
    time: '26분 전',
    last: true,
  },
]

const rowGrid = 'grid grid-cols-[14px_1fr_130px_88px_64px] gap-[12px]'

function Dashboard() {
  return (
    <div className="flex flex-col gap-[20px]">
      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-[16px]">
        <div className="bg-surface border border-line rounded-[12px] p-[18px] shadow-[var(--shadow-1)] border-l-[3px] border-l-crit">
          <div className="text-[12px] text-faint">미판단 위협</div>
          <div className="flex items-center gap-[9px] mt-[10px]">
            <span className="font-mono text-[28px] font-medium text-ink tabular-nums">9</span>
            <Badge severity="crit" className="!py-[2px] !px-2">
              심각 2
            </Badge>
          </div>
        </div>
        <div className="bg-surface border border-line rounded-[12px] p-[18px] shadow-[var(--shadow-1)]">
          <div className="text-[12px] text-faint">이번 주 탐지</div>
          <div className="flex items-baseline gap-[5px] mt-[10px]">
            <span className="font-mono text-[28px] font-medium text-ink tabular-nums">128</span>
            <span className="text-[12px] text-good">+18%</span>
          </div>
        </div>
      </div>

      {/* main grid */}
      <div className="grid grid-cols-[1.7fr_1fr] gap-[20px] items-start">
        {/* LEFT column */}
        <div className="flex flex-col gap-[20px]">
          {/* attack path */}
          <Card className="px-[24px] py-[22px]">
            <AttackPath host="host-0472" label="자격증명 탈취 의심 시퀀스" steps={steps} />
            <div className="flex items-center gap-[16px] mt-[24px] px-[18px] py-[16px] bg-panel-2 border border-line-2 rounded-[12px] border-l-[3px] border-l-crit">
              <div className="flex-1">
                <div className="text-[12px] text-faint mb-1">권고 대응</div>
                <div className="text-[13.5px] leading-[1.5] text-ink">
                  <span className="font-mono text-ink-2">host-0472</span> 를 격리하고 스크립트
                  실행을 차단하세요.
                </div>
              </div>
              <span className="whitespace-nowrap text-[13px] font-semibold text-ink-2 border border-line px-[16px] py-[10px] rounded-[10px] cursor-pointer">
                자세히
              </span>
              <span className="whitespace-nowrap text-[13px] font-semibold text-white bg-accent px-[18px] py-[10px] rounded-[10px] cursor-pointer">
                위협 확정
              </span>
            </div>
          </Card>

          {/* recent threats table */}
          <Card className="px-[24px] py-[22px]">
            <div className="flex justify-between items-center mb-[14px]">
              <span className="text-[14px] font-bold text-ink">최근 탐지된 위협</span>
              <span className="text-[12px] font-semibold text-accent cursor-pointer">
                전체 보기 →
              </span>
            </div>
            <div
              className={`${rowGrid} py-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
            >
              <span />
              <span>위협</span>
              <span>호스트</span>
              <span>심각도</span>
              <span className="text-right">시간</span>
            </div>
            {threatRows.map((row) => (
              <div
                key={row.title}
                className={`${rowGrid} items-center py-[12px] pl-[12px] border-l-[3px] ${
                  row.last ? '' : 'border-b border-line-2'
                }`}
                style={{ borderLeftColor: row.dot }}
              >
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: row.dot }} />
                <span className="text-[13.5px] text-ink">{row.title}</span>
                <span className="font-mono text-[12px] text-mid">{row.host}</span>
                <Badge severity={row.severity} className="justify-self-start">
                  {row.severityLabel}
                </Badge>
                <span className="font-mono text-[11px] text-faint text-right">{row.time}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* RIGHT column */}
        <div className="flex flex-col gap-[20px]">
          {/* endpoint status donut */}
          <Card className="px-[24px] py-[22px]">
            <div className="text-[14px] font-bold text-ink mb-[18px]">엔드포인트 상태</div>
            <div className="flex items-center gap-[22px]">
              <div
                className="relative w-[104px] h-[104px] flex-shrink-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(var(--good) 0 43%, var(--high) 43% 71%, var(--crit) 71% 100%)',
                }}
              >
                <div
                  className="absolute inset-[-5px] rounded-full"
                  style={
                    {
                      background:
                        'conic-gradient(from 0deg, transparent 70%, var(--accent) 93%, transparent 100%)',
                      WebkitMask:
                        'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                      mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                      animation: 'edrRingSpin 5s linear infinite',
                    } as CSSProperties
                  }
                />
                <div className="absolute inset-[13px] rounded-full bg-surface flex flex-col items-center justify-center">
                  <span className="font-mono text-[22px] font-medium text-ink tabular-nums leading-none">
                    7
                  </span>
                  <span className="text-[10px] text-faint mt-[2px]">총 엔드포인트</span>
                </div>
              </div>
              <div className="flex flex-col gap-[11px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-good" />
                  <span className="text-[13px] text-ink-2 whitespace-nowrap">정상</span>
                  <span className="font-mono text-[13px] text-ink ml-auto tabular-nums">3</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-high" />
                  <span className="text-[13px] text-ink-2 whitespace-nowrap">주의</span>
                  <span className="font-mono text-[13px] text-ink ml-auto tabular-nums">2</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-crit" />
                  <span className="text-[13px] text-ink-2 whitespace-nowrap">위험</span>
                  <span className="font-mono text-[13px] text-ink ml-auto tabular-nums">2</span>
                </div>
              </div>
            </div>
          </Card>

          {/* threat types top 5 */}
          <Card className="px-[24px] py-[22px]">
            <div className="text-[14px] font-bold text-ink mb-[18px]">위협 유형 TOP 5</div>
            <div className="flex flex-col gap-[15px]">
              <ProgressBar label="악성코드" percent={42} duration={1} />
              <ProgressBar label="권한 상승" percent={24} duration={1.1} opacity={0.82} />
              <ProgressBar label="정보 유출" percent={18} duration={1.2} opacity={0.64} />
              <ProgressBar label="원격 접속" percent={10} duration={1.3} opacity={0.46} />
              <ProgressBar label="기타" percent={6} duration={1.4} color="var(--mid)" muted />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
