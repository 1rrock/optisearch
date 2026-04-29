import type { Metadata } from "next"
import { TitleGeneratorTool } from "./TitleGeneratorTool"

export const metadata: Metadata = {
  title: "AI 블로그 제목 생성기 — SEO 최적화 제목 추천 | 옵티써치",
  description:
    "키워드와 글 유형을 입력하면 클릭률 높은 SEO 최적화 블로그 제목 3개를 즉시 생성합니다. 정보성·리뷰·리스트형·비교분석 유형 지원. 무료 제공.",
  keywords: ["블로그 제목 추천", "블로그 제목 생성기", "AI 블로그 제목", "블로그 제목 만들기", "SEO 제목"],
  openGraph: {
    title: "AI 블로그 제목 생성기 | 옵티써치",
    description: "SEO 최적화된 블로그 제목 3개를 즉시 생성합니다. 무료.",
    url: "https://www.optisearch.kr/tools/title-generator",
    type: "website",
  },
  alternates: {
    canonical: "https://www.optisearch.kr/tools/title-generator",
  },
}

const titleGeneratorSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AI 블로그 제목 생성기",
  description:
    "키워드와 글 유형을 입력하면 클릭률 높은 SEO 최적화 블로그 제목 3개를 즉시 생성합니다. 정보성·리뷰·리스트형·비교분석 유형 지원. 무료 제공.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  url: "https://www.optisearch.kr/tools/title-generator",
  publisher: {
    "@type": "Organization",
    name: "옵티써치",
  },
}

export default function TitleGeneratorPage() {
  return (
    <div className="space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(titleGeneratorSchema) }}
      />
      {/* 헤더 */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">AI 블로그 제목 생성기</h1>
        <p className="text-muted-foreground text-lg">
          키워드와 글 유형을 입력하면 클릭률 높은 SEO 최적화 제목 3개를 즉시 생성합니다.
          하루 3회 무료로 이용하세요.
        </p>
      </div>

      {/* 도구 */}
      <TitleGeneratorTool />

      {/* SEO 설명 콘텐츠 */}
      <div className="prose prose-neutral dark:prose-invert max-w-none pt-8 border-t space-y-6 text-muted-foreground">
        <h2 className="text-xl font-bold text-foreground">좋은 블로그 제목의 3가지 조건</h2>
        <p>
          블로그 제목은 독자가 글을 클릭할지 말지를 결정하는 가장 중요한 요소입니다. 구글, 네이버, 다음 같은 검색
          엔진의 결과 페이지에서 사용자는 평균 5~7초 안에 클릭할 글을 고릅니다. 따라서 제목은{" "}
          <strong className="text-foreground">명확한 혜택</strong>,{" "}
          <strong className="text-foreground">구체성</strong>,{" "}
          <strong className="text-foreground">검색 의도 부합</strong> 세 가지를 반드시 갖춰야 합니다.
        </p>

        <h2 className="text-xl font-bold text-foreground">1. 명확한 혜택을 담아라</h2>
        <p>
          독자가 이 글을 읽고 무엇을 얻을 수 있는지가 제목에 드러나야 합니다. 예를 들어 "블로그 수익화"보다는
          "블로그로 월 100만 원 버는 5가지 방법"이 훨씬 강력합니다. 숫자, 구체적 결과, 시간 절약 같은 혜택을
          담으면 클릭률이 2~3배까지 차이가 납니다.
        </p>

        <h2 className="text-xl font-bold text-foreground">2. 구체적이고 숫자를 활용하라</h2>
        <p>
          "좋은 블로그 제목 작성법"보다 "검색 1페이지에 오르는 블로그 제목 7가지 공식"처럼 구체적이고 숫자가
          들어간 제목이 훨씬 잘 읽힙니다. 사람의 뇌는 숫자를 보면 "정리된 정보"라고 인식해 클릭 욕구가 높아집니다.
        </p>

        <h2 className="text-xl font-bold text-foreground">3. 검색 의도에 맞춰라</h2>
        <p>
          사용자가 "아이폰 17 리뷰"를 검색할 때 원하는 것은 실제 사용자의 솔직한 후기입니다. 이때 "아이폰 17
          출시일 정리"라는 제목은 검색 의도와 어긋나 클릭받기 어렵습니다. AI 제목 생성기는 입력한 글
          유형(정보성/리뷰/리스트형/비교분석)에 맞춰 검색 의도에 부합하는 제목을 만들어줍니다.
        </p>

        <h2 className="text-xl font-bold text-foreground">AI 제목 생성기 활용법</h2>
        <p>
          옵티써치의 AI 제목 생성기는 GPT 기반으로 동작하며, 키워드와 글 유형을 입력하면 즉시 3개의 서로 다른
          스타일의 제목을 제시합니다. 하루 3회까지 무료로 사용할 수 있습니다. 추천 사용 흐름:
        </p>
        <ul className="space-y-2">
          <li>
            <strong className="text-foreground">1단계</strong>: 키워드 분석기로 타겟 키워드의 검색량과
            경쟁도를 먼저 확인
          </li>
          <li>
            <strong className="text-foreground">2단계</strong>: AI 제목 생성기로 해당 키워드를 활용한
            제목 후보 3개 생성
          </li>
          <li>
            <strong className="text-foreground">3단계</strong>: 3개 중 가장 매력적인 제목을 선택하거나,
            마음에 드는 요소를 조합해 최종 제목 완성
          </li>
          <li>
            <strong className="text-foreground">4단계</strong>: 완성된 제목을 SEO 점수 분석기로 검증
          </li>
        </ul>

        <h2 className="text-xl font-bold text-foreground">더 많은 기능이 필요하다면</h2>
        <p>
          본문 초안 자동 생성, SEO 최적화 아웃라인, 메타 태그 추천 등 글쓰기 전 과정을 지원하는 기능은 회원가입
          후 대시보드에서 이용할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
