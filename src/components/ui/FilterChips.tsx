type Chip = {
  label: string
  active?: boolean
}

type FilterChipsProps = {
  chips: Chip[]
}

function FilterChips({ chips }: FilterChipsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`text-[12.5px] font-semibold px-[13px] py-[7px] rounded-full cursor-pointer border ${
            chip.active ? 'bg-accent text-white border-accent' : 'bg-surface text-mid border-line'
          }`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  )
}

export default FilterChips
