import { useEffect, useRef, useState } from 'react'
import { useRefreshStore } from '@/store/refresh'

type ApiState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * 단발 조회용 최소 페칭 훅. deps 가 바뀌거나 refetch() 를 부르면 다시 요청하고,
 * 언마운트/재요청 중이면 늦게 도착한 응답은 버린다.
 *
 * fetcher 는 매 렌더 새로 만들어지므로 재실행 기준은 호출자가 넘긴 deps 뿐이다.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null })
  const [nonce, setNonce] = useState(0)
  // 전역 새로고침을 여기서 한 번에 받는다. 화면마다 deps 에 넣게 하면 빠뜨린 곳이 생긴다.
  const refreshVersion = useRefreshStore((s) => s.version)

  // 조건이 그대로인 재조회(새로고침)인지 구분한다. 조건이 바뀐 것이면 이전 결과를 남기면 안 된다.
  const lastDeps = useRef<string | null>(null)
  const key = JSON.stringify(deps)

  useEffect(() => {
    let alive = true
    // 렌더 중에 판정하면 StrictMode 의 이중 렌더에서 두 번째가 같은 조건으로 잘못 읽힌다.
    const sameQuery = lastDeps.current === key
    lastDeps.current = key
    // 자동 새로고침마다 화면을 비우면 보던 줄이 사라진다. 같은 조건이면 이전 값을 두고 조용히 바꾼다.
    setState((prev) =>
      sameQuery ? { ...prev, error: null } : { data: null, loading: true, error: null },
    )
    fetcher()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null })
      })
      .catch((e: Error) => {
        if (alive) setState({ data: null, loading: false, error: e.message })
      })
    return () => {
      alive = false
    }
  }, [...deps, nonce, refreshVersion])

  return { ...state, refetch: () => setNonce((n) => n + 1) }
}
