type ProgressBarProps = {
  label: string
  percent: number
  /** animation duration in seconds, matches design stagger */
  duration?: number
  /** bar fill color, defaults to accent */
  color?: string
  /** fill opacity for accent shades */
  opacity?: number
  muted?: boolean
}

function ProgressBar({
  label,
  percent,
  duration = 1,
  color = 'var(--accent)',
  opacity = 1,
  muted = false,
}: ProgressBarProps) {
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex justify-between text-[13px]">
        <span className={muted ? 'text-mid' : 'text-ink-2'}>{label}</span>
        <span className={`font-mono tabular-nums ${muted ? 'text-mid' : 'text-ink'}`}>
          {percent}%
        </span>
      </div>
      <div className="h-[7px] rounded-full bg-panel overflow-hidden">
        <div
          className="h-full rounded-full origin-left"
          style={{
            width: `${percent}%`,
            background: color,
            opacity,
            animation: `edrBarGrow ${duration}s cubic-bezier(.2,.7,.2,1) both`,
          }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
