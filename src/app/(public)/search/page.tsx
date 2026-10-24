import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/ui/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getTags, searchPublished } from "@/server/public-queries";

export const metadata: Metadata = {
  title: "Search",
  description: "Search reporting and pages from the Department of Communication and Media Studies.",
  robots: { index: false, follow: true },
};

const PAGE_SIZE = 12;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: pageParam } = await searchParams;
  const query = q.trim().slice(0, 200);
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [data, tags] = await Promise.all([
    query ? searchPublished(query, PAGE_SIZE, (page - 1) * PAGE_SIZE) : Promise.resolve({ results: [], total: 0 }),
    getTags(12),
  ]);

  return (
    <>
      <PageHeader
        kicker="Search"
        title={query ? `Results for “${query}”` : "Search the department site"}
        lede="Search published reporting by headline, summary and body text. Unpublished drafts are never included."
      >
        <Breadcrumbs items={[{ label: "Search" }]} />
      </PageHeader>

      <div className="container-page py-9">
        <form action="/search" method="get" role="search" className="mb-8 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="search-q" className="sr-only">
            Search
          </label>
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search stories…"
            className="field max-w-xl bg-white"
            autoFocus={!query}
          />
          <button type="submit" className="btn btn-primary sm:w-auto">
            Search
          </button>
        </form>

        {query ? (
          <>
            <p className="mb-5 border-b border-line pb-3 text-sm text-muted">
              {data.total} {data.total === 1 ? "result" : "results"}
            </p>
            {data.results.length > 0 ? (
              <>
                <div className="divide-y divide-line">
                  {data.results.map((article) => (
                    <ArticleCard key={article.id} article={article} variant="list" />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
                  basePath="/search"
                  params={{ q: query }}
                />
              </>
            ) : (
              <EmptyState title="No published stories matched your search">
                Try shorter or different words, or browse the{" "}
                <Link href="/news" className="underline">
                  newsroom
                </Link>
                .
              </EmptyState>
            )}
          </>
        ) : (
          <div className="max-w-2xl">
            <h2 className="font-serif text-xl text-navy">Browse by topic</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag.slug}>
                  <Link
                    href={`/news/tag/${tag.slug}`}
                    className="inline-flex min-h-[36px] items-center rounded-full border border-line px-3 text-sm hover:border-navy hover:text-navy"
                  >
                    {tag.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">
              You can also browse the <Link href="/news" className="underline">newsroom</Link>,{" "}
              <Link href="/events" className="underline">events</Link> or{" "}
              <Link href="/academics" className="underline">academic programmes</Link>.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
