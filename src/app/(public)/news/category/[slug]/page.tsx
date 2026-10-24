import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ui/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import {
  countPublished,
  getCategoryBySlug,
  getLatestArticles,
} from "@/server/public-queries";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Section not found" };
  return {
    title: category.name,
    description: category.description ?? `Stories in ${category.name} from the department newsroom.`,
    alternates: { canonical: `/news/category/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const category = await getCategoryBySlug(slug);
  if (!category || !category.isActive) notFound();

  const [articles, total] = await Promise.all([
    getLatestArticles({
      categorySlug: category.slug,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countPublished({ categorySlug: category.slug }),
  ]);

  return (
    <>
      <PageHeader kicker="Newsroom section" title={category.name} lede={category.description ?? undefined}>
        <Breadcrumbs items={[{ href: "/news", label: "Newsroom" }, { label: category.name }]} />
      </PageHeader>

      <div className="container-page py-9">
        <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
          <p className="text-sm text-muted">
            {total} {total === 1 ? "story" : "stories"}
          </p>
          <Link href="/news" className="text-sm font-semibold text-navy hover:text-red">
            All newsroom sections
          </Link>
        </div>

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
              basePath={`/news/category/${category.slug}`}
            />
          </>
        ) : (
          <EmptyState title="No stories in this section yet">
            Return to the <Link href="/news" className="underline">newsroom</Link> for the latest
            reporting.
          </EmptyState>
        )}
      </div>
    </>
  );
}
