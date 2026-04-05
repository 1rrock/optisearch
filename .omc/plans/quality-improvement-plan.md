# OptisSearch 종합 품질 개선 로드맵

> 5개 AI 에이전트 분석 기반 (Architect, API Researcher, Security Reviewer, Next.js 16 Specialist, UX Auditor)
> 작성일: 2026-04-03

---

## Phase 1: 긴급 보안 + 안정성 (1일)

> 프로덕션 서비스 안전 확보. 배포 전 필수.

### 1-1. CRITICAL: `/api/keywords/batch` 인증 추가
- **파일:** `src/app/api/keywords/batch/route.ts:8-29`
- **문제:** 인증/레이트리밋 없이 누구나 50개 키워드 무한 호출 가능
- **작업:** `getAuthenticatedUser()` + `enforceUsageLimit()` + `checkRateLimit()` 추가
- **검증:** 인증 없이 POST → 401

### 1-2. HIGH: DEV_AUTH_BYPASS 프로덕션 가드
- **파일:** `src/middleware.ts:21`, `src/shared/lib/api-helpers.ts:13`
- **문제:** NODE_ENV 체크 없어 프로덕션에서 실수로 활성화 시 전체 인증 우회
- **작업:** `&& process.env.NODE_ENV !== "production"` 추가
- **작업:** `.env.example`의 기본값을 `DEV_AUTH_BYPASS=false`로 변경
- **검증:** production에서 바이패스 비활성화 확인

### 1-3. HIGH: CRON_SECRET 빈값 방어
- **파일:** `src/app/api/cron/billing/route.ts:11`, `src/app/api/cron/collect-keywords/route.ts:23`
- **문제:** CRON_SECRET="" 이면 `Bearer ` 헤더로 누구나 호출 가능
- **작업:** `if (!cronSecret || authHeader !== ...)` 패턴
- **검증:** CRON_SECRET 미설정 시 401

### 1-4. HIGH: 쇼핑 API 캐시 추가
- **파일:** `src/app/api/shopping/route.ts`
- **문제:** 캐시 없이 매 요청마다 DataLab 호출 → 1,000회 한도 초과 위험
- **작업:** `cached()` 래퍼 추가 (TTL: 6시간)
- **검증:** 동일 요청 2회 시 DataLab 1회만 호출

### 1-5. HIGH: AI 서비스 JSON.parse 안전 처리
- **파일:** `src/services/ai-service.ts:41,91,146`
- **문제:** OpenAI가 잘못된 JSON 반환 시 unhandled 에러
- **작업:** try/catch + 의미있는 에러 메시지
- **검증:** 파싱 실패 시 500 대신 적절한 에러

### 1-6. MEDIUM: 보안 헤더 추가
- **파일:** `next.config.ts`
- **작업:** X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, X-XSS-Protection
- **검증:** curl -I 로 헤더 확인

### 1-7. MEDIUM: 에러 메시지 내부정보 차단
- **파일:** 모든 API route 핸들러 catch 블록
- **문제:** `err.message`를 클라이언트에 그대로 반환 → DB 테이블명, API URL 노출
- **작업:** 서버에 상세 로그, 클라이언트에 generic 메시지
- **검증:** 500 에러에 내부 정보 미포함

### 1-8. MEDIUM: Supabase service_role 키 fallback 제거
- **파일:** `src/shared/lib/supabase.ts:14`
- **문제:** SERVICE_ROLE_KEY 없으면 anon key로 fallback → RLS 적용되어 예측 불가 동작
- **작업:** 서버에서 SERVICE_ROLE_KEY 없으면 throw Error
- **검증:** 키 미설정 시 즉시 에러

---

## Phase 2: API 최적화 + DataLab 쿼터 관리 (1-2일)

> DataLab 1,000회/일 한도 내에서 최대 효율. 비용 0원 절감.

### 2-1. DataLab keywordGroups 배치 (5개 묶기)
- **파일:** `src/shared/lib/naver-datalab.ts` (getSearchTrend 함수)
- **문제:** 현재 키워드 1개당 1 API 호출. API는 1회에 5개 그룹 지원.
- **작업:** 키워드 5개씩 묶는 `getSearchTrendBatch()` 함수 추가
- **효과:** trending 캐시 미스 시 20 → 4 호출 (80% 절감)
- **주의:** ratio는 그룹 내 상대값. 크로스 배치 정규화 시 참조 키워드 1개 공유
- **검증:** trending 엔드포인트 로그에서 DataLab 호출 수 확인

### 2-2. DataLab 일일 쿼터 카운터
- **파일:** `src/shared/lib/naver-datalab.ts` (postDatalab 함수에 래핑)
- **작업:**
  - 인메모리 일별 카운터 (자정 리셋)
  - 800회: console.warn
  - 950회: 요청 차단 + `{ error: "DataLab 일일 한도 근접" }` 반환
- **검증:** 카운터 동작 및 경고 로그

### 2-3. 코드 중복 제거
- **작업 1:** `getAuthHeaders()` → `src/shared/lib/naver-auth.ts` 공유 모듈 (naver-search.ts:13-27, naver-datalab.ts:13-28 중복)
- **작업 2:** `formatDate()` → `src/shared/lib/utils.ts` (seasonal:194, new:179, trending:187 중복)
- **작업 3:** `UsageLimitError` → `src/shared/lib/errors.ts` (analyze:45-54, ai:33-42 중복)
- **검증:** grep으로 중복 0 확인

### 2-4. Cron Job N+1 쿼리 → 배치 Upsert
- **파일:** `src/app/api/cron/collect-keywords/route.ts:234-248`
- **문제:** 기존 키워드 개별 UPDATE 루프 → 수천 개 시 수천 쿼리
- **작업:** Supabase upsert 배치 (onConflict: 'keyword')
- **검증:** 1000개 업데이트 시 쿼리 수 대폭 감소

### 2-5. AI 콘텐츠 입력 길이 제한
- **파일:** `src/app/api/ai/score/route.ts:8`
- **문제:** `z.string().min(10)` — max 없음 → 수 MB 전송 시 고비용 OpenAI 호출
- **작업:** `.max(50000)` 추가
- **검증:** 50000자 초과 시 400 에러

---

## Phase 3: 새 API 통합 + 기능 강화 (2-3일)

> 경쟁사(BlackKiwi) 대비 차별화. 추가 비용 없이 가치 극대화.

### 3-1. SearchAd Estimate API (예상 CPC/입찰가) ⭐ 핵심 차별화
- **파일:** `src/shared/lib/naver-searchad.ts` (함수 3개 추가)
- **엔드포인트:**
  - `POST /estimate/performance` → 예상 노출수, 클릭수, CPC
  - `GET /estimate/average-position-bid` → 순위별 필요 입찰가
  - `GET /estimate/exposure-minimum-bid` → 최소 노출 입찰가
- **일일 한도:** 없음 (SearchAd 속도 제한만)
- **UI:** 키워드 분석 결과에 "광고 경쟁도" 카드 추가
  - 예상 CPC, 최소 입찰가, 1위 입찰가, 예상 클릭수
- **캐시:** 24시간 TTL
- **검증:** 키워드 분석 시 CPC 데이터 정상 표시

### 3-2. 쇼핑인사이트 인구통계 API (6개 엔드포인트)
- **파일:** `src/shared/lib/naver-datalab.ts`
- **엔드포인트:** device/gender/age × (category/keyword) = 6개
- **일일 한도:** DataLab 1,000회 공유 (Phase 2 배치 절감 후 여유 확보)
- **UI:** 쇼핑 트렌드에 디바이스별/성별/연령별 파이차트
- **캐시:** 24시간 TTL
- **검증:** 쇼핑 카테고리 분석 시 인구통계 차트 표시

### 3-3. 뉴스 검색 API 통합
- **파일:** `src/shared/lib/naver-search.ts` (searchNews 추가)
- **엔드포인트:** `GET /v1/search/news.json`
- **일일 한도:** Search API 25,000회 (여유)
- **UI 1:** 키워드 분석에 "뉴스 동향" 섹션 (최근 뉴스 목록)
- **UI 2:** 트렌드 페이지 키워드에 뉴스 수 > 10이면 "🔥 뉴스 화제" 배지
- **검증:** 뉴스 있는 키워드에 뉴스 섹션 표시

### 3-4. 웹문서/백과사전 검색 추가
- **파일:** `src/shared/lib/naver-search.ts`
- **엔드포인트:** `/v1/search/webkr.json`, `/v1/search/encyc.json`
- **UI:** 키워드 분석 "검색 점유율"에 웹문서 총 결과 수 추가
- **UI:** 백과사전 결과 > 0이면 "⚠️ 백과사전 벽: 상위 노출 어려움" 경고
- **검증:** 백과사전 있는 키워드에 경고 표시

---

## Phase 4: UX/UI 개선 (2-3일)

> 모바일 대응, 사용자 피드백, 접근성

### 4-1. 모바일 네비게이션 추가 ⭐ 치명적 UX 결함
- **파일:** `src/widgets/layout/ui/Sidebar.tsx:61`
- **문제:** `hidden md:flex` → 모바일에서 네비게이션 완전 불가
- **작업:** shadcn/ui Sheet 컴포넌트로 모바일 드로어 + 햄버거 버튼 (`md:hidden`)
- **검증:** 모바일 뷰포트에서 모든 페이지 네비게이션 가능

### 4-2. Toast 알림 시스템
- **문제:** 삭제/복사/저장 등 액션에 피드백 없음
- **작업:** sonner 설치 + root layout에 Toaster 추가
- **적용:** 키워드 삭제, 메모 저장, 클립보드 복사, 엑셀 내보내기, AI 생성 성공/실패 (약 15-20곳)
- **검증:** 각 액션 후 토스트 표시

### 4-3. 대시보드 검색 입력 수정
- **파일:** `src/app/(main)/dashboard/page.tsx:208-216`
- **문제:** 검색 input + button에 이벤트 핸들러 없음 (완전 장식)
- **문제:** 최근 검색 링크가 `?q=` 사용하지만 analyze 페이지는 `?keyword=` 체크
- **작업:** form onSubmit → `/analyze?keyword=...` 이동 + URL 파라미터 통일
- **검증:** 대시보드 검색 → analyze 페이지 자동 분석

### 4-4. 삭제 확인 다이얼로그
- **파일:** `src/app/(main)/keywords/page.tsx:268`
- **문제:** 키워드 삭제 시 확인 없이 즉시 삭제
- **작업:** shadcn/ui AlertDialog로 확인 단계 추가
- **검증:** 삭제 클릭 → "정말 삭제?" 다이얼로그 → 확인 시 삭제

### 4-5. 접근성(a11y) 개선
- **문제:** 전체 앱에서 aria-label 4개만 사용
- **작업:**
  - 모든 아이콘 버튼에 `aria-label` (FAB, 삭제, 알림, 복사)
  - 사이드바 `<nav aria-label="주 내비게이션">`
  - 유저 메뉴에 `aria-expanded`, `aria-haspopup`
  - 모든 input에 `<label>` 또는 `aria-label`
  - SVG 차트에 `role="img"` + `aria-label`
- **검증:** Lighthouse 접근성 점수 90+ 달성

### 4-6. 헤더 검색(CMD+K) 수정 또는 제거
- **파일:** `src/widgets/layout/ui/Header.tsx:32-35`
- **문제:** "빠른 키워드 검색 (CMD+K)" 입력창이 완전 비기능
- **작업:** 기능 구현 (커맨드 팔레트) 또는 제거
- **검증:** CMD+K로 검색 가능 또는 UI 미표시

### 4-7. OG 메타데이터 URL 수정
- **파일:** `src/app/layout.tsx:21`
- **문제:** `https://optisearch-ochre.vercel.app` → 프로덕션 도메인 아님
- **작업:** `https://www.optisearch.kr`로 변경
- **검증:** 카카오톡/SNS 공유 시 올바른 미리보기

---

## Phase 5: Next.js 16 마이그레이션 + 인프라 (2-3일)

> 기술 부채 해소, 확장성 확보

### 5-1. middleware → proxy 마이그레이션
- **파일:** `src/middleware.ts` → `src/proxy.ts`
- **문제:** Next.js 16에서 middleware deprecated (빌드 경고)
- **작업:** 파일명 변경 + export 이름 변경 + auth 체크를 쿠키 존재 확인 방식으로 전환
- **주의:** auth()를 proxy에서 사용 불가 시 쿠키 직접 체크 (optimistic)
- **검증:** 빌드 경고 제거 + 미인증 시 로그인 리다이렉트

### 5-2. Redis/Vercel KV 캐시 전환
- **파일:** `src/services/cache-service.ts`, `src/shared/lib/rate-limit.ts`
- **문제:** 인메모리 캐시/레이트리밋 → 서버리스 콜드 스타트마다 초기화
- **작업:** Upstash Redis 또는 Vercel KV (`.env`에 이미 UPSTASH 변수 존재)
- **효과:** 캐시 지속성, 멀티 인스턴스 공유, 실효적 레이트 리밋
- **비용:** Upstash 무료 10,000 req/day → 충분

### 5-3. API Route 공통 래퍼
- **문제:** 모든 라우트에 auth/validation/error 보일러플레이트 반복
- **작업:** `createApiHandler(schema, handler, options)` HOF 추출
  ```
  options: { auth: boolean, rateLimit: boolean, feature: string }
  ```
- **효과:** 코드 50% 감소, 일관된 보안/에러 처리
- **검증:** 모든 라우트가 래퍼 사용, batch 같은 누락 불가

### 5-4. 빌링 멱등성 키
- **파일:** `src/app/api/billing/route.ts:39`
- **문제:** `order_${userId}_${Date.now()}` → 재시도 시 이중 결제
- **작업:** 클라이언트 idempotency key + 중복 확인
- **검증:** 동일 키로 2회 요청 시 1회만 결제

### 5-5. 구조화된 로깅
- **문제:** console.log/error만 사용, 요청 ID 추적 불가
- **작업:** JSON 구조 로깅 + 요청 ID + 에러 알림 (빌링 실패 시)
- **검증:** Vercel 로그에서 요청 추적 가능

---

## 쿼터 최적화 전후 비교

### DataLab (1,000회/일)

| 항목 | 현재 | 최적화 후 | 절감 |
|------|------|-----------|------|
| Trending (daily+monthly) | 40회/캐시미스 | **8회** | -80% |
| Seasonal | ~10회/월 | **2회** | -80% |
| Shopping | **무제한 (캐시없음)** | 1회/6h | -99% |
| Keyword analyze | 1회/키워드 | 1회/키워드 | 0% |
| 인구통계 (Phase 3 신규) | 0 | +6회/카테고리 | 신규 |
| **일일 추정** | **~200 + 유저비례** | **~50 + 유저비례** | **-75%** |

### SearchAd (일일 한도 없음)

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| Cron 수집 | ~100-150/일 | 동일 |
| Estimate (Phase 3 신규) | 0 | +3회/키워드분석 |
| 총계 | 안전 | 안전 |

---

## 새 기능으로 추가되는 사용자 가치

| 기능 | API | 경쟁사 대비 | Phase |
|------|-----|-----------|-------|
| 예상 CPC / 입찰가 | SearchAd Estimate | **BlackKiwi에 없음** | 3 |
| 성별/연령/디바이스 분석 | Shopping Insight | 고급 인사이트 | 3 |
| 뉴스 화제 키워드 | News Search | 실시간 트렌드 | 3 |
| 백과사전 벽 경고 | Encyc Search | SEO 정확도 | 3 |
| 모바일 네비게이션 | - | 기본 필수 | 4 |
| Toast 피드백 | - | UX 기본 | 4 |

---

## 우선순위 요약

```
Phase 1 (1일)  : 🔴 보안 + 안정성 — 즉시 필요
Phase 2 (1-2일): 🟡 API 최적화 — DataLab 쿼터 안전 확보
Phase 3 (2-3일): 🟢 새 기능 — 차별화 + 가치 창출
Phase 4 (2-3일): 🔵 UX/UI — 모바일 + 사용자 경험
Phase 5 (2-3일): ⚪ 인프라 — 기술 부채 해소
```

총 예상: **8-12일** (병렬 작업 시 단축 가능)
