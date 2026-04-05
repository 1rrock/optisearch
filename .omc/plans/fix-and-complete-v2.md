# OptisSearch 버그 수정 및 누락 기능 완성 계획

## 요약
사용자 피드백 + 코드 감사에서 발견된 버그 수정, 누락 기능 구현, Sentry 제거.

---

## 🔴 CRITICAL - 즉시 수정 필요

### 1. UUID 불일치 버그 수정 (저장 키워드 에러)
**파일:** `src/shared/lib/api-helpers.ts` (line 31)
**문제:** `getAuthenticatedUser()`가 user_profiles 조회 실패 시 Naver auth ID 문자열을 userId로 반환. saved_keywords.user_id는 UUID 타입이라 에러 발생.
**수정:** user_profiles에서 프로필을 찾지 못하면 자동 생성(upsert) 후 UUID를 반환. 절대로 auth string을 UUID 필드에 전달하지 않도록.
**검증:** POST /api/keywords/saved 호출 시 에러 없이 저장 성공

### 2. 검색 기록 저장 안 됨
**파일:** `src/app/api/keywords/route.ts`, `src/app/api/analyze/route.ts`
**문제:** `recordUsage()`는 호출하지만 `saveSearchHistory()`는 호출하지 않음. keyword_searches 테이블에 아무것도 저장 안 됨.
**수정:** 두 라우트에서 분석 결과를 `saveSearchHistory()`로 저장
**검증:** 키워드 검색 후 /api/history GET에서 기록이 반환됨

### 3. 분석 페이지 레이아웃 깨짐
**파일:** `src/app/(main)/analyze/page.tsx` (line 377)
**문제:** `-mb-6` 네거티브 마진으로 결과 헤더(저장/태그복사 버튼)가 아래 카드와 겹침
**수정:** `-mb-6` 제거, 적절한 마진/패딩으로 교체
**검증:** 버튼이 카드와 겹치지 않고 정상 표시

---

## 🟡 HIGH - 핵심 기능 미구현

### 4. 결제 플로우 연동 (요금제 페이지)
**파일:** `src/app/(main)/pricing/page.tsx` (line 141-145)
**문제:** "베이직 시작하기" / "프로 시작하기" 클릭 시 `alert("결제 기능은 준비 중입니다.")`만 표시
**수정:**
- 토스 결제 SDK 초기화 → 빌링키 발급 → /api/billing 호출 → 구독 생성
- 결제 성공 시 대시보드로 리다이렉트
- 결제 실패 시 에러 메시지 표시
**검증:** 결제 버튼 클릭 → 토스 결제창 열림 → 완료 시 구독 활성화

### 5. 사용량 제한 + 업그레이드 유도 UI
**파일:** 여러 API 라우트 + 프론트엔드 페이지
**문제:**
- `/api/trends`, `/api/shopping`에 사용량 제한 없음
- 제한 초과 시 "업그레이드" 유도 UI 없음
- `historyLimit`, `trendPeriodMonths` 미적용
**수정:**
- 모든 API 라우트에 enforceUsageLimit() 적용
- 프론트엔드에 "일일 한도 초과" 모달 컴포넌트 생성 → /pricing 링크
- 429 응답 시 자동으로 업그레이드 모달 표시
**검증:** 무료 유저가 5회 검색 후 6번째에 업그레이드 모달 표시

### 6. 트렌드 페이지 개선 (블랙키위 벤치마킹)
**파일:** `src/app/(main)/trends/page.tsx`
**문제:** 현재는 키워드 비교 도구처럼 동작. 블랙키위처럼 개별 키워드의 시계열 트렌드 + 인구통계를 직관적으로 보여줘야 함.
**수정:**
- 단일 키워드 입력 → 시계열 차트 (월간 추이)
- 성별/연령별 분포 파이차트 또는 바차트
- 기간 선택기 (1개월/3개월/6개월/1년)
- 선택적으로 비교 키워드 추가 (최대 5개)
- 디자인만 변경 — 기존 DataLab API 그대로 사용
**검증:** 단일 키워드 입력 → 차트 표시, 비교 키워드 추가 가능

---

## 🟢 MEDIUM - 정리/제거

### 7. Sentry 완전 제거
**파일:** sentry.*.config.ts, next.config.ts, src/shared/lib/sentry.ts, error.tsx 등
**수정:**
- sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts 삭제
- next.config.ts에서 withSentryConfig 제거
- src/shared/lib/sentry.ts 삭제
- error.tsx에서 Sentry import 제거 → console.error로 교체
- @sentry/nextjs 패키지 제거
**검증:** TypeScript 컴파일 통과, 빌드 성공

### 8. 분석 페이지 내 트렌드 차트 하드코딩 제거
**파일:** `src/app/(main)/analyze/page.tsx` (line 548-577)
**문제:** TODO 주석과 함께 하드코딩된 시뮬레이션 트렌드 바 존재
**수정:** DataLab API를 호출하여 실제 트렌드 데이터로 교체하거나, 해당 섹션 제거
**검증:** 하드코딩된 데이터 없음

---

## 실행 순서
1. Sentry 제거 (의존성 정리) → 빌드 안정화
2. UUID 버그 수정 (CRITICAL)
3. 검색 기록 저장 + 레이아웃 수정 (CRITICAL)
4. 사용량 제한 적용 + 업그레이드 모달
5. 결제 플로우 연동
6. 트렌드 페이지 개선
7. 분석 페이지 트렌드 차트 수정
8. 빌드 검증 + 배포

## 즉시 필요한 사항 (사용자 확인 필요)
- **토스 결제:** 테스트 모드 / 실제 모드 중 어떤 것으로? (테스트 키가 Vercel에 설정되어 있는지?)
- **트렌드 페이지:** 블랙키위 스타일 완전 리디자인 vs 현재 디자인에 기능 추가?
