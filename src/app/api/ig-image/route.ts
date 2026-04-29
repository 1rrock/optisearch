import { writeFile } from "fs/promises";
import { join } from "path";

/**
 * POST /api/ig-image
 * 로컬 마케팅 루틴에서 Instagram용 카드 이미지를 업로드하고 공개 URL을 반환합니다.
 * Body: { secret: string, image: string (base64), filename: string }
 */
export async function POST(request: Request) {
  const secret = process.env.INSTAGRAM_UPLOAD_SECRET;
  if (!secret) {
    return Response.json({ error: "INSTAGRAM_UPLOAD_SECRET 미설정" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.secret !== secret) {
    return Response.json({ error: "인증 실패" }, { status: 401 });
  }

  const { image, filename } = body as { image: string; filename: string };
  if (!image || !filename) {
    return Response.json({ error: "image, filename 필수" }, { status: 400 });
  }

  // base64 디코딩 후 public/ig/ 에 저장
  const buffer = Buffer.from(image, "base64");
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filePath = join(process.cwd(), "public", "ig", safeName);
  await writeFile(filePath, buffer);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://optisearch.kr";
  const url = `${baseUrl}/ig/${safeName}`;

  return Response.json({ url });
}
