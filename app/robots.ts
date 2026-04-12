import type { MetadataRoute } from "next";

/**
 * Robots.txt — allows all crawlers, points to sitemap.
 * Next.js serves this at /robots.txt automatically.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://dimeglio.dev/sitemap.xml",
  };
}
