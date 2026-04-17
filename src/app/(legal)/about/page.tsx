import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "소개 | 옵티써치",
  description: "옵티써치는 키워드 분석과 AI 콘텐츠 최적화를 하나로 제공하는 콘텐츠 마케팅 도구입니다.",
  robots: { index: true, follow: true },
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
        <h2 className="text-xl font-bold mb-4">우리가 이 도구를 만든 이유</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          옵티써치 팀은 블로그 운영자와 콘텐츠 마케터로 일하면서 키워드 분석 도구의 높은 구독 비용과
          복잡한 UX에 오랫동안 불편함을 느꼈습니다. 해외에서 만들어진 도구들은 한국어 검색 환경을
          제대로 반영하지 못했고, 국내 도구들은 기능이 단편적이거나 가격 부담이 컸습니다.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          그래서 한국어 검색 환경에 최적화된, 직관적이고 합리적인 도구가 필요하다고 판단했습니다.
          네이버 검색광고 API, DataLab API 등 공개 데이터를 활용해 누구나 쉽게 키워드를 분석할 수
          있도록 설계했고, AI 기능을 결합해 분석에서 콘텐츠 작성까지 하나의 흐름으로 완성할 수 있게
          했습니다.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          옵티써치의 목표는 블로거·콘텐츠 크리에이터·소규모 쇼핑몰 운영자가 데이터 기반으로
          콘텐츠 전략을 세우고, 검색 상위 노출을 통해 실질적인 성장을 이룰 수 있도록 돕는 것입니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">옵티써치 팀의 전문 분야</h2>
        <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">데이터 분석</strong> —
            수십만 건의 한국어 키워드 패턴 분석 경험을 바탕으로 신뢰도 높은 검색량·경쟁도 지표를 제공합니다.
          </li>
          <li>
            <strong className="text-foreground">검색엔진 최적화(SEO)</strong> —
            네이버 및 구글 검색 알고리즘의 변화를 지속적으로 추적하고 서비스에 반영합니다.
          </li>
          <li>
            <strong className="text-foreground">AI/ML 통합</strong> —
            GPT 기반 콘텐츠 생성과 SEO 데이터를 효율적으로 결합하여 실용적인 AI 도구를 구현합니다.
          </li>
          <li>
            <strong className="text-foreground">프론트엔드 개발</strong> —
            Next.js, TypeScript 기반의 빠르고 직관적인 웹 애플리케이션을 설계합니다.
          </li>
          <li>
            <strong className="text-foreground">콘텐츠 마케팅 실전 경험</strong> —
            실제 블로그 운영과 수익화 경험을 통해 현장에서 필요한 기능을 직접 제품에 반영합니다.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">서비스 신뢰성</h2>
        <div className="bg-muted/20 rounded-2xl p-6 border border-muted/40">
          <ul className="list-disc pl-6 space-y-3 text-muted-foreground not-prose">
            <li>
              <strong className="text-foreground">공식 데이터 기반</strong> —
              모든 검색량 데이터는 네이버 검색광고 공식 API에서 직접 수집합니다.
            </li>
            <li>
              <strong className="text-foreground">트렌드 데이터</strong> —
              시간별·기간별 트렌드는 네이버 DataLab 공식 API를 통해 제공합니다.
            </li>
            <li>
              <strong className="text-foreground">데이터 보완 알고리즘</strong> —
              검열 처리되거나 데이터가 부족한 키워드는 독자 개발한 블로그 비율 역산 알고리즘으로 보완합니다.
            </li>
            <li>
              <strong className="text-foreground">개인정보 보호</strong> —
              회원 정보는 암호화하여 저장하며, 제3자에게 공유하지 않습니다.
            </li>
            <li>
              <strong className="text-foreground">신속한 고객 응대</strong> —
              서비스 관련 문의는 카카오톡 채널 또는 이메일로 즉시 응대합니다.
            </li>
          </ul>
        </div>
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
