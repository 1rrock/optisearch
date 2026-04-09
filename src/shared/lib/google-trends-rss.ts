/**
 * Google Trends Daily Trending Searches RSS parser.
 *
 * Fetches the Korean daily trending searches RSS feed and extracts
 * keyword titles. Used as the primary seed source for trending detection.
 *
 * Feed URL: https://trends.google.com/trending/rss?geo=KR
 */

const RSS_URL =
  "https://trends.google.com/trending/rss?geo=KR";

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch and parse Google Trends daily trending keywords for Korea.
 *
 * @returns Deduplicated array of trending keyword strings.
 *          Returns empty array on any error (network, parse, timeout).
 */
export async function fetchGoogleTrendsRSS(): Promise<string[]> {
  try {
    const response = await fetch(RSS_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Optisearch-TrendCollector/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      console.warn(
        `[google-trends-rss] HTTP ${response.status} ${response.statusText}`
      );
      return [];
    }

    const xml = await response.text();
    return parseRSSKeywords(xml);
  } catch (err) {
    console.warn(
      "[google-trends-rss] Fetch failed:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

// Stateless regexes (no /g flag) — safe at module scope
const CDATA_TITLE_REGEX = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
const PLAIN_TITLE_REGEX = /<title>(.*?)<\/title>/;

/**
 * Extract keyword titles from RSS XML using regex.
 * Avoids external XML parser dependency.
 * Known limitation: CDATA match is single-line only.
 */
function parseRSSKeywords(xml: string): string[] {
  const keywords = new Set<string>();

  // /g flag regex must be function-local to avoid lastIndex race condition across calls
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemContent = itemMatch[1];
    const titleMatch = CDATA_TITLE_REGEX.exec(itemContent);
    const plainTitleMatch = !titleMatch
      ? PLAIN_TITLE_REGEX.exec(itemContent)
      : null;

    const title = titleMatch?.[1] ?? plainTitleMatch?.[1];
    if (title) {
      const cleaned = decodeRSSEntities(title);
      if (cleaned.length > 0) {
        keywords.add(cleaned);
      }
    }
  }

  return [...keywords];
}

/** Decode HTML entities in RSS titles. Strips angle-bracket entities to prevent injection. */
function decodeRSSEntities(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&lt;/g, "")
    .replace(/&gt;/g, "")
    .trim();
}
