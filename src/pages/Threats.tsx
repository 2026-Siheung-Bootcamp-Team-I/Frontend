import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import FilterChips from '@/components/ui/FilterChips'

type Severity = 'crit' | 'high' | 'mid'
type Status = 'crit' | 'accent' | 'good' | 'mid'

type ThreatRow = {
  title: string
  host: string
  severity: Severity
  severityLabel: string
  status: Status
  statusLabel: string
  time: string
}

const severityColor: Record<Severity, string> = {
  crit: 'var(--crit)',
  high: 'var(--high)',
  mid: 'var(--mid)',
}

const rows: ThreatRow[] = [
  {
    title: '관리자 권한 상승 시도',
    host: 'host-0472',
    severity: 'crit',
    severityLabel: '심각',
    status: 'crit',
    statusLabel: '미판단',
    time: '2분 전',
  },
  {
    title: '자격증명 접근 탐지',
    host: 'host-0472',
    severity: 'crit',
    severityLabel: '심각',
    status: 'accent',
    statusLabel: '조사중',
    time: '5분 전',
  },
  {
    title: '랜섬웨어 의심 암호화',
    host: 'host-0912',
    severity: 'crit',
    severityLabel: '심각',
    status: 'good',
    statusLabel: '확정',
    time: '22분 전',
  },
  {
    title: '비정상 외부 연결',
    host: 'host-1180',
    severity: 'high',
    severityLabel: '높음',
    status: 'crit',
    statusLabel: '미판단',
    time: '12분 전',
  },
  {
    title: '다량 파일 접근',
    host: 'host-0338',
    severity: 'high',
    severityLabel: '높음',
    status: 'accent',
    statusLabel: '조사중',
    time: '40분 전',
  },
  {
    title: '알 수 없는 서명 파일 실행',
    host: 'host-0338',
    severity: 'mid',
    severityLabel: '보통',
    status: 'mid',
    statusLabel: '무시',
    time: '1시간 전',
  },
  {
    title: '예약 작업 등록',
    host: 'host-0455',
    severity: 'mid',
    severityLabel: '보통',
    status: 'good',
    statusLabel: '확정',
    time: '2시간 전',
  },
]

const rowGrid = 'grid grid-cols-[14px_1fr_120px_84px_96px_72px] gap-[12px]'

const chips = [
  { label: '전체 24', active: true },
  { label: '심각 2' },
  { label: '높음 3' },
  { label: '보통 4' },
  { label: '처리됨 15' },
]

function Threats() {
  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex justify-between items-end gap-[16px] flex-wrap">
        <div>
          <div className="text-[20px] font-bold text-ink tracking-[-0.01em]">위협</div>
          <div className="mt-[6px] text-[13px] text-faint">
            탐지된 위협을 심각도와 상태로 관리합니다.
          </div>
        </div>
        <FilterChips chips={chips} />
      </div>

      <Card className="px-[24px] py-[22px]">
        <div
          className={`${rowGrid} pt-2 pb-2 pl-[12px] border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
        >
          <span />
          <span>위협</span>
          <span>호스트</span>
          <span>심각도</span>
          <span>상태</span>
          <span className="text-right">탐지</span>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.title}
            className={`${rowGrid} items-center py-[12px] pl-[12px] border-l-[3px] ${
              i === rows.length - 1 ? '' : 'border-b border-line-2'
            }`}
            style={{ borderLeftColor: severityColor[row.severity] }}
          >
            <span
              className="w-[7px] h-[7px] rounded-full"
              style={{ background: severityColor[row.severity] }}
            />
            <span className="text-[13.5px] text-ink">{row.title}</span>
            <span className="font-mono text-[12px] text-mid">{row.host}</span>
            <Badge severity={row.severity} className="justify-self-start">
              {row.severityLabel}
            </Badge>
            <Badge severity={row.status} className="justify-self-start">
              {row.statusLabel}
            </Badge>
            <span className="font-mono text-[11px] text-faint text-right">{row.time}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

export default Threats
