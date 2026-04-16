import { createServerClient } from "@/shared/lib/supabase";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const baseUrl = "https://www.optisearch.kr";

  try {
    const supabase = await createServerClient();

    const { data: trends, error } = await supabase
      .from("keyword_trend_daily")
      .select("keyword, news_title, news_link, recorded_date, composite_score")
      .order("recorded_date", { ascending: false })
      .order("composite_score", { ascending: false })
      .limit(50);

    if (error) throw error;

    const items = (trends ?? []).map((item) => {
      const title = escapeXml(item.news_title || `${item.keyword} 트렌드 분석`);
      const link = item.news_link || `${baseUrl}/trends/analysis?keyword=${encodeURIComponent(item.keyword)}`;
      const guid = `${baseUrl}/trends/analysis?keyword=${encodeURIComponent(item.keyword)}&date=${item.recorded_date}`;
      const pubDate = new Date(item.recorded_date + "T00:00:00+09:00").toUTCString();
      const description = escapeXml(`${item.keyword}의 최신 검색 트렌드와 관련 뉴스를 확인하세요.`);

      return [
        "<item>",
        `<title>${title}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid isPermaLink="true">${escapeXml(guid)}</guid>`,
        `<pubDate>${pubDate}</pubDate>`,
        `<description>${description}</description>`,
        "</item>",
      ].join("\n");
    });

    const now = new Date().toUTCString();

    const rss = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      "<channel>",
      "<title>OptiSearch 트렌드 피드</title>",
      `<link>${baseUrl}</link>`,
      "<description>최신 검색 트렌드와 인기 키워드 분석 리포트</description>",
      "<language>ko</language>",
      `<lastBuildDate>${now}</lastBuildDate>`,
      `<atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
      ...items,
      "</channel>",
      "</rss>",
    ].join("\n");

    return new Response(rss, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    console.error("[rss.xml] Error generating RSS:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
