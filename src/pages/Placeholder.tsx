type PlaceholderProps = {
  title: string
  description: string
}

function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="flex flex-col gap-[20px]">
      <div>
        <div className="text-[20px] font-bold text-ink tracking-[-0.01em]">{title}</div>
        <div className="mt-[6px] text-[13px] text-faint">{description}</div>
      </div>
      <div className="bg-surface border border-line rounded-[14px] px-[24px] py-[40px] shadow-[var(--shadow-1)] text-[13px] text-faint">
        준비 중입니다.
      </div>
    </div>
  )
}

export default Placeholder
