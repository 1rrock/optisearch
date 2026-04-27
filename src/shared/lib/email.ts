interface RankChangeEmailInput {
  to: string;
  keyword: string;
  storeId: string;
  previousRank: number;
  currentRank: number;
  checkedAt: string;
}

function shouldSendEmail(): boolean {
  return process.env.RANK_ALERT_EMAIL_ENABLED === "true";
}

function getRequiredEmailEnv() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RANK_ALERT_EMAIL_FROM;

  if (!apiKey || !from) {
    return null;
  }

  return { apiKey, from };
}

export async function sendRankChangeEmail(input: RankChangeEmailInput): Promise<{ sent: boolean; reason?: string }> {
  if (!shouldSendEmail()) {
    return { sent: false, reason: "email_disabled" };
  }

  const env = getRequiredEmailEnv();
  if (!env) {
    return { sent: false, reason: "email_env_missing" };
  }

  const rankText = input.currentRank === 0 ? "TOP100 밖" : `${input.currentRank}위`;
  const previousText = input.previousRank === 0 ? "TOP100 밖" : `${input.previousRank}위`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.from,
      to: [input.to],
      subject: `[옵티써치] '${input.keyword}' 순위 변동 알림`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height:1.6; color:#111;">
          <h2 style="margin:0 0 12px;">내 상품 순위 변동 알림</h2>
          <p style="margin:0 0 8px;"><strong>키워드:</strong> ${input.keyword}</p>
          <p style="margin:0 0 8px;"><strong>스토어:</strong> ${input.storeId}</p>
          <p style="margin:0 0 8px;"><strong>변동:</strong> ${previousText} → ${rankText}</p>
          <p style="margin:0; color:#666;"><small>기준 시각: ${input.checkedAt}</small></p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[email] resend error", response.status, body);
    return { sent: false, reason: "email_send_failed" };
  }

  return { sent: true };
}
