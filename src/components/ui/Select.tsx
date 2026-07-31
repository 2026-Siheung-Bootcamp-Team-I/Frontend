type Option = { value: string; label: string }

type SelectProps = {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}

/**
 * 필터 바에 쓰는 라벨 붙은 드롭다운.
 * 기본 화살표는 테마를 따르지 않아 지우고 직접 그린다(라이트에서만 보이거나 그 반대가 된다).
 */
function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="flex min-w-0 flex-col gap-[7px]">
      <span className="text-[11.5px] font-semibold text-faint">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-sm border border-line bg-surface py-[8px] pl-[11px] pr-[30px] font-sans text-[12.5px] text-ink"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-faint"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </label>
  )
}

export default Select
