import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, type Page } from '@/api/client'
import { useRefreshStore } from '@/store/refresh'

/** 다음 쪽 요청에 실을 값. from/to 는 첫 쪽에서 서버가 알려준 구간 그대로다. */
export type PageRequest = {
  offset: number
  limit: number
  withTotal?: boolean
  from?: number
  to?: number
}

/** 서버가 한 번에 주는 상한. 새로고침으로 쌓인 만큼을 되받을 때도 이 선을 넘지 않는다. */
const MAX_LIMIT = 1000

/** offset 상한을 넘으면 400 이다. 다시 눌러도 같으므로 기간을 좁히라고 알린다. */
function moreErrorText(e: Error): string {
  if (e instanceof ApiError && e.status === 400) {
    return '여기서 더 깊이는 한 번에 볼 수 없습니다. 기간을 좁혀서 다시 조회해 주세요.'
  }
  return e.message
}

/**
 * 쪽 단위로 받아 이어 붙이는 목록.
 *
 * deps 가 바뀌면 쌓아 둔 행과 구간을 버리고 첫 쪽부터 다시 받는다.
 * 조건이 그대로인 재조회(새로고침)면 지금까지 쌓인 만큼을 한 번에 되받는다. 첫 쪽만 받으면
 * 페이지를 내려보던 사용자의 목록이 갱신 때마다 사라진다. 자동 새로고침에서는 주기마다 그렇게 된다.
 */
export function usePagedList<T>(
  fetchPage: (page: PageRequest) => Promise<Page<T>>,
  deps: unknown[],
  pageSize: number,
) {
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
  // 새로고침 때 얼마를 되받을지 정하려면 지금 몇 줄인지 알아야 한다. deps 에 넣으면 받을 때마다 또 돈다.
  const loaded = useRef(0)
  // 늦게 도착한 응답을 버린다.
  const seq = useRef(0)

  const key = JSON.stringify(deps)
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    // 렌더 중에 판정하면 StrictMode 의 이중 렌더에서 두 번째가 같은 조건으로 잘못 읽힌다.
    const sameQuery = lastKey.current === key
    lastKey.current = key
    const id = ++seq.current
    const want = sameQuery ? Math.min(Math.max(pageSize, loaded.current), MAX_LIMIT) : pageSize
    offset.current = 0
    range.current = {}
    // 조건이 그대로면 보던 줄을 남겨 둔 채 바꾼다. 조건이 바뀐 것이면 남기면 안 된다.
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
    // withTotal 은 첫 쪽에만. 다음 쪽부터는 서버가 count 를 또 도는 값이라 X-Has-More 로 판단한다.
    fetchRef
      .current({ offset: 0, limit: want, withTotal: true })
      .then((page) => {
        if (seq.current !== id) return
        range.current = { from: page.from ?? undefined, to: page.to ?? undefined }
        offset.current = page.rows.length
        loaded.current = page.rows.length
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
        loaded.current = 0
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
  }, [key, nonce, refreshVersion, pageSize])

  const loadMore = useCallback(() => {
    const id = ++seq.current
    setState((prev) => ({ ...prev, loadingMore: true, moreError: null }))
    fetchRef
      .current({ offset: offset.current, limit: pageSize, ...range.current })
      .then((page) => {
        if (seq.current !== id) return
        offset.current += page.rows.length
        loaded.current += page.rows.length
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
  }, [pageSize])

  return { ...state, loadMore, reload: () => setNonce((n) => n + 1) }
}
