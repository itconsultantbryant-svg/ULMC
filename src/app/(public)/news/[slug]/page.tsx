import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentTypeBadge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ArticleCard } from "@/components/ui/article-card";
import { ShareButtons } from "@/components/site/share-buttons";
import { CommentsSection } from "@/components/site/comments";
import { NewsletterForm } from "@/components/site/newsletter-form";
import {
  getArticleBySlug,
  getRelatedArticles,
} from "@/server/public-queries";
import { readSiteSettings } from "@/server/settings";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Story not found" };
  const description = article.seoDescription ?? article.summary;
  const image = article.hero
    ? { url: `${env.siteUrl}/media/${article.hero.id}`, alt: article.hero.alt }
    : undefined;
  return {
    title: article.seoTitle ?? article.title,
    description,
    alternates: { canonical: article.canonicalUrl ?? `/news/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.seoTitle ?? article.title,
      description,
      url: `${env.siteUrl}/news/${article.slug}`,
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: article.authors.map((author) => author.name),
      section: article.category?.name,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: article.seoTitle ?? article.title,
      description,
      images: image ? [image.url] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const [related, settings] = await Promise.all([
    getRelatedArticles(article.id, article.category?.slug),
    readSiteSettings(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.seoDescription ?? article.summary,
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    wordCount: article.wordCount,
    articleSection: article.category?.name,
    keywords: article.tags.map((tag) => tag.name).join(", "),
    author: article.authors.map((author) => ({
      "@type": "Person",
      name: author.name,
      url: `${env.siteUrl}/authors/${author.slug}`,
    })),
    publisher: {
      "@type": "Organization",
      name: settings.siteName,
      logo: { "@type": "ImageObject", url: `${env.siteUrl}/brand/department-seal-400.webp` },
    },
    image: article.hero ? `${env.siteUrl}/media/${article.hero.id}` : undefined,
    mainEntityOfPage: `${env.siteUrl}/news/${article.slug}`,
    isAccessibleForFree: true,
  };

  return (
    <>
      <article className="pb-4">
        <div className="container-page max-w-4xl pt-6">
          <Breadcrumbs
            items={[
              { href: "/news", label: "Newsroom" },
              ...(article.category
                ? [{ href: `/news/category/${article.category.slug}`, label: article.category.name }]
                : []),
              { label: article.title },
            ]}
          />

          <header className="mx-auto max-w-[46rem]">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <ContentTypeBadge type={article.contentType} />
              {article.category ? (
                <Link
                  href={`/news/category/${article.category.slug}`}
                  className="text-xs font-bold uppercase tracking-widest text-red hover:text-red-deep"
                >
                  {article.category.name}
                </Link>
              ) : null}
            </div>

            <h1 className="text-balance text-[2rem] leading-[1.12] sm:text-[2.6rem]">
              {article.title}
            </h1>
            {article.subtitle ? (
              <p className="mt-3 font-serif text-xl leading-snug text-muted">{article.subtitle}</p>
            ) : null}
            <p className="mt-4 border-l-2 border-red pl-3 text-[1.02rem] leading-relaxed text-ink/85">
              {article.summary}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-line py-3">
              <div className="flex items-center gap-3">
                {article.authors.length > 0 ? (
                  <div className="flex -space-x-2">
                    {article.authors.slice(0, 3).map((author) =>
                      author.image ? (
                        <img
                          key={author.id}
                          src={author.image}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full border-2 border-white object-cover"
                        />
                      ) : (
                        <span
                          key={author.id}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-navy-tint text-xs font-bold text-navy"
                          aria-hidden="true"
                        >
                          {author.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                      ),
                    )}
                  </div>
                ) : null}
                <div className="text-xs leading-relaxed">
                  {article.authors.length > 0 ? (
                    <p className="font-semibold text-ink">
                      By{" "}
                      {article.authors.map((author, index) => (
                        <span key={author.id}>
                          <Link href={`/authors/${author.slug}`} className="hover:text-red hover:underline">
                            {author.name}
                          </Link>
                          {index < article.authors.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="font-semibold text-ink">The Varsity Pilot</p>
                  )}
                  <p className="text-muted">
                    <time dateTime={article.publishedAt.toISOString()}>
                      {formatDate(article.publishedAt, { long: true })}
                    </time>
                    <span aria-hidden="true"> · </span>
                    {article.readingMinutes} min read
                  </p>
                </div>
              </div>
              <ShareButtons title={article.title} />
            </div>
          </header>

          {article.hero ? (
            <figure className="mx-auto mt-7 max-w-4xl">
              <img
                src={`/media/${article.hero.id}`}
                alt={article.hero.alt}
                width={article.hero.width ?? 1200}
                height={article.hero.height ?? 800}
                className="w-full rounded-sm bg-mist object-cover"
                fetchPriority="high"
              />
              {article.hero.caption || article.hero.credit ? (
                <figcaption className="mt-2 border-t border-line pt-2 text-xs leading-relaxed text-muted">
                  {article.hero.caption}
                  {article.hero.credit ? (
                    <span className="text-muted/90"> {article.hero.credit}</span>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="mx-auto mt-8 max-w-[46rem]">
            <div
              className="prose-article"
              dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
            />

            {article.tags.length > 0 ? (
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <span className="text-xs font-bold uppercase tracking-widest text-muted">Topics</span>
                {article.tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/news/tag/${tag.slug}`}
                    className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink hover:border-navy hover:text-navy"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="mt-6 rounded border border-line bg-mist/60 px-4 py-3 text-xs leading-relaxed text-muted">
              This story was produced by The Varsity Pilot, the student newspaper of the
              Department of Communication and Media Studies, and reviewed under our{" "}
              <Link href="/policies/editorial" className="underline">
                editorial standards
              </Link>
              . To report an error, read our{" "}
              <Link href="/policies/corrections" className="underline">
                corrections policy
              </Link>{" "}
              and contact the editorial team.
            </div>

            {article.authors.length > 0 ? (
              <div className="mt-8 space-y-4 border-t border-line pt-6">
                <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-muted">
                  About the {article.authors.length === 1 ? "author" : "authors"}
                </h2>
                {article.authors.map((author) => (
                  <div key={author.id} className="flex gap-3">
                    {author.image ? (
                      <img
                        src={author.image}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 flex-none rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-navy-tint font-serif text-lg text-navy">
                        {author.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-ink">
                        <Link href={`/authors/${author.slug}`} className="hover:text-red hover:underline">
                          {author.name}
                        </Link>
                        {author.title ? <span className="font-normal text-muted"> — {author.title}</span> : null}
                      </p>
                      {author.bio ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted">{author.bio}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <CommentsSection slug={article.slug} commentsClosed={article.commentsClosed} />
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mt-6 border-t border-line bg-mist/50 py-10">
          <div className="container-page">
            <h2 className="editorial-rule mb-6 font-serif text-2xl text-navy">Related coverage</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {settings.newsletterEnabled ? (
        <section className="container-page py-10">
          <div className="rounded-md border border-line bg-white p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_1.2fr] md:items-center">
              <div>
                <p className="kicker">Newsletter</p>
                <h2 className="mt-1 font-serif text-2xl text-navy">Get department updates by email</h2>
                <p className="mt-1 text-sm text-muted">
                  Occasional news, events and student work. Unsubscribe at any time.
                </p>
              </div>
              <NewsletterForm />
            </div>
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
