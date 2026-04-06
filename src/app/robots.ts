import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/analyze/", "/compare/", "/trends/"],
      },
    ],
    sitemap: "https://www.optisearch.kr/sitemap.xml",
  };
}
