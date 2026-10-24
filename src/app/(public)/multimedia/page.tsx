import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/ui/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { countPublished, getLatestArticles } from "@/server/public-queries";

export const metadata: Metadata = {
  title: "Multimedia",
  description:
    "Video, audio and visual storytelling from the Department of Communication and Media Studies at the University of Liberia.",
};

export default async function MultimediaPage() {
  const [articles, total] = await Promise.all([
    getLatestArticles({ multimediaOnly: true, limit: 24 }),
    countPublished({ multimediaOnly: true }),
  ]);

  return (
    <>
      <PageHeader
        kicker="Watch and listen"
        title="Multimedia"
        lede="Video reports, audio stories and visual projects produced by faculty and student journalists in the department."
      >
        <Breadcrumbs items={[{ label: "Multimedia" }]} />
      </PageHeader>

      <div className="container-page py-9">
        <p className="mb-5 border-b border-line pb-3 text-sm text-muted">
          {total} multimedia {total === 1 ? "story" : "stories"}
        </p>
        {articles.length > 0 ? (
          <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No multimedia stories published yet"
            action={
              <Link href="/news" className="btn btn-primary">
                Visit the newsroom
              </Link>
            }
          >
            Video and audio reporting will appear here once it has been through editorial review.
          </EmptyState>
        )}
      </div>
    </>
  );
}
