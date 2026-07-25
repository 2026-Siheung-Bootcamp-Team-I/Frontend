import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/store/theme'
import { useAlertsStore } from '@/store/alerts'
import { useAuthStore } from '@/store/auth'
import { useApi } from '@/hooks/useApi'
import { api } from '@/api'
import { searchAll } from '@/lib/search'
import { severityColors, severityTone, hostStatusColor, hostStatusLabel } from '@/lib/format'

const titles: Record<string, string> = {
  '/dashboard': '대시보드',
  '/threats': '위협',
  '/endpoints': '엔드포인트',
  '/sequence': '시퀀스 분석',
  '/report': '요약 보기',
}

type TopbarProps = {
  onMenuOpen: () => void
}

function Topbar({ onMenuOpen }: TopbarProps) {
  const { theme, toggle } = useThemeStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pageTitle = titles[pathname] ?? 'EDRdog'
  const themeLabel = theme === 'dark' ? '라이트' : '다크'
  const isDemo = useAuthStore((s) => s.token) === null

  const alertsVersion = useAlertsStore((s) => s.version)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // 검색은 클라이언트 부분 일치라 전체 목록이 필요하다. 검색창을 열기 전에는 받지 않는다.
  const alerts = useApi(
    () => (open ? api.alerts({ limit: 1000 }) : Promise.resolve([])),
    [alertsVersion, open],
  )
  const hosts = useApi(() => (open ? api.hosts() : Promise.resolve([])), [alertsVersion, open])

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  const results = searchAll(query, alerts.data ?? [], hosts.data ?? [])
  const showDropdown = open && query.trim() !== ''
  const loading = alerts.loading || hosts.loading
  const hasResults = results.alerts.length > 0 || results.hosts.length > 0

  function goToHost(host: string) {
    navigate('/threats?host=' + encodeURIComponent(host))
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
          <span className="text-[16px] font-bold text-ink tracking-[-0.01em] truncate">
            {pageTitle}
          </span>
          {/* 같은 이유로 배지는 sm 부터. 데모라는 사실은 사이드바 하단에도 적혀 있다. */}
          {isDemo && (
            <span className="hidden sm:inline-flex flex-shrink-0 text-[11px] font-semibold text-high bg-[var(--high-wash)] px-[8px] py-[2px] rounded-full whitespace-nowrap">
              예시 데이터
            </span>
          )}
          <span className="hidden md:inline-flex items-center gap-[6px] text-[12px] text-mid ml-2">
            <span
              className="w-[6px] h-[6px] rounded-full bg-good"
              style={{ animation: 'edrPulse 2s ease-in-out infinite' }}
            />
            실시간 동기화 중
          </span>
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
              placeholder="호스트·위협 검색"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none font-sans text-[13px] text-ink placeholder:text-faint"
            />
            {showDropdown && (
              <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 bg-surface border border-line rounded-md shadow-[var(--shadow-2)] py-[6px] max-h-[320px] overflow-y-auto">
                {loading ? (
                  <div className="text-[12.5px] text-faint px-[12px] py-[14px] text-center">
                    불러오는 중
                  </div>
                ) : !hasResults ? (
                  <div className="text-[12.5px] text-faint px-[12px] py-[14px] text-center">
                    검색 결과가 없습니다
                  </div>
                ) : (
                  <>
                    {results.alerts.length > 0 && (
                      <>
                        <div className="text-[10.5px] text-faint uppercase tracking-[0.04em] px-[12px] py-[5px]">
                          위협
                        </div>
                        {results.alerts.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => goToHost(a.host)}
                            className="w-full flex items-center gap-2 px-[12px] py-[8px] text-left hover:bg-panel cursor-pointer"
                          >
                            <span
                              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                              style={{ background: severityColors[severityTone(a.severity)] }}
                            />
                            <span className="text-[13px] text-ink flex-1 truncate">
                              {a.threatName}
                            </span>
                            <span className="font-mono text-[11px] text-faint">{a.host}</span>
                          </button>
                        ))}
                      </>
                    )}
                    {results.hosts.length > 0 && (
                      <>
                        <div className="text-[10.5px] text-faint uppercase tracking-[0.04em] px-[12px] py-[5px]">
                          엔드포인트
                        </div>
                        {results.hosts.map((h) => (
                          <button
                            key={h.host}
                            type="button"
                            onClick={() => goToHost(h.host)}
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
                  </>
                )}
              </div>
            )}
          </div>
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
