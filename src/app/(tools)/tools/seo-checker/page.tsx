import type { Metadata } from "next"
import { SeoCheckerTool } from "./SeoCheckerTool"

export const metadata: Metadata = {
  title: "무료 블로그 SEO 점수 분석기 — 상위노출 체크리스트 | 옵티써치",
  description:
    "블로그 글의 SEO 점수를 0~100점으로 즉시 분석합니다. 제목 길이, 키워드 포함 여부, 본문 분량을 자동 체크하여 A~D 등급과 개선 방법을 제공합니다. 로그인 없이 무료.",
  keywords: ["블로그 SEO", "SEO 점수", "블로그 SEO 체크", "네이버 블로그 SEO", "블로그 상위노출 체크"],
  openGraph: {
    title: "무료 블로그 SEO 점수 분석기 | 옵티써치",
    description: "블로그 글의 SEO 점수를 즉시 분석합니다. 로그인 없이 무료.",
    url: "https://www.optisearch.kr/tools/seo-checker",
    type: "website",
  },
  alternates: {
    canonical: "https://www.optisearch.kr/tools/seo-checker",
  },
}

const seoCheckerSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "블로그 SEO 점수 체커",
  description:
    "블로그 글의 SEO 점수를 0~100점으로 즉시 분석합니다. 제목 길이, 키워드 포함 여부, 본문 분량을 자동 체크하여 A~D 등급과 개선 방법을 제공합니다. 로그인 없이 무료.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  url: "https://www.optisearch.kr/tools/seo-checker",
  publisher: {
    "@type": "Organization",
    name: "옵티써치",
  },
}

export default function SeoCheckerPage() {
  return (
    <div className="space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seoCheckerSchema) }}
      />
      <header className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">무료 SEO 점수 분석기</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          블로그 글 제목과 키워드를 입력하면 SEO 점수를 즉시 분석합니다.
          로그인 없이 하루 5회까지 무료로 사용할 수 있습니다.
        </p>
      </header>

      <SeoCheckerTool />

      {/* 1,000자+ SEO 설명 콘텐츠 (서버 렌더링) */}
      <section className="prose prose-neutral dark:prose-invert max-w-none border-t pt-12 space-y-6">
        <h2 className="text-2xl font-bold">SEO 점수란 무엇인가?</h2>
        <p>
          SEO(검색엔진 최적화) 점수는 블로그 글이 검색 결과 상위에 노출될 가능성을 0~100점으로 정량화한 지표입니다.
          검색 엔진 크롤러가 글을 이해하고 평가하는 주요 요소인 <strong>제목, 키워드 분포, 본문 구조, 본문 분량</strong>을
          기준으로 계산됩니다. 점수가 높을수록 검색 결과 첫 페이지에 오를 가능성이 높고, 낮으면 아무리 좋은 내용이어도
          독자에게 도달하지 못합니다.
        </p>

        <h2 className="text-2xl font-bold">블로그 SEO의 기본 원칙 4가지</h2>

        <h3 className="text-xl font-semibold">1. 제목 최적화 (가장 중요)</h3>
        <p>
          제목은 검색 결과 페이지(SERP)에서 가장 먼저 보이는 요소이며, 검색 엔진이 글의 주제를 파악하는 핵심 단서입니다.
          이상적인 제목 길이는 <strong>한국어 기준 30~60자</strong>입니다. 너무 짧으면 정보 부족, 너무 길면 검색 결과에서
          잘려서 표시됩니다.
        </p>

        <h3 className="text-xl font-semibold">2. 타겟 키워드가 제목에 자연스럽게 포함</h3>
        <p>
          검색되고 싶은 키워드가 제목 <strong>앞쪽</strong>에 배치되면 SEO 효과가 극대화됩니다. 단, 키워드
          스터핑(무리한 반복)은 오히려 페널티를 받으므로 자연스러운 문장 흐름을 유지해야 합니다.
        </p>

        <h3 className="text-xl font-semibold">3. 본문 분량</h3>
        <p>
          한국어 블로그 기준 <strong>최소 1,000자 이상, 이상적으로는 1,500~2,500자</strong> 분량이 권장됩니다.
          구글 검색 상위 페이지 평균은 약 1,900단어(한국어 약 2,500자)로 알려져 있습니다. 너무 짧으면
          &quot;얇은 콘텐츠(Thin Content)&quot;로 분류되어 순위가 하락합니다.
        </p>

        <h3 className="text-xl font-semibold">4. 구조적 글쓰기 (H2/H3 태그)</h3>
        <p>
          긴 글은 H2, H3 소제목으로 섹션을 나눠야 합니다. 이는 검색 엔진이 글의 논리 구조를 파악하게 해주고,
          독자도 원하는 부분을 빠르게 찾을 수 있습니다.
        </p>

        <h2 className="text-2xl font-bold">SEO 점수 분석기 사용법</h2>
        <p>
          옵티써치 SEO 점수 분석기는 위 기본 원칙을 자동으로 체크하여 0~100점의 점수와 A~D 등급을 즉시 반환합니다.
          사용 흐름:
        </p>
        <ul>
          <li><strong>제목 입력</strong>: 발행할 글의 제목 (30~60자 권장)</li>
          <li><strong>타겟 키워드</strong>: 검색 상위 노출하고 싶은 핵심 키워드 1개</li>
          <li><strong>본문 입력(선택)</strong>: 본문을 함께 입력하면 분량 체크까지 이뤄져 더 정확한 점수가 나옵니다</li>
          <li><strong>결과 확인</strong>: 점수, 등급, 체크리스트 3항목을 즉시 제공</li>
        </ul>

        <h2 className="text-2xl font-bold">더 상세한 분석이 필요하다면</h2>
        <p>
          기본 3항목 외에도 <strong>상세 개선 제안 5가지</strong>, <strong>경쟁 글 비교 분석</strong>,{" "}
          <strong>키워드 밀도 계산</strong> 등이 필요하다면 로그인 후 대시보드에서 전체 기능을 사용할 수 있습니다.
          가입은 무료이며 이메일·구글·카카오 로그인을 지원합니다.
        </p>
      </section>
    </div>
  )
}
