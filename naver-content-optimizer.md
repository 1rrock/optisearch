# 네이버 콘텐츠 옵티마이저 - 최종 기획서

## 서비스 개요

**서비스명:** (미정 - 추천: 키워드플러스, 블로그스코어, 네이버라이터 등)
**한줄 설명:** 블랙키위 + AI = 네이버 키워드 분석 + AI 콘텐츠 최적화 도구
**타겟:** 네이버 블로그 마케터, 스마트스토어 운영자, 마케팅 프리랜서
**포지셔닝:** 블랙키위보다 싸고, AI가 "어떻게 써야 하는지"까지 알려주는 도구

---

## 시장 분석

### 경쟁사 지도

| 도구 | 가격 | 회원 | 특징 | 우리와의 차이 |
|---|---|---|---|---|
| **블랙키위** | 무료 4회/분, ₩12,000~₩81,000/월 | 29만 | 시장 1위, 키워드 데이터 최강 | AI 기능 없음, 비쌈 |
| 키워드마스터 | 무료 | - | 검색량+문서수만 | 너무 기초적 |
| 키자드 | 무료 | - | 트래픽 감당 못해 반죽음 | 불안정 |
| 마피아넷 | 무료 | - | 대량 검색량 조회 | 분석 기능 없음 |
| SURF(서핑) | 무료 | - | 10년 트렌드 | 분석 기능 없음 |
| 아이템스카우트 | 프리미엄 | - | 스마트스토어 특화 | 블로그 SEO 아님 |
| Surfer SEO | $99~$299/월 | - | 글로벌 최강 SERP 분석 | 한국어 부족, 너무 비쌈 |

### 시장 기회

```
무료 도구들 (키워드마스터, 마피아넷, SURF) — 데이터만, 분석 없음
        ↕ 이 갭에 우리가 진입 (₩9,900 + AI)
블랙키위 유료 (₩12,000~₩81,000) — 데이터 풍부하나 AI 없음
```

### 유저 불만 포인트 → 우리 해결책

| 불만 | 해결 |
|---|---|
| 블랙키위 무료 4회/분 적음 | 무료 5회/일 |
| 블랙키위 유료 부담 | ₩9,900/월 |
| 데이터만 주고 활용법 없음 | AI 콘텐츠 가이드 |
| 대량 키워드 분석 안됨 | 대량 분석 지원 |
| 초보자 진입 어려움 | AI가 쉽게 설명 |

---

## 핵심 기능 (16개)

### 기본 기능 — 블랙키위 대등 (11개)

| # | 기능 | 설명 | 데이터 소스 |
|---|---|---|---|
| 1 | **키워드 분석** | 검색량(PC/모바일), 경쟁도, 클릭률 | 검색광고 API `/keywordstool` |
| 2 | **콘텐츠 포화 지수** | 검색량 대비 발행 콘텐츠 비율 (블로그 진입 난이도) | 검색광고 API 검색량 ÷ 검색 API 블로그 글 수 |
| 3 | **키워드 등급 (S+~D-)** | 15단계 등급 (포화지수+경쟁도+클릭률 조합) | 자체 스코어링 공식 |
| 4 | **키워드 추천/확장** | 연관 키워드 발굴 | 검색광고 API `relKeyword` |
| 5 | **트렌드** | 기간별 검색 추이, 성별/연령 필터 (⚠️ 상대지수 0~100, 절대 검색량 아님 → 차트에 "상대 검색량 지수" 라벨 필수) | 데이터랩 API |
| 6 | **인기글 TOP7** | 상위 블로그 7개 글의 제목, 설명, URL 분석 | 검색 API `/search/blog?display=7` |
| 7 | **섹션 분석** | PC/모바일 검색 결과 섹션별(블로그/카페/지식인) 노출 현황 | 검색 API 각 엔드포인트 호출 |
| 8 | **인구통계 분석** | 성별/연령별 검색자 비율 | 데이터랩 API `gender`, `ages` |
| 9 | **대량 키워드 분석** | CSV/다건 키워드 일괄 분석 + 엑셀 다운로드 | 검색광고 API 반복 호출 |
| 10 | **간편 키워드 조회/비교** | 빠른 검색 + 2~5개 키워드 나란히 비교 | 검색광고 API |
| 11 | **태그 복사 + 검색 기록** | 키워드 태그 원클릭 복사, 검색 기록 저장/엑셀 | 프론트엔드 구현 |

### AI 차별화 기능 — 블랙키위에 없는 것 (3개)

| # | 기능 | 설명 | 기술 |
|---|---|---|---|
| 12 | **AI 제목 추천** | 클릭률 높은 블로그 제목 5개 생성 | GPT-4o-mini |
| 13 | **AI 글 초안 생성** | 키워드 기반 블로그 글 뼈대 작성 | GPT-4o-mini |
| 14 | **AI 콘텐츠 점수** | 내 글 분석 → 0-100 점수 + 개선 가이드 | GPT-4o-mini |

### 신규 기능 (2개)

| # | 기능 | 설명 | 기술 |
|---|---|---|---|
| 15 | **쇼핑 키워드 인사이트** | 쇼핑 카테고리별 트렌드 + 인기 키워드 TOP 20 | 데이터랩 쇼핑인사이트 API |
| 16 | **오타 교정 + 성인 키워드 필터** | 키워드 입력 시 자동 오타 교정, 성인 키워드 자동 차단 | 검색 API `/search/errata`, `/search/adult` |

### 블랙키위 대비 커버리지: 16개 중 14개 (87%) + AI 3개 + 신규 2개

| 블랙키위 기능 | 우리 | 비고 |
|---|---|---|
| 키워드 분석 | ✅ | 동일 |
| 콘텐츠 포화 지수 | ✅ | 동일 |
| 키워드 등급 | ✅ | 자체 공식 |
| 검색 트렌드 | ✅ | 동일 |
| 연관 키워드 | ✅ | 동일 |
| 인기글 TOP7 | ✅ | 동일 + AI 분석 |
| 섹션 분석 | ✅ | 동일 |
| 인구통계 | ✅ | 동일 |
| 키워드 추천 | ✅ | 동일 |
| 키워드 확장 | ✅ | 동일 |
| 대량 분석 | ✅ | 동일 |
| 태그 복사 | ✅ | 동일 |
| 검색 기록/엑셀 | ✅ | 동일 |
| 구글 키워드 분석 | ❌ | 후순위 (네이버 특화로 차별화) |
| 인플루언서 순위 | ❌ | 후순위 (스크래핑 필요) |
| 트렌드 모니터링 (실시간) | ❌ | 후순위 (스크래핑 필요) |
| 예상 검색량 | ❌ | 후순위 (예측 모델 필요) |

### 후순위 (MVP 이후)

| 기능 | 이유 |
|---|---|
| 구글 키워드 분석 | 네이버 특화 전략, 추후 확장 |
| 검색 순위 추적 | 공식 API 없음, SerpApi 비용 $50/월 |
| 인플루언서 순위 | 스크래핑 필요, 법적 리스크 |
| 트렌드 모니터링 (실시간) | 스크래핑 필요 |
| 경쟁 글 비교 분석 | 상위 글 텍스트 필요 → 유저 직접 붙여넣기로 우회 |
| 실시간 글 작성 코칭 | 개발 복잡도 높음 |

---

## 기술 스택

### 아키텍처: Next.js 풀스택

```
Next.js App Router (Vercel Pro $20/월)
├── 프론트엔드: React + TanStack Query + Zustand
├── 백엔드: API Routes (서비스 레이어 분리)
├── DB: Supabase (PostgreSQL + Auth + RLS)
├── AI: OpenAI GPT-4o-mini
├── 결제: Stripe (한국 지원)
└── 크론잡: Vercel Cron / Inngest
```

### FSD 아키텍처 (siot-frontend 기반)

```
src/
├── app/                          # Next.js 라우팅
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── kakao/callback/page.tsx
│   ├── (main)/
│   │   ├── dashboard/page.tsx
│   │   ├── analyze/page.tsx
│   │   ├── analyze/compare/page.tsx
│   │   ├── keywords/page.tsx
│   │   ├── trends/page.tsx
│   │   ├── shopping/page.tsx
│   │   ├── bulk/page.tsx
│   │   ├── ai/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── keywords/route.ts
│   │   ├── analyze/route.ts
│   │   ├── ai/title/route.ts
│   │   ├── ai/draft/route.ts
│   │   ├── ai/score/route.ts
│   │   └── webhooks/stripe/route.ts
│   ├── layout.tsx
│   └── providers.tsx
│
├── features/
│   ├── keyword-analysis/         # 키워드 분석 + 포화지수 + 등급
│   │   ├── api/
│   │   │   ├── keyword-api.ts
│   │   │   └── use-keyword-search.ts
│   │   ├── model/
│   │   │   ├── types.ts
│   │   │   └── keyword-schema.ts
│   │   └── ui/
│   │       ├── KeywordSearchForm.tsx
│   │       ├── KeywordResultCard.tsx
│   │       ├── KeywordCompareTable.tsx
│   │       └── SearchVolumeChart.tsx
│   │
│   ├── keyword-expand/           # 키워드 추천/확장
│   │   ├── api/
│   │   ├── model/
│   │   └── ui/
│   │
│   ├── keyword-compare/          # 키워드 비교
│   │   ├── api/
│   │   ├── model/
│   │   └── ui/
│   │
│   ├── top-posts/                # 인기글 TOP7
│   │   ├── api/
│   │   ├── model/
│   │   └── ui/
│   │
│   ├── section-analysis/         # 섹션 분석
│   │   ├── api/
│   │   ├── model/
│   │   └── ui/
│   │
│   ├── shopping-insight/         # 쇼핑 인사이트
│   │   ├── api/
│   │   ├── model/
│   │   └── ui/
│   │
│   ├── trend/                    # 트렌드
│   │   ├── api/
│   │   ├── model/
│   │   └── ui/
│   │       ├── TrendChart.tsx
│   │       └── DemographicFilter.tsx
│   │
│   ├── bulk-analysis/            # 대량 키워드 분석
│   │   ├── api/
│   │   ├── model/
│   │   └── ui/
│   │
│   ├── ai-tools/                 # AI 기능 통합
│   │   ├── api/
│   │   │   ├── ai-api.ts
│   │   │   ├── use-title-suggest.ts
│   │   │   ├── use-draft-generate.ts
│   │   │   └── use-content-score.ts
│   │   ├── model/
│   │   │   └── types.ts
│   │   └── ui/
│   │       ├── TitleSuggestionPanel.tsx
│   │       ├── DraftGeneratorPanel.tsx
│   │       ├── ContentScoreGauge.tsx
│   │       └── ContentEditor.tsx
│   │
│   ├── search-history/           # 검색 기록 + 태그 복사
│   │   ├── api/
│   │   ├── model/
│   │   └── ui/
│   │
│   ├── auth/                     # 인증
│   │   ├── api/auth-api.ts
│   │   ├── model/use-auth-session.ts
│   │   └── ui/
│   │
│   └── subscription/             # 구독/결제
│       ├── api/
│       ├── model/
│       └── ui/
│
├── entities/
│   ├── keyword/
│   │   └── model/types.ts
│   └── analysis/
│       └── model/types.ts
│
├── shared/
│   ├── api/
│   │   ├── public-api.ts
│   │   ├── private-api.ts
│   │   └── types.ts
│   ├── ui/                       # Radix + CVA + Tailwind
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── chart.tsx
│   │   └── gauge.tsx
│   ├── lib/
│   │   ├── naver-searchad.ts     # 네이버 검색광고 API 클라이언트
│   │   ├── naver-datalab.ts      # 네이버 데이터랩 API 클라이언트
│   │   ├── naver-search.ts       # 네이버 검색 API 클라이언트
│   │   ├── openai.ts             # OpenAI API 래퍼
│   │   ├── stripe.ts             # Stripe 결제
│   │   └── utils.ts              # cn() 등
│   └── config/
│       └── constants.ts
│
└── services/                     # 서버 전용 (NestJS 추출 대비)
    ├── keyword-service.ts
    ├── trend-service.ts
    ├── ai-service.ts
    └── scoring-service.ts
```

### 네이버 API 연동

| API | 인증 | 일일 한도 | 용도 |
|---|---|---|---|
| 검색광고 API `/keywordstool` | HMAC-SHA256 | 초당 20~30 (일 한도 없음) | 검색량, 경쟁도, 연관키워드 |
| 데이터랩 API - 검색 트렌드 | Client-ID | 25,000/일 | 트렌드, 성별/연령 |
| 데이터랩 API - 쇼핑인사이트 | Client-ID | 25,000/일 | 쇼핑 트렌드, 카테고리 키워드 |
| 검색 API - 블로그 | Client-ID | 25,000/일 | 인기글 TOP7, 포화지수 |
| 검색 API - 지식iN | Client-ID | 25,000/일 | 섹션분석, 유저 의도 |
| 검색 API - 쇼핑 | Client-ID | 25,000/일 | 상업적 의도 판단 |
| 검색 API - 카페글 | Client-ID | 25,000/일 | 섹션분석 |
| 검색 API - 성인판별 | Client-ID | 25,000/일 | 키워드 필터 |
| 검색 API - 오타교정 | Client-ID | 25,000/일 | 입력 보정 |
| OpenAI GPT-4o-mini | API Key | 종량제 | AI 제목/초안/점수 |

### API 인증 키 정리

| API 그룹 | 인증 방식 | 필요한 키 | 발급처 |
|---|---|---|---|
| 네이버 검색광고 API | HMAC-SHA256 서명 | CUSTOMER_ID, Access License, Secret Key | searchad.naver.com → 도구 → API 사용 관리 |
| 네이버 Developers API (검색, 데이터랩 등) | Client-ID 헤더 | Client ID, Client Secret | developers.naver.com → 애플리케이션 등록 |
| OpenAI | Bearer Token | API Key | platform.openai.com |
| Stripe | Secret Key | Publishable Key, Secret Key | dashboard.stripe.com |

> ⚠️ 모든 API 키는 서버사이드 환경변수로만 관리. 클라이언트 노출 금지.

### OpenAI 비용 관리

| 기능 | 모델 | 토큰/건 | 비용/건 |
|---|---|---|---|
| 제목 추천 | gpt-4o-mini | ~500 | ~₩5 |
| 글 초안 | gpt-4o-mini | ~3,000 | ~₩30 |
| 콘텐츠 점수 | gpt-4o-mini | ~2,000 | ~₩20 |

---

## 가격 정책

블랙키위: 무료(4회/분) → 베이직 ₩12,000 → 스탠다드 ₩27,000 → 프리미엄 ₩81,000
우리: 더 싸고 + AI 포함

| | 무료 | 베이직 ₩9,900/월 | 프로 ₩29,000/월 |
|---|---|---|---|
| 키워드 검색 | 5회/일 | 무제한 | 무제한 |
| 연관 키워드 | ✅ | ✅ | ✅ |
| 콘텐츠 포화 지수 | ✅ | ✅ | ✅ |
| 키워드 등급 | ✅ | ✅ | ✅ |
| 인기글 TOP7 | ❌ | ✅ | ✅ |
| 섹션 분석 | ❌ | ✅ | ✅ |
| 쇼핑 인사이트 | ❌ | ✅ | ✅ |
| 트렌드 | 기본 (1개월) | 1년 | 전체 |
| 성별/연령 필터 | ❌ | ✅ | ✅ |
| 대량 키워드 | ❌ | 50개/회 | 500개/회 |
| 태그 복사 | ✅ | ✅ | ✅ |
| 검색 기록/엑셀 | 최근 10개 | 무제한 + 엑셀 | 무제한 + 엑셀 |
| AI 제목 추천 | 1회/일 (블러) | 20회/일 | 100회/일 |
| AI 글 초안 | ❌ | 5회/일 | 30회/일 |
| AI 콘텐츠 점수 | ❌ | 10회/일 | 50회/일 |
| 오타 교정 | ✅ | ✅ | ✅ |

---

## DB 스키마

```sql
-- 유저
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  provider text DEFAULT 'kakao',  -- kakao, google
  avatar_url text,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

-- 구독
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text DEFAULT 'active',
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 키워드 검색 기록
CREATE TABLE keyword_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  pc_search_volume int,
  mobile_search_volume int,
  competition text,              -- 낮음/중간/높음
  blog_post_count int,
  saturation_index numeric(5,2), -- 콘텐츠 포화 지수
  keyword_grade text,            -- S+~D- 등급
  section_data jsonb,            -- 섹션 분석 결과
  top_posts jsonb,               -- 인기글 TOP7 데이터
  shopping_data jsonb,           -- 쇼핑 인사이트 데이터
  created_at timestamptz DEFAULT now()
);

-- AI 사용 기록 (횟수 제한용)
-- feature: 'search' | 'title' | 'draft' | 'score'
-- 키워드 검색 시 feature='search'로 기록, keyword_searches는 상세 결과 저장용
CREATE TABLE ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  feature text NOT NULL,     -- search, title, draft, score
  keyword text,
  tokens_used int,
  created_at timestamptz DEFAULT now()
);

-- 저장된 키워드 (즐겨찾기)
CREATE TABLE saved_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  memo text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, keyword)
);

-- 일일 사용량 뷰 (모든 사용 기록 통합)
CREATE VIEW daily_usage AS
SELECT
  user_id,
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE feature = 'search') as search_count,
  COUNT(*) FILTER (WHERE feature = 'title') as title_count,
  COUNT(*) FILTER (WHERE feature = 'draft') as draft_count,
  COUNT(*) FILTER (WHERE feature = 'score') as score_count
FROM ai_usage
GROUP BY user_id, DATE(created_at);
```

---

## 화면 목록 (11개)

| # | 화면 | 경로 | 설명 |
|---|---|---|---|
| 1 | 랜딩 페이지 | `/` | 서비스 소개, 가입 유도 |
| 2 | 로그인 | `/login` | 카카오/구글 소셜 로그인 |
| 3 | 대시보드 | `/dashboard` | 최근 검색, 저장 키워드, 사용량 |
| 4 | 키워드 분석 | `/analyze` | 키워드 검색 → 결과 카드 |
| 5 | 키워드 비교 | `/analyze/compare` | 2~5개 키워드 나란히 비교 |
| 6 | 트렌드 | `/trends` | 검색 추이 차트, 필터 |
| 7 | 쇼핑 인사이트 | `/shopping` | 쇼핑 카테고리 트렌드 + 인기 키워드 |
| 8 | 대량 분석 | `/bulk` | CSV 업로드 or 직접 입력 |
| 9 | AI 도구 | `/ai` | 제목 추천, 글 초안, 콘텐츠 점수 탭 |
| 10 | 가격 정책 | `/pricing` | 플랜 비교, 결제 |
| 11 | 설정 | `/settings` | 계정, 구독 관리 |

---

## MVP 로드맵 (8주)

| 주차 | 작업 | 산출물 |
|---|---|---|
| **W1** | 프로젝트 세팅, FSD 구조, 인증 (카카오/구글), 공통 UI, DB | Next.js + Supabase + Radix UI |
| **W2** | 네이버 API 연동 (검색광고 + 검색 + 데이터랩), 기본 키워드 검색 | API 클라이언트, 키워드 분석 결과 카드 |
| **W3** | 포화지수, 등급, 인기글 TOP7, 섹션 분석 | 파생 분석 기능 |
| **W4** | 키워드 비교, 트렌드 차트, 쇼핑 인사이트, 대량 분석 | 차트, 비교 테이블 |
| **W5** | AI 기능 (제목 추천, 글 초안, 콘텐츠 점수) | OpenAI 연동, 프롬프트 엔지니어링 |
| **W6** | 결제 (Stripe/토스), 플랜별 제한, 사용량 추적 | 구독 시스템 |
| **W7** | 랜딩 페이지 + 추가 기능 polish | 마케팅 페이지 |
| **W8** | QA, 버그 수정, 배포, 모니터링 셋업 | Vercel 배포, Sentry 연동 |

---

## 수익 시뮬레이션

인프라 비용 반영 + Stripe 수수료(3.4%+₩400/건) 반영.

| 시점 | 무료 | 베이직 | 프로 | 월 매출 | 인프라 | API/수수료 | 순수익 |
|---|---|---|---|---|---|---|---|
| 1개월 | 50 | 2 | 0 | ₩19,800 | ₩30,000 | ₩6,500 | **-₩16,700** |
| 3개월 | 300 | 10 | 1 | ₩128,000 | ₩35,000 | ₩40,000 | **₩53,000** |
| 6개월 | 1,000 | 30 | 5 | ₩442,000 | ₩50,000 | ₩135,000 | **₩257,000** |
| 12개월 | 3,000 | 50 | 10 | ₩785,000 | ₩80,000 | ₩260,000 | **₩445,000** |

인프라: Vercel Pro $20 + Supabase 무료→유료 + OpenAI 종량제 + 도메인
API/수수료: OpenAI 토큰 + Stripe 수수료(3.4%+₩400/건)

---

## 초기 유저 유치 전략

1. **무료 AI 제목 추천**으로 검색 유입 ("네이버 블로그 제목 추천 AI")
2. **네이버 블로그/카페에 사용법 포스팅** (셀프 마케팅)
3. **블랙키위 무료 유저 타겟** — "무료 4회 → 여긴 5회 + AI"
4. ₩9,900 런칭 특가로 진입 장벽 최소화
5. 마케팅 커뮤니티 (에펨코리아, 아프리카TV 마케팅 카페) 홍보

---

## 리스크 & 대응

| 리스크 | 확률 | 대응 |
|---|---|---|
| 블랙키위가 AI 추가 | 높음 | 선점 + 가격 우위 유지 |
| 네이버 API 정책 변경 | 중간 | 검색광고 API는 광고 생태계 핵심이라 폐지 가능성 낮음 |
| OpenAI 비용 초과 | 중간 | 일일 횟수 제한 + GPT-4o-mini 사용 |
| 네이버 AI 브리핑 확대 | 중간 | SEO 수요 감소 가능 → 장기 리스크 |
| 유저 유치 실패 | 중간 | 무료 티어 넉넉하게 → 바이럴 기회 확보 |
| 검색광고 API 약관 위반 | 낮음 | 18개+ 도구가 사용 중, 단속 사례 없음. Plan B: 유저 자체 API키 연동 방식 전환 |
| Stripe 수수료 부담 | 중간 | 토스페이먼츠 대안 검토 (수수료 더 낮음) |
| Supabase 무료 한계 초과 | 중간 | 500MB DB, 50K MAU 한도. 유저 1,000명 시점에 유료 전환 ($25/월) |

---

## 캐싱 전략

- 동일 키워드 24시간 캐싱 (Supabase에 결과 저장, TTL 기반)
- 인구통계 분석 = API 12회 호출 필요 → 반드시 캐싱
- 인기글 TOP7 = 6시간 캐싱 (콘텐츠 변동 반영)

---

## 에러 핸들링

- 네이버 API 429 (Rate Limit): 지수 백오프 재시도 (최대 3회)
- 네이버 API 장애: "일시적 오류" 토스트 + 캐시된 데이터 우선 표시
- OpenAI 타임아웃: 30초 제한 + "다시 시도" 버튼

---

## 보안 + 악용 방지

**API Key 보호:**
- 네이버/OpenAI API Key: 서버사이드 전용 (환경변수), 클라이언트 노출 금지
- CORS: Vercel 설정으로 도메인 제한

**Rate Limiting:**
- 유저별 분당 요청 제한 (Upstash Rate Limit)
- 플랜별 일일 사용량 제한 (DB 기반 카운팅)

**입력 검증:**
- Zod 스키마로 키워드 입력 검증 (XSS, SQL injection 방지)
- 성인 키워드 자동 필터링 (네이버 /search/adult API)

**CAPTCHA (AI/봇 악용 방지):**
- 무료 유저: 일일 한도 초과 시 Cloudflare Turnstile CAPTCHA 표시
- 비로그인 사용: Cloudflare Turnstile 필수 (봇 방지)
- 의심 행동 감지: 짧은 시간 내 대량 요청 시 CAPTCHA 트리거
- 구현: Cloudflare Turnstile (무료, 사용자 친화적, reCAPTCHA 대안)
  - 프론트: @marsidev/react-turnstile 패키지
  - 백엔드: API Route에서 토큰 검증 (siteverify endpoint)
- 네이버 CAPTCHA API는 이미지/음성 생성용이라 웹 검증 용도로 부적합 → Cloudflare Turnstile 추천

---

## 모니터링

- Sentry: 에러 추적
- Vercel Analytics: 성능 모니터링
- Supabase Dashboard: DB 사용량 모니터링

---

## 법적 요건

- 개인정보처리방침 (카카오 로그인 시 이메일, 닉네임 수집)
- 이용약관
- 사업자등록 정보 표시 (전자상거래법)
