import type { ReactNode } from 'react'

/** 디자인 시안의 인라인 SVG 아이콘. 공격 경로 노드 종류별로 쓴다. */
function icon(children: ReactNode) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export const processIcon = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 9.5l2.5 2.5L7 14.5" />
    <path d="M12.5 15h4" />
  </>,
)

export const networkIcon = icon(
  <>
    <rect x="3" y="4" width="18" height="7" rx="1.6" />
    <rect x="3" y="13" width="18" height="7" rx="1.6" />
    <path d="M6.5 7.5h.01" />
    <path d="M6.5 16.5h.01" />
  </>,
)

export const fileIcon = icon(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </>,
)
