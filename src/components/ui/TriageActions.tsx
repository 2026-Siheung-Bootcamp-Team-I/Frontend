import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import type { Alert } from '@/api/types'
import { statusLabel } from '@/lib/format'
import { useAlertsStore } from '@/store/alerts'

/** detector 가 severity 로 정하는 권고 대응(notify|kill|isolate). dry-run 이라 실행하지 않고 표시만 한다. */
const actionText: Record<string, string> = {
  isolate: '를 즉시 격리하세요.',
  kill: '에서 해당 프로세스를 종료하세요.',
  notify: '의 활동을 확인하세요.',
}

type TriageActionsProps = {
  alert: Alert
  /** 넘기면 "자세히" 링크가 붙는다. 이미 상세 화면이면 생략한다. */
  detailTo?: string
}

/** 권고 대응 문구와 트리아지(확정·오탐) 버튼. 이미 판단된 알림은 결과만 보여준다. */
function TriageActions({ alert, detailTo }: TriageActionsProps) {
  const [pending, setPending] = useState<'confirmed' | 'false_positive' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bump = useAlertsStore((s) => s.bump)

  async function triage(status: 'confirmed' | 'false_positive') {
    setPending(status)
    setError(null)
    try {
      await api.triage(alert.id, status)
      bump()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(null)
    }
  }

  const suffix = actionText[alert.action ?? ''] ?? '의 활동을 확인하세요.'

  return (
    <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:gap-[16px] mt-[24px] px-[14px] py-[14px] sm:px-[18px] sm:py-[16px] bg-panel-2 border border-line-2 rounded-[12px] border-l-[3px] border-l-crit">
      <div className="flex-1">
        <div className="text-[12px] text-faint mb-1">권고 대응</div>
        <div className="text-[13.5px] leading-[1.5] text-ink">
          <span className="font-mono text-ink-2">{alert.host}</span> {suffix}
        </div>
        {error && <div className="mt-[6px] text-[12px] text-crit">{error}</div>}
      </div>

      <div className="flex gap-[10px]">
        {detailTo && (
          <Link
            to={detailTo}
            className="flex-1 sm:flex-none text-center whitespace-nowrap text-[13px] font-semibold !text-ink-2 border border-line px-[16px] py-[10px] rounded-[10px]"
          >
            자세히
          </Link>
        )}

        {alert.status === 'open' ? (
          <>
            <button
              type="button"
              onClick={() => triage('false_positive')}
              disabled={pending !== null}
              className="flex-1 sm:flex-none whitespace-nowrap text-[13px] font-semibold text-ink-2 border border-line px-[16px] py-[10px] rounded-[10px] cursor-pointer font-sans disabled:opacity-60"
            >
              {pending === 'false_positive' ? '처리 중' : '오탐'}
            </button>
            <button
              type="button"
              onClick={() => triage('confirmed')}
              disabled={pending !== null}
              className="flex-1 sm:flex-none whitespace-nowrap text-[13px] font-semibold text-white bg-accent px-[18px] py-[10px] rounded-[10px] cursor-pointer font-sans disabled:opacity-60"
            >
              {pending === 'confirmed' ? '처리 중' : '위협 확정'}
            </button>
          </>
        ) : (
          <span className="flex-1 sm:flex-none text-center whitespace-nowrap text-[13px] font-semibold text-mid border border-line px-[16px] py-[10px] rounded-[10px]">
            {statusLabel(alert.status)}
          </span>
        )}
      </div>
    </div>
  )
}

export default TriageActions
