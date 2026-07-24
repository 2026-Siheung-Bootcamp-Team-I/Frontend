import { create } from 'zustand'
import type { AuthResponse } from '@/api/types'

const STORAGE_KEY = 'edrdog.auth'

export type AuthUser = Omit<AuthResponse, 'token'>

type AuthState = {
  token: string | null
  user: AuthUser | null
  signIn: (res: AuthResponse) => void
  clear: () => void
}

/** 새로고침해도 로그인이 유지되도록 localStorage 에서 복원한다. 값이 깨져 있으면 로그아웃 상태로 시작. */
function restore(): { token: string | null; user: AuthUser | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { token: null, user: null }
    const parsed = JSON.parse(raw) as { token: string; user: AuthUser }
    return { token: parsed.token, user: parsed.user }
  } catch {
    return { token: null, user: null }
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...restore(),
  signIn: ({ token, ...user }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
    set({ token, user })
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ token: null, user: null })
  },
}))
