import { create } from 'zustand'

type AlertsState = {
  /** 알림을 다시 불러와야 할 때 올라가는 카운터. 조회 훅의 deps 로 쓴다. */
  version: number
  bump: () => void
}

/**
 * 트리아지처럼 알림을 바꾸는 동작이 화면 여러 곳(사이드바 배지, 대시보드, 목록)에 반영되도록
 * 갱신 신호만 공유한다. 데이터 자체는 각 화면이 자기 필터로 조회한다.
 */
export const useAlertsStore = create<AlertsState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}))
