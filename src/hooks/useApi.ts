import { useEffect, useState } from 'react'

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

  useEffect(() => {
    let alive = true
    setState({ data: null, loading: true, error: null })
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
  }, [...deps, nonce])

  return { ...state, refetch: () => setNonce((n) => n + 1) }
}
