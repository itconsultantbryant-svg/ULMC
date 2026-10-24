import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getAcademicPageBySlug } from "@/server/public-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getAcademicPageBySlug(slug);
  if (!page) return { title: "Programme not found" };
  return {
    title: page.title,
    description: page.summary || undefined,
    alternates: { canonical: `/academics/${page.slug}` },
  };
}

export default async function AcademicProgrammePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getAcademicPageBySlug(slug);
  if (!page) notFound();

  return (
    <>
      <div className="border-b border-line bg-mist/50">
        <div className="container-page max-w-4xl py-8">
          <Breadcrumbs
            items={[
              { href: "/academics", label: "Academics" },
              { label: page.title },
            ]}
          />
          <p className="kicker mb-2">Academic programme</p>
          <h1 className="text-balance text-3xl leading-tight sm:text-4xl">{page.title}</h1>
          {page.summary ? (
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">{page.summary}</p>
          ) : null}
        </div>
      </div>

      <div className="container-page max-w-4xl py-8">
        {page.bodyHtml ? (
          <div className="prose-article" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
        ) : (
          <p className="text-sm text-muted">
            Detailed programme information has not been published yet. Please contact the department
            office for current requirements.
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-5">
          {page.linkUrl ? (
            <a href={page.linkUrl} className="btn btn-primary" rel="noopener noreferrer">
              University information
            </a>
          ) : null}
          {page.document ? (
            <a href={`/media/${page.document.id}`} className="btn btn-outline">
              Download programme document
            </a>
          ) : null}
          <Link href="/academics" className="btn btn-ghost">
            All programmes
          </Link>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted">
          Programme requirements, fees and admission decisions are governed by the University of
          Liberia. This page provides departmental information and does not replace official
          University publications.
        </p>
      </div>
    </>
  );
}
