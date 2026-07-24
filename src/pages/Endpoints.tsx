import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api'
import type { HostStatus } from '@/api/types'
import Card from '@/components/ui/Card'
import FilterChips from '@/components/ui/FilterChips'
import AsyncState from '@/components/ui/AsyncState'
import ScrollArea from '@/components/ui/ScrollArea'
import { useApi } from '@/hooks/useApi'
import { hostStatusColor, hostStatusLabel, relativeTime } from '@/lib/format'

type Filter = 'all' | HostStatus

const rowGrid = 'grid grid-cols-[1fr_110px_140px_70px] gap-[12px]'

function Endpoints() {
  const [filter, setFilter] = useState<Filter>('all')
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApi(() => api.hosts())

  const hosts = useMemo(() => data ?? [], [data])
  const counts = useMemo(
    () => ({
      healthy: hosts.filter((h) => h.status === 'healthy').length,
      warning: hosts.filter((h) => h.status === 'warning').length,
      critical: hosts.filter((h) => h.status === 'critical').length,
    }),
    [hosts],
  )

  const rows = filter === 'all' ? hosts : hosts.filter((h) => h.status === filter)

  const chips = [
    { label: `전체 ${hosts.length}`, active: filter === 'all', onClick: () => setFilter('all') },
    {
      label: `정상 ${counts.healthy}`,
      active: filter === 'healthy',
      onClick: () => setFilter('healthy'),
    },
    {
      label: `주의 ${counts.warning}`,
      active: filter === 'warning',
      onClick: () => setFilter('warning'),
    },
    {
      label: `위험 ${counts.critical}`,
      active: filter === 'critical',
      onClick: () => setFilter('critical'),
    },
  ]

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex flex-col items-start gap-[16px] sm:flex-row sm:justify-between sm:items-end">
        <div>
          <div className="text-[18px] sm:text-[20px] font-bold text-ink tracking-[-0.01em]">
            엔드포인트
          </div>
          <div className="mt-[6px] text-[13px] text-faint">
            에이전트가 관측 중인 호스트의 상태입니다.
          </div>
        </div>
        <FilterChips chips={chips} />
      </div>

      <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
        <AsyncState
          loading={loading}
          error={error}
          empty={rows.length === 0}
          emptyText="관측된 호스트가 없습니다"
          onRetry={refetch}
        >
          <ScrollArea label="엔드포인트 목록">
            <div className="min-w-[520px]">
              <div
                className={`${rowGrid} py-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
              >
                <span>호스트</span>
                <span>상태</span>
                <span>마지막 활동</span>
                <span className="text-right">위협</span>
              </div>
              {rows.map((row, i) => {
                const clickable = row.threats > 0
                const goToThreats = () => navigate('/threats?host=' + encodeURIComponent(row.host))
                return (
                  <div
                    key={row.host}
                    className={`${rowGrid} items-center py-[13px] ${
                      i === rows.length - 1 ? '' : 'border-b border-line-2'
                    } ${clickable ? 'cursor-pointer hover:bg-panel' : ''}`}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? goToThreats : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              if (e.key === ' ') e.preventDefault()
                              goToThreats()
                            }
                          }
                        : undefined
                    }
                  >
                    <span className="font-mono text-[13px] text-ink">{row.host}</span>
                    <span
                      className="inline-flex items-center gap-[7px] text-[12.5px] font-semibold"
                      style={{ color: hostStatusColor(row.status) }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: hostStatusColor(row.status) }}
                      />
                      {hostStatusLabel(row.status)}
                    </span>
                    <span className="font-mono text-[12px] text-faint">
                      {relativeTime(row.lastSeen)}
                    </span>
                    <span
                      className={`font-mono text-[12.5px] text-right ${
                        row.threats > 0 ? 'text-crit' : 'text-faint'
                      }`}
                    >
                      {row.threats}
                    </span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </AsyncState>
      </Card>
    </div>
  )
}

export default Endpoints
