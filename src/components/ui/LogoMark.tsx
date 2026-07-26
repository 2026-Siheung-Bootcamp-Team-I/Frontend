/**
 * 브랜드 마크. 사이드바·로그인·랜딩 헤더/푸터 네 곳이 같은 도안을 쓰므로 한 곳에 모은다.
 *
 * 실제 로고(자물쇠 + 뼈)에서 워드마크를 떼고 마크만 쓴다. 원본은 진한 남색인데 파란 배지 위에
 * 얹으면 대비가 죽어서, 모양만 남기고 흰색으로 칠한 이미지를 쓴다. 그래서 배경이 밝든 어둡든
 * 배지 안에서 항상 같게 보인다.
 */
function LogoMark({ size = 28 }: { size?: number }) {
  const inner = Math.round(size * 0.68)
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md bg-accent"
      style={{ width: size, height: size }}
    >
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden="true"
        width={inner}
        height={inner}
        style={{ width: inner, height: inner, objectFit: 'contain' }}
      />
    </div>
  )
}

export default LogoMark
