# OptiSearch PayApp 결제 시스템 아키텍처 및 코드 리뷰 리포트

**작성일**: 2026-04-20  
**검토 대상**: PayApp 결제 연동 아키텍처 및 관련 코드베이스 (`webhook`, `cron`, `cancel`, `payapp.ts` 등)

Oracle(아키텍처 검토) 및 Deep(코드 구현 검토) 에이전트를 병렬로 실행하여 결제 아키텍처와 관련 코드베이스를 전면적으로 검토했습니다. 보상 큐(compensation queue)와 멱등성(idempotency) 방어 로직을 활용한 전반적인 아키텍처 설계는 훌륭하지만, **REST API의 부분 업데이트 한계(트랜잭션 부재)와 모호한 날짜 처리 로직으로 인해 발생하는 몇 가지 치명적인 데이터 유실 취약점, 엣지 케이스, 그리고 경쟁 상태(Race condition)**를 발견했습니다.

---

## 🚨 1. 치명적인 데이터 유실 및 복구 불가능 상태 (부분 실패)

### [심각] Webhook의 데드 복구 경로 (`route.ts`)
*   **버그**: 활성화 실패 시 웹훅이 `failed_compensations` 행을 정상적으로 큐에 넣지만, 페이로드에 `userId`를 포함하는 것을 누락했습니다.
*   **영향**: Cron 재시도 작업이 "invalid payload: userId missing" 에러와 함께 무한히 실패합니다. 이 데이터들은 절대 자동으로 복구되지 않습니다.

### [심각] 해지 실패 시 PayApp에 남는 좀비 카드 (`cancel/route.ts`)
*   **버그**: `/subscription/cancel` 라우트에서 PayApp으로의 `billDelete` API 호출이 실패할 경우(예: 일시적 네트워크 오류), 코드는 에러만 로그로 남기고 DB에서 `bill_key`를 지운 뒤 상태를 `stopped`로 변경해버립니다.
*   **영향**: 삭제를 재시도하는 데 필요한 키를 잃게 됩니다. 사용자의 카드는 PayApp에 영구적으로 등록되어 결제 가능한 상태로 남게 되며, 시스템에서 이를 정리할 방법이 없어집니다.

### [심각] 전체 처리 완료 전 멱등성 토큰 소비 (`webhook/route.ts`)
*   **버그**: 웹훅이 `webhook_events` 테이블에 먼저 데이터를 삽입합니다. 이후 DB 쓰기(`payment_history` 또는 `subscriptions`)가 실패하더라도 웹훅은 PayApp에 `SUCCESS`를 반환합니다.
*   **영향**: PayApp은 해당 웹훅을 다시 시도하지 않습니다. 결제가 성공했음에도 불구하고 이벤트가 영구적으로 유실되어 사용자는 구독이 활성화되지 않은 상태로 남게 됩니다.

---

## ⏱️ 2. 타임존 및 날짜 계산 버그

### [심각] KST 타임존 절사(Truncation) 버그 (`payapp.ts`)
*   **버그**: `new Date().toISOString().slice(0,10)`는 UTC를 사용합니다. KST 기준 00:00부터 09:00 사이에는 **이전 날짜**를 반환하게 됩니다.
*   **영향**: PayApp은 KST에 해당하는 정확한 YYYY-MM-DD를 엄격하게 요구합니다. 이 버그는 경계 시간대에 불일치를 유발하여, 오전(KST)에 결제하는 사용자에게 이중 청구, 지연 청구 또는 조기 만료를 초래할 수 있습니다.

### [중간] 혼재된 날짜 의미론(Semantics)
*   **버그**: `last_charged_at` (UTC 날짜)가 종종 `todayKST` (KST 날짜)와 직접 비교되는 로직이 존재하여 경계 시간대 버그의 원인이 됩니다.

---

## ⚠️ 3. 경쟁 상태 및 동시성 (Cron & Webhook)

### [심각] Cron에서 `billPay` 타임아웃의 안전하지 않은 처리
*   **버그**: `callApi` 래퍼(wrapper)는 15초 후 타임아웃(abort)됩니다. 타임아웃이 발생하면 Cron은 이를 실패로 간주하고 `failed_charge_count`를 증가시킨 뒤 재시도를 예약합니다.
*   **영향**: **이중 청구 위험**. PayApp 측에서는 실제로 결제를 처리했을 수도 있습니다. 성공 여부 확인 없이 다음 날 자동 재시도를 하면 사용자에게 결제 금액이 두 번 청구됩니다.

### [심각] 결함이 있는 순서 뒤바뀜(Out-Of-Order) 환불 방어 로직 (`webhook/route.ts`)
*   **버그**: 지연된 "SUCCESS" 웹훅이 해지된 구독을 다시 활성화하는 것을 막기 위해 코드는 `paid_at > webhookReceivedAt(now)`인지 확인합니다.
*   **영향**: `paid_at`은 데이터 삽입 시점에 생성되므로 **절대** `now()`보다 클 수 없습니다. 오래된 성공 웹훅이 이 방어 로직을 쉽게 우회하여 해지된 계정을 다시 활성화할 수 있습니다.

### [중간] Cron 동시 실행 겹침
*   **버그**: `failed_compensations` 루프는 미해결 행을 `select`한 다음 순차적으로 `update`합니다. 
*   **영향**: 동시에 Cron이 실행되면(예: Vercel 재시도 + 수동 트리거) 동일한 행을 두 번 처리하여 PayApp을 중복 호출할 수 있습니다.

---

## 🛠️ 4. 구체적인 개선 제안 (Action Items)

### 1. 데드 복구 경로 및 좀비 카드 수정
*   **웹훅 페이로드 수정**: 웹훅의 보상 페이로드에 `userId`를 명시적으로 추가합니다. (`payload: { userId, plan: planFromVar1, periodEnd: periodEndStr, price }`)
*   **좀비 카드 방지**: `cancel/route.ts`에서 `billDelete`가 실패할 경우 단순히 로그만 남기지 않고, Cron을 통해 삭제를 재시도할 수 있도록 `failed_compensations` 행(`step: "bill_delete"`)을 삽입합니다.

### 2. 타임존 로직 수정 (KST)
*   **표준화**: 문자열 자르기(slice) 전에 +9시간 오프셋을 적용하여 모든 날짜 문자열 생성을 표준화합니다.
    ```typescript
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
    ```

### 3. 우아한 웹훅 롤백 및 멱등성 보장
*   **에러 핸들링**: Supabase REST API는 트랜잭션을 지원하지 않으므로, `webhook/route.ts`의 `catch` 블록에서 에러가 발생하면 `webhook_events` 테이블에서 해당 `mul_no`를 삭제하고 `500` 에러를 반환하여 PayApp이 나중에 안전하게 재시도할 수 있도록 합니다.

### 4. 순서 뒤바뀜 환불 방어 로직 수정
*   **검증 로직 변경**: `paid_at` 생성 타임스탬프를 비교하는 대신, 트랜잭션 식별자(`mul_no`)로 직접 비교하거나, 구독의 `stopped_reason`이 이미 `user_cancelled` 또는 `refunded`인지 명시적으로 확인하는 방식으로 변경합니다.

### 5. 타임아웃 시 이중 청구 방지 (인텐트 레코드)
*   **결제 시도 기록**: `billPay`를 호출하기 전에 명시적인 "결제 시도(Intent Record)" 테이블(예: `payment_attempts`)을 도입합니다.
*   **안전한 재시도**: `callApi`가 타임아웃될 경우 보상 기록을 명시적으로 `[TIMEOUT_RISK_OF_DOUBLE_CHARGE]`로 표시하고, PayApp 결제 내역을 조회하여 실제 결제 여부를 확인하기 전까지는 자동 재시도를 차단합니다.

### 6. 데이터베이스 원자성 확보 (장기적 개선)
*   **RPC 도입**: `payment_history`, `subscriptions`, `failed_compensations` 간의 데이터 불일치를 완전히 제거하기 위해 웹훅의 비즈니스 로직을 단일 PostgreSQL RPC로 이동시켜 원자적 롤백/커밋을 보장합니다.
