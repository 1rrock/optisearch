# Optisearch 시스템 안정화/개선 실행 계획

## TL;DR
> **Summary**: 결제 안정성 리스크를 최우선으로 봉합한 뒤, 로딩 UX/렌더링 성능/에러 스키마 일관성/FSD 경계를 순차적으로 정리한다.
> **Deliverables**:
> - Paddle 웹훅 멱등성 및 실패 가시성 강화
> - 라우트 로딩 UX 추가 및 과도한 재요청 완화
> - API 에러 응답 스키마 통일
> - `shared` 레이어 경계 위반 제거 + 재발 방지 규칙
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2 → 9

## Context
### Original Request
- 현재 프로젝트 전반 점검 결과를 바탕으로, **코드 수정 전 실행 계획**을 먼저 수립.

### Interview Summary
- 사용자 의도: API/페이지 렌더링속도, UX, 결제 예외처리, 로직/FSD 원칙까지 전체 개선 계획 필요.
- 제약: 이번 단계는 **계획만 작성**, 코드 수정 금지.

### Metis Review (gaps addressed)
- 수락 기준을 각 영역별로 이진(pass/fail)으로 명시.
- 웹훅 동시성/중복 이벤트/부분 실패 은닉 케이스를 QA 시나리오에 강제 포함.
- 범위 확장 방지(대규모 UI 리디자인, 결제사 교체, 전면 구조개편 제외).

## Work Objectives
### Core Objective
- 사용자 체감 품질과 운영 안정성을 해치던 핵심 리스크(결제/로딩/에러/아키텍처 경계)를 **회귀 최소화 방식**으로 개선.

### Deliverables
- 결제: 웹훅 멱등성 보장, 실패/부분 실패 가시화, 구독 조회 실패 표면화.
- UX/성능: 주요 경로 `loading.tsx` 도입, 트렌드 계산 병목 완화, `staleTime` 정책 정리.
- API: 에러 응답 표준 스키마 도입 및 route 일관 적용.
- FSD: `shared` 상향 의존 제거 + lint 규칙으로 재발 방지.

### Definition of Done (verifiable conditions with commands)
- `npm run build` 성공(Exit code 0).
- 변경 파일 대상 `lsp_diagnostics` 에러 0.
- 웹훅 중복 호출 QA에서 단일 처리 보장 확인.
- 느린 네트워크에서 로딩 UI 확인(주요 페이지).
- `src/shared/**`에서 금지 레이어 import 0건.

### Must Have
- 결제 안정성 작업을 1순위로 실행.
- 모든 TODO에 실패/엣지 QA 포함.
- 증거 파일을 `.sisyphus/evidence/`에 저장.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- 결제사 교체(Paddle→타사) 같은 범위 외 작업 금지.
- 디자인 전면 개편 금지(로딩/오류 UX 보강만 수행).
- FSD 전체 재배치 금지(위반 지점 국소 수정만).

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after + build/lsp/manual QA
- QA policy: 모든 작업은 happy path + failure/edge 시나리오 필수
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Wave당 3~4개 태스크 배치

Wave 1: 결제 안정성 기반 작업 (Task 1,2,3)
Wave 2: UX/성능 + 에러 스키마 정리 (Task 4,5,6)
Wave 3: FSD 경계 및 재발 방지 + 통합 검증 (Task 7,8,9)

### Dependency Matrix (full, all tasks)
- 1 → 2 → 3
- 4 독립, 5는 4 이후 권장
- 6은 2와 병행 가능
- 7은 6과 병행 가능
- 8은 7 이후
- 9는 1~8 이후

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → `unspecified-high`, `ultrabrain`
- Wave 2 → 3 tasks → `visual-engineering`, `quick`, `unspecified-high`
- Wave 3 → 3 tasks → `deep`, `unspecified-high`

## TODOs
> 구현 + 테스트를 하나의 작업으로 결합

- [x] 1. Paddle 웹훅 멱등성 원자성 보강

  **What to do**: `src/app/api/webhooks/paddle/route.ts`에서 read-then-write 패턴을 DB unique constraint/원자 upsert 기반으로 교체하고, 중복 이벤트 시 무해하게 종료하도록 처리.
  **Must NOT do**: 결제사 SDK 교체, 이벤트 타입 범위 확대.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` — Reason: 동시성/정합성 중심 로직
  - Skills: [`omc-reference`] — OMC 작업 프로토콜 준수
  - Omitted: [`frontend-ui-ux`] — 백엔드 로직 중심

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3,9] | Blocked By: []

  **References**:
  - Pattern: `src/app/api/webhooks/paddle/route.ts` — 현재 웹훅 처리 진입점
  - API/Type: `src/shared/lib/paddle.ts` — Paddle 유틸/타입 컨텍스트
  - External: `https://developer.paddle.com/webhooks/overview` — 이벤트 처리 권장 패턴

  **Acceptance Criteria**:
  - [ ] 동일 이벤트 2회 동시 입력 시 실제 반영 1회만 발생
  - [ ] 처리 실패 시 재시도 가능한 상태코드/로그 정책 일관 적용

  **QA Scenarios**:
  ```
  Scenario: 중복 이벤트 동시 수신
    Tool: Bash
    Steps: 동일 payload를 병렬 2회 전송하는 스크립트 실행
    Expected: DB 상태 변경 1회, API 응답은 중복 안전 처리
    Evidence: .sisyphus/evidence/task-1-webhook-idempotency.txt

  Scenario: payload 필수필드 누락
    Tool: Bash
    Steps: eventId 또는 item 정보 누락 payload 전송
    Expected: 정책대로 실패 처리 + 에러 로깅
    Evidence: .sisyphus/evidence/task-1-webhook-idempotency-error.txt
  ```

  **Commit**: YES | Message: `fix(payments): harden paddle webhook idempotency` | Files: [`src/app/api/webhooks/paddle/route.ts`, `supabase/**`]

- [x] 2. 구독 조회/취소 API의 장애 표면화 개선

  **What to do**: `src/app/api/subscription/route.ts`에서 Paddle 장애 시 200 null 폴백을 제거하고, 사용자/클라이언트가 장애를 인식할 수 있는 에러 응답으로 통일.
  **Must NOT do**: 요금제 정책 변경, 취소 비즈니스 정책 변경.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: API 계약/클라이언트 영향 동반
  - Skills: [`omc-reference`] — Reason: 표준 절차 유지
  - Omitted: [`playwright`] — API 중심 검증

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [3,6,9] | Blocked By: [1]

  **References**:
  - Pattern: `src/app/api/subscription/route.ts` — 구독 조회/취소 처리
  - Pattern: `src/app/(main)/settings/page.tsx` — 구독 상태 소비 UI
  - API/Type: `src/shared/lib/api-handler.ts` — 공통 핸들러 후보

  **Acceptance Criteria**:
  - [ ] Paddle 호출 실패 시 성공(200)으로 은닉되지 않음
  - [ ] 클라이언트가 에러 상태를 분기 가능

  **QA Scenarios**:
  ```
  Scenario: Paddle 장애 강제
    Tool: Bash
    Steps: 테스트 환경에서 Paddle 호출 실패를 모킹 후 GET /api/subscription 호출
    Expected: 에러 상태코드 + 표준 에러 바디
    Evidence: .sisyphus/evidence/task-2-subscription-api.txt

  Scenario: 취소 API 실패
    Tool: Bash
    Steps: DELETE /api/subscription 호출 시 외부 실패 주입
    Expected: 실패 원인 식별 가능한 에러 응답
    Evidence: .sisyphus/evidence/task-2-subscription-api-error.txt
  ```

  **Commit**: YES | Message: `fix(subscription): surface provider failures explicitly` | Files: [`src/app/api/subscription/route.ts`]

- [x] 3. 결제 경로 클라이언트 오류 UX 보강

  **What to do**: `src/app/(main)/pricing/page.tsx`, `src/shared/providers/paddle-provider.tsx`에서 checkout 실패/취소/비정상 종료를 명시 분기하여 사용자 안내를 표준화.
  **Must NOT do**: 결제 UI 리디자인, 플랜 가격/텍스트 정책 변경.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: 사용자 오류 피드백 UX
  - Skills: [`frontend-ui-ux`] — Reason: 피드백/상태 UX 품질
  - Omitted: [`git-master`] — 커밋 전용 스킬 불필요

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [9] | Blocked By: [2]

  **References**:
  - Pattern: `src/app/(main)/pricing/page.tsx`
  - Pattern: `src/shared/providers/paddle-provider.tsx`
  - Pattern: `src/shared/ui/sonner.tsx`

  **Acceptance Criteria**:
  - [ ] checkout 실패/취소/닫힘 각각에 구분된 사용자 메시지 제공
  - [ ] 활성화 실패 시 재시도/문의 경로가 제시됨

  **QA Scenarios**:
  ```
  Scenario: checkout 실패 이벤트
    Tool: Playwright
    Steps: 실패 이벤트 모킹 후 결제 버튼 클릭
    Expected: 실패 토스트/가이드 노출
    Evidence: .sisyphus/evidence/task-3-pricing-error.png

  Scenario: checkout 중단/닫힘
    Tool: Playwright
    Steps: 결제창을 정상 완료 없이 닫기
    Expected: 상태 혼선 없이 안내 메시지 표시
    Evidence: .sisyphus/evidence/task-3-pricing-error-close.png
  ```

  **Commit**: YES | Message: `fix(pricing): clarify paddle checkout failure states` | Files: [`src/app/(main)/pricing/page.tsx`, `src/shared/providers/paddle-provider.tsx`]

- [x] 4. 주요 라우트 로딩 경계(`loading.tsx`) 도입

  **What to do**: `src/app/(main)` 하위 핵심 페이지에 세그먼트 로딩 UI를 추가해 체감 대기시간을 개선.
  **Must NOT do**: 페이지 구조/디자인 대개편.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: skeleton/loading UX 구현
  - Skills: [`frontend-ui-ux`, `playwright`] — Reason: UI 품질 + 검증
  - Omitted: [`ultrabrain`] — 고난도 백엔드 불필요

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9] | Blocked By: []

  **References**:
  - Pattern: `src/app/(main)/error.tsx` — 에러 경계 스타일 기준
  - Pattern: `src/shared/ui/card.tsx`, `src/shared/ui/input.tsx` — skeleton 구조 참조

  **Acceptance Criteria**:
  - [ ] 주요 페이지 로딩 시 빈 화면 대신 로딩 UI 표시
  - [ ] CLS를 유발하지 않는 레이아웃 유지

  **QA Scenarios**:
  ```
  Scenario: 느린 네트워크 페이지 진입
    Tool: Playwright
    Steps: network throttling 적용 후 /dashboard, /analyze 진입
    Expected: loading UI 즉시 노출 후 데이터 화면 전환
    Evidence: .sisyphus/evidence/task-4-loading-ui.png

  Scenario: 로딩 중 라우트 전환
    Tool: Playwright
    Steps: 연속 페이지 이동으로 로딩 연쇄 발생
    Expected: 깨짐/점프 없이 일관된 placeholder
    Evidence: .sisyphus/evidence/task-4-loading-ui-error.png
  ```

  **Commit**: YES | Message: `feat(ux): add route loading boundaries` | Files: [`src/app/**/loading.tsx`]

- [x] 5. React Query `staleTime: 0` 남용 정리

  **What to do**: `src/shared/providers/query-provider.tsx` 기준으로 페이지별 override를 감사하고, 실시간이 아닌 영역에서 `staleTime: 0` 제거.
  **Must NOT do**: 실시간 요구 화면까지 일괄 상향 조정.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: 설정/정책 정리 중심
  - Skills: [`omc-reference`] — Reason: 작업 일관성
  - Omitted: [`frontend-ui-ux`] — 스타일 작업 아님

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [6,9] | Blocked By: []

  **References**:
  - Pattern: `src/shared/providers/query-provider.tsx`
  - Pattern: `src/shared/components/SearchInputWithHistory.tsx`
  - Pattern: `src/app/(main)/trends/page.tsx`

  **Acceptance Criteria**:
  - [ ] 비실시간 화면의 `staleTime: 0` 제거
  - [ ] 불필요 재요청 감소를 로그/네트워크 탭으로 확인

  **QA Scenarios**:
  ```
  Scenario: 동일 페이지 재진입
    Tool: Playwright
    Steps: /trends 또는 검색 화면 왕복 이동
    Expected: 즉시 재호출 횟수 감소
    Evidence: .sisyphus/evidence/task-5-staletime.png

  Scenario: 최신성 민감 화면
    Tool: Playwright
    Steps: 실시간성 요구 화면 동작 확인
    Expected: 데이터 갱신 체감 저하 없음
    Evidence: .sisyphus/evidence/task-5-staletime-edge.png
  ```

  **Commit**: YES | Message: `perf(query): normalize staleTime policy` | Files: [`src/shared/providers/query-provider.tsx`, `src/app/(main)/**`, `src/shared/components/**`]

- [x] 6. API 에러 응답 스키마 통일

  **What to do**: `{ error: { code, message, details } }` 표준을 정의하고 `src/app/api/**/route.ts`에 점진 적용.
  **Must NOT do**: 성공 응답 스키마까지 동시 개편.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 다수 API 계약 정합성
  - Skills: [`omc-reference`] — Reason: 공통 룰 적용
  - Omitted: [`playwright`] — API 중심

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9] | Blocked By: [2]

  **References**:
  - Pattern: `src/shared/lib/api-handler.ts`
  - Pattern: `src/shared/lib/errors.ts`
  - Pattern: `src/app/api/keywords/route.ts`, `src/app/api/keywords/estimate/route.ts`

  **Acceptance Criteria**:
  - [ ] 표준화 대상 API에서 에러 바디 형식 동일
  - [ ] 클라이언트 에러 파싱 코드와 충돌 없음

  **QA Scenarios**:
  ```
  Scenario: 400/401/500 에러 샘플 검증
    Tool: Bash
    Steps: 각 API에 의도적 실패 요청 전송
    Expected: error.code/message/details 구조 일치
    Evidence: .sisyphus/evidence/task-6-error-schema.txt

  Scenario: 클라이언트 파싱 실패
    Tool: Playwright
    Steps: 실패 응답 유도 후 화면 동작 확인
    Expected: 공통 에러 UI로 정상 표출
    Evidence: .sisyphus/evidence/task-6-error-schema-ui.png
  ```

  **Commit**: YES | Message: `refactor(api): standardize error response schema` | Files: [`src/shared/lib/api-handler.ts`, `src/app/api/**/route.ts`]

- [x] 7. 트렌드 페이지 클라이언트 계산 병목 완화

  **What to do**: `src/app/(main)/trends/page.tsx`의 고비용 루프(워드클라우드 배치/정렬/매핑)를 `useMemo`/전처리 이전으로 최적화.
  **Must NOT do**: 트렌드 기능/지표 정의 변경.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 렌더링 성능 + 정확성 균형
  - Skills: [`omc-reference`] — Reason: 검증 루틴 유지
  - Omitted: [`frontend-ui-ux`] — 로직 최적화 중심

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [9] | Blocked By: [5]

  **References**:
  - Pattern: `src/app/(main)/trends/page.tsx`
  - Pattern: `src/services/trend-service.ts`

  **Acceptance Criteria**:
  - [ ] 대량 데이터에서 초기 렌더/상호작용 지연 감소
  - [ ] 기존 결과 정확도 유지

  **QA Scenarios**:
  ```
  Scenario: 대량 키워드 렌더링
    Tool: Playwright
    Steps: 큰 데이터셋으로 /trends 진입
    Expected: 프레임 드랍/멈춤 현상 완화
    Evidence: .sisyphus/evidence/task-7-trends-perf.png

  Scenario: 계산 결과 일관성
    Tool: Bash
    Steps: 최적화 전후 핵심 지표 스냅샷 비교
    Expected: 값 일치 또는 허용 오차 내
    Evidence: .sisyphus/evidence/task-7-trends-perf-error.txt
  ```

  **Commit**: YES | Message: `perf(trends): reduce heavy client computation` | Files: [`src/app/(main)/trends/page.tsx`]

- [x] 8. FSD 경계 위반 지점 국소 수정 + lint 가드레일 도입

  **What to do**: `src/shared/lib/api-helpers.ts`, `src/shared/config/constants.ts` 등 위반 후보를 정리하고, `shared`의 상향 import 금지 규칙을 lint에 추가.
  **Must NOT do**: 전체 폴더 대이동/네이밍 개편.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 경계 규칙/영향도 분석 필요
  - Skills: [`omc-reference`] — Reason: 규칙 기반 실행
  - Omitted: [`playwright`] — 정적 구조 검증 중심

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [9] | Blocked By: [6]

  **References**:
  - Pattern: `src/shared/lib/api-helpers.ts`
  - Pattern: `src/shared/config/constants.ts`
  - Pattern: `tsconfig.json`, `eslint.config.mjs`

  **Acceptance Criteria**:
  - [ ] `src/shared/**`에서 금지 방향 import 0건
  - [ ] lint/타입체크 통과

  **QA Scenarios**:
  ```
  Scenario: 경계 위반 탐지
    Tool: Grep
    Steps: shared에서 features/widgets/pages/app import 패턴 검색
    Expected: 매치 0건
    Evidence: .sisyphus/evidence/task-8-fsd-boundary.txt

  Scenario: 리팩터링 회귀
    Tool: Bash
    Steps: npm run build 실행
    Expected: import/타입 오류 없음
    Evidence: .sisyphus/evidence/task-8-fsd-boundary-error.txt
  ```

  **Commit**: YES | Message: `refactor(architecture): enforce shared boundary rules` | Files: [`src/shared/**`, `eslint.config.mjs`]

- [x] 9. 통합 회귀 검증 및 운영 점검 리포트

  **What to do**: 1~8 완료 후 빌드/핵심 사용자 플로우(결제, 구독조회, 트렌드, 분석, 설정) 수동 QA를 통합 실행하고 증거 리포트 작성.
  **Must NOT do**: 미해결 이슈를 임시로 숨기는 핫픽스.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 크로스도메인 통합 검증
  - Skills: [`playwright`] — Reason: 실제 플로우 검증
  - Omitted: [`frontend-ui-ux`] — 구현보다 검증 중심

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [] | Blocked By: [1,2,3,4,5,6,7,8]

  **References**:
  - Pattern: `src/app/(main)/pricing/page.tsx`, `src/app/(main)/settings/page.tsx`, `src/app/(main)/trends/page.tsx`
  - API: `src/app/api/subscription/route.ts`, `src/app/api/webhooks/paddle/route.ts`

  **Acceptance Criteria**:
  - [ ] 핵심 플로우에서 blocker급 오류 0건
  - [ ] 빌드/타입검사 통과 + 증거 파일 완비

  **QA Scenarios**:
  ```
  Scenario: 핵심 사용자 여정 E2E
    Tool: Playwright
    Steps: 로그인→분석→트렌드→결제 진입→설정 이동 플로우 실행
    Expected: 치명 오류/무한로딩/오작동 없음
    Evidence: .sisyphus/evidence/task-9-regression-e2e.png

  Scenario: 통합 빌드 검증
    Tool: Bash
    Steps: npm run build 실행
    Expected: 빌드 성공, 타입 오류 0
    Evidence: .sisyphus/evidence/task-9-regression-e2e-build.txt
  ```

  **Commit**: YES | Message: `chore(qa): finalize remediation verification evidence` | Files: [`.sisyphus/evidence/**`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- 결제 안정성/UX/에러 스키마/FSD를 분리 커밋하여 롤백 가능성 확보.
- 각 커밋은 단일 책임 원칙 유지 (`fix(payments)`, `perf(ux)`, `refactor(api)`, `refactor(architecture)`).

## Success Criteria
- 결제 이벤트 중복/부분 실패 리스크가 운영 로그 기준 허용수준으로 하락.
- 사용자 체감 로딩 개선(빈 화면/멈춤 감소).
- API 오류 처리 일관성 확보로 클라이언트 오류 메시지 품질 향상.
- FSD 경계 위반 재발 방지 규칙이 CI에서 검출됨.
