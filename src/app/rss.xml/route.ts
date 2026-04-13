import { createServerClient } from "@/shared/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = "https://www.optisearch.kr";
  
  try {
    const supabase = await createServerClient();
    
    // Fetch latest trending keywords
    const { data: trends, error } = await supabase
      .from("keyword_trend_daily")
      .select("keyword, news_title, news_link, recorded_date, composite_score")
      .order("recorded_date", { ascending: false })
      .order("composite_score", { ascending: false })
      .limit(50);

    if (error) throw error;

    const rssItems = trends.map((item) => {
      const title = item.news_title || `${item.keyword} 트렌드 분석`;
      const link = item.news_link || `${baseUrl}/trends/analysis?keyword=${encodeURIComponent(item.keyword)}`;
      const pubDate = new Date(item.recorded_date).toUTCString();
      const description = `${item.keyword}의 최신 검색 트렌드와 관련 뉴스를 확인하세요.`;

      return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="false">${item.keyword}-${item.recorded_date}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
    }).join("");

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OptiSearch 트렌드 피드</title>
    <link>${baseUrl}</link>
    <description>최신 검색 트렌드와 인기 키워드 분석 리포트</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    console.error("[rss.xml] Error generating RSS:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
