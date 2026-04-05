# 새롭게 등장한 키워드 — 재설계 계획

## 요구사항

1. **데이터 소스**: DB 자체 검색 기록 → **SearchAd 일일 폴링**으로 전환
2. **UI**: 현재 7일 칩 형태 → **BlackKiwi 스타일 날짜 컬럼 테이블** (달력 느낌)
3. **스케줄링**: Vercel Cron으로 매일 자동 수집

## 아키텍처

```
[매일 새벽 3시 - Vercel Cron]
        │
        ▼
/api/cron/collect-keywords (GET, CRON_SECRET 인증)
        │
        ├─ trending-seeds.ts (8카테고리 ~60개)
        ├─ seasonal-keywords.ts (현재월 ~10개)
        └─ keyword_searches에서 최근 사용자 검색 (~50개)
        │
        ▼  (총 ~120개 시드, 중복 제거)
SearchAd getRelatedKeywords() × 120 = ~2,400개 연관 키워드
        │
        ▼
keyword_corpus 테이블에 INSERT (first_seen_at 기록)
        │
        ▼  [사용자 요청 시]
/api/keywords/new?date=2026-04-03 (날짜별 신규 키워드 조회)
        │
        ▼
trends 페이지 — 달력 스타일 컬럼 UI
```

## Phase 1: DB 스키마 — `keyword_corpus` 테이블

### Supabase SQL 마이그레이션

```sql
CREATE TABLE IF NOT EXISTS keyword_corpus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  source_seed TEXT,              -- 어떤 시드에서 발견됐는지
  pc_volume INT DEFAULT 0,
  mobile_volume INT DEFAULT 0,
  total_volume INT GENERATED ALWAYS AS (pc_volume + mobile_volume) STORED,
  competition TEXT,              -- 높음/중간/낮음
  first_seen_at DATE NOT NULL DEFAULT CURRENT_DATE,
  last_seen_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 핵심: keyword + first_seen_at 유니크 → 중복 방지
CREATE UNIQUE INDEX idx_corpus_keyword ON keyword_corpus (keyword);

-- 날짜별 신규 키워드 조회 인덱스
CREATE INDEX idx_corpus_first_seen ON keyword_corpus (first_seen_at DESC);

-- RLS 비활성화 (기존 패턴과 동일)
ALTER TABLE keyword_corpus DISABLE ROW LEVEL SECURITY;
```

**파일**: `supabase/migration-002-keyword-corpus.sql` (신규)

핵심 로직:
- `keyword` UNIQUE — 같은 키워드는 한 번만 저장
- `first_seen_at` — 최초 발견일 (INSERT 시 자동)
- `last_seen_at` — 마지막 발견일 (매일 폴링 시 UPDATE)
- 신규 키워드 = `first_seen_at = 오늘 날짜`인 것

## Phase 2: 수집 Cron API — `/api/cron/collect-keywords`

**파일**: `src/app/api/cron/collect-keywords/route.ts` (신규)

```
GET /api/cron/collect-keywords
Authorization: Bearer ${CRON_SECRET}
```

동작:
1. `CRON_SECRET` 검증 (기존 `/api/cron/billing` 패턴 참조: `src/app/api/cron/billing/route.ts`)
2. 시드 수집: `trending-seeds.ts` + `seasonal-keywords.ts` + DB `keyword_searches` 최근 검색
3. 중복 제거 → ~100~150개 유니크 시드
4. 각 시드로 `getRelatedKeywords()` 호출 (SearchAd API)
   - 배치: 10개씩 병렬, 100ms 딜레이 → ~15초 완료
   - 각 호출당 ~20~50개 연관 키워드 반환
   - 총 ~2,000~5,000개 키워드 수집
5. Supabase UPSERT:
   - 새 키워드: INSERT (`first_seen_at = today`)
   - 기존 키워드: UPDATE (`last_seen_at = today`, 볼륨 갱신)
6. 응답: `{ collected: 3240, newToday: 47, seeds: 120 }`

**Rate Limit 안전성**:
- SearchAd: ~20-30 req/s, 일일 제한 없음
- 120개 시드 × 1 req = 120 requests → 12초 내 완료
- Vercel Serverless 60초 타임아웃 내 충분

## Phase 3: 조회 API 수정 — `/api/keywords/new`

**파일**: `src/app/api/keywords/new/route.ts` (수정)

현재: `keyword_searches` MIN(created_at) 기반 → 사용자 검색 기록만
변경: `keyword_corpus` first_seen_at 기반 → SearchAd 연관 키워드 전체

```
GET /api/keywords/new?date=2026-04-02&days=7
```

응답 (BlackKiwi 스타일):
```json
{
  "dates": [
    {
      "date": "2026-04-02",
      "label": "2026-04-02 수",
      "keywords": [
        { "keyword": "삼성전자 14.5조 자사주 소각", "volume": 12300 },
        { "keyword": "제니 자크뮈스 언더붐 드레스", "volume": 11400 },
        ...
      ]
    },
    {
      "date": "2026-04-01",
      "label": "2026-04-01 화",
      "keywords": [...]
    }
  ],
  "selectedDate": "2026-04-02"
}
```

## Phase 4: UI — BlackKiwi 스타일 달력 컬럼

**파일**: `src/app/(main)/trends/page.tsx` (수정 — `NewKeywordsSectionWrapper` 교체)

### 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│ ✨ 새롭게 등장한 키워드                          < 2026-04 > │
├───────────────┬───────────────┬───────────────┬──────────────┤
│ 2026-04-03 목 │ 2026-04-02 수 │ 2026-04-01 화 │ 2026-03-31 월│
│ 키워드    검색량│ 키워드    검색량│ 키워드    검색량│ 키워드   검색량│
├───────────────┼───────────────┼───────────────┼──────────────┤
│ 표시할 데이터  │ 삼성전자..12300│ 이비가짬..2170│ 이민우.. 19800│
│ 없습니다.     │ 제니 자크..11400│ 주담대.. 850│ 41살 한..11100│
│               │ 소득하위..3280│ 고유가민..600│ 정호영.. 3720│
│               │ ...           │ ...          │ ...          │
└───────────────┴───────────────┴───────────────┴──────────────┘
```

핵심 UI 요소:
- 상단 월 네비게이션 (`< 2026-04 >`)
- 가로 스크롤 가능한 날짜 컬럼 (최근 7일 표시, 스크롤로 더 보기)
- 각 컬럼: 날짜 헤더 + 키워드/검색량 테이블
- 데이터 없는 날: "표시할 데이터가 없습니다."
- 키워드 클릭 → `/analyze?keyword=...`

## Phase 5: Vercel Cron 등록

**파일**: `vercel.json` (수정)

```json
{
  "crons": [
    { "path": "/api/cron/billing", "schedule": "0 0 * * *" },
    { "path": "/api/cron/collect-keywords", "schedule": "0 18 * * *" }
  ]
}
```

> `0 18 * * *` UTC = 한국시간 새벽 3시 (KST = UTC+9)

## 수정/생성 파일 목록

| 파일 | 작업 | Phase |
|------|------|:---:|
| `supabase/migration-002-keyword-corpus.sql` | **신규** — DB 테이블 | 1 |
| `src/app/api/cron/collect-keywords/route.ts` | **신규** — 수집 Cron | 2 |
| `src/app/api/keywords/new/route.ts` | **수정** — corpus 기반 조회 | 3 |
| `src/app/(main)/trends/page.tsx` | **수정** — 달력 컬럼 UI | 4 |
| `vercel.json` | **수정** — Cron 등록 | 5 |

## 재사용 코드

- `getRelatedKeywords()` — `src/shared/lib/naver-searchad.ts:166`
- `createServerClient()` — `src/shared/lib/supabase.ts`
- `getAllTrendingSeeds()` — `src/shared/config/trending-seeds.ts`
- `getSeasonalSeeds()` — `src/shared/config/seasonal-keywords.ts`
- Cron 인증 패턴 — `src/app/api/cron/billing/route.ts`

## 수용 기준

1. `curl /api/cron/collect-keywords -H "Authorization: Bearer $CRON_SECRET"` → `{ collected: N, newToday: N }`
2. `keyword_corpus` 테이블에 2,000+ 키워드 저장됨
3. `GET /api/keywords/new?date=2026-04-03` → 해당 날짜 신규 키워드 반환
4. 트렌드 페이지에서 달력 스타일 컬럼 렌더링
5. 날짜 네비게이션 (< >) 동작
6. 키워드 클릭 시 분석 페이지 이동
7. `npx tsc --noEmit` 성공

## 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| SearchAd API 일시 장애 | catch로 부분 실패 허용, 다음 날 재수집 |
| Vercel 60초 타임아웃 | 시드 120개 × 병렬 10 = ~12초 → 충분 |
| 초기 데이터 부족 (첫날) | 수동 트리거 엔드포인트로 즉시 1회 실행 가능 |
| 키워드 중복/노이즈 | total_volume > 100 필터로 저품질 키워드 제거 |
