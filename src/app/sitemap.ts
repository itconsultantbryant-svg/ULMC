import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import {
  getAcademicPages,
  getSitePages,
  getSitemapEntries,
} from "@/server/public-queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const { articles, categories, pages, authors } = await getSitemapEntries();
  const [academics, sitePages] = await Promise.all([getAcademicPages(), getSitePages()]);

  const staticPaths = [
    "/",
    "/news",
    "/about",
    "/academics",
    "/faculty",
    "/team",
    "/student-journalism",
    "/multimedia",
    "/events",
    "/resources",
    "/contact",
    "/newsletter",
    "/privacy",
    "/terms",
    "/policies/editorial",
    "/policies/corrections",
    "/policies/comments",
    "/policies/accessibility",
  ];

  return [
    ...staticPaths.map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "/" || path === "/news" ? ("daily" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : path === "/news" ? 0.9 : 0.6,
    })),
    ...articles.map((article) => ({
      url: `${base}/news/${article.slug}`,
      lastModified: article.publishedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...categories.map((category) => ({
      url: `${base}/news/category/${category.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...authors
      .filter((author): author is { slug: string } => Boolean(author.slug))
      .map((author) => ({
        url: `${base}/authors/${author.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ...academics.map((page) => ({
      url: `${base}/academics/${page.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...sitePages
      .filter((page) => !pages.some((known) => known.slug === page.slug))
      .map((page) => ({
        url: `${base}/pages/${page.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
  ];
}
