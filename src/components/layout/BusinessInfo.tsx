/**
 * 전자상거래법상 표시 의무 정보.
 *
 * 네이버 로그인 검수는 "네이버 로그인을 적용할 모든 서비스 환경"의 하단 푸터에서
 * 영업소 소재지·전화번호·이메일이 확인되기를 요구한다. 랜딩 푸터에만 두면 로그인
 * 화면에서 확인되지 않아 반려된다. 새 화면을 만들 때도 이 컴포넌트를 함께 넣을 것.
 */
export function BusinessInfo({ className = "" }: { className?: string }) {
  return (
    <div className={`text-xs text-muted-foreground font-mono space-y-1 ${className}`}>
      <p>OptiSearch Inc. | 사업자등록번호: 570-01-03731 | 대표: 최원락</p>
      <p>소재지: 경기도 화성시 새비봉남로 39</p>
      <p>고객센터: 070-8065-7571</p>
      <p>이메일: zxcv1685@gmail.com</p>
    </div>
  );
}
