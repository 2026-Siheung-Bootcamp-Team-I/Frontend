import { useAuthStore } from '@/store/auth'

/** 기본값은 Vite dev proxy(`/api` -> api-service:8084). 배포 시엔 VITE_API_BASE_URL 로 절대 주소를 준다. */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * 백엔드 ApiKeyFilter 가 요구하는 프론트 공용 키. /api/tenant/** 등 비면제 경로에 필요하다.
 * (/api/me·/api/hosts·/api/alerts 는 면제라 없어도 되지만, 인증 요청에 일괄로 붙인다.)
 * dev 기본값은 백엔드 EDRDOG_API_KEY 기본값과 맞춘다. 배포 시 VITE_API_KEY 로 주입.
 */
const API_KEY = import.meta.env.VITE_API_KEY ?? 'dev-api-key'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
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
    headers['X-API-Key'] = API_KEY
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // 서버가 꺼져 있거나 네트워크가 끊긴 경우. fetch 의 "Failed to fetch" 를 그대로 보여주지 않는다.
    throw new ApiError(0, UNREACHABLE)
  }

  if (!res.ok) {
    // 401 은 원인이 둘이다.
    // 1) 토큰 만료/무효: 재로그인이 답이라 clear() 로 로그인 화면으로 돌린다.
    // 2) X-API-Key 불일치(ApiKeyFilter): /tenant/** 경로만 X-API-Key 를 강제하는데,
    //    배포자가 백엔드 EDRDOG_API_KEY 와 프론트 VITE_API_KEY 를 다르게 설정하면 여기서 401 이 난다.
    //    이 경우 재로그인해도 고쳐지지 않으므로 clear() 하지 말고 에러를 그대로 던져
    //    화면에 원인 메시지가 보이게 한다(clear() 하면 컴포넌트가 언마운트되며 원인이 사라진다).
    const isTenantPath = path.startsWith('/tenant/')
    if (res.status === 401 && auth && !isTenantPath) useAuthStore.getState().clear()
    throw new ApiError(res.status, await errorMessage(res))
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const UNREACHABLE = '서버에 연결하지 못했습니다'

/** 백엔드 에러 본문은 {"error": "..."} 형태. 아니면 상태코드로 대체한다. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (typeof data.error === 'string') return data.error
  } catch {
    // JSON 본문이 아니면 아래 기본 문구를 쓴다
  }
  // 5xx 는 서버가 죽었거나 dev 프록시가 대상에 못 붙은 경우라 사용자가 할 일이 다르다.
  if (res.status >= 500) return UNREACHABLE
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
