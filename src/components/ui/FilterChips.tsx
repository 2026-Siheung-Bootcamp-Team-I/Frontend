type Chip = {
  label: string
  active?: boolean
  onClick?: () => void
}

type FilterChipsProps = {
  chips: Chip[]
}

function FilterChips({ chips }: FilterChipsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={chip.onClick}
          className={`text-[12.5px] font-semibold px-[13px] py-[7px] rounded-sm cursor-pointer border font-sans ${
            chip.active ? 'bg-accent text-white border-accent' : 'bg-surface text-mid border-line'
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}

export default FilterChips
