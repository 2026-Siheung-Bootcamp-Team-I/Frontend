import { useEffect, useRef, useState, type ReactNode } from 'react'

type ScrollAreaProps = {
  children: ReactNode
  /** 스크롤이 가능할 때만 붙는 접근성 이름. 키보드 사용자가 무엇을 스크롤하는지 알 수 있어야 한다. */
  label: string
  /** 페이드가 녹아들 배경색. 감싸는 영역의 배경과 맞춘다. */
  fadeFrom?: string
}

/**
 * 좁은 화면에서 가로로 스크롤되는 영역.
 * 아직 안 보인 내용이 남은 쪽에만 페이드를 띄워 스크롤할 수 있다는 것을 알린다.
 */
function ScrollArea({ children, label, fadeFrom = 'var(--surface)' }: ScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function update() {
      if (!el) return
      const max = el.scrollWidth - el.clientWidth
      setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 })
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    // 창 크기(el)와 내용 폭(자식) 둘 다 스크롤 여부를 바꾼다.
    const observer = new ResizeObserver(update)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)

    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [])

  // 스크롤되는 영역은 키보드로도 닿아야 한다. 스크롤할 게 없으면 탭 순서를 어지럽히지 않도록 뺀다.
  const scrollable = edges.left || edges.right

  return (
    <div className="relative">
      <div
        ref={ref}
        className="overflow-x-auto overscroll-x-contain"
        tabIndex={scrollable ? 0 : undefined}
        role={scrollable ? 'region' : undefined}
        aria-label={scrollable ? label : undefined}
      >
        {children}
      </div>
      {edges.left && <Fade side="left" color={fadeFrom} />}
      {edges.right && <Fade side="right" color={fadeFrom} />}
    </div>
  )
}

function Fade({ side, color }: { side: 'left' | 'right'; color: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 w-[28px] ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
      style={{
        background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${color}, transparent)`,
      }}
    />
  )
}

export default ScrollArea
