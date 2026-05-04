import type { MetadataRoute } from "next";
import { guides } from "./(guides)/guides/_content";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.optisearch.kr";
  const now = new Date();
  const staticLastMod = new Date("2026-05-04");

  const toolPages: MetadataRoute.Sitemap = [
    "keyword-analyzer",
    "title-generator",
    "seo-checker",
    "trend-checker",
  ].map((slug) => ({
    url: `${baseUrl}/tools/${slug}`,
    lastModified: staticLastMod,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const guideDetailPages: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${baseUrl}/guides/${g.slug}`,
    lastModified: new Date(g.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    { url: baseUrl, lastModified: staticLastMod, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/pricing`, lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/support`, lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },
    ...toolPages,
    { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...guideDetailPages,
  ];
}
