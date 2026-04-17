import Image from "next/image";

export function LandingFooter() {
  return (
    <footer className="bg-background py-12 border-t border-border relative z-10">
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted border border-border p-1 flex items-center justify-center grayscale opacity-70">
              <Image src="/logo.png" alt="OptiSearch Logo" width={20} height={20} className="w-full h-full object-cover rounded" />
            </div>
            <span className="font-black text-xl text-muted-foreground tracking-tight">OptiSearch</span>
          </div>

          <div className="flex items-center gap-6 flex-wrap text-sm font-bold text-muted-foreground">
            <a href="/about" className="hover:text-foreground transition-colors">소개</a>
            <a href="/terms" className="hover:text-foreground transition-colors">이용약관</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</a>
            <a href="/disclaimer" className="hover:text-foreground transition-colors">면책조항</a>
            <a href="/contact" className="hover:text-foreground transition-colors">문의</a>
            <a href="/support" className="hover:text-foreground transition-colors">고객지원</a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 border-t border-border/50 py-8">
          <div>
            <h3 className="text-sm font-bold text-foreground mb-4">서비스</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="/tools/keyword-analyzer" className="hover:text-foreground transition-colors">
                  키워드 분석기
                </a>
              </li>
              <li>
                <a href="/tools/title-generator" className="hover:text-foreground transition-colors">
                  AI 제목 생성기
                </a>
              </li>
              <li>
                <a href="/tools/seo-checker" className="hover:text-foreground transition-colors">
                  SEO 점수 분석기
                </a>
              </li>
              <li>
                <a href="/tools/trend-checker" className="hover:text-foreground transition-colors">
                  트렌드 분석기
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-foreground mb-4">학습</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="/guides" className="hover:text-foreground transition-colors">
                  SEO 가이드
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 pt-8 text-xs text-muted-foreground font-mono flex flex-col md:flex-row justify-between items-center gap-4">
          <p>키워드 데이터 분석 소프트웨어 © 2026</p>
          <div className="text-right">
            <p>OptiSearch Inc. | 사업자등록번호: 570-01-03731 | 대표: 최원락</p>
            <p className="mt-1">소재지: 경기도 화성시 새비봉남로 39</p>
            <p className="mt-1">고객센터: 070-8065-7571</p>
            <p className="mt-1">이메일: zxcv1685@gmail.com</p>
            <p className="mt-1">문의: <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground">카카오톡 채널</a></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
