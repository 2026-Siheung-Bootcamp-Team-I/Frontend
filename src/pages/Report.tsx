import Card from '@/components/ui/Card'
import ProgressBar from '@/components/ui/ProgressBar'

type Stat = {
  label: string
  value: string
  crit?: boolean
}

const stats: Stat[] = [
  { label: '이번 주 탐지', value: '128' },
  { label: '미판단', value: '9', crit: true },
  { label: '심각', value: '2', crit: true },
]

type ThreatType = {
  label: string
  percent: number
  opacity?: number
}

const threatTypes: ThreatType[] = [
  { label: '악성코드', percent: 42 },
  { label: '권한 상승', percent: 24, opacity: 0.82 },
  { label: '정보 유출', percent: 18, opacity: 0.64 },
  { label: '원격 접속', percent: 10, opacity: 0.46 },
  { label: '기타', percent: 6, opacity: 0.46 },
]

type EventCount = {
  label: string
  value: string
  percent: number
}

const eventCounts: EventCount[] = [
  { label: '프로세스 실행', value: '4,210', percent: 100 },
  { label: '네트워크 연결', value: '2,980', percent: 71 },
  { label: '파일 생성·수정', value: '1,640', percent: 39 },
  { label: '레지스트리 변경', value: '520', percent: 12 },
  { label: '스크립트 실행', value: '180', percent: 5 },
]

function Report() {
  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="text-[20px] font-bold text-ink tracking-[-0.01em]">요약 보기</div>
        <div className="mt-[6px] text-[13px] text-faint">
          에이전트가 관측한 이벤트와 탐지된 위협을 요약합니다.
        </div>
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-3 gap-[16px]">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`px-[24px] py-[22px] ${s.crit ? 'border-l-[3px] border-l-crit' : ''}`}
          >
            <div className="text-[12px] text-faint">{s.label}</div>
            <div className="flex items-baseline gap-[5px] mt-[10px]">
              <span className="font-mono text-[28px] font-medium text-ink tabular-nums">
                {s.value}
              </span>
              <span className="text-[12px] text-mid">건</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-[20px] items-start">
        {/* threat types top 5 */}
        <Card className="px-[24px] py-[22px]">
          <div className="text-[14px] font-bold text-ink mb-[18px]">위협 유형 TOP 5</div>
          <div className="flex flex-col gap-[15px]">
            {threatTypes.map((t) => (
              <ProgressBar
                key={t.label}
                label={t.label}
                percent={t.percent}
                opacity={t.opacity}
                animate={false}
              />
            ))}
          </div>
        </Card>

        {/* event counts */}
        <Card className="px-[24px] py-[22px]">
          <div className="flex justify-between items-center mb-[18px]">
            <span className="text-[14px] font-bold text-ink">이벤트 유형별 건수</span>
            <span className="text-[11.5px] text-faint">최근 24시간</span>
          </div>
          <div className="flex flex-col gap-[15px]">
            {eventCounts.map((e) => (
              <div key={e.label} className="flex flex-col gap-[7px]">
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink-2">{e.label}</span>
                  <span className="font-mono tabular-nums text-ink">{e.value}</span>
                </div>
                <div className="h-[7px] rounded-full bg-panel overflow-hidden">
                  <div className="h-full rounded-full bg-good" style={{ width: `${e.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Report
