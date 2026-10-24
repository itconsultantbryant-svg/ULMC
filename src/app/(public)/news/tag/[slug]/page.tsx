import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ui/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { countPublished, getLatestArticles, getTagBySlug } from "@/server/public-queries";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  return {
    title: tag ? `Topic: ${tag.name}` : "Topic not found",
    description: tag ? `Stories tagged ${tag.name} from the department newsroom.` : undefined,
    alternates: tag ? { canonical: `/news/tag/${tag.slug}` } : undefined,
  };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const [articles, total] = await Promise.all([
    getLatestArticles({ tagSlug: tag.slug, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countPublished({ tagSlug: tag.slug }),
  ]);

  return (
    <>
      <PageHeader kicker="Topic" title={tag.name}>
        <Breadcrumbs items={[{ href: "/news", label: "Newsroom" }, { label: tag.name }]} />
      </PageHeader>
      <div className="container-page py-9">
        <p className="mb-5 border-b border-line pb-3 text-sm text-muted">
          {total} {total === 1 ? "story" : "stories"} tagged “{tag.name}”
        </p>
        {articles.length > 0 ? (
          <>
            <div className="divide-y divide-line">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} variant="list" />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
              basePath={`/news/tag/${tag.slug}`}
            />
          </>
        ) : (
          <EmptyState title="No published stories with this topic yet">
            Browse the <Link href="/news" className="underline">newsroom</Link> for the latest reporting.
          </EmptyState>
        )}
      </div>
    </>
  );
}
