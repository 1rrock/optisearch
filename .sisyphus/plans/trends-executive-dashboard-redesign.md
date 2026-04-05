# Trends Executive Dashboard Redesign

## TL;DR
> **Summary**: `src/app/(main)/trends/page.tsx`를 Executive Dashboard 컨셉으로 전면 재구성하고, `new-keywords` 대량 데이터(예: 1000개)에서도 레이아웃이 깨지지 않도록 구조를 재설계한다.
> **Deliverables**:
> - Executive Dashboard 정보 구조(요약/핵심 분석/확장 데이터)
> - New Keywords: 일자별 Top 20 + 더보기(증분 확장) + 높이 제어
> - Wordcloud: 뒤집힘 없는 가독성 우선 + 겹침 완화 정책
> - 자동 검증 가능한 QA 시나리오 및 증거 파일
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2 → 3 → 6 → 9 → F1~F4

## Context
### Original Request
- trend 페이지를 지금과 다른 컨셉으로 전면 변경
- 신규 키워드 1000개 상황에서 화면 깨짐(무제한 길이 증가) 해결
- 워드클라우드 글자 겹침/가독성 문제 해결
- 문제 구간을 먼저 진단하고 수정 계획을 제시

### Interview Summary
- 컨셉 확정: **Executive Dashboard**
- 신규 키워드 정책 확정: **일자당 Top 20 + 더보기**
- 워드클라우드 정책 확정: **가독성 우선(회전 고정/겹침 완화/상한 적용)**

### Metis Review (gaps addressed)
- 범위 고정: `src/app/(main)/trends/page.tsx` 중심 UI/UX 재설계 (API 계약 변경은 선택사항)
- 대량 렌더 가드레일: New Keywords는 기본 Top 20 + 증분 확장 규칙 고정
- 워드클라우드 가드레일: deterministic + 0도 회전 + spacing/font/maxWords 정책 고정
- 검증 현실화: 단위/e2e 미구축이므로 `npm run lint`, `npm run build`, 명령형 수동 QA 시나리오를 필수화

## Work Objectives
### Core Objective
`trends` 페이지를 데이터 밀도와 가독성을 동시에 만족하는 Executive Dashboard로 재설계하고, 대량 데이터에서도 안정적으로 동작하게 만든다.

### Deliverables
- 섹션 재배치(요약 → 트렌드 분석 → 신규 키워드 → 시즌/보조 인사이트)
- 신규 키워드 섹션 레이아웃 폭주 방지(높이 제한/증분 확장)
- 워드클라우드 읽기 각도 고정 및 겹침 최소화
- 에이전트 실행형 QA 증거

### Definition of Done (verifiable conditions with commands)
- `npm run lint` 실행 시 기존 대비 신규 에러 0
- `npm run build` 성공(Exit code 0)
- `/trends` HTML 응답에 주요 섹션 타이틀 존재
- `GET /api/keywords/new?days=30` 응답에서 각 날짜 컬럼 초기 렌더가 Top 20 규칙을 따름(프론트 렌더 결과 기준)
- 워드클라우드 옵션이 회전 0도/상한 정책으로 고정됨

### Must Have
- Executive Dashboard 컨셉이 육안으로 명확히 구분될 정도의 구조 변경
- New Keywords는 대량 데이터에서도 페이지 전체 높이 폭주 없음
- Wordcloud 텍스트 뒤집힘 없음, 겹침 체감 완화

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- `src/app/(main)/trends/page.tsx` 밖으로 광범위 UI 리팩터 확장 금지
- API 스키마 변경/DB 쿼리 변경을 기본 경로로 사용 금지
- `--force`, 임시 하드코딩, 비검증 스타일 패치 금지

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: **tests-after** + existing scripts (`lint`, `build`)
- QA policy: 모든 TODO에 happy/failure 시나리오 포함
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.

Wave 1: 구조/정책 고정 (정보 구조, 상태 모델, 워드클라우드 정책, 신규키워드 규칙)
Wave 2: UI 구현 (레이아웃/섹션/토글/목록/클라우드 렌더 개선)
Wave 3: 안정화 (접근성/반응형/성능/검증/문서화)

### Dependency Matrix (full, all tasks)
- 1 blocks: 2,3,4,5,6,7
- 2 blocks: 8,9
- 3 blocks: 7
- 4 blocks: 8
- 5 blocks: 8
- 6 blocks: 9
- 7,8,9 block: 10,11,12
- 12 blocks: F1-F4

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 4 tasks → `ultrabrain`, `deep`, `quick`
- Wave 2 → 5 tasks → `visual-engineering`, `unspecified-high`, `quick`
- Wave 3 → 3 tasks → `unspecified-high`, `deep`, `writing`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Executive Dashboard 정보 구조 확정 및 섹션 순서 재정의

  **What to do**: `src/app/(main)/trends/page.tsx`의 현재 단일 흐름을 Executive Dashboard 구조(요약/핵심 분석/확장 인사이트)로 재배치하고, 섹션 간 시각적 위계(헤더/메타/보조설명)를 명시한다.
  **Must NOT do**: 기존 API 호출 계약 변경, 라우트 추가, 다른 페이지 스타일 변경.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` — Reason: 섹션 구조 재설계와 상태/렌더 영향도를 함께 판단해야 함
  - Skills: `[]` — 별도 스킬 없이 코드베이스 패턴 기반으로 충분
  - Omitted: `figma-strict-lock` — Figma 1:1 재현 과제가 아님

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5,6,7 | Blocked By: 없음

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `src/shared/ui/page-header.tsx` — 페이지 헤더 위계 패턴
  - Pattern: `src/app/(main)/ai/page.tsx` — 섹션 분리/탭형 정보구조 참고
  - Pattern: `src/app/(main)/trends/page.tsx` — 현재 전체 흐름 기준선

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/app/(main)/trends/page.tsx`에서 섹션 순서가 문서화된 Executive Dashboard 구조와 일치한다.
  - [ ] 기존 주요 기능(검색/기간/비교/하위 섹션)이 제거되지 않는다.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Dashboard 구조 반영 확인
    Tool: Bash
    Steps: npm run dev 후 curl -s "http://localhost:3000/trends"로 주요 섹션 타이틀 존재 확인
    Expected: 핵심 섹션 타이틀 문자열이 HTML에 모두 존재
    Evidence: .sisyphus/evidence/task-1-dashboard-structure.txt

  Scenario: 기능 누락 방지
    Tool: interactive_bash
    Steps: 브라우저에서 /trends 열고 검색/기간/비교 토글 상호작용 수행
    Expected: 기존 주요 인터랙션이 동작하고 런타임 에러가 없음
    Evidence: .sisyphus/evidence/task-1-dashboard-structure-error.txt
  ```

  **Commit**: YES | Message: `feat(trends): establish executive dashboard information architecture` | Files: `src/app/(main)/trends/page.tsx`

- [x] 2. 트렌드 상단 핵심 카드/컨트롤 디자인 컨셉 전환

  **What to do**: 검색/기간/비교 컨트롤을 Executive Dashboard 톤(명확한 카드 경계, 강조/보조 상태 대비, 밀도 조절)으로 재디자인한다.
  **Must NOT do**: 입력 로직/비즈니스 로직 변경.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: UI 스타일 시스템 일관성 중심 변경
  - Skills: `[]` — 내부 패턴 재사용이 핵심
  - Omitted: `omc-reference` — 구현에 직접 필요 없음

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8 | Blocked By: 1

  **References**:
  - Pattern: `src/app/(main)/shopping/page.tsx` — pill/filter 가시성 패턴
  - Pattern: `src/shared/ui/button.tsx` — 버튼 시각 변형 규칙
  - Pattern: `src/shared/ui/card.tsx` — 카드 베이스 규칙

  **Acceptance Criteria**:
  - [ ] 상단 컨트롤 영역의 active/inactive 상태가 시각적으로 즉시 구분된다.
  - [ ] 반응형(모바일/데스크톱)에서 컨트롤이 겹치거나 잘리지 않는다.

  **QA Scenarios**:
  ```
  Scenario: 컨트롤 상태 시인성 확인
    Tool: interactive_bash
    Steps: /trends에서 기간/뷰 토글을 전환하고 각 상태 캡처
    Expected: active/inactive 스타일이 명확히 분리되어 보임
    Evidence: .sisyphus/evidence/task-2-controls-visual.png

  Scenario: 좁은 화면 레이아웃 확인
    Tool: interactive_bash
    Steps: 모바일 뷰포트로 전환 후 컨트롤 영역 확인
    Expected: 텍스트/버튼 겹침 없음, 가로 스크롤 강제 없음
    Evidence: .sisyphus/evidence/task-2-controls-visual-error.png
  ```

  **Commit**: YES | Message: `feat(trends): redesign header controls for executive dashboard` | Files: `src/app/(main)/trends/page.tsx`

- [x] 3. New Keywords 렌더링 정책(Top 20 + 더보기) 상태 모델 구현

  **What to do**: 날짜 컬럼별 기본 표시를 Top 20으로 제한하고, 사용자 조작 시 증분 확장(예: +20)되는 상태 모델을 추가한다.
  **Must NOT do**: API 응답 스키마 변경.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` — Reason: 대량 데이터 상태/렌더 정책 설계 필요
  - Skills: `[]` — 내부 구현 중심
  - Omitted: `writing` — 문서 작업 아님

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7 | Blocked By: 1

  **References**:
  - Pattern: `src/app/(main)/bulk/page.tsx` — 대량 목록의 단계적 노출/탐색 패턴
  - API/Type: `src/app/api/keywords/new/route.ts` — 일자별 keywords 무제한 반환 계약
  - Pattern: `src/app/(main)/trends/page.tsx` — `NewKeywordsSectionWrapper` 현재 렌더 구조

  **Acceptance Criteria**:
  - [ ] 각 날짜 컬럼 초기 렌더 키워드 수가 정확히 20개 이하이다.
  - [ ] 더보기 1회 동작 시 해당 컬럼 표시 수가 정의된 step만큼 증가한다.

  **QA Scenarios**:
  ```
  Scenario: 초기 Top 20 정책 검증
    Tool: interactive_bash
    Steps: /trends 열고 New Keywords 컬럼에서 항목 수 확인
    Expected: 초기 표시 개수 <= 20
    Evidence: .sisyphus/evidence/task-3-newkeywords-top20.png

  Scenario: 더보기 증분 확장 검증
    Tool: interactive_bash
    Steps: 동일 컬럼에서 더보기 클릭 전/후 항목 수 비교
    Expected: 클릭 후 표시 개수가 증가하고 페이지 전체가 비정상 확장되지 않음
    Evidence: .sisyphus/evidence/task-3-newkeywords-top20-error.png
  ```

  **Commit**: YES | Message: `fix(trends): add top20-plus-more rendering policy for new keywords` | Files: `src/app/(main)/trends/page.tsx`

- [x] 4. New Keywords 컬럼 높이 제어 및 내부 스크롤 적용

  **What to do**: 날짜별 컬럼 컨테이너에 `max-height` + `overflow-y-auto`를 적용하여 대량 데이터에서도 카드 높이가 제어되도록 수정한다.
  **Must NOT do**: 가로 스크롤 구조 제거로 인한 컬럼 깨짐 유발.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: 레이아웃 안정화와 스크롤 UX 조정
  - Skills: `[]`
  - Omitted: `ultrabrain` — 복잡한 아키텍처 변경 아님

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8 | Blocked By: 1

  **References**:
  - Pattern: `src/shared/components/SearchInputWithHistory.tsx` — `max-h + overflow-y-auto` 패턴
  - Pattern: `src/app/(main)/analyze/page.tsx` — 내부 스크롤 컨테이너 패턴
  - Pattern: `src/app/(main)/trends/page.tsx` — 현재 `NewKeywordsSectionWrapper`

  **Acceptance Criteria**:
  - [ ] New Keywords 카드의 세로 높이가 제한되어 전체 페이지 길이 폭주가 발생하지 않는다.
  - [ ] 컬럼 내부 스크롤로 모든 데이터 접근이 가능하다.

  **QA Scenarios**:
  ```
  Scenario: 대량 데이터 높이 제어 확인
    Tool: interactive_bash
    Steps: /trends에서 키워드가 많은 날짜 컬럼 확인
    Expected: 카드 높이는 고정 범위, 내부만 스크롤
    Evidence: .sisyphus/evidence/task-4-newkeywords-overflow.png

  Scenario: 스크롤 접근성 확인
    Tool: interactive_bash
    Steps: 키보드/휠로 컬럼 내부 스크롤 탐색
    Expected: 데이터 탐색 가능, 외부 페이지 스크롤과 충돌 최소
    Evidence: .sisyphus/evidence/task-4-newkeywords-overflow-error.png
  ```

  **Commit**: YES | Message: `fix(trends): constrain new-keywords column height and internal scrolling` | Files: `src/app/(main)/trends/page.tsx`

- [x] 5. 워드클라우드 가독성 우선 옵션 고정

  **What to do**: `@cp949/react-wordcloud` 옵션을 readability-first로 고정한다(회전 0도, spacing 강화, 폰트 상한 제어, deterministic, maxWords).
  **Must NOT do**: 라이브러리 미지원 옵션 추가, 회전 각도 음수 사용.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 시각 품질 + 라이브러리 옵션 정확성 모두 필요
  - Skills: `[]`
  - Omitted: `figma-strict-lock` — 컴포넌트 렌더 옵션 문제

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8 | Blocked By: 1

  **References**:
  - External: `https://react-wordcloud.netlify.app/` — 옵션 키/동작 근거
  - Pattern: `src/app/(main)/trends/page.tsx` — `TrendingWordCloud` 현재 옵션 블록

  **Acceptance Criteria**:
  - [ ] `rotationAngles`가 읽기 가능한 각도(0도 고정)로 설정된다.
  - [ ] `maxWords`, `padding`, `fontSizes` 상한 정책이 적용되어 겹침 위험이 줄어든다.

  **QA Scenarios**:
  ```
  Scenario: 텍스트 뒤집힘 제거 확인
    Tool: interactive_bash
    Steps: /trends 워드클라우드 확인, 임의 단어 여러 개 육안 체크
    Expected: 뒤집힌/세로 회전 텍스트가 없음
    Evidence: .sisyphus/evidence/task-5-wordcloud-readable.png

  Scenario: 밀집도 스트레스 확인
    Tool: interactive_bash
    Steps: 데이터가 많은 상태에서 클라우드 렌더 확인
    Expected: 단어 중첩/잘림이 기존 대비 완화되고 클릭 상호작용 유지
    Evidence: .sisyphus/evidence/task-5-wordcloud-readable-error.png
  ```

  **Commit**: YES | Message: `fix(trends): enforce readability-first wordcloud policy` | Files: `src/app/(main)/trends/page.tsx`

- [x] 6. 워드클라우드 섹션 크기/레이아웃 재설계

  **What to do**: 클라우드 컨테이너 크기와 주변 랭킹 리스트 배치를 재설계해 시각적 여유를 확보하고 겹침 체감을 줄인다.
  **Must NOT do**: 랭킹 리스트 기능 제거.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: 공간 배치/균형 조정 중심
  - Skills: `[]`
  - Omitted: `deep` — 과도한 탐색 불필요

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9 | Blocked By: 1

  **References**:
  - Pattern: `src/app/(main)/trends/page.tsx` — 클라우드 + ranked list 결합 구조
  - Pattern: `src/app/(main)/compare/page.tsx` — 정보/표시 균형 레이아웃

  **Acceptance Criteria**:
  - [ ] 클라우드 영역이 충분한 높이/너비를 확보해 단어 가독성이 향상된다.
  - [ ] 클라우드/랭킹 리스트가 반응형에서 깨지지 않는다.

  **QA Scenarios**:
  ```
  Scenario: 데스크톱 레이아웃 확인
    Tool: interactive_bash
    Steps: /trends 데스크톱 해상도에서 클라우드/리스트 배치 확인
    Expected: 영역 분리 명확, 텍스트 잘림/겹침 감소
    Evidence: .sisyphus/evidence/task-6-wordcloud-layout.png

  Scenario: 모바일 반응형 확인
    Tool: interactive_bash
    Steps: 모바일 해상도에서 동일 섹션 확인
    Expected: 세로 스택 재배치 정상, 기능 접근 가능
    Evidence: .sisyphus/evidence/task-6-wordcloud-layout-error.png
  ```

  **Commit**: YES | Message: `feat(trends): expand and rebalance wordcloud section layout` | Files: `src/app/(main)/trends/page.tsx`

- [x] 7. 하단 대형 섹션(Trending/New/Seasonal) 네비게이션 구조화

  **What to do**: always-visible 누적 구조를 탭/아코디언/접기 기본값 중 하나로 구조화하여 페이지 길이를 통제한다(Executive Dashboard 톤 유지).
  **Must NOT do**: 섹션 데이터 자체를 삭제하거나 접근 불가능하게 만들지 말 것.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` — Reason: 정보 접근성과 페이지 길이 제어의 균형 필요
  - Skills: `[]`
  - Omitted: `quick` — 단순 스타일 변경 범위 초과

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 10,11 | Blocked By: 1,3

  **References**:
  - Pattern: `src/app/(main)/ai/page.tsx` — 탭/섹션 전환 정보구조
  - Pattern: `src/app/(main)/trends/page.tsx` — 항상 렌더되는 3개 섹션

  **Acceptance Criteria**:
  - [ ] 초기 진입 시 전체 페이지 길이가 기존 대비 유의미하게 감소한다.
  - [ ] 사용자 액션으로 모든 하위 섹션 접근이 가능하다.

  **QA Scenarios**:
  ```
  Scenario: 초기 페이지 길이 확인
    Tool: interactive_bash
    Steps: /trends 최초 진입 후 스크롤 길이 체감 및 섹션 노출 범위 확인
    Expected: 초기 노출 밀도 개선, 불필요한 장거리 스크롤 완화
    Evidence: .sisyphus/evidence/task-7-section-navigation.png

  Scenario: 섹션 접근성 확인
    Tool: interactive_bash
    Steps: 탭/아코디언 전환으로 Trending/New/Seasonal 각각 접근
    Expected: 각 섹션 콘텐츠 손실 없이 접근 가능
    Evidence: .sisyphus/evidence/task-7-section-navigation-error.png
  ```

  **Commit**: YES | Message: `feat(trends): structure lower insight sections for controlled page depth` | Files: `src/app/(main)/trends/page.tsx`

- [x] 8. 트렌드 차트/인구통계 카드 시각 통일 및 밀도 최적화

  **What to do**: 차트/인구통계 카드의 간격/테두리/타이포/메타텍스트를 Executive Dashboard 톤으로 통일해 컨셉 일관성을 완성한다.
  **Must NOT do**: 차트 데이터 계산 로직 변경.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: 스타일 일관성 및 정보 밀도 조정
  - Skills: `[]`
  - Omitted: `ultrabrain` — 로직 복잡도 낮음

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 2,4,5

  **References**:
  - Pattern: `src/app/(main)/dashboard/page.tsx` — 카드 헤더/메타 정보 구획
  - Pattern: `src/app/(main)/shopping/page.tsx` — 차트/필터 시각 조합
  - Pattern: `src/app/(main)/trends/page.tsx` — `TrendLineChart`, demographics 카드

  **Acceptance Criteria**:
  - [ ] 차트/인구통계 카드의 시각 스타일이 페이지 전반과 일관된다.
  - [ ] 텍스트 대비/아이콘 계층이 명확하다.

  **QA Scenarios**:
  ```
  Scenario: 스타일 일관성 확인
    Tool: interactive_bash
    Steps: /trends에서 상단/중단/하단 카드 시각 톤 비교
    Expected: 카드 시스템이 통일되어 이질감이 없음
    Evidence: .sisyphus/evidence/task-8-card-consistency.png

  Scenario: 가독성 회귀 확인
    Tool: interactive_bash
    Steps: 다크/라이트 모드(가능 시)에서 텍스트 대비 확인
    Expected: 메타 텍스트/라벨 판독 가능
    Evidence: .sisyphus/evidence/task-8-card-consistency-error.png
  ```

  **Commit**: YES | Message: `feat(trends): unify chart and demographics visual system` | Files: `src/app/(main)/trends/page.tsx`

- [x] 9. 반응형/접근성 하드닝(핵심 인터랙션)

  **What to do**: 토글/버튼/테이블/리스트의 반응형 깨짐과 접근성 라벨을 점검 및 보강한다.
  **Must NOT do**: 기능 의미를 바꾸는 인터랙션 재정의.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: UI 안정성과 접근성 품질 게이트
  - Skills: `[]`
  - Omitted: `writing` — 문서보다 구현 중심

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 6,7

  **References**:
  - Pattern: `src/shared/components/SearchInputWithHistory.tsx` — role/aria 활용 사례
  - Pattern: `src/app/(main)/trends/page.tsx` — 기존 `aria-label` 포인트

  **Acceptance Criteria**:
  - [ ] 주요 컨트롤에 식별 가능한 aria/role 단서가 유지 또는 강화된다.
  - [ ] 모바일/태블릿/데스크톱에서 레이아웃 붕괴 없음.

  **QA Scenarios**:
  ```
  Scenario: 접근성 단서 확인
    Tool: Bash
    Steps: rendered HTML에서 주요 aria-label/role 문자열 검색
    Expected: 핵심 조작 요소 식별 단서 존재
    Evidence: .sisyphus/evidence/task-9-a11y-check.txt

  Scenario: 반응형 회귀 확인
    Tool: interactive_bash
    Steps: 3개 뷰포트에서 컨트롤/테이블/리스트 배치 확인
    Expected: 요소 겹침/잘림/불가시 영역 없음
    Evidence: .sisyphus/evidence/task-9-a11y-check-error.png
  ```

  **Commit**: YES | Message: `fix(trends): harden responsive and accessibility behavior` | Files: `src/app/(main)/trends/page.tsx`

- [x] 10. 코드 구조 정리(섹션 컴포넌트 분리 가능한 최소 단위)

  **What to do**: `trends/page.tsx`의 과도한 단일 파일 구조를 기능 보존 전제로 내부 섹션 단위로 정리(파일 분리 또는 명확한 내부 분할)한다.
  **Must NOT do**: 대규모 아키텍처 변경으로 범위 확장.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 유지보수성 개선과 회귀 리스크 균형 필요
  - Skills: `[]`
  - Omitted: `visual-engineering` — 주목표가 구조 안정성

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 11,12 | Blocked By: 7,8,9

  **References**:
  - Pattern: `src/app/(main)/trends/page.tsx` — 현재 단일 대형 파일 구조
  - Pattern: `src/shared/ui/*` — 공용 컴포넌트 재사용 기준

  **Acceptance Criteria**:
  - [ ] 코드 가독성과 섹션 경계가 명확해진다.
  - [ ] 동작 회귀 없이 lint/build를 통과한다.

  **QA Scenarios**:
  ```
  Scenario: 구조 정리 후 기능 보존 확인
    Tool: Bash
    Steps: npm run lint && npm run build
    Expected: 성공 종료, 신규 에러 없음
    Evidence: .sisyphus/evidence/task-10-structure-refactor.txt

  Scenario: 상호작용 회귀 확인
    Tool: interactive_bash
    Steps: 검색/기간 변경/뷰 전환/더보기 동작 재검증
    Expected: 이전 단계와 동등 기능 유지
    Evidence: .sisyphus/evidence/task-10-structure-refactor-error.png
  ```

  **Commit**: YES | Message: `refactor(trends): improve section boundaries and maintainability` | Files: `src/app/(main)/trends/page.tsx`, `src/app/(main)/trends/* (if extracted)`

- [x] 11. 성능/렌더 안정화(불필요 재렌더 및 대량 리스트 비용)

  **What to do**: 대량 키워드 렌더 시 재연산/재렌더를 줄이기 위해 필요한 메모이제이션/키 안정화/파생값 계산 정리를 적용한다.
  **Must NOT do**: 체감 동작을 바꾸는 공격적 최적화.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: UI 성능 최적화의 정밀 조정 필요
  - Skills: `[]`
  - Omitted: `quick` — 단순 변경 아님

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 12 | Blocked By: 10

  **References**:
  - Pattern: `src/app/(main)/trends/page.tsx` — 정렬/맵/토글 파생 렌더 구간
  - API/Type: `src/app/api/keywords/new/route.ts` — 대량 데이터 입력 가능성 근거

  **Acceptance Criteria**:
  - [ ] 대량 데이터 상태에서 상호작용(더보기/토글) 시 프레임 드랍 체감이 완화된다.
  - [ ] 렌더 관련 콘솔 에러/경고가 새로 발생하지 않는다.

  **QA Scenarios**:
  ```
  Scenario: 대량 데이터 상호작용 성능 확인
    Tool: interactive_bash
    Steps: 데이터 많은 상태에서 더보기/토글 반복
    Expected: UI 응답 지연이 허용 범위, 동작 끊김 없음
    Evidence: .sisyphus/evidence/task-11-render-performance.png

  Scenario: 콘솔 안정성 확인
    Tool: interactive_bash
    Steps: 동일 시나리오 중 브라우저 콘솔 확인
    Expected: 신규 에러/중대한 경고 없음
    Evidence: .sisyphus/evidence/task-11-render-performance-error.txt
  ```

  **Commit**: YES | Message: `perf(trends): stabilize heavy-list rendering and interactions` | Files: `src/app/(main)/trends/page.tsx`

- [x] 12. 검증 실행 및 증거 패키징

  **What to do**: 계획된 lint/build/수동 QA 시나리오를 실행하고 `.sisyphus/evidence/`에 증거를 수집해 최종 검증 파트를 완성한다.
  **Must NOT do**: 검증 생략 또는 구두 보고만 수행.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 검증 누락 없이 종합 체크 필요
  - Skills: `[]`
  - Omitted: `writing` — 설명보다 실행/증거 수집 우선

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: F1-F4 | Blocked By: 8,9,10,11

  **References**:
  - Pattern: `package.json` — `lint`, `build` 실행 기준
  - Pattern: `src/app/(main)/trends/page.tsx` — 검증 대상 UI
  - API/Type: `src/app/api/keywords/new/route.ts` — 대량 데이터 조건 근거

  **Acceptance Criteria**:
  - [ ] `npm run lint`와 `npm run build` 결과 로그가 증거 파일로 남는다.
  - [ ] 핵심 UI 시나리오(컨셉/Top20+more/wordcloud) 증거가 모두 존재한다.

  **QA Scenarios**:
  ```
  Scenario: 자동 검증 명령 실행
    Tool: Bash
    Steps: npm run lint && npm run build
    Expected: 명령 성공(또는 기존 이슈와 신규 이슈 구분 보고)
    Evidence: .sisyphus/evidence/task-12-validation.log

  Scenario: 기능별 실사용 확인
    Tool: interactive_bash
    Steps: /trends에서 핵심 플로우 전부 실행 후 캡처/로그 수집
    Expected: 사용자 요청 3대 이슈(컨셉/신규키워드/워드클라우드) 모두 해결 확인
    Evidence: .sisyphus/evidence/task-12-validation-error.log
  ```

  **Commit**: YES | Message: `chore(trends): capture verification evidence for redesign rollout` | Files: `.sisyphus/evidence/*`, `src/app/(main)/trends/page.tsx`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: `feat(trends): establish executive dashboard structure`
- Commit 2: `fix(trends): constrain new-keywords rendering for large datasets`
- Commit 3: `fix(trends): harden wordcloud readability and overlap policy`
- Commit 4: `chore(trends): finalize responsive/accessibility and QA evidence`

## Success Criteria
- 사용자 피드백 기준 “기존과 다른 컨셉” 충족
- 1000건 수준 데이터에서도 New Keywords 섹션이 페이지를 파괴하지 않음
- 워드클라우드 텍스트 가독성(회전/겹침) 이슈 재현 불가
- lint/build/수동 QA 증거가 모두 수집됨
