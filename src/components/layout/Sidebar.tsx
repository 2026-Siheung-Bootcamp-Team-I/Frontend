import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAlertsStore } from '@/store/alerts'
import { useAuthStore } from '@/store/auth'

/**
 * 그룹 라벨은 분석가 업무 순서(분류 → 증거 → 분석)를 구조로 드러낸다.
 * 대시보드는 어느 단계에도 속하지 않는 진입점이라 group 없이 맨 위에 단독으로 둔다.
 * 라벨이 영문 대문자인 건 보안 콘솔 관례이자, 한글 항목명과 시각적으로 갈라져
 * 캡션이 이동 가능한 항목으로 오독되지 않기 때문이다.
 */
type NavGroup = 'TRIAGE' | 'EVIDENCE' | 'ANALYSIS' | 'PLATFORM'

const GROUP_ORDER: NavGroup[] = ['TRIAGE', 'EVIDENCE', 'ANALYSIS', 'PLATFORM']

type NavItem = {
  to: string
  label: string
  icon: ReactNode
  group?: NavGroup
}

const items: NavItem[] = [
  {
    to: '/dashboard',
    label: '대시보드',
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/threats',
    group: 'TRIAGE',
    label: '위협',
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l9 16H3z" />
        <path d="M12 10v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  {
    to: '/endpoints',
    group: 'EVIDENCE',
    label: '엔드포인트',
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    ),
  },
  {
    to: '/map',
    group: 'ANALYSIS',
    label: '위협 지도',
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
      </svg>
    ),
  },
  {
    to: '/sequence',
    group: 'ANALYSIS',
    label: '시퀀스 분석',
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 15l6-6" />
        <path d="M10.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
        <path d="M13.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
      </svg>
    ),
  },
  {
    to: '/report',
    group: 'ANALYSIS',
    label: '요약 보기',
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </svg>
    ),
  },
  {
    to: '/onboarding',
    group: 'PLATFORM',
    label: '수집 알림 연동',
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v10" />
        <path d="M8 9l4 4 4-4" />
        <rect x="4" y="16" width="16" height="5" rx="1.5" />
      </svg>
    ),
  },
]

// 미판단 위협 배지는 위협 항목에만 붙는다.
function NavRow({ item, openCount }: { item: NavItem; openCount: number }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-[11px] px-[11px] py-[8px] rounded-sm text-[13px] font-semibold cursor-pointer transition-colors ${
          isActive ? 'bg-[var(--accent-wash)] text-accent' : 'text-mid hover:text-ink-2 hover:bg-panel'
        }`
      }
    >
      {item.icon}
      <span>{item.label}</span>
      {item.to === '/threats' && openCount > 0 && (
        <span className="ml-auto rounded-xs bg-crit px-[5px] py-[1px] font-mono text-[11px] font-semibold text-white">
          {openCount}
        </span>
      )}
    </NavLink>
  )
}

type SidebarProps = {
  open: boolean
  onClose: () => void
}

function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()
  // 사이드바 배지는 미판단 위협 수. 개수만 필요하므로 목록을 받아 길이를 쓴다.
  const alertsVersion = useAlertsStore((s) => s.version)
  const { data: openAlerts } = useApi(
    () => api.alerts({ status: 'open', limit: 1000 }),
    [alertsVersion],
  )

  async function logout() {
    try {
      await api.logout()
    } catch {
      // 서버 세션 삭제가 실패해도 로컬 토큰은 비워 로그아웃 상태로 만든다
    }
    clear()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-[rgba(0,0,0,0.5)] lg:hidden" onClick={onClose} />
      )}
      {/*
        높이는 100vh 가 아니라 dvh. 모바일 브라우저에서 100vh 는 주소창을 포함한 높이라
        하단의 사용자 정보와 로그아웃이 주소창에 가려진다.
      */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 h-dvh w-[224px] flex-shrink-0 border-r border-line-2 bg-surface flex flex-col px-[14px] py-[18px] transition-transform overflow-y-auto lg:inset-auto lg:z-auto lg:sticky lg:top-0 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavLink to="/dashboard" className="flex items-center gap-[10px] px-2 pt-[6px] pb-[18px]">
          <div className="w-[28px] h-[28px] rounded-sm bg-accent flex items-center justify-center">
            <div className="w-[10px] h-[10px] bg-white rotate-45 rounded-xs" />
          </div>
          <span className="text-[17px] font-[750] tracking-[-0.02em] text-ink">EDRdog</span>
        </NavLink>
        <nav className="flex flex-col mt-[6px]">
          <div className="flex flex-col gap-[3px]">
            {items
              .filter((item) => !item.group)
              .map((item) => (
                <NavRow key={item.to} item={item} openCount={openAlerts?.length ?? 0} />
              ))}
          </div>
          {GROUP_ORDER.map((group) => (
            <div key={group} className="flex flex-col gap-[3px] mt-[16px]">
              <span className="px-[11px] pb-[4px] text-[10px] font-semibold uppercase tracking-[0.09em] text-faint">
                {group}
              </span>
              {items
                .filter((item) => item.group === group)
                .map((item) => (
                  <NavRow key={item.to} item={item} openCount={openAlerts?.length ?? 0} />
                ))}
            </div>
          ))}
        </nav>
        {/* 대시보드는 로그인 없이도 열리므로 비로그인 상태를 함께 다룬다. */}
        {user ? (
          <div className="mt-auto flex items-center gap-[10px] px-[12px] py-[10px] border-t border-line-2">
            <div className="w-[30px] h-[30px] rounded-full bg-panel flex items-center justify-center text-[12px] font-semibold text-ink-2">
              보안
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-semibold text-ink">보안운영팀</span>
              <span className="text-[11px] text-faint truncate">{user.email}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="ml-auto text-[11.5px] font-semibold text-mid hover:text-ink-2 cursor-pointer font-sans"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="mt-auto flex flex-col gap-[8px] px-[12px] py-[12px] border-t border-line-2">
            <span className="text-[11.5px] text-faint leading-[1.5]">
              데모를 보고 있습니다. 로그인하면 실제 데이터가 보입니다.
            </span>
            <NavLink
              to="/login"
              className="text-center text-[12.5px] font-semibold !text-white bg-accent py-[9px] rounded-sm"
            >
              로그인
            </NavLink>
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar
