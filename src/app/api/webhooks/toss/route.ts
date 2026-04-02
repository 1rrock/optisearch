export async function POST(request: Request) {
  try {
    const body = await request.json();

    // TODO: Verify webhook signature
    // For now, just log and return 200
    console.log("[Toss Webhook]", body.eventType, body);

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
