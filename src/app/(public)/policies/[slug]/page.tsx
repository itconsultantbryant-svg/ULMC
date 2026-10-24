import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { POLICIES } from "@/content/policies";

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) return { title: "Policy not found" };
  return {
    title: policy.title,
    description: policy.lede,
    alternates: { canonical: `/policies/${policy.slug}` },
  };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();

  return (
    <>
      <PageHeader kicker={policy.kicker} title={policy.title} lede={policy.lede}>
        <Breadcrumbs items={[{ label: "Policies" }, { label: policy.title }]} />
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article className="prose-article max-w-none">
          {policy.sections.map((section, index) => (
            <section key={section.heading} id={`section-${index + 1}`}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          <p className="text-sm not-italic">
            Questions about this policy can be sent through the <Link href="/contact">contact page</Link>.
          </p>
        </article>

        <aside className="text-sm">
          <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
            On this page
          </h2>
          <ol className="mt-2 space-y-1.5">
            {policy.sections.map((section, index) => (
              <li key={section.heading}>
                <a href={`#section-${index + 1}`} className="text-muted hover:text-navy hover:underline">
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-6 border-t border-line pt-4">
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
              Other policies
            </h2>
            <ul className="mt-2 space-y-1.5">
              {Object.values(POLICIES)
                .filter((item) => item.slug !== policy.slug)
                .map((item) => (
                  <li key={item.slug}>
                    <Link href={`/policies/${item.slug}`} className="text-muted hover:text-navy hover:underline">
                      {item.title}
                    </Link>
                  </li>
                ))}
              <li>
                <Link href="/privacy" className="text-muted hover:text-navy hover:underline">
                  Privacy notice
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted hover:text-navy hover:underline">
                  Terms of use
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
