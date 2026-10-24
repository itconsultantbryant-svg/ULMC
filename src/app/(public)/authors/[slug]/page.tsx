import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ui/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import {
  getAuthorArticles,
  getAuthorBySlug,
  getAuthorPublishedCount,
} from "@/server/public-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Author not found" };
  return {
    title: author.name,
    description: author.bio ?? `Published work by ${author.name}.`,
    alternates: { canonical: `/authors/${author.slug}` },
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const [articles, count] = await Promise.all([
    getAuthorArticles(author.id),
    getAuthorPublishedCount(author.id),
  ]);

  return (
    <>
      <PageHeader kicker="Author" title={author.name} lede={author.title ?? undefined}>
        <Breadcrumbs items={[{ href: "/news", label: "Newsroom" }, { label: author.name }]} />
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside>
          {author.image ? (
            <img
              src={author.image}
              alt=""
              width={240}
              height={240}
              className="mb-4 h-40 w-40 rounded-full object-cover"
            />
          ) : (
            <div className="mb-4 flex h-40 w-40 items-center justify-center rounded-full bg-navy-tint font-serif text-4xl text-navy">
              {author.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </div>
          )}
          {author.bio ? (
            <p className="text-sm leading-relaxed text-muted">{author.bio}</p>
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              A member of the department&apos;s editorial team. A full biography has not been
              published yet.
            </p>
          )}
          <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
            {count} published {count === 1 ? "story" : "stories"}
          </p>
        </aside>

        <div>
          <h2 className="editorial-rule mb-5 font-serif text-2xl text-navy">Published work</h2>
          {articles.length > 0 ? (
            <div className="divide-y divide-line">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} variant="list" />
              ))}
            </div>
          ) : (
            <EmptyState title="No published stories yet">
              Work by this author will appear here once it has been through editorial review and
              publication.
            </EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
