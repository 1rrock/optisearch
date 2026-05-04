import type { ComponentType } from "react"

export interface GuideMeta {
  slug: string
  title: string
  description: string
  category: "키워드 분석" | "블로그 SEO" | "콘텐츠 마케팅" | "실전 활용"
  date: string  // YYYY-MM-DD
  author: string
  readingMinutes: number
}

export const guides: GuideMeta[] = [
  { slug: "keyword-search-volume", title: "키워드 검색량이란? 초보자를 위한 완벽 가이드", description: "키워드 검색량의 의미와 블로그 운영에 활용하는 법을 알려드립니다.", category: "키워드 분석", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "keyword-competition", title: "블로그 키워드 경쟁도 분석하는 법", description: "경쟁도 지표를 이해하고 진입 가능한 키워드를 찾는 방법을 설명합니다.", category: "키워드 분석", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "saturation-index", title: "포화지수로 블루오션 키워드 찾는 방법", description: "포화지수의 개념과 저경쟁 키워드 발굴 전략을 소개합니다.", category: "키워드 분석", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 4 },
  { slug: "long-tail-keywords", title: "롱테일 키워드 전략: 검색량 적어도 수익 나는 이유", description: "롱테일 키워드의 장점과 활용 방법을 정리합니다.", category: "키워드 분석", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "keyword-grade", title: "키워드 등급(S~D)의 의미와 활용법", description: "옵티써치 키워드 등급 시스템을 설명하고 실전 활용법을 안내합니다.", category: "키워드 분석", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 4 },
  { slug: "blog-title-tips", title: "블로그 제목 작성법: 클릭률 높이는 7가지 공식", description: "검색 상위 노출과 클릭을 부르는 제목 작성 노하우 7가지.", category: "블로그 SEO", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 7 },
  { slug: "seo-basics", title: "블로그 SEO 기초: 검색 상위 노출의 원리", description: "검색 엔진 최적화의 기본 원리와 블로그에 적용하는 방법.", category: "블로그 SEO", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 7 },
  { slug: "heading-tags", title: "블로그 글 구조 잡는 법: H2/H3 태그 활용", description: "제목 태그를 활용한 구조적 글쓰기로 SEO 점수를 올리는 방법.", category: "블로그 SEO", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 4 },
  { slug: "content-length", title: "블로그 본문 길이, 몇 글자가 적당할까?", description: "SEO에 유리한 콘텐츠 분량을 통계와 사례로 알아봅니다.", category: "블로그 SEO", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 4 },
  { slug: "meta-description", title: "메타 디스크립션 작성법: 검색 결과 클릭을 부르는 요약문", description: "CTR을 높이는 메타 디스크립션 작성 원칙을 정리합니다.", category: "블로그 SEO", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 4 },
  { slug: "seasonal-keywords", title: "시즌 키워드 활용법: 트렌드 분석으로 타이밍 잡기", description: "계절성 키워드를 미리 발굴하고 콘텐츠 타이밍을 맞추는 전략.", category: "콘텐츠 마케팅", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-monetization", title: "블로그 수익화 전략: 애드센스부터 체험단까지", description: "블로그로 돈을 버는 주요 방법 5가지와 각각의 장단점.", category: "콘텐츠 마케팅", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 7 },
  { slug: "ai-writing-tools", title: "AI 글쓰기 도구 활용법: 효율적인 블로그 운영", description: "AI 도구를 활용해 블로그 생산성을 높이는 실전 팁.", category: "콘텐츠 마케팅", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-category", title: "블로그 카테고리 구성 전략", description: "SEO와 사용성을 모두 잡는 카테고리 설계 원칙.", category: "콘텐츠 마케팅", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 4 },
  { slug: "content-calendar", title: "콘텐츠 캘린더 만드는 법: 월간 발행 계획 수립", description: "꾸준한 발행을 위한 콘텐츠 캘린더 구축 방법.", category: "콘텐츠 마케팅", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 4 },
  { slug: "optisearch-keyword-tutorial", title: "옵티써치로 키워드 분석하는 방법 (튜토리얼)", description: "옵티써치 키워드 분석기의 모든 기능을 스텝별로 안내합니다.", category: "실전 활용", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 7 },
  { slug: "optisearch-title-tutorial", title: "옵티써치 AI 제목 생성기 활용 가이드", description: "AI 제목 생성기 사용법과 고품질 결과를 얻는 프롬프트 팁.", category: "실전 활용", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "keyword-to-publish", title: "키워드 분석부터 글 발행까지: 실전 워크플로우", description: "키워드 발굴, 글쓰기, 발행까지 이어지는 블로그 운영 전체 흐름.", category: "실전 활용", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 7 },
  { slug: "competitor-analysis", title: "경쟁 블로그 분석하고 차별화하는 방법", description: "상위 노출 블로그를 분석하고 차별화 포인트를 찾는 방법.", category: "실전 활용", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "first-blog-post", title: "블로그 첫 글 쓰기: 주제 선정부터 발행까지", description: "블로그를 막 시작한 사람을 위한 첫 포스팅 가이드.", category: "실전 활용", date: "2026-04-16", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-side-job-guide", title: "직장인 블로그 부업 시작 가이드: 첫 6개월 로드맵", description: "직장인이 퇴근 후 1시간으로 블로그 부업을 시작해 6개월 안에 토대를 만드는 단계별 실전 가이드입니다.", category: "실전 활용", date: "2026-04-29", author: "옵티써치 팀", readingMinutes: 7 },
  { slug: "find-blog-keywords-free", title: "블로그 키워드 찾는 법: 무료 도구로 시작하는 3단계 발굴법", description: "네이버 자동완성, 광고 시스템, 데이터랩을 활용해 비용 없이 블로그 키워드를 발굴하는 3단계 방법과 실전 키워드 선정 기준을 정리합니다.", category: "키워드 분석", date: "2026-04-30", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-seo-score-check", title: "블로그 SEO 점수 측정하는 법: 지금 당장 내 블로그를 진단하는 방법", description: "내 블로그의 SEO 상태를 스스로 진단하는 방법을 단계별로 정리합니다. 서치어드바이저, 구글 서치콘솔, 수동 체크리스트까지 지금 바로 점검할 수 있는 실전 가이드입니다.", category: "블로그 SEO", date: "2026-05-01", author: "옵티써치 팀", readingMinutes: 6 },
  { slug: "blog-write-faster", title: "블로그 글 빨리 쓰는 법: 1시간 안에 완성하는 5단계 루틴", description: "바쁜 직장인도 퇴근 후 1시간 안에 블로그 글을 완성할 수 있습니다. 기획부터 발행까지 글쓰기 속도를 높이는 5단계 실전 루틴과 반복 사용 가능한 템플릿 전략을 정리합니다.", category: "콘텐츠 마케팅", date: "2026-05-02", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-adsense-approval", title: "블로그 애드센스 승인 받는 법: 첫 신청부터 통과까지 실전 체크리스트", description: "블로그 애드센스 승인을 처음 신청하는 초보자를 위해 콘텐츠 기준, 탈락 원인 5가지, 재신청 주의사항, 최종 체크리스트까지 실전 중심으로 단계별 정리합니다.", category: "실전 활용", date: "2026-05-04", author: "옵티써치 팀", readingMinutes: 6 },
]

export const guideMap = new Map(guides.map(g => [g.slug, g]))

export function getGuideBySlug(slug: string): GuideMeta | undefined {
  return guideMap.get(slug)
}

export function getGuidesByCategory(category: GuideMeta["category"]): GuideMeta[] {
  return guides.filter(g => g.category === category)
}
