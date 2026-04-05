## 2026-04-04
- Decision: Executive Dashboard 3단 구조를 `요약 → 핵심 분석 → 확장 인사이트`로 고정하고, 기존 단일 흐름 요소를 해당 섹션으로 이동했다.
  - Rationale: 후속 Task 2~7의 기준 프레임을 먼저 명확히 만들고, 사용자에게 분석 단계의 인지 부하를 줄이기 위함.

- Decision: 상단 내비게이션은 별도 탭 상태(state) 없이 앵커(`#trends-summary`, `#trends-core-analysis`, `#trends-extended-insights`) 기반으로 구현했다.
  - Rationale: 기존 데이터/이벤트 계약을 건드리지 않으면서 섹션 순서 재정의 요구를 가장 안전하게 만족한다.

- Decision: 주요 검증은 `npm run dev` + curl 타이틀 확인 + 브라우저 앵커 상호작용 오류 점검으로 구성했다.
  - Rationale: 요구된 수용 기준(주요 섹션 타이틀 존재 및 인터랙션 에러 부재)을 직접적으로 증명할 수 있다.
