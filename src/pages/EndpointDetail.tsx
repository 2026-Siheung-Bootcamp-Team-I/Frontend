import { Fragment, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/api'
import type { EdrEvent, Host } from '@/api/types'
import AsyncState from '@/components/ui/AsyncState'
import AttackPath from '@/components/ui/AttackPath'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import ScrollArea from '@/components/ui/ScrollArea'
import { useApi } from '@/hooks/useApi'
import {
  absoluteTime,
  clockTime,
  eventTypeLabel,
  hostStatusColor,
  hostStatusLabel,
  platformLabel,
  relativeTime,
  severityLabel,
  severityTone,
  statusLabel,
  statusTone,
} from '@/lib/format'
import { toAttackSteps } from '@/lib/lineagePath'

const ALERT_LIMIT = 50

const INCIDENT_LIMIT = 200

const EVENT_LIMIT = 20

// 위협 / 심각도 / 상태 / MITRE / 탐지 시각
const alertGrid = 'grid grid-cols-[1fr_78px_86px_104px_150px] gap-[12px] px-[4px]'

// 위협 / 심각도 / 상태 / 알림 수 / 기간
const incidentGrid = 'grid grid-cols-[1fr_78px_86px_60px_160px] gap-[12px] px-[4px]'

// 발생 시각 / 유형 / 프로세스 / 내용
const eventGrid = 'grid grid-cols-[152px_104px_140px_1fr] gap-[12px] px-[4px]'

// Endpoints 목록과 같은 기준. 등록은 됐지만 수집이 한 번도 없으면 status 는 healthy 로 오는데
// 그걸 정상이라 말하면 검증 안 된 상태를 좋다고 하는 셈이라 따로 뗀다.
function isNoEvents(h: Host): boolean {
  return h.enrolled && h.lastSeen === 0
}

function EndpointDetail() {
  const host = useParams().host ?? ''
  // 호스트 단건 API 가 없어 목록에서 찾는다.
  const hosts = useApi(() => api.hosts(), [])
  const info = hosts.data?.find((h) => h.host === host) ?? null

  return (
    <div className="flex flex-col gap-[16px]">
      <Link to="/endpoints" className="text-[12.5px] font-semibold !text-mid hover:!text-ink-2">
        ← 엔드포인트 목록으로
      </Link>

      <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
        <AsyncState
          loading={hosts.loading}
          error={hosts.error}
          empty={hosts.data !== null && info === null}
          emptyText={`${host} 는 등록되거나 관측된 호스트 목록에 없습니다`}
          onRetry={hosts.refetch}
        >
          {info && <Summary info={info} />}
        </AsyncState>
      </Card>

      {/* 없는 호스트로 더 조회하지 않는다. 빈 표만 늘어난다. */}
      {info && (
        <>
          <ProcessTree host={host} />
          <HostAlerts host={host} />
          <HostIncidents host={host} />
          <HostEvents host={host} />
        </>
      )}
    </div>
  )
}

function Summary({ info }: { info: Host }) {
  const noEvents = isNoEvents(info)

  return (
    <>
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="font-mono text-[16px] font-bold text-ink">{info.host}</span>
        {/* 위험 여부는 서버가 준 status 를 따른다. 점수로 색을 또 나누지 않는다. */}
        <span
          className="inline-flex items-center gap-[7px] text-[12.5px] font-semibold"
          style={{ color: noEvents ? 'var(--faint)' : hostStatusColor(info.status) }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: noEvents ? 'var(--faint)' : hostStatusColor(info.status) }}
          />
          {noEvents ? '수집 없음' : hostStatusLabel(info.status)}
        </span>
        {!info.enrolled && <Badge severity="mid">미등록</Badge>}
      </div>

      <dl className="mt-[16px] grid grid-cols-[max-content_1fr] gap-x-[18px] gap-y-[8px] sm:grid-cols-[max-content_1fr_max-content_1fr]">
        <Field label="OS">{platformLabel(info.platform)}</Field>
        <Field label="위험도">
          <span className="flex items-center gap-[8px]">
            <span className="font-mono tabular-nums text-ink">{info.riskScore}</span>
            <span className="h-[5px] w-[90px] overflow-hidden rounded-xs bg-panel">
              <span
                className="block h-full rounded-xs"
                style={{
                  width: `${info.riskScore}%`,
                  background: noEvents ? 'var(--faint)' : hostStatusColor(info.status),
                }}
              />
            </span>
          </span>
        </Field>
        <Field label="열린 위협">
          <span className={info.threats > 0 ? 'text-crit' : ''}>{info.threats}건</span>
        </Field>
        <Field label="마지막 활동">
          {/* lastSeen 0 은 등록만 되고 수집이 없는 기기다. 1970년으로 그리면 안 된다. */}
          {noEvents ? (
            <span className="text-faint">수집 없음</span>
          ) : (
            <span className="font-mono">
              {absoluteTime(info.lastSeen)}
              <span className="ml-[6px] text-faint">{relativeTime(info.lastSeen)}</span>
            </span>
          )}
        </Field>
        <Field label="에이전트 연결">
          {info.enrolled ? (
            <span className="font-mono">
              {absoluteTime(info.agentSeen)}
              <span className="ml-[6px] text-faint">{relativeTime(info.agentSeen)}</span>
            </span>
          ) : (
            <span className="text-faint">등록되지 않은 기기입니다</span>
          )}
        </Field>
      </dl>

      {/*
        위험도가 무엇을 센 값인지만 밝힌다. 상태를 어떻게 정하는지는 서버 규칙이라 여기 적지 않는다.
        적어 두면 서버가 규칙을 바꿀 때 화면만 옛 설명을 계속 사실처럼 보여준다.
      */}
      <div className="mt-[14px] text-[12px] leading-[1.5] text-faint">
        위험도는 열린 알림을 심각도로 가중해 더한 0~100 값입니다. 0 은 열린 알림이 없다는 뜻입니다.
        상태와 어긋나 보이면 아래 목록에서 실제 알림을 확인하세요.
      </div>
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

function Section({
  title,
  note,
  right,
  children,
}: {
  title: string
  note?: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="px-[16px] py-[18px] sm:px-[24px] sm:py-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
        <span className="text-[14px] font-bold text-ink">{title}</span>
        {right}
      </div>
      {note && <div className="mt-[6px] text-[12.5px] leading-[1.5] text-faint">{note}</div>}
      <div className="mt-[14px]">{children}</div>
    </Card>
  )
}

/** 호스트 단위 프로세스 계보. 응답이 알림 계보와 같은 Lineage 라 같은 렌더러를 쓴다. */
function ProcessTree({ host }: { host: string }) {
  const tree = useApi(() => api.processTree(host), [host])

  return (
    <Section
      title="프로세스 트리"
      note="이 호스트에서 관측된 프로세스와 그 뒤로 이어진 활동입니다."
    >
      <AsyncState loading={tree.loading} error={tree.error} onRetry={tree.refetch}>
        {/*
          받지 못한 것과 이을 관측이 없는 것은 뜻이 다르다. 같은 문구로 뭉치면
          수집이 없는 기기가 조회 실패로 읽힌다.
        */}
        {tree.data === null ? (
          <div className="py-[24px] text-center text-[13px] text-faint">
            프로세스 트리를 받지 못했습니다
          </div>
        ) : tree.data.nodes.length === 0 ? (
          <div className="py-[24px] text-center text-[13px] text-faint">
            이을 관측이 없어 프로세스 트리를 그리지 못했습니다
          </div>
        ) : (
          <AttackPath host={host} label="프로세스 트리" steps={toAttackSteps(tree.data)} />
        )}
      </AsyncState>
    </Section>
  )
}

function HostAlerts({ host }: { host: string }) {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApi(
    () => api.alerts({ host, limit: ALERT_LIMIT }),
    [host],
  )
  const rows = data ?? []
  const goToThreats = () => navigate('/threats?host=' + encodeURIComponent(host))

  return (
    <Section
      title="이 호스트의 위협"
      note={`최근 ${ALERT_LIMIT}건까지 봅니다. 줄을 누르면 이 호스트로 좁힌 위협 목록으로 갑니다.`}
      right={<span className="font-mono text-[12px] text-faint">{rows.length}건</span>}
    >
      <AsyncState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyText="이 호스트에서 탐지된 위협이 없습니다"
        onRetry={refetch}
      >
        <ScrollArea label="이 호스트의 위협 목록">
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
            {rows.map((row, i) => (
              <button
                key={row.id}
                type="button"
                onClick={goToThreats}
                className={`${alertGrid} w-full cursor-pointer items-center py-[10px] text-left font-sans hover:bg-panel rounded-xs ${
                  i === rows.length - 1 ? '' : 'border-b border-line-2'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink">{row.threatName}</span>
                  <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                    {row.ruleId}
                  </span>
                </span>
                <Badge severity={severityTone(row.severity)} className="justify-self-start">
                  {severityLabel(row.severity)}
                </Badge>
                <Badge severity={statusTone(row.status)} className="justify-self-start">
                  {statusLabel(row.status)}
                </Badge>
                <span className="font-mono text-[11.5px] text-mid">{row.mitre ?? '매핑 없음'}</span>
                <span className="font-mono text-[11px] text-faint">{absoluteTime(row.ts)}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </AsyncState>
    </Section>
  )
}

function HostIncidents({ host }: { host: string }) {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApi(
    () => api.incidents({ host, limit: INCIDENT_LIMIT }),
    [host],
  )
  const rows = data ?? []

  return (
    <Section
      title="이 호스트의 사건"
      note={`최근 사건 ${INCIDENT_LIMIT}건까지 봅니다(기본 최근 7일).`}
      right={<span className="font-mono text-[12px] text-faint">{rows.length}건</span>}
    >
      <AsyncState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyText="조회 범위 안에 이 호스트의 사건이 없습니다"
        onRetry={refetch}
      >
        <ScrollArea label="이 호스트의 사건 목록">
          <div className="min-w-[720px]">
            <div
              className={`${incidentGrid} pt-2 pb-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
            >
              <span>위협</span>
              <span>심각도</span>
              <span>상태</span>
              <span className="text-right">알림</span>
              <span>기간</span>
            </div>
            {rows.map((row, i) => (
              <button
                key={row.id}
                type="button"
                onClick={() => navigate(`/incidents/${encodeURIComponent(row.id)}`)}
                className={`${incidentGrid} w-full cursor-pointer items-center py-[10px] text-left font-sans hover:bg-panel rounded-xs ${
                  i === rows.length - 1 ? '' : 'border-b border-line-2'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink">
                    {row.threatNames[0] ?? '위협명 없음'}
                    {row.threatNames.length > 1 && (
                      <span className="text-faint"> 외 {row.threatNames.length - 1}건</span>
                    )}
                  </span>
                  <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                    {row.ruleIds.join(', ')}
                  </span>
                </span>
                <Badge severity={severityTone(row.severity)} className="justify-self-start">
                  {severityLabel(row.severity)}
                </Badge>
                <Badge severity={statusTone(row.status)} className="justify-self-start">
                  {statusLabel(row.status)}
                </Badge>
                <span className="text-right font-mono text-[12px] text-mid">{row.alertCount}</span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[11.5px] text-ink-2">
                    {absoluteTime(row.firstTs)}
                  </span>
                  <span className="mt-[2px] block truncate font-mono text-[11px] text-faint">
                    ~ {clockTime(row.lastTs)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </AsyncState>
    </Section>
  )
}

/**
 * 목록 한 줄에 걸 값.
 * 파일·DNS 이벤트는 목적지도 명령줄도 없어서 그 둘만 보면 빈 줄이 된다. 유형마다 남는 값을 챙긴다.
 */
function eventLine(e: EdrEvent): string {
  const dest = e.destPort === 0 ? e.destIp : `${e.destIp}:${e.destPort}`
  return (
    [e.action, e.domain, dest, e.cmdline, e.sha256].filter(Boolean).join(' · ') || '내용 없음'
  )
}

function HostEvents({ host }: { host: string }) {
  const { data, loading, error, refetch } = useApi(
    () => api.events({ host, limit: EVENT_LIMIT }),
    [host],
  )
  const rows = data ?? []

  return (
    <Section
      title="최근 수집 로그"
      note={`이 호스트에서 수집한 원시 이벤트 최근 ${EVENT_LIMIT}건입니다.`}
      right={
        <Link
          to={'/events?host=' + encodeURIComponent(host)}
          className="text-[12px] font-semibold !text-accent"
        >
          전체 보기
        </Link>
      }
    >
      <AsyncState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyText="이 호스트에서 수집된 이벤트가 없습니다"
        onRetry={refetch}
      >
        <ScrollArea label="최근 수집 로그">
          <div className="min-w-[720px]">
            <div
              className={`${eventGrid} pt-2 pb-2 border-b border-line-2 text-[11px] text-faint uppercase tracking-[0.04em]`}
            >
              <span>발생 시각</span>
              <span>유형</span>
              <span>프로세스</span>
              <span>내용</span>
            </div>
            {rows.map((row, i) => (
              <div
                // id 는 내용을 접은 값이라 완전히 같은 이벤트끼리는 겹칠 수 있다.
                key={`${row.id}#${i}`}
                className={`${eventGrid} items-center py-[10px] ${
                  i === rows.length - 1 ? '' : 'border-b border-line-2'
                }`}
              >
                <span className="font-mono text-[11.5px] text-ink-2">{absoluteTime(row.ts)}</span>
                {/* 색은 심각도 뜻으로만 쓴다. 유형은 중립 배지로 둔다. */}
                <Badge severity="mid" className="justify-self-start">
                  {eventTypeLabel(row.type)}
                </Badge>
                <span className="truncate font-mono text-[12px] text-mid">
                  {row.process || '프로세스 없음'}
                </span>
                <span className="truncate font-mono text-[12px] text-ink">{eventLine(row)}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </AsyncState>
    </Section>
  )
}

export default EndpointDetail
