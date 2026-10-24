import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/ui/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { EventList } from "@/components/site/event-list";
import { countPublished, getCategories, getLatestArticles, getUpcomingEvents } from "@/server/public-queries";

export const metadata: Metadata = {
  title: "Newsroom",
  description:
    "Reporting, features, opinion and student journalism from the Department of Communication and Media Studies at the University of Liberia.",
};

const TABS = [
  { value: "", label: "All stories" },
  { value: "feature", label: "Features" },
  { value: "opinion", label: "Opinion & analysis" },
  { value: "student", label: "Student journalism" },
  { value: "announcement", label: "Announcements" },
];

const PAGE_SIZE = 12;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const params = await searchParams;
  const type = TABS.some((tab) => tab.value === params.type) ? params.type : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [articles, total, categories, events] = await Promise.all([
    getLatestArticles({ contentType: type || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countPublished({ contentType: type || undefined }),
    getCategories(),
    getUpcomingEvents(3),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        kicker="The newsroom"
        title="Reporting from the Department of Communication and Media Studies"
        lede="Department news, faculty reporting, student journalism and analysis from the University of Liberia."
      >
        <nav aria-label="Story types" className="-mb-1 overflow-x-auto no-scrollbar">
          <ul className="flex gap-1 pb-1">
            {TABS.map((tab) => {
              const active = tab.value === type;
              return (
                <li key={tab.value || "all"}>
                  <Link
                    href={tab.value ? `/news?type=${tab.value}` : "/news"}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-[38px] items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold ${
                      active
                        ? "border-navy bg-navy text-white"
                        : "border-line bg-white text-ink hover:border-navy hover:text-navy"
                    }`}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <div>
          <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
            <p className="text-sm text-muted">
              {total} {total === 1 ? "story" : "stories"}
              {type ? ` in ${TABS.find((tab) => tab.value === type)?.label.toLowerCase()}` : ""}
            </p>
            <Link href="/search" className="text-sm font-semibold text-navy hover:text-red">
              Search the archive
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
                totalPages={totalPages}
                basePath="/news"
                params={{ type: type || undefined }}
              />
            </>
          ) : (
            <EmptyState title="No stories match this view">
              Try another section, or browse the full <Link href="/news" className="underline">newsroom archive</Link>.
            </EmptyState>
          )}
        </div>

        <aside className="space-y-8">
          <section className="border-t-4 border-navy bg-mist/60 p-5">
            <h2 className="font-serif text-xl text-navy">About our reporting</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Department reporting follows published editorial standards, including verification,
              fairness and correction of errors.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>
                <Link href="/policies/editorial" className="text-navy underline decoration-line-strong underline-offset-4 hover:text-red">
                  Editorial standards
                </Link>
              </li>
              <li>
                <Link href="/policies/corrections" className="text-navy underline decoration-line-strong underline-offset-4 hover:text-red">
                  Corrections policy
                </Link>
              </li>
              <li>
                <Link href="/student-journalism" className="text-navy underline decoration-line-strong underline-offset-4 hover:text-red">
                  Student journalism
                </Link>
              </li>
            </ul>
          </section>

          {categories.length > 0 ? (
            <section>
              <h2 className="editorial-rule mb-3 font-sans text-sm font-bold uppercase tracking-widest text-navy">
                Sections
              </h2>
              <ul className="space-y-1.5">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/news/category/${category.slug}`}
                      className="text-[0.92rem] text-ink hover:text-red hover:underline"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="editorial-rule mb-2 font-sans text-sm font-bold uppercase tracking-widest text-navy">
              Upcoming events
            </h2>
            <EventList events={events} compact />
          </section>
        </aside>
      </div>
    </>
  );
}
