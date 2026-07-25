import { create } from 'zustand'

type Theme = 'dark' | 'light'

// 최초 테마는 OS 시스템 설정(prefers-color-scheme)을 따른다. 판별 불가하면 다크.
function systemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return 'dark'
}

type ThemeState = {
  theme: Theme
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: systemTheme(),
  toggle: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
}))
