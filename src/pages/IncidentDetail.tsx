import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/api'
import type {
  Alert,
  ExecuteStatus,
  Incident,
  IncidentTimelineEntry,
  RuleCatalogEntry,
  SourceEvent,
} from '@/api/types'
import AsyncState from '@/components/ui/AsyncState'
import AttackPath from '@/components/ui/AttackPath'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import EvidenceChain, { type ChainStep } from '@/components/ui/EvidenceChain'
import ScrollArea from '@/components/ui/ScrollArea'
import TriageActions from '@/components/ui/TriageActions'
import { useApi } from '@/hooks/useApi'
import {
  absoluteTime,
  clockTime,
  eventTypeLabel,
  killTarget,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
} from '@/lib/format'
import { toAttackSteps } from '@/lib/lineagePath'
import { useAlertsStore } from '@/store/alerts'
import { useAuthStore } from '@/store/auth'

// 위협 / 심각도 / 상태 / MITRE / 탐지 시각
const alertGrid = 'grid grid-cols-[1fr_78px_86px_104px_150px] gap-[12px] px-[4px]'

function IncidentDetail() {
  const id = useParams().id ?? ''
  const { data, loading, error, refetch } = useApi(() => api.incident(id), [id])
  const timeline = useApi(() => api.incidentTimeline(id), [id])

  // 트리아지 응답으로 화면 상태를 갱신한다. 다른 사건으로 넘어가면 버린다.
  const [patched, setPatched] = useState<Incident | null>(null)
  useEffect(() => setPatched(null), [id])
  const incident = patched ?? data

  // 표에서 고른 알림. 사건이 바뀌면 버린다.
  const [pickedAlertId, setPickedAlertId] = useState<string | null>(null)
  useEffect(() => setPickedAlertId(null), [id])

  /**
   * 알림 단위 트리아지 뒤의 최신 알림. 사건을 통째로 다시 받으면 화면이 잠깐 비므로
   * 알림 상세로 받은 것만 표에 덮어쓴다.
   */
  const [freshAlerts, setFreshAlerts] = useState<Record<string, Alert>>({})
  useEffect(() => setFreshAlerts({}), [id])
  const keepFresh = useCallback((a: Alert) => setFreshAlerts((m) => ({ ...m, [a.id]: a })), [])

  const alerts = incident?.alerts?.map((a) => freshAlerts[a.id] ?? a) ?? null
  const picked = alerts?.find((a) => a.id === pickedAlertId) ?? alerts?.[0] ?? null

  // 룰 카탈로그는 알림과 무관한 정적 참조 데이터라 화면에서 한 번만 받아 ruleId 로 찾아 쓴다.
  const rules = useApi(() => api.rules(), [])
  const ruleById = useMemo(
    () => new Map((rules.data ?? []).map((r) => [r.ruleId, r])),
    [rules.data],
  )

  // 전개에서 이 알림을 유발한 관측을 짚는 id. 알림 줄은 eventId 가 null 이라 빈 값과 맞대면 안 된다.
  const sourceEventId = picked?.sourceEvent?.id ?? null

  return (
    <div className="flex flex-col gap-[16px]">
      <Link to="/incidents" className="text-[12.5px] font-semibold !text-mid hover:!text-ink-2">
        ← 사건 목록으로
      </Link>

      <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
        <AsyncState loading={loading} error={error} onRetry={refetch}>
          {incident && <Summary incident={incident} onTriaged={setPatched} />}
        </AsyncState>
      </Card>

      {incident && (
        <>
          <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
            <div className="mb-[14px] text-[14px] font-bold text-ink">프로세스 계보</div>
            {/*
              null 과 빈 그래프는 뜻이 다르다. null 은 목록 응답이라 아직 안 받은 것이고,
              빈 그래프는 상세까지 받았는데 이을 관측이 없는 것이다. 같은 문구로 뭉치면 안 된다.
            */}
            {incident.lineage === null ? (
              <div className="py-[24px] text-center text-[13px] text-faint">
                계보를 받지 못했습니다
              </div>
            ) : incident.lineage.nodes.length === 0 ? (
              <div className="py-[24px] text-center text-[13px] text-faint">
                이 사건을 이을 관측이 없어 계보를 그리지 못했습니다
              </div>
            ) : (
              <AttackPath
                host={incident.host}
                label="사건 계보"
                steps={toAttackSteps(incident.lineage)}
              />
            )}
          </Card>

          <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
            <div className="text-[14px] font-bold text-ink">구성 알림</div>
            <div className="mt-[6px] mb-[14px] text-[12.5px] text-faint leading-[1.5]">
              알림을 고르면 그 알림의 판정 근거와 조치가 아래에 붙습니다.
            </div>
            {alerts ? (
              <AlertTable
                alerts={alerts}
                selectedId={picked?.id ?? null}
                onPick={setPickedAlertId}
              />
            ) : (
              <div className="py-[24px] text-center text-[13px] text-faint">
                구성 알림을 받지 못했습니다
              </div>
            )}
            {picked && (
              <PickedAlert
                key={picked.id}
                alert={picked}
                incident={incident}
                rule={ruleById.get(picked.ruleId) ?? null}
                onLoaded={keepFresh}
              />
            )}
          </Card>
        </>
      )}

      <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
        <div className="text-[14px] font-bold text-ink">사건 전개</div>
        <div className="mt-[6px] mb-[14px] text-[12.5px] text-faint leading-[1.5]">
          이 사건의 체인으로 이어진 관측만 담깁니다. 같은 호스트라도 체인 밖 이벤트는 포함되지
          않습니다.
        </div>
        <AsyncState
          loading={timeline.loading}
          error={timeline.error}
          empty={timeline.data?.entries.length === 0}
          emptyText="전개로 이을 관측이 없습니다"
          onRetry={timeline.refetch}
        >
          <div className="flex flex-col">
            {/* 서버가 시간 오름차순으로, 같은 시각이면 이벤트를 알림보다 먼저 준다. 다시 정렬하지 않는다. */}
            {(timeline.data?.entries ?? []).map((entry, i) => (
              <TimelineRow
                key={`${entry.ts}-${entry.kind}-${i}`}
                entry={entry}
                isPickedSource={Boolean(sourceEventId) && entry.eventId === sourceEventId}
              />
            ))}
          </div>
        </AsyncState>
      </Card>
    </div>
  )
}

type SummaryProps = {
  incident: Incident
  onTriaged: (incident: Incident) => void
}

function Summary({ incident, onTriaged }: SummaryProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="text-[16px] font-bold text-ink">
          {incident.threatNames[0] ?? '위협명 없음'}
          {incident.threatNames.length > 1 && (
            <span className="text-faint"> 외 {incident.threatNames.length - 1}건</span>
          )}
        </span>
        <Badge severity={severityTone(incident.severity)}>{severityLabel(incident.severity)}</Badge>
        {/* 알림 수로 다시 계산하지 않고 서버가 준 status 를 그대로 쓴다. */}
        <Badge severity={statusTone(incident.status)}>{statusLabel(incident.status)}</Badge>
      </div>

      <dl className="mt-[16px] grid grid-cols-[max-content_1fr] gap-x-[18px] gap-y-[8px] sm:grid-cols-[max-content_1fr_max-content_1fr]">
        <Field label="호스트">
          <span className="font-mono">{incident.host}</span>
        </Field>
        <Field label="알림 수">{incident.alertCount}건</Field>
        <Field label="루트 프로세스">
          {/* 빈 문자열은 원본 이벤트를 못 찾았다는 뜻이다. 서버도 화면도 지어내지 않는다. */}
          {incident.rootProcess ? (
            <span className="font-mono">{incident.rootProcess}</span>
          ) : (
            <span className="text-faint">확인 불가</span>
          )}
        </Field>
        <Field label="기간">
          <span className="font-mono">
            {absoluteTime(incident.firstTs)} ~ {absoluteTime(incident.lastTs)}
          </span>
        </Field>
        <Field label="MITRE">
          {incident.mitre.length ? (
            <span className="font-mono">{incident.mitre.join(', ')}</span>
          ) : (
            <span className="text-faint">매핑 없음</span>
          )}
        </Field>
        <Field label="룰">
          <span className="font-mono">{incident.ruleIds.join(', ')}</span>
        </Field>
      </dl>

      <TriageBox incident={incident} onTriaged={onTriaged} />
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Fragment>
      <dt className="text-[11.5px] text-faint">{label}</dt>
      <dd className="min-w-0 text-[12.5px] text-ink-2 wrap-anywhere">{children}</dd>
    </Fragment>
  )
}

/** 사건 단위 트리아지. 확정은 되돌릴 수 없어 한 번 더 묻고, 오탐은 바로 처리한다. */
function TriageBox({ incident, onTriaged }: SummaryProps) {
  const [pending, setPending] = useState<'confirmed' | 'false_positive' | null>(null)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bump = useAlertsStore((s) => s.bump)

  async function triage(status: 'confirmed' | 'false_positive') {
    setPending(status)
    setAsking(false)
    setError(null)
    try {
      const patched = await api.triageIncident(incident.id, status)
      /*
        트리아지 응답은 목록 형태라 alerts 와 lineage 가 null 이다. 그대로 갈아치우면 판단 한 번에
        보고 있던 구성 알림과 계보가 사라진다. 바뀐 것은 status 뿐이므로 나머지는 그대로 둔다.
      */
      onTriaged({
        ...patched,
        alerts: patched.alerts ?? incident.alerts,
        lineage: patched.lineage ?? incident.lineage,
      })
      bump()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="mt-[20px] flex flex-col gap-[12px] rounded-md border border-line-2 bg-panel px-[14px] py-[14px] sm:flex-row sm:items-center sm:gap-[16px] sm:px-[18px] sm:py-[16px]">
      <div className="flex-1">
        <div className="mb-1 text-[12px] text-faint">사건 판단</div>
        <div className="text-[13.5px] leading-[1.5] text-ink">
          이 사건 하나로 판단하면{' '}
          <span className="font-mono text-ink-2">{incident.alertCount}</span>
          건의 알림을 한 번에 정리합니다.
        </div>
        <div className="mt-[6px] text-[12px] text-faint leading-[1.5]">
          알림이 나중에 하나 더 붙어도 여기 남긴 판단은 유지됩니다.
        </div>
        {error && <div className="mt-[6px] text-[12px] text-crit">{error}</div>}
      </div>

      <div className="flex gap-[10px]">
        {incident.status !== 'open' ? (
          <span className="flex-1 whitespace-nowrap rounded-sm border border-line px-[16px] py-[10px] text-center text-[13px] font-semibold text-mid sm:flex-none">
            {statusLabel(incident.status)}
          </span>
        ) : asking ? (
          <>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="flex-1 cursor-pointer whitespace-nowrap rounded-sm border border-line px-[16px] py-[10px] font-sans text-[13px] font-semibold text-ink-2 sm:flex-none"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => triage('confirmed')}
              className="flex-1 cursor-pointer whitespace-nowrap rounded-sm bg-crit px-[18px] py-[10px] font-sans text-[13px] font-semibold text-white sm:flex-none"
            >
              정말 확정하시겠습니까?
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => triage('false_positive')}
              disabled={pending !== null}
              className="flex-1 cursor-pointer whitespace-nowrap rounded-sm border border-line px-[16px] py-[10px] font-sans text-[13px] font-semibold text-ink-2 disabled:opacity-60 sm:flex-none"
            >
              {pending === 'false_positive' ? '처리 중' : '오탐'}
            </button>
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={pending !== null}
              className="flex-1 cursor-pointer whitespace-nowrap rounded-sm bg-accent px-[18px] py-[10px] font-sans text-[13px] font-semibold text-white disabled:opacity-60 sm:flex-none"
            >
              {pending === 'confirmed' ? '처리 중' : '위협 확정'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

type AlertTableProps = {
  alerts: Alert[]
  selectedId: string | null
  onPick: (id: string) => void
}

function AlertTable({ alerts, selectedId, onPick }: AlertTableProps) {
  if (alerts.length === 0) {
    return <div className="py-[24px] text-center text-[13px] text-faint">구성 알림이 없습니다</div>
  }

  return (
    <ScrollArea label="구성 알림 목록">
      <div className="min-w-[720px]">
        <div
          className={`${alertGrid} pt-2 pb-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
        >
          <span>위협</span>
          <span>심각도</span>
          <span>상태</span>
          <span>MITRE</span>
          <span>탐지 시각</span>
        </div>
        {alerts.map((alert, i) => (
          <button
            key={alert.id}
            type="button"
            onClick={() => onPick(alert.id)}
            aria-pressed={alert.id === selectedId}
            className={`${alertGrid} w-full cursor-pointer items-center py-[10px] text-left font-sans ${
              i === alerts.length - 1 ? '' : 'border-b border-line-2'
            } ${alert.id === selectedId ? 'bg-[var(--accent-wash)]' : ''}`}
          >
            <span className="min-w-0">
              <span className="block truncate text-[13px] text-ink">{alert.threatName}</span>
              <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                {alert.ruleId}
              </span>
            </span>
            <Badge severity={severityTone(alert.severity)} className="justify-self-start">
              {severityLabel(alert.severity)}
            </Badge>
            <Badge severity={statusTone(alert.status)} className="justify-self-start">
              {statusLabel(alert.status)}
            </Badge>
            <span className="font-mono text-[11.5px] text-mid">{alert.mitre ?? '—'}</span>
            <span className="font-mono text-[11px] text-faint">{absoluteTime(alert.ts)}</span>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}

/**
 * 표에서 고른 알림 하나. 판정 근거와 조치는 사건이 아니라 알림에 달리는 것이라 여기서 다룬다.
 * 사건 트리아지가 알림 전체를 한 번에 정리한다면, 여기는 알림 한 건만 따로 판단하고 조치한다.
 */
function PickedAlert({
  alert,
  incident,
  rule,
  onLoaded,
}: {
  alert: Alert
  incident: Incident
  rule: RuleCatalogEntry | null
  onLoaded: (a: Alert) => void
}) {
  const alertsVersion = useAlertsStore((s) => s.version)
  // 사건 응답의 알림에는 sourceEvent 가 없어 상세를 따로 받는다. 트리아지 뒤에는 status 도 여기서 다시 온다.
  const detail = useApi(() => api.alert(alert.id), [alert.id, alertsVersion])
  const fresh = detail.data
  useEffect(() => {
    if (fresh) onLoaded(fresh)
  }, [fresh, onLoaded])
  const current = fresh ?? alert

  return (
    <div className="mt-[18px] border-t border-line-2 pt-[18px]">
      <div className="text-[13px] font-bold text-ink">
        선택한 알림 <span className="ml-[4px] font-normal text-ink-2">{current.threatName}</span>
      </div>
      {/* ruleId 만으로는 이 룰이 무엇을 잡는지 알 수 없다. 카탈로그에 없는 룰이면 id 만 둔다. */}
      <div className="mt-[6px] text-[12px] leading-[1.5] text-faint">
        <span className="font-mono">{current.ruleId}</span>
        {rule && <span className="ml-[8px] text-mid">{rule.description}</span>}
      </div>

      <div className="mt-[14px]">
        <div className="mb-[10px] text-[12.5px] text-faint leading-[1.5]">
          이 알림이 어디서 왔고 어디로 이어지는지입니다.
        </div>
        {/* sourceEvent 는 상세 응답에만 있다. 아직 못 받았는데 그리면 있는 이벤트가 없는 것으로 보인다. */}
        {fresh ? (
          <EvidenceChain steps={toChainSteps(incident, fresh, rule)} />
        ) : (
          <div className="py-[16px] text-center text-[13px] text-faint">
            {detail.error ? '증거 사슬을 그리지 못했습니다' : '증거 사슬을 그리는 중입니다'}
          </div>
        )}
      </div>

      <SourceEventPanel
        event={fresh?.sourceEvent ?? null}
        loading={detail.loading}
        error={detail.error}
        onRetry={detail.refetch}
      />
      <TriageActions alert={current} />
      {/*
        실행 가능한 조치는 프로세스 종료 하나뿐이다. notify(MEDIUM)는 조치 대상이 아니라
        버튼을 띄우지 않는다.

        isolate 를 함께 받는 이유: 격리는 아직 구현이 없어(방화벽으로 끊으면 에이전트 연결도
        끊겨 명령을 내려보낼 수단이 사라진다) 당분간 프로세스 종료로 대신한다. detector 는 이미
        CRITICAL 을 kill 로 권고하도록 바꿨고(Alert.java), isolate 는 데모 데이터에만 남아 있다.
        실제로 격리를 붙이면 이 분기와 함께 권고를 되돌린다.
      */}
      {(current.action === 'kill' || current.action === 'isolate') && (
        <RealAction alert={current} />
      )}
    </div>
  )
}

/**
 * matchedBy 별 확신 문구. 백엔드가 주는 값은 summary 와 rule_type 둘뿐이고 그 순으로 확신이 약해진다.
 * 둘 다 못 짚으면 시각으로 추측하지 않고 sourceEvent 자체를 null 로 준다.
 * 배지 색과 문구를 갈라 둬서 추정이 사실처럼 보이지 않게 한다.
 */
const matchedByInfo: Record<string, { label: string; tone: 'good' | 'high'; note: string }> = {
  summary: {
    label: '근거 확실',
    tone: 'good',
    note: '프로세스명·부모·경로까지 일치해 이 이벤트가 판정 근거임을 확인했습니다.',
  },
  rule_type: {
    label: '근거 추정',
    tone: 'high',
    note: '이벤트 종류만 일치합니다. 같은 종류가 여럿이면 시각으로 가장 가까운 것을 고른 추정치입니다.',
  },
}

/**
 * 엔드포인트 → 이벤트 → 룰 → 알림 → 사건 다섯 칸.
 */
function toChainSteps(
  incident: Incident,
  alert: Alert,
  rule: RuleCatalogEntry | null,
): ChainStep[] {
  const event = alert.sourceEvent
  // summary 만 프로세스명·부모·경로까지 맞춘 확실한 연결이다. 나머지는 전부 추정으로 그린다.
  const estimated = event !== null && event.matchedBy !== 'summary'
  const info = event ? matchedByInfo[event.matchedBy] : undefined
  /*
    사건 칸은 지금 보고 있는 사건이 아니라 알림이 들고 온 incidentId 로 잇는다.
    null 이면 사건 조회 기간(최근 7일) 밖이라 사건 목록에도 없다. 링크를 걸면 열리지 않는 곳으로 보낸다.
  */
  const incidentId = alert.incidentId
  const sameIncident = incidentId === incident.id

  return [
    { label: '엔드포인트', value: alert.host },
    {
      label: '이벤트',
      value: event ? event.process || '프로세스 미상' : null,
      sub: event ? absoluteTime(event.ts) : undefined,
      estimated,
      estimatedLabel: info?.label,
      note: event
        ? estimated
          ? (info?.note ?? '알려지지 않은 방법으로 특정한 이벤트라 확실하지 않습니다.')
          : undefined
        : '판정 근거가 된 원본 이벤트를 찾지 못해 사슬이 여기서 끊깁니다.',
    },
    { label: '룰', value: alert.threatName, sub: alert.ruleId, note: rule?.description },
    // 사건 상세에서 고른 것은 알림이라 여기가 지금 위치다.
    { label: '알림', value: alert.id, active: true },
    {
      label: '사건',
      value:
        incidentId === null
          ? null
          : sameIncident
            ? (incident.threatNames[0] ?? '위협명 없음')
            : incidentId,
      sub: incidentId !== null && sameIncident ? incidentId : undefined,
      to: incidentId === null ? undefined : `/incidents/${incidentId}`,
      note:
        incidentId === null
          ? '사건 조회 기간(최근 7일)을 벗어난 오래된 알림이라 사건으로 묶이지 않았습니다.'
          : undefined,
    },
  ]
}

/** 판정을 유발한 원본 이벤트. 목록 조회에는 없고 알림 상세에서만 온다. */
function SourceEventPanel({
  event,
  loading,
  error,
  onRetry,
}: {
  event: SourceEvent | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  return (
    <div className="mt-[16px]">
      <div className="mb-[10px] text-[13px] font-bold text-ink">판정 근거 이벤트</div>
      <AsyncState
        loading={loading}
        error={error}
        empty={!event}
        emptyText="원본 이벤트를 찾지 못했습니다"
        onRetry={onRetry}
      >
        {event && <SourceEventCard event={event} />}
      </AsyncState>
    </div>
  )
}

function SourceEventCard({ event }: { event: SourceEvent }) {
  const info = matchedByInfo[event.matchedBy] ?? {
    label: event.matchedBy,
    tone: 'high' as const,
    note: '',
  }
  const hasDest = Boolean(event.domain || event.destIp || event.destPort !== 0)

  return (
    <div className="flex flex-col gap-[10px] px-[14px] py-[14px] sm:px-[18px] sm:py-[16px] bg-panel-2 border border-line-2 rounded-md">
      <div className="flex flex-wrap items-center gap-[10px]">
        <Badge severity={info.tone}>{info.label}</Badge>
        <span className="text-[11px] text-faint">{eventTypeLabel(event.type)}</span>
        <span className="ml-auto font-mono text-[11px] text-faint">{absoluteTime(event.ts)}</span>
      </div>
      {info.note && <div className="text-[12px] leading-[1.5] text-faint">{info.note}</div>}
      <div className="text-[13.5px] leading-[1.6] text-ink">
        <span className="font-mono text-ink-2">{event.process}</span>
        {event.parent && (
          <>
            {' '}
            (부모 <span className="font-mono text-ink-2">{event.parent}</span>)
          </>
        )}
        {event.cmdline && (
          <div className="mt-[4px] break-all font-mono text-[12px] text-faint">{event.cmdline}</div>
        )}
      </div>
      {hasDest && (
        <div className="font-mono text-[12px] text-mid">
          {event.domain && <span className="text-ink-2">{event.domain}</span>}
          {event.destIp && <span className="ml-[6px] text-faint">{event.destIp}</span>}
          {event.destPort !== 0 && <span className="text-faint">:{event.destPort}</span>}
        </div>
      )}
      {event.sha256 && (
        <div className="break-all font-mono text-[11px] text-faint">sha256 {event.sha256}</div>
      )}
    </div>
  )
}

/** responder 실행 결과 status 별 안내 문구와 색. */
const execResult: Record<ExecuteStatus, { text: string; tone: 'good' | 'high' | 'crit' | 'mid' }> =
  {
    KILLED: { text: '프로세스를 종료했습니다.', tone: 'good' },
    NO_MATCH: { text: '대상 프로세스를 찾지 못했습니다.', tone: 'mid' },
    TIMEOUT: { text: '응답 시간이 초과됐습니다.', tone: 'high' },
    FAILED: { text: '실행에 실패했습니다.', tone: 'crit' },
    COOLDOWN: { text: '쿨다운 중입니다. 잠시 후 다시 시도하세요.', tone: 'mid' },
    DISABLED: { text: '서버에서 실제 조치가 꺼져 있습니다.', tone: 'mid' },
  }

/** 결과 배지 배경. 작은 글씨 한 줄이면 조치가 됐는지 눈에 안 띈다. */
const resultBox = {
  good: 'bg-good/15 text-good border border-good/30',
  high: 'bg-high/15 text-high border border-high/30',
  crit: 'bg-crit/15 text-crit border border-crit/30',
  mid: 'bg-panel text-mid border border-line',
}

/** 실제 조치(kill) 실행. 확인 단계를 거친 뒤 api-service 를 경유해 실행한다. */
function RealAction({ alert }: { alert: Alert }) {
  const isDemo = useAuthStore((s) => s.token) === null
  // 종료 대상 프로세스는 alert.matched 의 실행 체인 말단 프로세스. 없으면 실행 불가.
  const target = killTarget(alert.matched)
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'pending'>('idle')
  const [result, setResult] = useState<ExecuteStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 종료에 성공하면 서버에서 알림이 confirmed 로 바뀐다. 바로 옆 표가 옛 상태를 들고 있지 않게 한다.
  const bump = useAlertsStore((s) => s.bump)

  function ask() {
    setResult(null)
    setError(null)
    setPhase('confirm')
  }

  async function run() {
    if (!target) return
    setPhase('pending')
    setError(null)
    try {
      const res = await api.executeKill(alert.id, target)
      setResult(res.status)
      if (res.status === 'KILLED') bump()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPhase('idle')
    }
  }

  return (
    <div className="mt-[12px] px-[14px] py-[14px] sm:px-[18px] sm:py-[16px] bg-panel-2 border border-line-2 rounded-md">
      <div className="flex flex-col gap-[10px] sm:flex-row sm:items-center sm:gap-[16px]">
        <div className="flex-1">
          <div className="text-[12px] text-faint mb-1">실제 조치 (프로세스 종료)</div>
          <div className="text-[13.5px] leading-[1.5] text-ink">
            {target ? (
              <>
                <span className="font-mono text-ink-2">{alert.host}</span> 에서{' '}
                <span className="font-mono text-ink-2">{target}</span> 프로세스를 종료합니다.
              </>
            ) : (
              '종료할 프로세스를 찾지 못했습니다.'
            )}
          </div>
          {result && (
            <div
              className={`mt-[10px] inline-flex items-center gap-[8px] px-[12px] py-[8px] rounded-sm text-[13px] font-semibold ${resultBox[execResult[result].tone]}`}
            >
              <span>{result === 'KILLED' ? '✓' : '!'}</span>
              <span>{execResult[result].text}</span>
            </div>
          )}
          {result === 'KILLED' && (
            <div className="mt-[6px] text-[12px] text-faint leading-[1.5]">
              이 알림은 처리 완료(confirmed)로 바뀌었습니다. 열린 알림 목록에서는 사라집니다.
            </div>
          )}
          {isDemo && (
            <div className="mt-[6px] text-[12px] text-faint">
              데모라 실제로 종료하지는 않습니다. 예시 결과만 보여 줍니다.
            </div>
          )}
          {error && <div className="mt-[6px] text-[12px] text-crit">{error}</div>}
        </div>

        <div className="flex gap-[10px]">
          {phase === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="flex-1 sm:flex-none whitespace-nowrap text-[13px] font-semibold text-ink-2 border border-line px-[16px] py-[10px] rounded-sm cursor-pointer font-sans"
              >
                취소
              </button>
              <button
                type="button"
                onClick={run}
                className="flex-1 sm:flex-none whitespace-nowrap text-[13px] font-semibold text-white bg-crit px-[18px] py-[10px] rounded-sm cursor-pointer font-sans"
              >
                정말 종료하시겠습니까?
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={ask}
              disabled={!target || phase === 'pending' || result === 'KILLED'}
              className="flex-1 sm:flex-none whitespace-nowrap text-[13px] font-semibold text-white bg-high px-[18px] py-[10px] rounded-sm cursor-pointer font-sans disabled:opacity-60 disabled:cursor-default"
            >
              {phase === 'pending'
                ? '실행 중'
                : result === 'KILLED'
                  ? '조치 완료'
                  : '실제 조치 실행'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 관측하지 못한 값(null)은 줄에서 아예 뺀다. 0 이나 빈 값으로 채우면 관측한 것처럼 읽힌다.
 */
function eventParts(entry: IncidentTimelineEntry): string[] {
  const dest =
    entry.destIp && entry.destPort !== null
      ? `${entry.destIp}:${entry.destPort}`
      : (entry.destIp ?? null)
  return [
    entry.pid === null ? null : `PID ${entry.pid}`,
    entry.parent ? `부모 ${entry.parent}` : null,
    entry.domain,
    dest,
    entry.cmdline,
  ].filter((part): part is string => Boolean(part))
}

/**
 * 이벤트 줄과 알림 줄을 배경·표식으로 갈라 그린다. 관측과 판정은 다른 것이다.
 * isPickedSource 는 고른 알림을 유발한 바로 그 관측이라 전개에서 눈에 띄게 짚어 준다.
 */
function TimelineRow({
  entry,
  isPickedSource,
}: {
  entry: IncidentTimelineEntry
  isPickedSource: boolean
}) {
  const isAlert = entry.kind === 'alert'
  const parts = eventParts(entry)

  return (
    <div
      className={`flex gap-[12px] border-b border-line-2 px-[10px] py-[10px] ${
        isPickedSource ? 'bg-[var(--accent-wash)]' : isAlert ? 'bg-panel' : ''
      }`}
    >
      <span className="pt-[2px] font-mono text-[11.5px] text-faint">{clockTime(entry.ts)}</span>
      {isAlert ? (
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-[8px]">
            <Badge severity={severityTone(entry.severity ?? '')}>
              판정 · {severityLabel(entry.severity ?? '알 수 없음')}
            </Badge>
            <span className="text-[13px] font-semibold text-ink">
              {entry.threatName ?? '위협명 없음'}
            </span>
          </span>
          <span className="mt-[3px] block truncate font-mono text-[11px] text-faint">
            {entry.ruleId ?? ''}
          </span>
        </span>
      ) : (
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-[8px]">
            <span className="font-mono text-[11px] text-faint">
              {entry.type ? eventTypeLabel(entry.type) : '유형 미상'}
            </span>
            <span className="font-mono text-[12.5px] text-ink-2">
              {entry.process ?? '프로세스 미상'}
            </span>
            {isPickedSource && (
              <span className="rounded-full border border-accent px-[6px] text-[10px] text-accent">
                선택한 알림의 원본
              </span>
            )}
          </span>
          {parts.length > 0 && (
            <span className="mt-[3px] block truncate font-mono text-[11px] text-faint">
              {parts.join(' · ')}
            </span>
          )}
        </span>
      )}
    </div>
  )
}

export default IncidentDetail
