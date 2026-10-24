import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getSitePage } from "@/server/public-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getSitePage(slug);
  if (!page) return { title: "Page not found" };
  return {
    title: page.title,
    alternates: { canonical: `/pages/${page.slug}` },
  };
}

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getSitePage(slug);
  if (!page) notFound();

  return (
    <>
      <PageHeader kicker="Department information" title={page.title}>
        <Breadcrumbs items={[{ label: page.title }]} />
      </PageHeader>
      <div className="container-page max-w-3xl py-9">
        {page.bodyHtml ? (
          <div className="prose-article max-w-none" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
        ) : (
          <p className="text-sm text-muted">This page has no content yet.</p>
        )}
        <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
          See the <Link href="/contact" className="underline">contact page</Link> for enquiries.
        </p>
      </div>
    </>
  );
}
