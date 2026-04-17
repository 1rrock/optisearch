import type { Metadata } from "next"
import { KeywordAnalyzerTool } from "./KeywordAnalyzerTool"

export const metadata: Metadata = {
  title: "무료 키워드 분석기 | 옵티써치",
  description:
    "키워드 검색량, 경쟁도, 등급을 무료로 확인하세요. 로그인 없이 바로 사용 가능한 한국어 키워드 분석 도구입니다.",
}

export default function KeywordAnalyzerPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">무료 키워드 분석기</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          키워드의 월간 검색량, 경쟁도, 그리고 SEO 등급을 실시간으로 분석합니다.
          로그인 없이 하루 5회까지 무료로 사용할 수 있습니다.
        </p>
      </header>

      <KeywordAnalyzerTool />

      {/* 1,000자+ SEO 설명 콘텐츠 (서버 렌더링) */}
      <section className="prose prose-neutral dark:prose-invert max-w-none border-t pt-12 space-y-6">
        <h2 className="text-2xl font-bold">키워드 분석이란?</h2>
        <p>
          키워드 분석은 블로그, 쇼핑몰, 웹사이트를 운영하는 사람이라면 반드시 익혀야 하는 SEO(검색엔진 최적화)의 출발점입니다.
          사람들이 실제로 검색하는 단어가 무엇인지, 그 단어를 두고 얼마나 많은 경쟁자가 있는지를 데이터로 확인해야
          상위 노출을 노릴 수 있는 기회 키워드를 발굴할 수 있기 때문입니다. 특히 한국어 검색 환경에서는 검색 포털별 검색량이
          달라 단순히 글로벌 트렌드만 참고해서는 안 되고, 국내 사용자들이 실제로 입력하는 질의어 데이터를 기반으로
          분석해야 합니다.
        </p>

        <h2 className="text-2xl font-bold">검색량이 중요한 이유</h2>
        <p>
          검색량(Search Volume)은 한 달 동안 특정 키워드가 얼마나 검색되었는지를 나타냅니다. 검색량이 많다는 것은
          그만큼 수요가 많다는 뜻이고, 상위에 노출되면 많은 방문자를 기대할 수 있습니다. 다만 검색량이 많을수록
          경쟁도 치열하기 때문에, 신규 블로그나 작은 사이트가 검색량 10만 이상의 초대형 키워드에서 상위권에 오르는 것은
          현실적으로 매우 어렵습니다. 반대로 검색량이 너무 적은 키워드(월 100회 이하)는 노출되어도 실질적인 트래픽을
          만들지 못합니다.
        </p>
        <p>
          이 때문에 실전에서는 <strong>검색량 500~10,000 사이</strong>의 중형 키워드와 롱테일 키워드를 타겟팅하는 전략이
          가장 효율적입니다. 옵티써치의 키워드 분석기는 PC 검색량과 모바일 검색량을 분리해서 보여주므로,
          타겟 사용자가 어느 기기를 주로 사용하는지도 파악할 수 있습니다.
        </p>

        <h2 className="text-2xl font-bold">경쟁도와 키워드 등급</h2>
        <p>
          경쟁도는 해당 키워드를 노리는 광고주와 블로거가 얼마나 많은지를 의미합니다. 경쟁도가 <strong>낮음</strong>이면
          비교적 진입하기 쉬운 키워드이고, <strong>높음</strong>이면 이미 많은 경쟁자가 있어 상위 노출이 어렵습니다.
          옵티써치는 검색량과 경쟁도를 종합하여 <strong>S+ ~ D-</strong> 범위의 키워드 등급을 제공합니다.
          S~A 등급은 검색량이 충분하면서 경쟁도도 합리적인 &quot;기회 키워드&quot;이고, C~D 등급은 진입에 신중을 기해야 하는
          키워드입니다.
        </p>

        <h2 className="text-2xl font-bold">실전 활용 팁</h2>
        <ul>
          <li><strong>롱테일 키워드 발굴</strong>: 대형 키워드(예: &quot;다이어트&quot;)보다는 구체적인 조합(예: &quot;40대 남자 다이어트 식단&quot;)을 공략하세요.</li>
          <li><strong>기기별 타겟 분석</strong>: 모바일 검색량이 압도적으로 많으면 모바일 UX를 최적화해야 합니다.</li>
          <li><strong>등급 기반 콘텐츠 전략</strong>: 신규 블로그는 B 이상 등급에 집중하고, 성장 후 A 등급 키워드로 확장하세요.</li>
          <li><strong>시즌성 고려</strong>: 시즌 키워드는 수요가 몰리기 전 1~2달 앞서 콘텐츠를 발행하는 것이 유리합니다.</li>
        </ul>

        <h2 className="text-2xl font-bold">더 자세한 분석이 필요하다면</h2>
        <p>
          무료 키워드 분석기는 검색량·경쟁도·등급의 핵심 지표만 제공합니다. 포화지수, 클릭률, 추정 클릭수, 관련 키워드,
          상위 노출 글 분석 등 상세 데이터가 필요하다면 옵티써치 계정에 로그인해 전체 기능을 사용할 수 있습니다.
          가입은 무료이며 이메일·구글·카카오 로그인을 지원합니다.
        </p>
      </section>
    </div>
  )
}
