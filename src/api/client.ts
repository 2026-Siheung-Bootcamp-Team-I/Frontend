import { useAuthStore } from '@/store/auth'

/** 기본값은 Vite dev proxy(`/api` -> api-service:8084). 배포 시엔 VITE_API_BASE_URL 로 절대 주소를 준다. */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  /** false 면 Authorization 헤더를 붙이지 않는다(로그인/회원가입). */
  auth?: boolean
}

export async function request<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const { token } = useAuthStore.getState()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    // 토큰 만료/무효면 로그인 상태를 비워 RequireAuth 가 로그인 화면으로 돌린다.
    if (res.status === 401 && auth) useAuthStore.getState().clear()
    throw new ApiError(res.status, await errorMessage(res))
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** 백엔드 에러 본문은 {"error": "..."} 형태. 아니면 상태코드로 대체한다. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (typeof data.error === 'string') return data.error
  } catch {
    // JSON 본문이 아니면 아래 기본 문구를 쓴다
  }
  return `요청에 실패했습니다 (${res.status})`
}

type QueryValue = string | number | undefined | null

/** undefined/null/빈 문자열 파라미터는 빼고 쿼리스트링을 만든다. */
export function queryString(params: Record<string, QueryValue>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => [k, String(v)])
  return entries.length ? `?${new URLSearchParams(entries)}` : ''
}
