import type { Metadata } from "next"
import { TrendCheckerTool } from "./TrendCheckerTool"

export const metadata: Metadata = {
  title: "무료 키워드 트렌드 분석기 | 옵티써치",
  description:
    "키워드의 최근 3개월 검색 트렌드를 무료로 확인하세요. 로그인 없이 바로 사용 가능한 한국어 키워드 트렌드 분석 도구입니다.",
}

export default function TrendCheckerPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">무료 키워드 트렌드 분석기</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          키워드의 최근 3개월 검색량 추이를 차트로 시각화합니다.
          로그인 없이 하루 3회까지 무료로 사용할 수 있습니다.
        </p>
      </header>

      <TrendCheckerTool />

      {/* 1,000자+ SEO 설명 콘텐츠 (서버 렌더링) */}
      <section className="prose prose-neutral dark:prose-invert max-w-none border-t pt-12 space-y-6">
        <h2 className="text-2xl font-bold">키워드 트렌드 분석이 중요한 이유</h2>
        <p>
          검색량은 계절, 트렌드, 이슈에 따라 계속 변합니다. 예를 들어 &ldquo;에어컨&rdquo;은 6~8월에 검색량이 3배 이상 뛰고,
          &ldquo;크리스마스 선물&rdquo;은 12월에 폭발적으로 증가합니다. 이런 시즌성을 미리 파악하지 못하면, 정작 사람들이 검색하는
          시기에는 이미 다른 경쟁자가 상위를 점유한 상태가 됩니다.
        </p>

        <h2 className="text-2xl font-bold">트렌드 분석으로 얻을 수 있는 인사이트</h2>

        <p>
          <strong>1. 수요 타이밍 예측</strong>
        </p>
        <p>
          과거 3개월 패턴을 보면 현재 키워드가 상승세인지 하락세인지, 또는 안정 구간에 있는지 파악할 수 있습니다.
          상승세 키워드를 선점하면 경쟁이 본격화되기 전에 상위 노출을 확보할 수 있습니다.
        </p>

        <p>
          <strong>2. 시즌 콘텐츠 발행 시점 결정</strong>
        </p>
        <p>
          시즌 키워드는 검색량이 폭증하기 <strong>1~2개월 전</strong>에 콘텐츠를 발행해야 합니다.
          검색 엔진이 글을 인덱싱하고 순위가 안정되는 데 시간이 걸리기 때문입니다.
          예를 들어 여름철 키워드는 4~5월에 발행해야 7월 정점에 상위 노출을 차지할 수 있습니다.
        </p>

        <p>
          <strong>3. 장기 vs 단발 트렌드 구분</strong>
        </p>
        <p>
          일시적 이슈로 검색량이 급증한 키워드는 빠르게 식을 수 있습니다.
          반면 꾸준히 성장하는 키워드는 장기 콘텐츠 자산이 됩니다.
          트렌드 그래프를 보면 이를 구분할 수 있습니다.
        </p>

        <h2 className="text-2xl font-bold">옵티써치 트렌드 분석기 사용법</h2>
        <ol>
          <li><strong>키워드 입력</strong>: 분석하고 싶은 키워드 1개 입력</li>
          <li><strong>3개월 트렌드 확인</strong>: 최근 90일 검색량 추이를 라인 차트로 시각화</li>
          <li><strong>패턴 해석</strong>: 상승/하락/안정 구간 파악</li>
          <li><strong>콘텐츠 전략 수립</strong>: 발행 시점, 타겟 기간 결정</li>
        </ol>
        <p>
          하루 3회까지 무료로 사용할 수 있으며, 데이터는 네이버 DataLab 기반으로 신뢰도가 높습니다.
        </p>

        <h2 className="text-2xl font-bold">시즌 키워드 활용 팁</h2>
        <ul>
          <li>
            <strong>여름 키워드</strong>: 에어컨, 선풍기, 다이어트, 제주도 여행 → 4~5월 발행
          </li>
          <li>
            <strong>겨울 키워드</strong>: 패딩, 핸드크림, 크리스마스 선물 → 10~11월 발행
          </li>
          <li>
            <strong>신학기 키워드</strong>: 노트북, 프린터, 학원 → 1~2월 발행
          </li>
        </ul>

        <h2 className="text-2xl font-bold">더 긴 기간의 데이터가 필요하다면</h2>
        <p>
          무료 버전은 3개월 트렌드만 제공합니다.{" "}
          <strong>12개월 이상 장기 트렌드, 키워드 간 비교 분석, 시즌 패턴 자동 분석</strong> 등은
          로그인 후 대시보드에서 이용할 수 있습니다.
        </p>
      </section>
    </div>
  )
}
