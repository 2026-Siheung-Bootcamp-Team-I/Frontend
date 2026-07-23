import { useLocation } from 'react-router-dom'
import { useThemeStore } from '@/store/theme'

const titles: Record<string, string> = {
  '/dashboard': '대시보드',
  '/threats': '위협',
  '/endpoints': '엔드포인트',
  '/sequence': '시퀀스 분석',
  '/report': '요약 보기',
}

function Topbar() {
  const { theme, toggle } = useThemeStore()
  const { pathname } = useLocation()
  const pageTitle = titles[pathname] ?? 'EDRdog'
  const themeLabel = theme === 'dark' ? '라이트' : '다크'

  return (
    <div className="h-[58px] flex-shrink-0 border-b border-line-2 bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] backdrop-blur-[10px] sticky top-0 z-20 flex items-center justify-between px-[28px]">
      <div className="flex items-center gap-[10px]">
        <span className="text-[16px] font-bold text-ink tracking-[-0.01em]">{pageTitle}</span>
        <span className="inline-flex items-center gap-[6px] text-[12px] text-mid ml-2">
          <span
            className="w-[6px] h-[6px] rounded-full bg-good"
            style={{ animation: 'edrPulse 2s ease-in-out infinite' }}
          />
          실시간 동기화 중
        </span>
      </div>
      <div className="flex items-center gap-[12px]">
        <div className="flex items-center gap-2 h-[34px] px-[12px] rounded-[10px] border border-line bg-surface min-w-[220px]">
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
          <span className="text-[13px] text-faint">호스트·위협 검색</span>
        </div>
        <button
          onClick={toggle}
          className="inline-flex items-center gap-[7px] h-[34px] pl-[11px] pr-[14px] rounded-[10px] border border-line bg-surface text-ink font-sans text-[12.5px] font-semibold cursor-pointer shadow-[var(--shadow-1)]"
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
          <span>{themeLabel}</span>
        </button>
      </div>
    </div>
  )
}

export default Topbar
