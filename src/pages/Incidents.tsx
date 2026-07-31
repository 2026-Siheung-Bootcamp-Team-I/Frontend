import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api'
import { ApiError, type Page } from '@/api/client'
import type { AlertStatus, Incident } from '@/api/types'
import ActiveFilters, { type ActiveFilter } from '@/components/ui/ActiveFilters'
import AsyncState from '@/components/ui/AsyncState'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import ScrollArea from '@/components/ui/ScrollArea'
import Select from '@/components/ui/Select'
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
import { useRefreshStore } from '@/store/refresh'

/** 한 쪽 크기. 더 볼 것은 아래 더 보기로 이어 붙인다. */
const LIMIT = 50

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

/** 다음 쪽 요청에 실을 값. from/to 는 첫 쪽에서 서버가 알려준 구간 그대로다. */
type PageRequest = { offset: number; withTotal?: boolean; from?: number; to?: number }

/** offset 상한을 넘으면 400 이다. 다시 눌러도 같으므로 기간을 좁히라고 알린다. */
function moreErrorText(e: Error): string {
  if (e instanceof ApiError && e.status === 400) {
    return '여기서 더 깊이는 한 번에 볼 수 없습니다. 기간을 좁혀서 다시 조회해 주세요.'
  }
  return e.message
}

/**
 * 쪽 단위로 받아 이어 붙이는 목록. deps 가 바뀌면 쌓아 둔 행과 구간을 버리고 첫 쪽부터 다시 받는다.
 * 전역 새로고침도 첫 쪽부터 다시 받는다. 덧붙이면 갱신인데 옛 행이 남는다.
 */
function usePagedList<T>(fetchPage: (page: PageRequest) => Promise<Page<T>>, deps: unknown[]) {
  const [state, setState] = useState({
    rows: [] as T[],
    total: null as number | null,
    hasMore: false,
    loading: true,
    loadingMore: false,
    error: null as string | null,
    moreError: null as string | null,
  })
  const [nonce, setNonce] = useState(0)
  const refreshVersion = useRefreshStore((s) => s.version)

  // fetchPage 는 매 렌더 새로 만들어지므로 재실행 기준은 deps 뿐이다(useApi 와 같다).
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage
  // 첫 쪽에서 서버가 실제로 적용한 구간. 그대로 되돌려주지 않으면 행이 겹치거나 건너뛰어진다.
  const range = useRef<{ from?: number; to?: number }>({})
  const offset = useRef(0)
  // 늦게 도착한 응답을 버린다.
  const seq = useRef(0)

  const key = JSON.stringify(deps)
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    // 렌더 중에 판정하면 StrictMode 의 이중 렌더에서 두 번째가 같은 조건으로 잘못 읽힌다.
    const sameQuery = lastKey.current === key
    lastKey.current = key
    const id = ++seq.current
    offset.current = 0
    range.current = {}
    // 조건이 그대로인 재조회면 보던 줄을 지우지 않는다. 다만 offset 이 0 으로 돌아갔으므로 더 보기는 막는다.
    setState((prev) =>
      sameQuery
        ? { ...prev, loadingMore: true, error: null, moreError: null }
        : {
            rows: [],
            total: null,
            hasMore: false,
            loading: true,
            loadingMore: false,
            error: null,
            moreError: null,
          },
    )
    // withTotal 은 첫 쪽에만. 서버가 count 쿼리를 한 번 더 돈다.
    fetchRef
      .current({ offset: 0, withTotal: true })
      .then((page) => {
        if (seq.current !== id) return
        range.current = { from: page.from ?? undefined, to: page.to ?? undefined }
        offset.current = page.rows.length
        setState({
          rows: page.rows,
          total: page.total,
          hasMore: page.hasMore,
          loading: false,
          loadingMore: false,
          error: null,
          moreError: null,
        })
      })
      .catch((e: Error) => {
        if (seq.current !== id) return
        setState({
          rows: [],
          total: null,
          hasMore: false,
          loading: false,
          loadingMore: false,
          error: e.message,
          moreError: null,
        })
      })
  }, [key, nonce, refreshVersion])

  const loadMore = useCallback(() => {
    const id = ++seq.current
    setState((prev) => ({ ...prev, loadingMore: true, moreError: null }))
    fetchRef
      .current({ offset: offset.current, ...range.current })
      .then((page) => {
        if (seq.current !== id) return
        offset.current += page.rows.length
        setState((prev) => ({
          ...prev,
          rows: [...prev.rows, ...page.rows],
          hasMore: page.hasMore,
          loadingMore: false,
        }))
      })
      .catch((e: Error) => {
        if (seq.current !== id) return
        setState((prev) => ({ ...prev, loadingMore: false, moreError: moreErrorText(e) }))
      })
  }, [])

  return { ...state, loadMore, reload: () => setNonce((n) => n + 1) }
}

function Incidents() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<string>(DEFAULT_PERIOD)
  const [status, setStatus] = useState<string>(ALL_STATUS)
  // 상세에서 트리아지하면 목록도 새 status 로 다시 받아야 한다.
  const alertsVersion = useAlertsStore((s) => s.version)

  const { rows, total, hasMore, loading, loadingMore, error, moreError, loadMore, reload } =
    usePagedList<Incident>(
      (page) => {
        const hours = PERIODS.find((p) => p.value === period)?.hours ?? null
        return api.incidentPage({
          status: status === ALL_STATUS ? undefined : (status as AlertStatus),
          // 첫 쪽이면 고른 기간으로 열고, 다음 쪽부터는 서버가 잡은 구간을 그대로 되돌려준다.
          from: page.from ?? (hours === null ? undefined : Date.now() - hours * HOUR),
          to: page.to,
          limit: LIMIT,
          offset: page.offset,
          withTotal: page.withTotal,
        })
      },
      [period, status, alertsVersion],
    )

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
          <span className="font-mono text-[12px] text-faint">
            {total === null ? `${rows.length}건` : `${rows.length} / ${total}건`}
          </span>
        </div>
        <div className="px-[16px] py-[14px] sm:px-[24px] sm:py-[18px]">
          <AsyncState
            loading={loading}
            error={error}
            empty={rows.length === 0}
            emptyText="조건에 맞는 사건이 없습니다"
            onRetry={reload}
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
            {moreError && (
              <div className="mt-[12px] text-center text-[12.5px] text-crit">{moreError}</div>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-[12px] w-full cursor-pointer rounded-sm border border-line bg-surface px-[14px] py-[9px] text-[12.5px] font-semibold text-ink-2 disabled:cursor-default disabled:text-faint"
              >
                {loadingMore ? '불러오는 중' : '더 보기'}
              </button>
            )}
          </AsyncState>
        </div>
      </Card>
    </div>
  )
}

export default Incidents
