import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api'
import type { AlertStatus } from '@/api/types'
import ActiveFilters, { type ActiveFilter } from '@/components/ui/ActiveFilters'
import AsyncState from '@/components/ui/AsyncState'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import ScrollArea from '@/components/ui/ScrollArea'
import Select from '@/components/ui/Select'
import { useApi } from '@/hooks/useApi'
import {
  absoluteTime,
  clockTime,
  relativeTime,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
} from '@/lib/format'
import { useAlertsStore } from '@/store/alerts'

const LIMIT = 200

const HOUR = 3_600_000

const PERIODS = [
  { value: '24', label: '최근 24시간', hours: 24 },
  { value: '168', label: '최근 7일', hours: 168 },
  { value: '720', label: '최근 30일', hours: 720 },
  { value: 'all', label: '전체 기간', hours: null },
] as const

/** 서버 기본 조회 구간과 같다. */
const DEFAULT_PERIOD = '168'

const ALL_STATUS = 'all'

const STATUS_OPTIONS = [
  { value: ALL_STATUS, label: '전체 상태' },
  { value: 'open', label: '미판단' },
  { value: 'confirmed', label: '확정' },
  { value: 'false_positive', label: '오탐' },
]

// 위협 / 호스트 / 루트 프로세스 / 심각도 / 상태 / 알림 수 / 기간 / 마지막 활동
const rowGrid = 'grid grid-cols-[1fr_128px_150px_78px_86px_60px_160px_84px] gap-[12px] px-[4px]'

function Incidents() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<string>(DEFAULT_PERIOD)
  const [status, setStatus] = useState<string>(ALL_STATUS)
  // 상세에서 트리아지하면 목록도 새 status 로 다시 받아야 한다.
  const alertsVersion = useAlertsStore((s) => s.version)

  const { data, loading, error, refetch } = useApi(() => {
    const hours = PERIODS.find((p) => p.value === period)?.hours ?? null
    return api.incidents({
      status: status === ALL_STATUS ? undefined : (status as AlertStatus),
      from: hours === null ? undefined : Date.now() - hours * HOUR,
      limit: LIMIT,
    })
  }, [period, status, alertsVersion])

  const rows = useMemo(() => data ?? [], [data])

  const activeFilters: ActiveFilter[] = [
    ...(period === DEFAULT_PERIOD
      ? []
      : [
          {
            label: '기간',
            value: PERIODS.find((p) => p.value === period)?.label ?? period,
            onClear: () => setPeriod(DEFAULT_PERIOD),
          },
        ]),
    ...(status === ALL_STATUS
      ? []
      : [
          {
            label: '상태',
            value: statusLabel(status),
            onClear: () => setStatus(ALL_STATUS),
          },
        ]),
  ]

  return (
    <div className="flex flex-col gap-[16px]">
      <div>
        <div className="text-[18px] sm:text-[20px] font-bold text-ink tracking-[-0.01em]">사건</div>
        <div className="mt-[6px] text-[13px] text-faint">
          같은 공격 체인으로 이어진 알림을 하나의 사건으로 묶어 봅니다.
        </div>
      </div>

      <Card className="px-[16px] py-[16px] sm:px-[20px]">
        <div className="grid gap-[14px] sm:grid-cols-2">
          <Select
            label="기간"
            value={period}
            options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            onChange={setPeriod}
          />
          <Select label="상태" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        </div>
      </Card>

      <ActiveFilters filters={activeFilters} />

      <Card>
        <div className="flex items-baseline justify-between gap-[12px] border-b border-line-2 px-[16px] py-[14px] sm:px-[24px]">
          <span className="text-[14px] font-bold text-ink">사건 목록</span>
          <span className="font-mono text-[12px] text-faint">{rows.length}건</span>
        </div>
        <div className="px-[16px] py-[14px] sm:px-[24px] sm:py-[18px]">
          <AsyncState
            loading={loading}
            error={error}
            empty={rows.length === 0}
            emptyText="조건에 맞는 사건이 없습니다"
            onRetry={refetch}
          >
            <ScrollArea label="사건 목록">
              <div className="min-w-[1000px]">
                <div
                  className={`${rowGrid} pt-2 pb-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
                >
                  <span>위협</span>
                  <span>호스트</span>
                  <span>루트 프로세스</span>
                  <span>심각도</span>
                  <span>상태</span>
                  <span className="text-right">알림</span>
                  <span>기간</span>
                  <span className="text-right">마지막 활동</span>
                </div>
                {rows.map((row, i) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => navigate(`/incidents/${encodeURIComponent(row.id)}`)}
                    className={`${rowGrid} w-full items-center py-[11px] text-left font-sans cursor-pointer hover:bg-panel rounded-xs ${
                      i === rows.length - 1 ? '' : 'border-b border-line-2'
                    }`}
                  >
                    {/* 대표 위협명 아래에 detector 룰 원문을 깐다. 조사할 때 대조하는 값은 ruleId 다. */}
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-ink">
                        {row.threatNames[0] ?? '위협명 없음'}
                        {row.threatNames.length > 1 && (
                          <span className="text-faint"> 외 {row.threatNames.length - 1}건</span>
                        )}
                      </span>
                      <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                        {row.ruleIds.join(', ')}
                      </span>
                    </span>
                    <span className="truncate font-mono text-[12px] text-mid">{row.host}</span>
                    {/* 빈 문자열은 원본 이벤트를 못 찾았다는 뜻이다. 프로세스명을 지어내지 않는다. */}
                    <span className="truncate font-mono text-[12px] text-mid">
                      {row.rootProcess || <span className="font-sans text-faint">확인 불가</span>}
                    </span>
                    <Badge severity={severityTone(row.severity)} className="justify-self-start">
                      {severityLabel(row.severity)}
                    </Badge>
                    <Badge severity={statusTone(row.status)} className="justify-self-start">
                      {statusLabel(row.status)}
                    </Badge>
                    <span className="text-right font-mono text-[12px] text-mid">
                      {row.alertCount}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[11.5px] text-ink-2">
                        {absoluteTime(row.firstTs)}
                      </span>
                      <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                        ~ {clockTime(row.lastTs)}
                      </span>
                    </span>
                    <span className="text-right text-[11.5px] text-faint">
                      {relativeTime(row.lastTs)}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </AsyncState>
        </div>
      </Card>
    </div>
  )
}

export default Incidents
