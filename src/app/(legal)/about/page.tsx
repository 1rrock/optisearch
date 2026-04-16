import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "소개 | 옵티써치",
  description: "옵티써치는 키워드 분석과 AI 콘텐츠 최적화를 하나로 제공하는 콘텐츠 마케팅 도구입니다.",
};

export default function AboutPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-xl bg-muted border border-border p-1.5 flex items-center justify-center">
          <Image src="/logo.png" alt="OptiSearch Logo" width={40} height={40} className="w-full h-full object-cover rounded" />
        </div>
        <h1 className="text-3xl font-black tracking-tight !mb-0">옵티써치 소개</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-10">키워드 분석 + AI 콘텐츠 최적화 도구</p>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">옵티써치란?</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          옵티써치(OptiSearch)는 검색 데이터를 기반으로 키워드의 검색량·경쟁도·트렌드를 분석하고,
          AI를 활용하여 블로그 제목·본문 초안을 자동 생성하며, SEO 점수 피드백까지 제공하는
          콘텐츠 마케팅 SaaS입니다.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          블로거, 마케터, 스몰 비즈니스 운영자가 검색 상위 노출을 위해 꼭 필요한 키워드 데이터와
          AI 콘텐츠 최적화 기능을 하나의 도구에서 모두 이용할 수 있습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">주요 기능</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
          <div className="bg-muted/20 rounded-2xl p-6 border border-muted/40">
            <h3 className="font-bold text-foreground mb-2">키워드 분석</h3>
            <p className="text-sm text-muted-foreground">월간 검색량, 블로그 발행량, 경쟁도, 포화지수를 한눈에 확인하고 수익성 높은 키워드를 발굴하세요.</p>
          </div>
          <div className="bg-muted/20 rounded-2xl p-6 border border-muted/40">
            <h3 className="font-bold text-foreground mb-2">AI 제목·초안 생성</h3>
            <p className="text-sm text-muted-foreground">키워드에 최적화된 블로그 제목과 본문 초안을 AI가 자동으로 생성합니다. 작성 시간을 대폭 절약하세요.</p>
          </div>
          <div className="bg-muted/20 rounded-2xl p-6 border border-muted/40">
            <h3 className="font-bold text-foreground mb-2">SEO 점수 분석</h3>
            <p className="text-sm text-muted-foreground">작성한 글의 SEO 최적화 수준을 점수로 확인하고, 구체적인 개선 포인트를 제안받으세요.</p>
          </div>
          <div className="bg-muted/20 rounded-2xl p-6 border border-muted/40">
            <h3 className="font-bold text-foreground mb-2">트렌드 분석</h3>
            <p className="text-sm text-muted-foreground">키워드의 검색량 추이를 기간별로 확인하고, 시즌별 콘텐츠 전략을 수립하세요.</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">왜 옵티써치인가요?</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">한국 검색 특화</strong> — 한국 검색 시장에 최적화된 데이터를 제공합니다.</li>
          <li><strong className="text-foreground">올인원 도구</strong> — 키워드 리서치부터 콘텐츠 작성, SEO 검증까지 하나의 흐름으로 완성합니다.</li>
          <li><strong className="text-foreground">AI 활용</strong> — 최신 AI 기술로 콘텐츠 작성 시간을 절반 이하로 줄여줍니다.</li>
          <li><strong className="text-foreground">무료로 시작</strong> — 핵심 기능을 무료 플랜에서 바로 체험할 수 있습니다.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">운영 정보</h2>
        <div className="bg-muted/20 rounded-2xl p-6 text-muted-foreground space-y-1">
          <p><span className="font-semibold text-foreground">서비스명:</span> 옵티써치 (OptiSearch)</p>
          <p><span className="font-semibold text-foreground">사업자명:</span> 알에이케이랩스</p>
          <p><span className="font-semibold text-foreground">사업자등록번호:</span> 570-01-03731</p>
          <p><span className="font-semibold text-foreground">대표자:</span> 최원락</p>
          <p><span className="font-semibold text-foreground">이메일:</span> zxcv1685@gmail.com</p>
          <p><span className="font-semibold text-foreground">전화:</span> 070-8065-7571</p>
          <p><span className="font-semibold text-foreground">소재지:</span> 경기도 화성시 새비봉남로 39</p>
          <p><span className="font-semibold text-foreground">고객문의:</span>{" "}
            <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">카카오톡 채널</a>
          </p>
        </div>
      </section>
    </article>
  );
}
