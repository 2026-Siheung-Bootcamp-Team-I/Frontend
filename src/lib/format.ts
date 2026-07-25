import type { AlertSeverity, AlertStatus, HostStatus } from '@/api/types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** epoch millis 를 "방금 / N분 전 / N시간 전 / N일 전" 으로. */
export function relativeTime(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts)
  if (diff < MINUTE) return '방금'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`
  return `${Math.floor(diff / DAY)}일 전`
}

/**
 * epoch millis 를 "2026-07-22 23:41:45" 로.
 * 탐지 시각에 상대 표기("12분 전")를 쓰지 않는 이유: 조사할 때 osquery·Zeek 로그와
 * 타임라인을 대조해야 하는데 상대 표기로는 대조가 안 된다. 초까지 남긴다.
 */
export function absoluteTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return `${date} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** epoch millis 를 "09:14:02" 로. 시안이 모노 숫자 표기라 ko-KR 의 "9시 14분" 형식은 쓰지 않는다. */
export function clockTime(ts: number): string {
  const d = new Date(ts)
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

/** N일 전 시각(epoch millis). 기간 필터의 from 값으로 쓴다. */
export function daysAgo(days: number, now = Date.now()): number {
  return now - days * DAY
}

type Tone = 'crit' | 'high' | 'mid' | 'accent' | 'good'

const severityTones: Record<AlertSeverity, Tone> = {
  CRITICAL: 'crit',
  HIGH: 'high',
  MEDIUM: 'mid',
}

const severityLabels: Record<AlertSeverity, string> = {
  CRITICAL: '심각',
  HIGH: '높음',
  MEDIUM: '보통',
}

/** 미등록 severity 는 보통(mid)으로 떨어뜨린다. */
export function severityTone(severity: string): Tone {
  return severityTones[severity as AlertSeverity] ?? 'mid'
}

export function severityLabel(severity: string): string {
  return severityLabels[severity as AlertSeverity] ?? severity
}

const statusTones: Record<AlertStatus, Tone> = {
  open: 'crit',
  confirmed: 'good',
  false_positive: 'mid',
}

const statusLabels: Record<AlertStatus, string> = {
  open: '미판단',
  confirmed: '확정',
  false_positive: '오탐',
}

export function statusTone(status: string): Tone {
  return statusTones[status as AlertStatus] ?? 'mid'
}

export function statusLabel(status: string): string {
  return statusLabels[status as AlertStatus] ?? status
}

const hostStatusLabels: Record<HostStatus, string> = {
  healthy: '정상',
  warning: '주의',
  critical: '위험',
}

const hostStatusColors: Record<HostStatus, string> = {
  healthy: 'var(--good)',
  warning: 'var(--high)',
  critical: 'var(--crit)',
}

export function hostStatusLabel(status: string): string {
  return hostStatusLabels[status as HostStatus] ?? status
}

export function hostStatusColor(status: string): string {
  return hostStatusColors[status as HostStatus] ?? 'var(--mid)'
}

export const severityColors: Record<Tone, string> = {
  crit: 'var(--crit)',
  high: 'var(--high)',
  mid: 'var(--mid)',
  accent: 'var(--accent)',
  good: 'var(--good)',
}

/** 합계 대비 백분율. 합계가 0이면 0. */
export function percentOf(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

/**
 * 실제 조치(kill)의 대상 프로세스명. 백엔드 alert.matched 의
 * "process <name> (parent <parent>)" 항목에서 뽑는다. 실행 체인의 마지막(말단) 프로세스가
 * 종료 대상이다. 해당 항목이 없으면 null.
 */
export function killTarget(matched: string[]): string | null {
  const procs = matched
    .map((m) => /^process\s+(\S+)/.exec(m)?.[1])
    .filter((name): name is string => Boolean(name))
  return procs.length ? procs[procs.length - 1] : null
}
