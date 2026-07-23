import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

type NavItem = {
  to: string
  label: string
  icon: ReactNode
  badge?: string
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
    label: '위협',
    badge: '9',
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
    to: '/sequence',
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
]

function Sidebar() {
  return (
    <aside className="w-[224px] flex-shrink-0 border-r border-line-2 bg-surface sticky top-0 h-screen flex flex-col px-[14px] py-[18px]">
      <NavLink to="/dashboard" className="flex items-center gap-[10px] px-2 pt-[6px] pb-[18px]">
        <div className="w-[28px] h-[28px] rounded-[8px] bg-accent flex items-center justify-center">
          <div className="w-[10px] h-[10px] bg-white rotate-45 rounded-[2px]" />
        </div>
        <span className="text-[17px] font-[750] tracking-[-0.02em] text-ink">EDRdog</span>
      </NavLink>
      <nav className="flex flex-col gap-[3px] mt-[6px]">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-[11px] px-[11px] py-[9px] rounded-[9px] text-[13.5px] font-semibold cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[var(--accent-wash)] text-accent'
                  : 'text-mid hover:text-ink-2 hover:bg-panel'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto text-[11px] font-semibold text-white bg-crit px-2 py-[1px] rounded-full font-mono">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-[10px] px-[12px] py-[10px] border-t border-line-2">
        <div className="w-[30px] h-[30px] rounded-full bg-panel flex items-center justify-center text-[12px] font-semibold text-ink-2">
          보안
        </div>
        <div className="flex flex-col">
          <span className="text-[12.5px] font-semibold text-ink">보안운영팀</span>
          <span className="text-[11px] text-faint">soc@edrdog.io</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
