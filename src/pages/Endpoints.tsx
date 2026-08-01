import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api'
import type { Host, HostStatus } from '@/api/types'
import Card from '@/components/ui/Card'
import FilterChips from '@/components/ui/FilterChips'
import AsyncState from '@/components/ui/AsyncState'
import ScrollArea from '@/components/ui/ScrollArea'
import { useApi } from '@/hooks/useApi'
import { hostStatusColor, hostStatusLabel, platformLabel, relativeTime } from '@/lib/format'

// HostStatus 와 별개 축이다. 등록은 됐지만 이벤트가 아직 없는 기기는 열린 알림이 없어
// status 는 항상 healthy 로 오는데, 그걸 그대로 "정상"에 합치면 검증 안 된 상태를 좋다고
// 말하는 셈이라 필터·카운트에서 따로 뗀다.
type Filter = 'all' | HostStatus | 'noEvents'

function isNoEvents(h: Host): boolean {
  return h.enrolled && h.lastSeen === 0
}

const rowGrid = 'grid grid-cols-[1fr_90px_100px_120px_120px_110px_70px] gap-[12px]'

function Endpoints() {
  const [filter, setFilter] = useState<Filter>('all')
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApi(() => api.hosts())

  const hosts = useMemo(() => data ?? [], [data])
  const counts = useMemo(
    () => ({
      healthy: hosts.filter((h) => h.status === 'healthy' && !isNoEvents(h)).length,
      warning: hosts.filter((h) => h.status === 'warning').length,
      critical: hosts.filter((h) => h.status === 'critical').length,
      noEvents: hosts.filter(isNoEvents).length,
    }),
    [hosts],
  )

  const rows =
    filter === 'all'
      ? hosts
      : filter === 'noEvents'
        ? hosts.filter(isNoEvents)
        : hosts.filter((h) => h.status === filter && !isNoEvents(h))

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
    {
      label: `수집 없음 ${counts.noEvents}`,
      active: filter === 'noEvents',
      onClick: () => setFilter('noEvents'),
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
            등록됐거나 에이전트가 관측 중인 호스트의 상태입니다.
          </div>
        </div>
        <FilterChips chips={chips} />
      </div>

      <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
        <AsyncState
          loading={loading}
          error={error}
          empty={rows.length === 0}
          emptyText="등록되거나 관측된 호스트가 없습니다"
          onRetry={refetch}
        >
          <ScrollArea label="엔드포인트 목록">
            <div className="min-w-[800px]">
              <div
                className={`${rowGrid} py-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
              >
                <span>호스트</span>
                <span>OS</span>
                <span>상태</span>
                <span>위험도</span>
                <span>마지막 활동</span>
                <span>에이전트 연결</span>
                <span className="text-right">위협</span>
              </div>
              {rows.map((row, i) => {
                // 위협 0건인 기기도 상세에서 볼 게 있어 모든 줄이 상세로 간다.
                const goToDetail = () => navigate('/endpoints/' + encodeURIComponent(row.host))
                const noEvents = isNoEvents(row)
                return (
                  <div
                    key={row.host}
                    className={`${rowGrid} items-center py-[13px] cursor-pointer hover:bg-panel ${
                      i === rows.length - 1 ? '' : 'border-b border-line-2'
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={goToDetail}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (e.key === ' ') e.preventDefault()
                        goToDetail()
                      }
                    }}
                  >
                    <span className="font-mono text-[13px] text-ink">{row.host}</span>
                    <span className="text-[12px] text-faint">{platformLabel(row.platform)}</span>
                    <span
                      className="inline-flex items-center gap-[7px] text-[12.5px] font-semibold"
                      style={{ color: noEvents ? 'var(--faint)' : hostStatusColor(row.status) }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: noEvents ? 'var(--faint)' : hostStatusColor(row.status),
                        }}
                      />
                      {noEvents ? '수집 없음' : hostStatusLabel(row.status)}
                    </span>
                    <span className="flex items-center gap-[8px]">
                      <span className="w-[22px] text-right font-mono text-[12px] text-ink tabular-nums">
                        {row.riskScore}
                      </span>
                      <span className="h-[5px] flex-1 overflow-hidden rounded-xs bg-panel">
                        <span
                          className="block h-full rounded-xs"
                          style={{
                            width: `${row.riskScore}%`,
                            background: noEvents ? 'var(--faint)' : hostStatusColor(row.status),
                          }}
                        />
                      </span>
                    </span>
                    <span className="font-mono text-[12px] text-faint">
                      {noEvents ? '수집 없음' : relativeTime(row.lastSeen)}
                    </span>
                    <span className="font-mono text-[12px] text-faint">
                      {row.enrolled ? relativeTime(row.agentSeen) : '-'}
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
        {/*
          위험도가 무엇을 센 값인지만 밝힌다. 상태를 어떻게 정하는지는 서버 규칙이라 여기 적지 않는다.
          적어 두면 서버가 규칙을 바꿀 때 화면만 옛 설명을 계속 사실처럼 보여준다.
        */}
        <div className="mt-[16px] text-[12px] leading-[1.5] text-faint">
          위험도는 열린 알림을 심각도로 가중해 더한 0~100 값입니다. 0 은 열린 알림이 없다는 뜻입니다.
        </div>
      </Card>
    </div>
  )
}

export default Endpoints
