/**
 * 브랜드 마크. 사이드바·로그인·랜딩 헤더/푸터 네 곳이 같은 도안을 쓰므로 한 곳에 모은다.
 *
 * 로고가 파란 원 배경을 이미 갖고 있어 배지로 감싸지 않는다. 감싸면 파랑 위에 파랑이 얹혀
 * 마크가 뭉개진다. 배경은 투명하게 빼 두어 라이트·다크 어느 쪽에서도 원 모양 그대로 뜬다.
 */
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  )
}

export default LogoMark
