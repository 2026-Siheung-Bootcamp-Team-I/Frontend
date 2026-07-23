import Card from '@/components/ui/Card'
import FilterChips from '@/components/ui/FilterChips'

type Status = 'crit' | 'high' | 'good'

type EndpointRow = {
  host: string
  status: Status
  statusLabel: string
  lastSeen: string
  threats: number
}

const statusColor: Record<Status, string> = {
  crit: 'var(--crit)',
  high: 'var(--high)',
  good: 'var(--good)',
}

const rows: EndpointRow[] = [
  { host: 'host-0472', status: 'crit', statusLabel: '위험', lastSeen: '방금', threats: 2 },
  { host: 'host-1180', status: 'high', statusLabel: '주의', lastSeen: '3분 전', threats: 1 },
  { host: 'host-0912', status: 'good', statusLabel: '정상', lastSeen: '1분 전', threats: 0 },
  { host: 'host-0338', status: 'high', statusLabel: '주의', lastSeen: '8분 전', threats: 1 },
  { host: 'host-0455', status: 'good', statusLabel: '정상', lastSeen: '2분 전', threats: 0 },
  { host: 'host-0781', status: 'good', statusLabel: '정상', lastSeen: '5분 전', threats: 0 },
  { host: 'host-1043', status: 'crit', statusLabel: '위험', lastSeen: '12분 전', threats: 1 },
]

const rowGrid = 'grid grid-cols-[1fr_110px_140px_70px] gap-[12px]'

const chips = [{ label: '정상 3', active: true }, { label: '주의 2' }, { label: '위험 2' }]

function Endpoints() {
  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex justify-between items-end gap-[16px] flex-wrap">
        <div>
          <div className="text-[20px] font-bold text-ink tracking-[-0.01em]">엔드포인트</div>
          <div className="mt-[6px] text-[13px] text-faint">
            에이전트가 관측 중인 호스트의 상태입니다.
          </div>
        </div>
        <FilterChips chips={chips} />
      </div>

      <Card className="px-[24px] py-[22px]">
        <div
          className={`${rowGrid} py-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
        >
          <span>호스트</span>
          <span>상태</span>
          <span>마지막 활동</span>
          <span className="text-right">위협</span>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.host}
            className={`${rowGrid} items-center py-[13px] ${
              i === rows.length - 1 ? '' : 'border-b border-line-2'
            }`}
          >
            <span className="font-mono text-[13px] text-ink">{row.host}</span>
            <span
              className="inline-flex items-center gap-[7px] text-[12.5px] font-semibold"
              style={{ color: statusColor[row.status] }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: statusColor[row.status] }}
              />
              {row.statusLabel}
            </span>
            <span className="font-mono text-[12px] text-faint">{row.lastSeen}</span>
            <span
              className={`font-mono text-[12.5px] text-right ${
                row.threats > 0 ? 'text-crit' : 'text-faint'
              }`}
            >
              {row.threats}
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}

export default Endpoints
