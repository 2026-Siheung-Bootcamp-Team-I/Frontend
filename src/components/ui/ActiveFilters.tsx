export type ActiveFilter = {
  /** 무엇을 거른 것인지. 값만 있으면 어느 조건인지 알 수 없다. */
  label: string
  value: string
  onClear: () => void
}

type ActiveFiltersProps = {
  filters: ActiveFilter[]
  /**
   * 다른 화면에서 좁혀서 들어온 경우 되돌아갈 곳.
   * 조건을 푸는 것(해제)과 왔던 곳으로 가는 것은 다른 일이라 버튼을 따로 둔다.
   */
  onBack?: () => void
}

/**
 * 지금 걸려 있는 조건을 목록 위에 되짚어 준다.
 * 결과가 비었을 때 화면이 빈 이유가 데이터가 없어서인지 조건 때문인지 여기서 갈린다.
 */
function ActiveFilters({ filters, onBack }: ActiveFiltersProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-[8px]">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded-sm border border-line bg-surface px-[11px] py-[6px] font-sans text-[12px] font-semibold text-mid hover:text-ink-2"
        >
          ← 뒤로
        </button>
      )}
      {filters.map((filter) => (
        <span
          key={filter.label}
          className="inline-flex items-center gap-[9px] rounded-full bg-[var(--accent-wash)] py-[6px] pl-[13px] pr-[9px] text-[12px]"
        >
          <span className="text-faint">{filter.label}</span>
          <span className="font-mono font-semibold text-accent">{filter.value}</span>
          <button
            type="button"
            onClick={filter.onClear}
            aria-label={`${filter.label} 필터 해제`}
            className="cursor-pointer font-sans text-[11.5px] font-semibold text-mid hover:text-ink-2"
          >
            해제
          </button>
        </span>
      ))}
    </div>
  )
}

export default ActiveFilters
