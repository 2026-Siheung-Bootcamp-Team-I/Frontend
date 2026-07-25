import { useEffect, useRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useThemeStore } from '@/store/theme'
import LogoMark from '@/components/ui/LogoMark'
import ScrollArea from '@/components/ui/ScrollArea'

const container = 'max-w-[1440px] mx-auto px-[20px] md:px-[40px]'
const eyebrow =
  'text-[12px] font-semibold tracking-[0.08em] uppercase text-accent border-l-2 border-accent pl-[9px]'
const cardBase = 'bg-surface border border-line rounded-md'
// 평평한 문법이라 hover 는 들어올리기가 아니라 경계선으로 답한다.
const featureCard = `${cardBase} p-[22px] md:p-[30px] transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))]`
const iconTile =
  'w-[40px] h-[40px] rounded-md bg-[var(--accent-wash)] flex items-center justify-center'

function Landing() {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const themeLabel = theme === 'dark' ? '라이트' : '다크'
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-reveal]') ?? [])
    if (reduce || !('IntersectionObserver' in window)) return
    els.forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(18px)'
      el.style.transition = 'opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1)'
    })
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement
            el.style.opacity = '1'
            el.style.transform = 'none'
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    const fallback = window.setTimeout(() => {
      els.forEach((el) => {
        el.style.opacity = '1'
        el.style.transform = 'none'
      })
    }, 1800)
    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])

  return (
    <div ref={rootRef} className="bg-bg font-sans text-ink overflow-x-hidden transition-colors">
      {/* ===== NAV ===== */}
      <div className="sticky top-0 z-50 border-b border-line-2 bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-[12px]">
        <div className={`${container} flex items-center justify-between h-[66px]`}>
          <div className="flex items-center lg:gap-[44px]">
            <Link to="/" className="flex items-center gap-[11px]">
              <LogoMark size={30} />
              <span className="text-[19px] font-[750] tracking-[-0.02em] text-ink">EDRdog</span>
            </Link>
            <div className="hidden lg:flex gap-[28px]">
              <a href="#how" className="text-[14px] font-medium !text-ink-2">
                동작 방식
              </a>
              <a href="#features" className="text-[14px] font-medium !text-ink-2">
                기능
              </a>
              <a href="#path" className="text-[14px] font-medium !text-ink-2">
                공격 경로
              </a>
              <Link to="/dashboard" className="text-[14px] font-medium !text-ink-2">
                대시보드
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-[10px] sm:gap-[14px]">
            <button
              onClick={toggle}
              className="inline-flex items-center gap-[7px] h-[34px] pl-[11px] pr-[11px] sm:pr-[14px] rounded-sm border border-line bg-surface text-ink font-sans text-[12.5px] font-semibold cursor-pointer"
            >
              <span data-om-sun className="items-center text-high">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4.3" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
                </svg>
              </span>
              <span data-om-moon className="items-center text-accent">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
                </svg>
              </span>
              <span className="hidden sm:inline">{themeLabel}</span>
            </button>
            <Link
              to="/login"
              className="font-sans text-[13px] font-semibold !text-white bg-accent px-[13px] sm:px-[18px] py-[9px] rounded-sm cursor-pointer"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>

      {/*
        ===== HERO =====
        좌측 560px 은 h1 이 의도한 2줄로 들어가는 최소 폭. 더 좁으면 마지막 글자가 3줄로 떨어진다.
        2열은 xl 부터. lg 에서 나누면 우측 제품 패널이 3D 를 보여주기엔 너무 좁아진다.
      */}
      <div className={container}>
        <div
          className="grid grid-cols-1 gap-[40px] pt-[48px] pb-[64px] lg:pt-[72px] lg:pb-[92px] xl:grid-cols-[560px_minmax(0,1fr)] xl:gap-[56px] items-center relative"
          style={{ perspective: '1900px' }}
        >
          <div
            className="absolute inset-x-0 -inset-y-[40px] pointer-events-none"
            style={{
              background:
                'radial-gradient(680px 480px at 78% 46%, var(--accent-wash), transparent 68%)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={
              {
                backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                WebkitMaskImage: 'radial-gradient(70% 74% at 76% 50%, #000, transparent)',
                maskImage: 'radial-gradient(70% 74% at 76% 50%, #000, transparent)',
              } as CSSProperties
            }
          />

          <div className="relative z-[1] flex flex-col">
            <span className="inline-flex items-center gap-2 self-start text-[12px] font-semibold tracking-[0.02em] text-ink-2 bg-surface border border-line px-[13px] py-[7px] rounded-sm">
              <span
                className="w-[6px] h-[6px] rounded-full bg-good"
                style={{ animation: 'edrPulse 1.6s ease-in-out infinite' }}
              />
              엔드포인트 위협 탐지·대응
            </span>
            <h1 className="mt-[22px] text-[32px] sm:text-[40px] lg:text-[52px] leading-[1.08] font-[750] tracking-[-0.03em] text-ink text-balance">
              엔드포인트 위협을
              <br />
              탐지하고 바로 <span className="text-accent">대응</span>합니다
            </h1>
            <p className="mt-[22px] max-w-[44ch] text-[15px] lg:text-[17px] leading-[1.62] text-mid">
              서버와 PC에서 일어나는 이상 행동을 실시간으로 잡아내고, 어떤 위협부터 처리해야 할지
              짚어 드립니다.
            </p>
            <div className="flex flex-wrap gap-[12px] mt-[32px]">
              <Link
                to="/login"
                className="inline-flex items-center gap-[9px] font-sans text-[15px] font-semibold !text-white bg-accent px-[22px] py-[13px] rounded-sm cursor-pointer"
                style={{ animation: 'edrCtaGlow 3.6s ease-in-out infinite' }}
              >
                로그인<span className="text-[16px]">→</span>
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-[9px] text-[15px] font-semibold !text-ink-2 bg-surface border border-line px-[20px] py-[13px] rounded-sm"
              >
                대시보드 둘러보기
              </Link>
            </div>
          </div>

          {/*
            product panel — 브라우저 창 목업.
            기울이지 않는다. 3D 로 눕히면 화면 안 글씨가 왜곡돼 정작 제품이 안 보이고,
            부유하는 기울인 목업 자체가 지난 세대 SaaS 랜딩 문법이다.
            그림자는 여기 하나만 남긴다. 창이 페이지 위에 떠 있다는 신호는 필요하다.
          */}
          {/*
            기울기는 히어로가 2열이 되는 xl 부터만 준다. 그 아래에서는 목업이 폭을 꽉 채우는데
            거기서 눕히면 모서리가 화면 밖으로 나가고, 루트의 overflow-x-hidden 에 잘린다.
            scale 은 기울면서 넓어진 바운딩 박스를 컨테이너 안으로 되돌리는 용도다.
          */}
          <div
            data-hero-panel
            className="relative z-[1] overflow-hidden rounded-md border border-line bg-surface xl:[transform:perspective(2000px)_rotateY(-11deg)_rotateX(4deg)_scale(0.97)]"
            style={{ boxShadow: 'var(--shadow-2), var(--lift)' } as CSSProperties}
          >
            {/*
              브라우저 창 크롬. 신호등만 찍으면 macOS 앱 창이 되는데 EDRdog 은 웹 콘솔이라
              형태가 안 맞는다. 주소창까지 넣어야 "로그인해서 쓰는 웹 콘솔"이라는 정보가 된다.
              신호등 색은 macOS 관례값이라 토큰을 쓰지 않는다.
            */}
            <div className="flex items-center gap-[12px] border-b border-line-2 bg-panel px-[14px] py-[10px]">
              <span className="flex shrink-0 items-center gap-[6px]">
                <span className="h-[10px] w-[10px] rounded-full bg-[#ff5f57]" />
                <span className="h-[10px] w-[10px] rounded-full bg-[#febc2e]" />
                <span className="h-[10px] w-[10px] rounded-full bg-[#28c840]" />
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-[7px] rounded-sm border border-line-2 bg-surface px-[10px] py-[4px]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="4"
                    y="10"
                    width="16"
                    height="11"
                    rx="2"
                    stroke="var(--faint)"
                    strokeWidth="2"
                  />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="var(--faint)" strokeWidth="2" />
                </svg>
                <span className="truncate font-mono text-[11.5px] text-mid">
                  app.edrdog.io/dashboard
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-line-2">
              <div className="flex items-center gap-[9px]">
                <span
                  className="w-2 h-2 rounded-full bg-good"
                  style={{ animation: 'edrPulse 2.4s ease-in-out infinite' }}
                />
                <span className="text-[13px] font-[650] text-ink">실시간 대응 현황</span>
              </div>
              <span className="font-mono text-[11px] text-faint">방금 업데이트됨</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] p-[18px]">
              <div className="bg-panel-2 border border-line-2 rounded-md p-[16px]">
                <div className="text-[12px] text-faint mb-[12px]">지금 확인이 필요한 위협</div>
                <div className="flex items-center gap-[14px]">
                  <div
                    className="relative w-[76px] h-[76px] rounded-full"
                    style={{
                      background:
                        'conic-gradient(var(--crit) 0 22%, var(--high) 22% 40%, var(--line) 40% 100%)',
                    }}
                  >
                    <div
                      className="absolute inset-[-5px] rounded-full"
                      style={
                        {
                          background:
                            'conic-gradient(from 0deg, transparent 68%, var(--accent) 92%, transparent 100%)',
                          WebkitMask:
                            'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                          animation: 'edrRingSpin 4.5s linear infinite',
                        } as CSSProperties
                      }
                    />
                    <div className="absolute inset-[11px] rounded-full bg-panel-2 flex flex-col items-center justify-center">
                      <span className="font-mono text-[22px] font-medium text-ink tabular-nums">
                        9
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-[7px]">
                    <div className="flex items-center gap-[7px]">
                        <span className="text-[12px] text-ink-2">심각</span>
                      <span className="font-mono text-[12px] text-ink ml-auto">2</span>
                    </div>
                    <div className="flex items-center gap-[7px]">
                        <span className="text-[12px] text-ink-2">높음</span>
                      <span className="font-mono text-[12px] text-ink ml-auto">3</span>
                    </div>
                    <div className="flex items-center gap-[7px]">
                      <span className="w-[7px] h-[7px] rounded-full bg-mid" />
                      <span className="text-[12px] text-ink-2">보통</span>
                      <span className="font-mono text-[12px] text-ink ml-auto">4</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-panel-2 border border-line-2 rounded-md p-[16px]">
                <div className="text-[12px] text-faint mb-[12px]">엔드포인트 상태</div>
                <div className="flex items-baseline gap-[6px] mb-[12px]">
                  <span className="font-mono text-[24px] font-medium text-ink tabular-nums">
                    1,250
                  </span>
                  <span className="text-[12px] text-faint">대</span>
                </div>
                <div
                  className="relative flex h-[10px] gap-[3px] mb-[12px] origin-left"
                  style={{ animation: 'edrBarGrow 1.2s cubic-bezier(.2,.7,.2,1) both' }}
                >
                  <div className="w-[86%] bg-good rounded-xs" />
                  <div className="w-[10%] bg-high rounded-xs" />
                  <div
                    className="w-[4%] bg-crit rounded-xs"
                    style={{ animation: 'edrCritGlow 1.8s ease-in-out infinite' }}
                  />
                </div>
                <div className="flex justify-between mt-[10px] text-[11.5px] text-mid">
                  <span>정상 1,080</span>
                  <span>주의 120</span>
                  <span>위험 50</span>
                </div>
              </div>
              <div className="sm:col-span-2 bg-panel-2 border border-line-2 rounded-md p-[16px]">
                <div className="flex justify-between items-center mb-[12px]">
                  <span className="inline-flex items-center gap-2 text-[12px] text-faint">
                    <span className="relative inline-flex w-[13px] h-[13px] items-center justify-center">
                      <span
                        className="absolute inset-0 rounded-full"
                        style={
                          {
                            background:
                              'conic-gradient(from 0deg, transparent 60%, var(--accent) 92%, transparent 100%)',
                            WebkitMask:
                              'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px))',
                            mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px))',
                            animation: 'edrRingSpin 3.2s linear infinite',
                          } as CSSProperties
                        }
                      />
                      <span className="w-[5px] h-[5px] rounded-full bg-accent" />
                    </span>
                    최근 탐지된 위협
                  </span>
                  <span className="text-[12px] font-semibold text-accent">전체 보기 →</span>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-[12px] items-center min-w-0 px-[4px] py-[9px]">
                    <span className="text-[13px] text-ink truncate">관리자 권한 상승 시도</span>
                    <span className="inline-flex items-center gap-[5px] border border-[color-mix(in_srgb,var(--crit)_40%,transparent)] bg-[var(--crit-wash)] px-[7px] py-[2px] rounded-xs text-[11px] font-semibold text-crit">
                      <span className="h-[5px] w-[5px] rounded-full bg-current" />
                      심각
                    </span>
                    <span className="font-mono text-[11px] text-faint w-[48px] text-right">
                      2분 전
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-[12px] items-center min-w-0 px-[4px] py-[9px]">
                    <span className="text-[13px] text-ink truncate">자격증명 접근 탐지</span>
                    <span className="inline-flex items-center gap-[5px] border border-[color-mix(in_srgb,var(--crit)_40%,transparent)] bg-[var(--crit-wash)] px-[7px] py-[2px] rounded-xs text-[11px] font-semibold text-crit">
                      <span className="h-[5px] w-[5px] rounded-full bg-current" />
                      심각
                    </span>
                    <span className="font-mono text-[11px] text-faint w-[48px] text-right">
                      5분 전
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-[12px] items-center min-w-0 px-[4px] py-[9px]">
                    <span className="text-[13px] text-ink truncate">비정상 외부 연결</span>
                    <span className="inline-flex items-center gap-[5px] border border-[color-mix(in_srgb,var(--high)_40%,transparent)] bg-[var(--high-wash)] px-[7px] py-[2px] rounded-xs text-[11px] font-semibold text-high">
                      <span className="h-[5px] w-[5px] rounded-full bg-current" />
                      높음
                    </span>
                    <span className="font-mono text-[11px] text-faint w-[48px] text-right">
                      12분 전
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CAPABILITY BAND ===== */}
      <div className="border-t border-b border-line-2 bg-surface">
        <div className={container}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line-2">
            <div className="bg-surface px-[26px] py-[30px] flex flex-col gap-[12px]">
              <span className={iconTile}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12h4l2.5-7 4 14 2.5-7H21" />
                </svg>
              </span>
              <div className="text-[15px] font-[650] text-ink">실시간 모니터링</div>
              <div className="text-[12.5px] leading-[1.55] text-faint">
                서버·PC·노트북을 24시간 지켜봅니다.
              </div>
            </div>
            <div className="bg-surface px-[26px] py-[30px] flex flex-col gap-[12px]">
              <span className={iconTile}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 15l6-6" />
                  <path d="M10.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
                  <path d="M13.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
                </svg>
              </span>
              <div className="text-[15px] font-[650] text-ink">시퀀스 상관분석</div>
              <div className="text-[12.5px] leading-[1.55] text-faint">
                흩어진 신호를 하나의 공격 경로로 잇습니다.
              </div>
            </div>
            <div className="bg-surface px-[26px] py-[30px] flex flex-col gap-[12px]">
              <span className={iconTile}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l7 3v5c0 4.5-3 7-7 8-4-1-7-3.5-7-8V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <div className="text-[15px] font-[650] text-ink">자동 대응 권고</div>
              <div className="text-[12.5px] leading-[1.55] text-faint">
                다음에 할 행동을 그대로 제안합니다.
              </div>
            </div>
            <div className="bg-surface px-[26px] py-[30px] flex flex-col gap-[12px]">
              <span className={iconTile}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <div className="text-[15px] font-[650] text-ink">실행 전 dry-run</div>
              <div className="text-[12.5px] leading-[1.55] text-faint">
                격리·차단 전 결과를 미리 확인합니다.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div id="how" className={`${container} pt-[64px] md:pt-[104px]`}>
        <div data-reveal className="flex flex-col items-center text-center gap-[16px]">
          <span className={eyebrow}>How it works</span>
          <h2 className="text-[26px] md:text-[32px] lg:text-[36px] leading-[1.14] font-[730] tracking-[-0.02em] text-ink max-w-[20ch] text-balance">
            복잡한 로그를 세 단계로 정리합니다
          </h2>
          <p className="max-w-[52ch] text-[16px] leading-[1.62] text-mid">
            보안 전문가가 아니어도 지금 무슨 일이 일어나고 있는지, 무엇을 해야 하는지 바로 이해할 수
            있습니다.
          </p>
        </div>
        <div
          data-reveal
          className="grid grid-cols-1 gap-[20px] mt-[36px] md:grid-cols-3 md:gap-[24px] md:mt-[56px]"
        >
          {[
            {
              num: '01',
              title: '탐지',
              body: '엔드포인트에서 일어나는 프로세스·파일·네트워크 행동을 실시간으로 지켜봅니다. 이상 신호를 놓치지 않습니다.',
              icon: (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ),
            },
            {
              num: '02',
              title: '연결',
              body: '따로 보면 정상 같은 행동도, 시간 순서로 이으면 공격이 됩니다. 흩어진 신호를 하나의 공격 경로로 재구성합니다.',
              icon: (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 15l6-6" />
                  <path d="M10.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
                  <path d="M13.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
                </svg>
              ),
            },
            {
              num: '03',
              title: '대응',
              body: '무엇을, 어떤 순서로 처리해야 하는지 권고안을 제시합니다. 실행 전 미리 결과를 확인하는 dry-run도 지원합니다.',
              icon: (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l7 3v5c0 4.5-3 7-7 8-4-1-7-3.5-7-8V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              ),
            },
          ].map((step) => (
            <div key={step.num} className={`${cardBase} p-[22px] md:p-[28px]`}>
              <div className="flex items-center gap-[12px] mb-[18px]">
                <span className="w-[34px] h-[34px] rounded-sm bg-[var(--accent-wash)] text-accent flex items-center justify-center font-mono text-[14px] font-medium">
                  {step.num}
                </span>
                <span className="w-[26px] h-[26px] rounded-sm border-[1.8px] border-accent flex items-center justify-center">
                  {step.icon}
                </span>
              </div>
              <h3 className="mb-2 text-[18px] font-[650] text-ink">{step.title}</h3>
              <p className="text-[14px] leading-[1.6] text-mid">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <div id="features" className={`${container} pt-[64px] md:pt-[104px]`}>
        <div
          data-reveal
          className="flex justify-between items-end gap-[24px] flex-wrap mb-[32px] md:mb-[44px]"
        >
          <div className="flex flex-col gap-[14px] max-w-[34ch]">
            <span className={eyebrow}>Features</span>
            <h2 className="text-[26px] md:text-[32px] lg:text-[36px] leading-[1.14] font-[730] tracking-[-0.02em] text-ink text-balance">
              판단에 필요한 것만, 명확하게
            </h2>
          </div>
          <p className="max-w-[40ch] text-[15px] leading-[1.62] text-mid">
            화려한 대시보드보다, 지금 뭘 해야 하는지 알려주는 도구가 필요합니다. EDRdog는 그 한
            가지에 집중합니다.
          </p>
        </div>
        <div data-reveal className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
          {[
            {
              title: '실시간 엔드포인트 모니터링',
              body: '서버·PC·노트북에서 일어나는 활동을 24시간 지켜봅니다. 새로운 위협은 몇 초 안에 화면 위로 올라옵니다.',
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="12" rx="2" />
                  <path d="M8 20h8" />
                  <path d="M12 16v4" />
                </svg>
              ),
            },
            {
              title: '시퀀스 상관분석',
              body: '개별 알림이 아니라, 행동의 순서를 읽습니다. 진짜 공격과 단순 노이즈를 구분해 줍니다.',
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 15l6-6" />
                  <path d="M10.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
                  <path d="M13.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
                </svg>
              ),
            },
            {
              title: '자동 대응 권고',
              body: '"이 호스트를 격리하세요"처럼 다음 행동을 그대로 제안합니다. 클릭 한 번으로 확정, 실행 전 미리보기도 가능합니다.',
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l7 3v5c0 4.5-3 7-7 8-4-1-7-3.5-7-8V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              ),
            },
            {
              title: '읽기 쉬운 리포트',
              body: '경영진에게 보고할 때도 그대로 쓸 수 있는, 전문 용어를 걷어낸 요약. 무슨 일이 있었고 어떻게 막았는지 한 장으로.',
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5" />
                  <path d="M9 13h6" />
                  <path d="M9 17h4" />
                </svg>
              ),
            },
          ].map((f) => (
            <div key={f.title} className={featureCard}>
              <div className={`${iconTile} mb-[18px]`}>{f.icon}</div>
              <h3 className="mb-2 text-[18px] font-[650] text-ink">{f.title}</h3>
              <p className="text-[14px] leading-[1.62] text-mid">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== ATTACK PATH SHOWCASE ===== */}
      <div id="path" className={`${container} pt-[64px] md:pt-[104px]`}>
        <div
          data-reveal
          className="bg-surface border border-line rounded-md p-[24px] md:p-[36px] lg:p-[48px] grid grid-cols-1 gap-[32px] lg:grid-cols-[400px_1fr] lg:gap-[48px] items-center"
        >
          <div className="flex flex-col">
            <span className={`self-start ${eyebrow}`}>Attack path</span>
            <h2 className="mt-[20px] text-[24px] md:text-[28px] lg:text-[32px] leading-[1.16] font-[730] tracking-[-0.02em] text-ink text-balance">
              흩어진 신호를
              <br />
              하나의 공격 경로로
            </h2>
            <p className="mt-[18px] max-w-[40ch] text-[15px] leading-[1.62] text-mid">
              한 사건이 어떻게 시작돼 어디까지 번졌는지 시간 순서로 보여줍니다. 어디를 끊어야 하는지
              한눈에 잡힙니다.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 mt-[24px] text-[14px] font-semibold text-accent"
            >
              대시보드에서 실제로 보기 →
            </Link>
          </div>
          <div className="bg-panel-2 border border-line-2 rounded-md pt-[24px] px-[16px] md:px-[26px] pb-[22px]">
            <div className="flex flex-wrap justify-between items-center gap-[10px] mb-[28px]">
              <span className="text-[13px] font-[650] text-ink">공격 경로 재구성</span>
              <span className="inline-flex items-center gap-[7px] text-[11.5px] font-semibold text-accent bg-[var(--accent-wash)] px-[11px] py-1 rounded-sm">
                dry-run · 실행 안 됨
              </span>
            </div>
            <ScrollArea label="공격 경로 단계" fadeFrom="var(--panel-2)">
              <div
                className="grid items-start relative"
                style={{ gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))' }}
              >
                {[
                  {
                    title: '메일 첨부 실행',
                    time: '09:14:02',
                    color: 'var(--accent)',
                    wash: 'var(--accent-wash)',
                    strong: false,
                    ring: false,
                    connector: 'line' as const,
                    icon: (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M3 7l9 6 9-6" />
                      </svg>
                    ),
                  },
                  {
                    title: '스크립트 실행',
                    time: '09:14:08',
                    color: 'var(--high)',
                    wash: 'var(--high-wash)',
                    strong: false,
                    ring: false,
                    connector: 'line' as const,
                    icon: (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M7 9.5l2.5 2.5L7 14.5" />
                        <path d="M12.5 15h4" />
                      </svg>
                    ),
                  },
                  {
                    title: '자격증명 접근',
                    time: '09:14:11',
                    color: 'var(--crit)',
                    wash: 'var(--crit-wash)',
                    strong: true,
                    ring: true,
                    connector: 'crit' as const,
                    icon: (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="8.5" cy="8.5" r="4.5" />
                        <path d="M11.8 11.8L20 20" />
                        <path d="M17 17l2.2-2.2" />
                      </svg>
                    ),
                  },
                  {
                    title: '외부 서버 연결',
                    time: '09:14:15',
                    color: 'var(--crit)',
                    wash: 'var(--crit-wash)',
                    strong: true,
                    ring: false,
                    connector: null,
                    icon: (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="7" rx="1.6" />
                        <rect x="3" y="13" width="18" height="7" rx="1.6" />
                        <path d="M6.5 7.5h.01" />
                        <path d="M6.5 16.5h.01" />
                      </svg>
                    ),
                  },
                ].map((step) => {
                  const connectorColor = step.connector === 'crit' ? 'var(--crit)' : 'var(--line)'
                  return (
                    <div
                      key={step.title}
                      className="flex flex-col items-center gap-[10px] relative"
                    >
                      <div
                        className="w-[52px] h-[52px] rounded-md flex items-center justify-center"
                        style={
                          {
                            border: `1.8px solid ${step.color}`,
                            background: step.wash,
                            color: step.color,
                            boxShadow: step.ring ? `0 0 0 4px ${step.wash}` : undefined,
                          } as CSSProperties
                        }
                      >
                        {step.icon}
                      </div>
                      <span
                        className={`text-[12.5px] text-center ${
                          step.strong ? 'font-bold text-crit' : 'font-semibold text-ink'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="font-mono text-[10.5px] text-faint">{step.time}</span>
                      {step.connector && (
                        <div className="absolute top-[24px] left-[calc(50%+30px)] w-[calc(100%-60px)] h-[6px] flex items-center">
                          <div className="flex-1 h-[2px]" style={{ background: connectorColor }} />
                          <div
                            className="w-[6px] h-[6px] rotate-45 -ml-1 flex-shrink-0"
                            style={{
                              borderTop: `2px solid ${connectorColor}`,
                              borderRight: `2px solid ${connectorColor}`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:gap-[16px] mt-[26px] px-[18px] py-[16px] bg-surface border border-line-2 rounded-md">
              <div className="flex-1">
                <div className="text-[12px] text-faint mb-1">권고 대응</div>
                <div className="text-[13.5px] leading-[1.5] text-ink">
                  <span className="font-mono text-ink-2">host-0472</span> 를 격리하고 스크립트
                  실행을 차단하세요.
                </div>
              </div>
              <span className="whitespace-nowrap text-[13px] font-semibold text-white bg-accent px-[18px] py-[10px] rounded-sm cursor-pointer">
                위협 확정
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CTA ===== */}
      <div className={`${container} pt-[64px] pb-[64px] md:pt-[104px] md:pb-[104px]`}>
        <div
          data-reveal
          className="relative overflow-hidden border border-line rounded-md bg-surface px-[24px] py-[48px] md:px-[40px] md:py-[64px] text-center"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(560px 320px at 50% -10%, var(--accent-wash), transparent 70%)',
            }}
          />
          <div className="relative z-[1] flex flex-col items-center gap-[20px]">
            <h2 className="text-[26px] md:text-[32px] lg:text-[38px] leading-[1.12] font-[740] tracking-[-0.025em] text-ink max-w-[22ch] text-balance">
              지금, 판단이 필요한 것부터 보여드립니다
            </h2>
            <p className="max-w-[48ch] text-[16px] leading-[1.62] text-mid">
              로그인하면 우리 조직의 엔드포인트가 지금 어떤 상태인지 바로 확인할 수 있습니다.
            </p>
            <div className="flex flex-wrap justify-center gap-[12px] mt-[6px]">
              <Link
                to="/login"
                className="inline-flex items-center gap-[9px] font-sans text-[15px] font-semibold !text-white bg-accent px-[24px] py-[14px] rounded-sm cursor-pointer"
                style={{ animation: 'edrCtaGlow 3.6s ease-in-out infinite' }}
              >
                로그인<span className="text-[16px]">→</span>
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-[9px] text-[15px] font-semibold !text-ink-2 bg-transparent border border-line px-[22px] py-[14px] rounded-sm"
              >
                대시보드 둘러보기
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="border-t border-line-2 bg-surface">
        <div
          className={`${container} py-[32px] md:py-[40px] flex justify-between items-center gap-[24px] flex-wrap`}
        >
          <div className="flex items-center gap-[12px] min-w-0">
            <LogoMark size={30} />
            <div className="flex flex-col gap-[3px]">
              <span className="text-[17px] font-[750] tracking-[-0.02em] text-ink">EDRdog</span>
              <span className="text-[12.5px] text-faint">
                엔드포인트 위협을 탐지하고, 판단까지 도와드립니다.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[22px] flex-wrap">
            <span className="text-[12px] text-faint">© 2026 EDRdog. All rights reserved.</span>
            <a href="#" className="text-[12px] !text-faint">
              이용약관
            </a>
            <a href="#" className="text-[12px] !text-faint">
              개인정보처리방침
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Landing
