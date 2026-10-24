import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { getResources } from "@/server/public-queries";
import { formatBytes, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Guides, forms and downloads for students and staff of the Department of Communication and Media Studies.",
};

export default async function ResourcesPage() {
  const resources = await getResources();
  const groups = new Map<string, typeof resources>();
  for (const resource of resources) {
    groups.set(resource.category, [...(groups.get(resource.category) ?? []), resource]);
  }

  return (
    <>
      <PageHeader
        kicker="Downloads"
        title="Resources"
        lede="Department guides, forms and reference documents. Files are published by staff after review; download counts are used only to improve the collection."
      >
        <Breadcrumbs items={[{ label: "Resources" }]} />
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-9">
          {resources.length === 0 ? (
            <EmptyState title="No public resources published yet">
              Documents will appear here once staff publish them. Contact the department office if
              you need a specific form or guide.
            </EmptyState>
          ) : (
            [...groups.entries()].map(([category, items]) => (
              <section key={category}>
                <h2 className="editorial-rule mb-3 font-serif text-2xl text-navy">{category}</h2>
                <ul className="divide-y divide-line">
                  {items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <h3 className="text-[1.02rem] font-semibold text-ink">{item.title}</h3>
                        {item.description ? (
                          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                            {item.description}
                          </p>
                        ) : null}
                        {item.file ? (
                          <p className="mt-1 text-xs text-muted">
                            {item.file.originalName} · {formatBytes(item.file.sizeBytes)} · added{" "}
                            {formatDate(item.createdAt)}
                          </p>
                        ) : null}
                      </div>
                      {item.file ? (
                        <a
                          href={`/media/${item.file.id}?download=1`}
                          className="btn btn-outline btn-sm flex-none"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="badge bg-mist text-muted">File unavailable</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside className="space-y-6">
          <section className="border-t-4 border-navy bg-mist/60 p-5">
            <h2 className="font-serif text-xl text-navy">Need a document?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The department office can provide programme forms, course outlines and other official
              documents where they are not published here.
            </p>
            <Link href="/contact" className="btn btn-primary btn-sm mt-4">
              Contact the office
            </Link>
          </section>
          <section className="text-sm leading-relaxed text-muted">
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
              Accessibility
            </h2>
            <p className="mt-2">
              If a document is not accessible to you, contact the department and we will work to
              provide an alternative format.
            </p>
            <Link href="/policies/accessibility" className="mt-2 inline-block underline hover:text-navy">
              Accessibility statement
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
