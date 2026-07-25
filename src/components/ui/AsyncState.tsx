import type { ReactNode } from 'react'

type AsyncStateProps = {
  loading: boolean
  error: string | null
  /** 요청은 성공했지만 결과가 없을 때 */
  empty?: boolean
  loadingText?: string
  emptyText?: string
  onRetry?: () => void
  children: ReactNode
}

/** 로딩·에러·빈 상태를 한 곳에서 처리한다. 셋 다 아니면 children 을 그린다. */
function AsyncState({
  loading,
  error,
  empty = false,
  loadingText = '불러오는 중',
  emptyText = '표시할 데이터가 없습니다',
  onRetry,
  children,
}: AsyncStateProps) {
  if (loading) return <Message text={loadingText} />
  if (error) return <Message text={error} tone="crit" onRetry={onRetry} />
  if (empty) return <Message text={emptyText} />
  return <>{children}</>
}

function Message({
  text,
  tone = 'faint',
  onRetry,
}: {
  text: string
  tone?: 'faint' | 'crit'
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-[10px] py-[36px]">
      <span className={`text-[13px] ${tone === 'crit' ? 'text-crit' : 'text-faint'}`}>{text}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-[12.5px] font-semibold text-ink-2 border border-line bg-surface px-[14px] py-[7px] rounded-sm cursor-pointer"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

export default AsyncState
