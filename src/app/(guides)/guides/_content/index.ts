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
  { slug: "blog-keyword-extraction-sites", title: "블로그 키워드 추출 사이트 비교: 무료와 유료의 차이는?", description: "블로그 키워드 추출에 활용할 수 있는 도구들을 기능별로 비교하고, 무료 도구와 유료 도구를 단계별로 선택하는 기준을 정리합니다.", category: "키워드 분석", date: "2026-05-05", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "naver-blog-top-exposure", title: "네이버 블로그 상위 노출 방법: 검색 1페이지에 오르는 7가지 핵심 전략", description: "네이버 블로그 상위 노출에 영향을 주는 C-RANK, 키워드 제목, 본문 구조, 이미지, 발행 주기 등 7가지 핵심 전략을 초보 블로거 기준으로 정리합니다.", category: "블로그 SEO", date: "2026-05-06", author: "옵티써치 팀", readingMinutes: 6 },
  { slug: "blog-fill-1000-characters", title: "블로그 글 1000자 채우는 법: 내용 없어도 분량 늘리는 5가지 실전 방법", description: "블로그 글 1000자가 막막할 때 쓸 수 있는 5가지 방법을 소개합니다. 소제목 분리, 예시 추가, Q&A 섹션 등 초보도 바로 적용 가능한 분량 확장 전략을 정리합니다.", category: "콘텐츠 마케팅", date: "2026-05-07", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-keyword-search-volume-check", title: "블로그 키워드 검색량 조회 방법: 네이버에서 무료로 확인하는 4단계", description: "네이버 광고 시스템을 활용해 블로그 키워드 검색량을 직접 조회하는 방법을 4단계로 정리합니다. 계정 생성부터 데이터 해석까지 초보도 따라할 수 있는 실전 가이드입니다.", category: "키워드 분석", date: "2026-05-08", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-seo-checklist", title: "블로그 SEO 체크리스트: 발행 전 반드시 확인할 10가지 항목", description: "블로그 글 발행 전 확인해야 할 SEO 체크리스트를 정리합니다. 제목 키워드, 메타 디스크립션, 이미지 alt 텍스트, 내부 링크까지 초보 블로거도 바로 적용할 수 있는 실전 점검 목록입니다.", category: "블로그 SEO", date: "2026-05-09", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-experience-group-guide", title: "블로그 체험단 신청 가이드: 초보도 선정되는 5가지 핵심 전략", description: "블로그 체험단을 처음 신청하는 초보 블로거를 위해 신청 조건, 선정 확률을 높이는 신청서 작성법, 발행 시 주의사항까지 단계별로 정리합니다.", category: "실전 활용", date: "2026-05-11", author: "옵티써치 팀", readingMinutes: 6 },
  { slug: "blog-content-ideas", title: "블로그 글감 떠올리는 법: 아이디어가 떨어졌을 때 쓰는 5가지 방법", description: "블로그 글감이 떨어졌을 때 바로 쓸 수 있는 5가지 아이디어 발굴법을 정리합니다. 검색어 자동완성, 커뮤니티 질문, 메모 습관까지 초보도 적용 가능한 방법을 소개합니다.", category: "콘텐츠 마케팅", date: "2026-05-12", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "naver-datalab-guide", title: "네이버 데이터랩 활용법: 블로그 콘텐츠 기획에 바로 쓰는 실전 가이드", description: "네이버 데이터랩에서 키워드 추이와 계절성을 확인하는 방법을 정리합니다. 검색어 트렌드, 시즌 키워드 발굴, 발행 타이밍 최적화까지 블로그 콘텐츠 기획에 바로 적용할 수 있는 실전 활용법을 소개합니다.", category: "키워드 분석", date: "2026-05-13", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-meta-tag-guide", title: "블로그 메타태그 설정 가이드: SEO를 결정하는 핵심 태그 5가지", description: "블로그 SEO에서 빠질 수 없는 메타태그의 종류와 각각 올바르게 설정하는 방법을 초보 블로거 기준으로 정리합니다.", category: "블로그 SEO", date: "2026-05-14", author: "옵티써치 팀", readingMinutes: 6 },
  { slug: "blog-writing-with-ai", title: "AI로 블로그 글쓰기 실전: 처음부터 발행까지 한 번에 끝내는 4단계 방법", description: "AI를 활용해 블로그 글을 처음부터 발행까지 완성하는 실전 방법을 4단계로 정리합니다. 키워드 선정, 개요 작성, 섹션별 생성, 퇴고까지 초보도 따라할 수 있는 구체적인 전략을 소개합니다.", category: "콘텐츠 마케팅", date: "2026-05-15", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-traffic-growth-tips", title: "블로그 유입 늘리는 현실적인 방법: 오늘 바로 적용하는 5가지 전략", description: "블로그 방문자가 늘지 않는 이유와 해결책을 정리합니다. 키워드 선정, 발행 주기, 내부 링크, 외부 채널까지 초보 블로거가 바로 실천할 수 있는 유입 증가 전략 5가지를 소개합니다.", category: "실전 활용", date: "2026-05-16", author: "옵티써치 팀", readingMinutes: 6 },
  { slug: "blog-inflow-keyword-analysis", title: "블로그 유입 키워드 분석 방법: 어떤 검색어로 방문자가 들어오는지 파악하는 3가지 방법", description: "블로그에 어떤 키워드로 방문자가 유입되는지 파악하는 방법을 정리합니다. 네이버 서치어드바이저, 구글 서치콘솔, 블로그 통계를 활용한 실전 분석법을 소개합니다.", category: "키워드 분석", date: "2026-05-17", author: "옵티써치 팀", readingMinutes: 5 },
  { slug: "blog-search-not-showing", title: "블로그 검색 노출 안 되는 이유 7가지: 원인별 해결법 정리", description: "블로그 글을 써도 검색에 노출되지 않는 이유 7가지를 정리합니다. 인덱싱 누락부터 경쟁도 오판까지 초보 블로거가 자주 겪는 원인과 단계별 해결 방법을 안내합니다.", category: "블로그 SEO", date: "2026-05-18", author: "옵티써치 팀", readingMinutes: 6 },
]

export const guideMap = new Map(guides.map(g => [g.slug, g]))

export function getGuideBySlug(slug: string): GuideMeta | undefined {
  return guideMap.get(slug)
}

export function getGuidesByCategory(category: GuideMeta["category"]): GuideMeta[] {
  return guides.filter(g => g.category === category)
}
