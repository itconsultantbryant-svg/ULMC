import { getFeedArticles } from "@/server/public-queries";
import { readSiteSettings } from "@/server/settings";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [articles, settings] = await Promise.all([getFeedArticles(40), readSiteSettings()]);
  const items = articles
    .map((article) => {
      const url = `${env.siteUrl}/news/${article.slug}`;
      return [
        "<item>",
        `<title>${escapeXml(article.title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `<pubDate>${article.publishedAt.toUTCString()}</pubDate>`,
        `<description>${escapeXml(article.summary)}</description>`,
        article.category ? `<category>${escapeXml(article.category.name)}</category>` : "",
        article.authors.length > 0
          ? `<author>${escapeXml(article.authors.map((a) => a.name).join(", "))}</author>`
          : "",
        "</item>",
      ]
        .filter(Boolean)
        .join("");
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(settings.siteName)}</title>
<link>${escapeXml(env.siteUrl)}</link>
<description>${escapeXml(settings.tagline)}</description>
<language>en-lr</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<atom:link href="${escapeXml(`${env.siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
