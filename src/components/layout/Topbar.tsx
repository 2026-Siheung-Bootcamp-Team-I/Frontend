import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/store/theme'
import { useAlertsStore } from '@/store/alerts'
import { useAuthStore } from '@/store/auth'
import { useApi } from '@/hooks/useApi'
import { api } from '@/api'
import type { SearchEvent } from '@/api/types'
import { MIN_QUERY } from '@/lib/search'
import {
  absoluteTime,
  eventTypeLabel,
  severityColors,
  severityTone,
  hostStatusColor,
  hostStatusLabel,
} from '@/lib/format'
import { useRefreshStore, INTERVALS, type RefreshInterval } from '@/store/refresh'

const intervalLabels: Record<RefreshInterval, string> = {
  0: '끄기',
  10: '10초',
  30: '30초',
  60: '1분',
  300: '5분',
}

const titles: Record<string, string> = {
  '/dashboard': '대시보드',
  '/threats': '위협',
  '/incidents': '사건',
  '/endpoints': '엔드포인트',
  '/events': '수집 로그',
  '/map': '위협 지도',
  '/intelligence': '관계 분석',
  '/lookup': 'IP·도메인 조회',
  '/onboarding': '수집 알림 연동',
}

type Crumb = { label: string; to?: string }

/**
 * 화면이 깊어지면(사건 상세) 제목만으로는 어디에 있는지 알 수 없다.
 * 제목 위에 경로를 한 줄 깔아 위치와 돌아갈 곳을 같이 보여준다.
 */
function trailOf(pathname: string): Crumb[] {
  if (pathname.startsWith('/incidents/')) {
    return [{ label: '사건', to: '/incidents' }, { label: '사건 상세' }]
  }
  if (pathname.startsWith('/endpoints/')) {
    // 호스트명을 그대로 마지막 칸에 둔다. 어느 기기를 보고 있는지가 제목이어야 한다.
    return [
      { label: '엔드포인트', to: '/endpoints' },
      { label: decodeURIComponent(pathname.slice('/endpoints/'.length)) },
    ]
  }
  const title = titles[pathname]
  return title ? [{ label: title }] : []
}

/** 잘린 종류만 표시한다. 표시가 없는 섹션은 그게 전부라는 뜻이다. */
function SectionHead({ label, hasMore }: { label: string; hasMore: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-[8px] px-[12px] py-[5px]">
      <span className="text-[10.5px] text-faint uppercase tracking-[0.04em]">{label}</span>
      {hasMore && <span className="text-[10.5px] text-faint">더 있음</span>}
    </div>
  )
}

/** 한 줄에 세울 값. 검색 응답은 이벤트 부분집합이라 목록 화면만큼 자세히 적을 수 없다. */
function eventSummary(e: SearchEvent): string {
  return e.cmdline || e.process || e.domain || e.destIp || e.sha256 || e.id
}

type TopbarProps = {
  onMenuOpen: () => void
}

function Topbar({ onMenuOpen }: TopbarProps) {
  const { theme, toggle } = useThemeStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const trail = trailOf(pathname)
  const pageTitle = trail.at(-1)?.label ?? 'EDRdog'
  const themeLabel = theme === 'dark' ? '라이트' : '다크'
  const isDemo = useAuthStore((s) => s.token) === null

  const alertsVersion = useAlertsStore((s) => s.version)
  const [query, setQuery] = useState('')
  // 실제로 서버에 보낸 질의어. 입력값과 다르면 아직 결과가 옛 것이라는 뜻이다.
  const [committed, setCommitted] = useState('')
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const refreshInterval = useRefreshStore((s) => s.interval)
  const lastRefreshAt = useRefreshStore((s) => s.lastAt)
  const refresh = useRefreshStore((s) => s.refresh)
  const setRefreshInterval = useRefreshStore((s) => s.setInterval)

  useEffect(() => {
    if (refreshInterval === 0) return
    const id = window.setInterval(() => {
      // 백그라운드 탭까지 계속 받을 필요는 없다.
      if (document.visibilityState === 'hidden') return
      refresh()
    }, refreshInterval * 1000)
    return () => window.clearInterval(id)
  }, [refreshInterval, refresh])

  const trimmed = query.trim()
  const tooShort = trimmed.length < MIN_QUERY

  useEffect(() => {
    if (tooShort) {
      setCommitted('')
      return
    }
    // 글자마다 서버를 두드리지 않는다. 손이 멈춘 뒤 한 번만 보낸다.
    const id = window.setTimeout(() => setCommitted(trimmed), 250)
    return () => window.clearTimeout(id)
  }, [trimmed, tooShort])

  const search = useApi(
    () => (committed ? api.search(committed) : Promise.resolve(null)),
    [committed, alertsVersion],
  )
  const found = search.data

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  const showDropdown = open && trimmed !== ''
  // 디바운스를 기다리는 동안은 아직 옛 결과라 "없음"으로 단정하면 안 된다.
  const searching = !tooShort && (search.loading || trimmed !== committed)
  const hasResults =
    !!found &&
    found.hosts.items.length + found.alerts.items.length + found.events.items.length > 0

  function go(to: string) {
    navigate(to)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="h-[58px] flex-shrink-0 border-b border-line-2 bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] backdrop-blur-[10px] sticky top-0 z-20">
      {/* 구분선은 화면 끝까지 긋되, 내용은 본문과 같은 폭에 맞춘다(AppLayout 과 동일한 max-w). */}
      <div className="h-full w-full max-w-[1600px] mx-auto flex items-center justify-between gap-[10px] px-[16px] lg:px-[28px]">
        {/*
          메뉴 버튼은 제목 묶음 밖에 둔다. 안에 넣으면 좁은 화면에서 그 묶음이 폭 0 으로 접힐 때
          버튼이 묶음 밖으로 밀려나 검색창(불투명 배경) 밑에 깔려 아예 보이지 않는다.
          형제로 두고 flex-shrink-0 을 주면 40px 자리는 무슨 일이 있어도 남는다.
        */}
        <button
          type="button"
          onClick={onMenuOpen}
          aria-label="메뉴 열기"
          className="lg:hidden flex-shrink-0 w-[40px] h-[40px] -ml-[8px] flex items-center justify-center rounded-sm text-ink-2 cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M3 12h18" />
            <path d="M3 18h18" />
          </svg>
        </button>
        <div className="flex items-center gap-[10px] min-w-0">
          {/* 좁은 화면에서 제목이 줄어들 수 있어야 우측 묶음이 자리를 뺏지 않는다. */}
          <span className="flex min-w-0 flex-col">
            {/* 좁은 화면에서는 접는다. 한 줄뿐인 화면에서는 제목과 같은 말이라 잃는 정보가 없다. */}
            <span className="hidden sm:flex items-center gap-[5px] text-[11px] text-faint">
              <Link to="/dashboard" className="!text-faint hover:!text-mid">
                EDRdog
              </Link>
              {trail.map((crumb) => (
                <span key={crumb.label} className="flex items-center gap-[5px]">
                  <span aria-hidden>/</span>
                  {crumb.to ? (
                    <Link to={crumb.to} className="!text-faint hover:!text-mid">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate">{crumb.label}</span>
                  )}
                </span>
              ))}
            </span>
            <span className="text-[16px] font-bold text-ink tracking-[-0.01em] truncate">
              {pageTitle}
            </span>
          </span>
          {/* 같은 이유로 배지는 sm 부터. 데모라는 사실은 사이드바 하단에도 적혀 있다. */}
          {isDemo && (
            <span className="hidden sm:inline-flex flex-shrink-0 text-[11px] font-semibold text-high bg-[var(--high-wash)] px-[8px] py-[2px] rounded-full whitespace-nowrap">
              예시 데이터
            </span>
          )}
        </div>
        <div className="flex items-center gap-[8px] sm:gap-[12px] min-w-0">
          <div
            ref={searchRef}
            className="relative flex items-center gap-2 h-[34px] px-[12px] rounded-sm border border-line bg-surface flex-1 min-w-0 max-w-[260px] sm:min-w-[220px]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--faint)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
              }}
              placeholder="호스트·위협·로그 검색"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none font-sans text-[13px] text-ink placeholder:text-faint"
            />
            {showDropdown && (
              <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 bg-surface border border-line rounded-md shadow-[var(--shadow-2)] py-[6px] max-h-[380px] overflow-y-auto">
                {tooShort ? (
                  <div className="text-[12.5px] text-faint px-[12px] py-[14px] text-center">
                    {MIN_QUERY}글자 이상 입력하세요
                  </div>
                ) : searching ? (
                  <div className="text-[12.5px] text-faint px-[12px] py-[14px] text-center">
                    찾는 중
                  </div>
                ) : search.error ? (
                  <div className="text-[12.5px] text-crit px-[12px] py-[14px] text-center">
                    {search.error}
                  </div>
                ) : (
                  <>
                    {!hasResults && (
                      <div className="text-[12.5px] text-faint px-[12px] py-[14px] text-center">
                        일치하는 항목이 없습니다
                      </div>
                    )}
                    {found && found.hosts.items.length > 0 && (
                      <>
                        <SectionHead label="엔드포인트" hasMore={found.hosts.hasMore} />
                        {found.hosts.items.map((h) => (
                          <button
                            key={h.host}
                            type="button"
                            onClick={() => go('/endpoints/' + encodeURIComponent(h.host))}
                            className="w-full flex items-center gap-2 px-[12px] py-[8px] text-left hover:bg-panel cursor-pointer"
                          >
                            <span
                              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                              style={{ background: hostStatusColor(h.status) }}
                            />
                            <span className="font-mono text-[13px] text-ink flex-1 truncate">
                              {h.host}
                            </span>
                            <span className="text-[11px] text-faint">
                              {hostStatusLabel(h.status)}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                    {found && found.alerts.items.length > 0 && (
                      <>
                        <SectionHead label="위협" hasMore={found.alerts.hasMore} />
                        {/*
                          알림 하나만 여는 화면이 없어 그 알림이 난 호스트의 위협 목록으로 보낸다.
                          검색 응답에는 status·목적지가 없어 여기서 상세인 척 그릴 수도 없다.
                        */}
                        {found.alerts.items.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => go('/threats?host=' + encodeURIComponent(a.host))}
                            className="w-full flex items-center gap-2 px-[12px] py-[8px] text-left hover:bg-panel cursor-pointer"
                          >
                            <span
                              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                              style={{ background: severityColors[severityTone(a.severity)] }}
                            />
                            {/*
                              실제 호스트명은 30자를 넘는다. 한 줄에 나란히 두면 호스트가 폭을 다 먹어
                              위협명이 0px 로 접힌다. 위협명을 위에 세우고 호스트는 아래로 내린다.
                            */}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] text-ink">
                                {a.threatName}
                              </span>
                              <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                                {a.host}
                              </span>
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                    {found && found.events.items.length > 0 && (
                      <>
                        <SectionHead label="수집 로그" hasMore={found.events.hasMore} />
                        {/* id 만으로는 서버가 행을 못 찾는다. host·ts 를 같이 넘겨야 한 건이 열린다. */}
                        {found.events.items.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() =>
                              go(
                                '/events?' +
                                  new URLSearchParams({ id: e.id, host: e.host, ts: String(e.ts) }),
                              )
                            }
                            className="w-full flex items-center gap-2 px-[12px] py-[8px] text-left hover:bg-panel cursor-pointer"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono text-[12.5px] text-ink">
                                {eventSummary(e)}
                              </span>
                              <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                                {eventTypeLabel(e.type)} · {e.host}
                              </span>
                            </span>
                            <span className="font-mono text-[11px] text-faint whitespace-nowrap">
                              {absoluteTime(e.ts).slice(5, 16)}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                    {/*
                      찾은 구간을 반드시 밝힌다. 이게 없으면 "없음"이 "이 기간에는 없음"과 같이 읽힌다.
                    */}
                    {found && (
                      <div className="mt-[4px] border-t border-line-2 px-[12px] pt-[8px] pb-[3px] text-[10.5px] leading-[1.5] text-faint">
                        {absoluteTime(found.from)} ~ {absoluteTime(found.to)} 구간에서 찾았습니다
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          {lastRefreshAt && (
            <span className="hidden md:inline-flex flex-shrink-0 text-[11px] text-faint whitespace-nowrap">
              {new Date(lastRefreshAt).toLocaleTimeString('ko-KR', { hour12: false })} 갱신
            </span>
          )}
          <span className="relative flex-shrink-0">
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value) as RefreshInterval)}
              aria-label="자동 새로고침 간격"
              className="h-[34px] cursor-pointer appearance-none rounded-sm border border-line bg-surface pl-[10px] pr-[26px] font-sans text-[12px] text-ink"
            >
              {INTERVALS.map((sec) => (
                <option key={sec} value={sec}>
                  {intervalLabels[sec]}
                </option>
              ))}
            </select>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="pointer-events-none absolute right-[9px] top-1/2 -translate-y-1/2 text-faint"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
          <button
            type="button"
            onClick={refresh}
            aria-label="새로고침"
            className="inline-flex flex-shrink-0 items-center justify-center w-[34px] h-[34px] rounded-sm border border-line bg-surface text-ink-2 cursor-pointer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
          <button
            onClick={toggle}
            className="inline-flex flex-shrink-0 items-center gap-[7px] h-[34px] pl-[11px] pr-[11px] sm:pr-[14px] rounded-sm border border-line bg-surface text-ink font-sans text-[12.5px] font-semibold cursor-pointer"
          >
            <span data-om-sun className="items-center text-high">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4.3" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
              </svg>
            </span>
            <span data-om-moon className="items-center text-accent">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
              </svg>
            </span>
            <span className="hidden sm:inline">{themeLabel}</span>
          </button>
          {isDemo && (
            <Link
              to="/login"
              className="inline-flex flex-shrink-0 items-center h-[34px] px-[13px] sm:px-[15px] rounded-sm bg-accent !text-white font-sans text-[12.5px] font-semibold cursor-pointer"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default Topbar
