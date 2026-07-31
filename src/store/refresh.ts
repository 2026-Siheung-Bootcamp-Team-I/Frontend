import { create } from 'zustand'

/** 자동 새로고침 간격(초). 0 은 끔. */
export const INTERVALS = [0, 10, 30, 60, 300] as const

export type RefreshInterval = (typeof INTERVALS)[number]

type RefreshState = {
  /** 올라가면 화면의 모든 조회가 다시 돈다(useApi 가 구독한다). */
  version: number
  /** epoch millis. 마지막으로 다시 받은 시각. 아직 한 번도 안 받았으면 null. */
  lastAt: number | null
  interval: RefreshInterval
  refresh: () => void
  setInterval: (interval: RefreshInterval) => void
}

/**
 * 화면 전체를 다시 받는 신호.
 *
 * 각 화면이 알아서 구독하게 두지 않고 useApi 안에서 한 번에 받는다. 페이지마다 deps 에
 * 넣게 하면 빠뜨린 화면만 멈춘 데이터를 보여주는데, 그건 새로 받는 것보다 나쁘다.
 * 화면은 갱신됐다고 믿고 있는데 값만 옛것이기 때문이다.
 */
export const useRefreshStore = create<RefreshState>((set) => ({
  version: 0,
  lastAt: null,
  // 켜 두면 조사하는 도중에 목록이 바뀌어 보던 줄을 놓친다. 켜는 것은 사용자가 정한다.
  interval: 0,
  refresh: () => set((s) => ({ version: s.version + 1, lastAt: Date.now() })),
  setInterval: (interval) => set({ interval }),
}))
