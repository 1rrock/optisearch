/**
 * Resend 이메일 전송 테스트 스크립트
 * 사용법: npx tsx scripts/test-resend.ts
 *
 * 실행 전 .env.local에서 설정:
 *   RESEND_API_KEY=re_...
 *   RANK_ALERT_EMAIL_FROM=alerts@yourdomain.com
 */

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RANK_ALERT_EMAIL_FROM;
const to = process.env.TEST_EMAIL || "zxcv1685@gmail.com";

if (!apiKey || !from) {
  console.error("❌ RESEND_API_KEY 또는 RANK_ALERT_EMAIL_FROM 환경변수가 설정되지 않았습니다.");
  console.error("   .env.local을 확인하세요.");
  process.exit(1);
}

async function main() {
  console.log(`📧 테스트 이메일 발송 중...`);
  console.log(`   From: ${from}`);
  console.log(`   To: ${to}`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "[옵티써치] Resend 연동 테스트 이메일",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height:1.6; color:#111; padding:24px;">
          <h2 style="margin:0 0 12px; color:#2563eb;">✅ Resend 연동 성공!</h2>
          <p style="margin:0 0 8px;">이 이메일은 옵티써치 Resend 연동 테스트입니다.</p>
          <p style="margin:0 0 8px;"><strong>테스트 항목:</strong> 순위 변동 알림 이메일</p>
          <hr style="margin:16px 0; border:none; border-top:1px solid #e5e7eb;" />
          <p style="margin:0 0 4px; color:#666;"><small>발송 시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</small></p>
          <p style="margin:0; color:#666;"><small>From: ${from}</small></p>
        </div>
      `,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (response.ok) {
    console.log(`✅ 성공! 이메일 ID: ${(body as { id?: string }).id}`);
    console.log(`   ${to}로 이메일을 확인하세요.`);
  } else {
    console.error(`❌ 실패 (${response.status}):`, body);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("❌ 오류:", e);
  process.exit(1);
});
