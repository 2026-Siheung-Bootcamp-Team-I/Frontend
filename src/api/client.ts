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

/**
 * 목록 한 쪽. 본문은 그냥 배열이고 쪽 정보는 헤더로 온다.
 *
 * from/to 는 서버가 실제로 적용한 구간이다. 다음 쪽을 부를 때 그대로 되돌려줘야 한다.
 * 조회가 최신순이라 그사이 새 데이터가 쌓이면 offset 이 밀려 행이 겹치거나 건너뛰어진다.
 */
export type Page<T> = {
  rows: T[]
  /** withTotal=true 로 물었을 때만 채워진다. */
  total: number | null
  hasMore: boolean
  from: number | null
  to: number | null
}

function headerNumber(res: Response, name: string): number | null {
  const raw = res.headers.get(name)
  if (raw === null || raw === '' || raw === 'null') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/**
 * 목록 조회. 쪽 정보를 함께 돌려준다.
 *
 * 헤더는 다른 출처에서 CorsConfig 의 exposedHeaders 에 올라가 있어야 읽힌다.
 * 안 올라가 있으면 서버는 정상인데 화면에서만 값이 안 보이므로, 못 읽었을 때를 null 로 다룬다.
 */
export async function listRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Page<T>> {
  const res = await send(path, options)
  const rows = res.status === 204 ? [] : ((await res.json()) as T[])
  return {
    rows,
    total: headerNumber(res, 'X-Total-Count'),
    hasMore: res.headers.get('X-Has-More') === 'true',
    from: headerNumber(res, 'X-Time-From'),
    to: headerNumber(res, 'X-Time-To'),
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** 요청과 오류 처리만. 본문을 어떻게 읽을지는 부르는 쪽이 정한다. */
async function send(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
): Promise<Response> {
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
  return res
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

type QueryValue = string | number | boolean | undefined | null

/** undefined/null/빈 문자열 파라미터는 빼고 쿼리스트링을 만든다. */
export function queryString(params: Record<string, QueryValue>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => [k, String(v)])
  return entries.length ? `?${new URLSearchParams(entries)}` : ''
}
