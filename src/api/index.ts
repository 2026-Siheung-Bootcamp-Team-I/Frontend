import { queryString, request } from './client'
import type {
  Alert,
  AlertStatus,
  AlertSummary,
  AuthResponse,
  EventSummary,
  Host,
  HostSummary,
  Lineage,
} from './types'

type AlertFilter = {
  host?: string
  severity?: string
  status?: AlertStatus
  /** epoch millis */
  from?: number
  to?: number
  limit?: number
}

type Period = { from?: number; to?: number }

export const api = {
  signup: (email: string, password: string, orgName?: string) =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: { email, password, orgName },
      auth: false,
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  alerts: (filter: AlertFilter = {}) => request<Alert[]>(`/alerts${queryString(filter)}`),

  alertSummary: (period: Period = {}) =>
    request<AlertSummary>(`/alerts/summary${queryString(period)}`),

  lineage: (id: string) => request<Lineage>(`/alerts/${encodeURIComponent(id)}/lineage`),

  triage: (id: string, status: Extract<AlertStatus, 'confirmed' | 'false_positive'>) =>
    request<Alert>(`/alerts/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),

  hosts: () => request<Host[]>('/hosts'),

  hostSummary: () => request<HostSummary>('/hosts/summary'),

  eventSummary: (period: Period = {}) =>
    request<EventSummary>(`/events/summary${queryString(period)}`),
}
