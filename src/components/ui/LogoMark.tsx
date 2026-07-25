/**
 * 브랜드 마크. 사이드바·로그인·랜딩 헤더/푸터 네 곳이 같은 도안을 쓰므로 한 곳에 모은다.
 *
 * 임시 도안이다. 제품명이 EDRdog 라 개 얼굴 실루엣으로 그렸고, 28px 에서도 형태가 뭉개지지
 * 않도록 눈·코를 fill-rule=evenodd 로 뚫어 배경색이 비치게 했다. 별도 색 지정이 없어서
 * 어떤 배경 위에 올려도 그대로 동작한다.
 */
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md bg-accent"
      style={{ width: size, height: size }}
    >
      <svg
        width={Math.round(size * 0.68)}
        height={Math.round(size * 0.68)}
        viewBox="0 0 24 24"
        fill="#fff"
        aria-hidden="true"
      >
        {/* 늘어진 귀. 머리보다 먼저 그려 옆으로 삐져나오게 둔다 */}
        <path d="M6.1 4.9c1.3 0 2.3 1.1 2.3 2.5v5c0 2-1.3 3.5-3 3.5S2.2 14.4 2.2 12.4V8.7c0-2.1 1.7-3.8 3.9-3.8Z" />
        <path d="M17.9 4.9c-1.3 0-2.3 1.1-2.3 2.5v5c0 2 1.3 3.5 3 3.5s3.2-1.5 3.2-3.5V8.7c0-2.1-1.7-3.8-3.9-3.8Z" />
        {/* 머리. 눈·코는 evenodd 로 뚫어 배경색이 그대로 비치게 한다 */}
        <path
          fillRule="evenodd"
          d="M12 3.4c3.4 0 5.9 2.4 5.9 5.8v4.1c0 3.7-2.6 6.5-5.9 6.5s-5.9-2.8-5.9-6.5V9.2c0-3.4 2.5-5.8 5.9-5.8ZM9.7 9.9a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Zm4.6 0a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3ZM12 13.7c-1.05 0-1.8.62-1.8 1.45 0 .92.8 1.65 1.8 1.65s1.8-.73 1.8-1.65c0-.83-.75-1.45-1.8-1.45Z"
        />
      </svg>
    </div>
  )
}

export default LogoMark
