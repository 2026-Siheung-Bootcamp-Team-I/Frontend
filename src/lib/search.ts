import type { Alert, Host } from '@/api/types'

export type SearchResult = {
  alerts: Alert[]
  hosts: Host[]
}

/**
 * 상단바 검색. 위협은 이름·호스트로, 엔드포인트는 호스트로 부분 일치시킨다.
 * 검색어가 비어 있으면 아무것도 찾지 않는다(드롭다운을 닫아두기 위해).
 */
export function searchAll(query: string, alerts: Alert[], hosts: Host[], limit = 5): SearchResult {
  const q = query.trim().toLowerCase()
  if (!q) return { alerts: [], hosts: [] }
  const hit = (value: string) => value.toLowerCase().includes(q)
  return {
    alerts: alerts.filter((a) => hit(a.threatName) || hit(a.host)).slice(0, limit),
    hosts: hosts.filter((h) => hit(h.host)).slice(0, limit),
  }
}
