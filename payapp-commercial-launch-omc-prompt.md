# OptiSearch PayApp 상용 런칭용 OMC 마스터 프롬프트

## 추천 판단

지금 상태는 **바로 개발만 시키는 것보다, 계획 확정 → 구현 → 검증 → 상용 출시 판정까지 한 번에 강제하는 방식**이 더 안전합니다.

따라서 추천 엔트리포인트는 아래입니다.

```text
/oh-my-claudecode:autopilot
```

아래 프롬프트를 그대로 붙여넣어 실행하세요.

---

## 복붙용 프롬프트

```text
You are executing the final commercial-hardening pass for the OptiSearch PayApp subscription/payment system.

Goal: make this payment system commercially launchable, not just “working in dev”. You must first improve and lock the plan, then implement, then verify, then give a go/no-go launch verdict. Do not stop at partial fixes.

### Source of truth you MUST read first
1. Official PayApp docs entry:
   - https://docs.payapp.kr/dev_center01.html
2. PayApp linked docs relevant to this repo:
   - getting started / payment request / webhook / subscription / cancellation-refund docs
3. Local repo files:
   - `payapp-audit-report.md`
   - `src/app/api/payments/payapp/**`
   - `src/app/api/subscription/**`
   - `src/app/api/cron/billing/route.ts`
   - `src/shared/lib/payapp.ts`
   - `src/proxy.ts`
   - `src/app/(legal)/terms/page.tsx`
   - `src/app/(legal)/support/page.tsx`
   - `vercel.json`
   - `supabase/migrations/*payapp*`
   - `supabase/migrations/*webhook*`
   - `supabase/migrations/*subscription*`

If `payapp-payment-system-context.md` exists, read that too. If it does not exist, continue with the files above.

### Required OMC workflow
Use OMC/Oh-My-ClaudeCode workflow in this exact order:
1. `/oh-my-claudecode:omc-plan`
   - Build the final implementation plan from the code + docs + audit findings.
   - Do not write code until the plan is concrete, file-targeted, and commercially sufficient.
2. Critique the plan before coding.
   - Use the strongest available plan/design review lane (`critic`, `verifier`, or equivalent OMC review step).
   - Challenge missing scenarios, migration drift, operational gaps, legal/policy mismatches, and rollback safety.
3. Execute the approved plan.
   - Use parallel work where safe.
   - Do not leave partially fixed flows.
4. Run a full verification loop.
   - `lsp_diagnostics`
   - targeted tests
   - build
   - manual QA of the actual payment-related behavior that can be tested locally
5. Final launch-readiness verdict.
   - If any commercial blocker remains, say `NO-GO` and list exact blockers.
   - If commercially safe, say `GO` and explain why.

### Non-negotiable success criteria
The task is NOT complete until all of the following are true:

1. **Unsafe activation paths are closed**
   - No client-supplied or return-url-only path may activate paid access without PayApp-backed proof.
   - If `activate-from-return` is unsafe, fix it or disable/remove it.

2. **First charge and entitlement are deterministic**
   - A new paid signup must not depend on a once-daily cron in a way that leaves the user unpaid-but-pending or activated-without-charge.
   - Choose one commercially correct behavior and implement it completely:
     - either immediate first charge after bill-key registration,
     - or explicit delayed activation with matching product/legal UX.
   - Do not leave the current ambiguous middle state.

3. **Webhook and idempotency are commercially safe**
   - Fix migration drift around `webhook_events`.
   - Make webhook processing reproducible on a clean database.
   - Do not dedupe only on `mul_no` if that can drop later lifecycle events such as cancel/refund/failure.
   - Use a safer event identity model, such as `(mul_no, pay_state, purpose)` or a provider event key if available.

4. **Partial-failure handling is real, not cosmetic**
   - No more “log error and still return SUCCESS” if that can permanently lose state.
   - Every inserted `failed_compensations.step` must have one of:
     - a working retry path,
     - a safe escalation path,
     - or the step must be removed.
   - Remove dead compensation paths and payload mismatches.

5. **Timeout ambiguity is handled safely**
   - `billPay` timeout/exception must not silently create double-charge risk.
   - Add a durable payment-attempt/intention layer if needed.
   - If PayApp does not provide a reliable status lookup for ambiguous attempts, never auto-retry ambiguous attempts blindly. Force reconciliation/manual review before retry.

6. **Cancel / refund / upgrade logic matches real business rules**
   - Ensure cancel/refund logic does not accidentally refund the wrong payment row.
   - Ensure stopped basic → pro / upgrade_diff / legacy rebill paths are not under-charged or over-charged.
   - Ensure refund policy implementation matches what the legal pages promise.

7. **KST and billing date handling are consistent**
   - Remove UTC/KST drift in billing, entitlement, and retry dates.
   - Re-check cron schedule assumptions versus KST.

8. **Operations and auditability are sufficient for launch**
   - Add or improve minimum production controls:
     - cron freshness visibility
     - unresolved compensation backlog visibility
     - old `pending_billing` visibility
     - webhook failure visibility
   - Preserve a trustworthy payment/audit trail.

### Known high-risk areas you must explicitly review and resolve
You must not skip these because they were already identified in prior review:

- `activate-from-return` activation bypass risk
- `register-billkey` first-charge timing problem
- `webhook_events` migration/schema conflict
- webhook duplicate/lifecycle-event handling
- `billDelete` failure leaving external billing state alive
- missing/invalid compensation payloads such as `webhook_activation_update`
- timeout after charge claim in cron
- refund basis accidentally using the wrong payment record
- legacy `rebill_no` upgrade flow mismatch with preview/pro-rated logic
- KST boundary issues in `payapp.ts` and billing routes

### Implementation constraints
- No `as any`
- No `@ts-ignore`, `@ts-expect-error`
- No fake/demo/skeleton fixes
- No deleting tests to pass CI
- No silent swallow of financially meaningful failures
- No git push
- No unsafe backward compatibility if it keeps a paid-access hole alive

### Verification requirements
Before claiming completion, you must do all of these:

1. Run `lsp_diagnostics` on every changed file.
2. Run targeted tests for changed payment logic.
3. Add/adjust tests for at least these scenarios if coverage is missing:
   - duplicate webhook delivery
   - success then cancel/refund ordering
   - timeout/ambiguous `billPay`
   - first signup charge + entitlement flow
   - `billDelete` failure recovery
   - KST boundary date handling
   - concurrent registration/request race
4. Run the relevant build/typecheck.
5. Perform manual QA for the actual changed behavior and report observed results, not assumptions.

### Final deliverable format
At the end, provide:
1. What changed
2. Why those changes were necessary for commercial launch
3. What was verified (with commands/results)
4. Remaining blockers, if any
5. Final verdict: `GO` or `NO-GO`

If you discover that commercial safety cannot be achieved without a product/business decision, stop and ask exactly one precise question with the narrowest possible decision surface.

Do not optimize for speed. Optimize for commercial safety, auditability, and correctness.
```

---

## 사용 메모

- 이 프롬프트는 **계획 개선부터 구현까지 한 번에** 시키는 용도입니다.
- 핵심은 “지금 있는 구멍을 땜질”이 아니라, **상용 결제 시스템 기준으로 마지막 하드닝**을 끝내게 하는 것입니다.
- 실행 후 결과가 `GO`가 아니면 그대로 배포하지 마세요.
