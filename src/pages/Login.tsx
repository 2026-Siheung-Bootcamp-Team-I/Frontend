import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/api'
import { useAuthStore } from '@/store/auth'

type Mode = 'login' | 'signup'

const inputClass =
  'h-[40px] px-[13px] rounded-[10px] border border-line bg-panel-2 text-ink text-[13.5px] font-sans outline-none focus:border-accent'

function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.signup(email, password, orgName.trim() || undefined)
      signIn(res)
      navigate(from, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-bg font-sans text-ink flex items-center justify-center px-[20px]">
      <div className="relative w-full max-w-[380px] bg-surface border border-line rounded-[14px] shadow-[var(--shadow-2)] px-[28px] py-[30px]">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="닫기"
          className="absolute top-[16px] right-[16px] w-[30px] h-[30px] flex items-center justify-center rounded-[8px] text-faint hover:text-ink-2 hover:bg-panel cursor-pointer transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
        <Link to="/" className="flex items-center gap-[10px] mb-[22px]">
          <div className="w-[28px] h-[28px] rounded-[8px] bg-accent flex items-center justify-center">
            <div className="w-[10px] h-[10px] bg-white rotate-45 rounded-[2px]" />
          </div>
          <span className="text-[17px] font-[750] tracking-[-0.02em] text-ink">EDRdog</span>
        </Link>

        <div className="flex gap-[6px] mb-[20px]">
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 h-[34px] rounded-[10px] text-[12.5px] font-semibold cursor-pointer border transition-colors ${
                mode === m
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface text-mid border-line hover:text-ink-2'
              }`}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-[12px]">
          <label className="flex flex-col gap-[6px]">
            <span className="text-[12px] text-faint">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="text-[12px] text-faint">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputClass}
            />
            {mode === 'signup' && (
              <span className="text-[11.5px] text-faint">8자 이상 입력하세요.</span>
            )}
          </label>

          {mode === 'signup' && (
            <label className="flex flex-col gap-[6px]">
              <span className="text-[12px] text-faint">조직명 (선택)</span>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className={inputClass}
              />
            </label>
          )}

          {error && <span className="text-[12.5px] text-crit">{error}</span>}

          <button
            type="submit"
            disabled={pending}
            className="mt-[6px] h-[40px] rounded-[10px] bg-accent text-white text-[13.5px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-default"
          >
            {pending ? '처리 중' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
