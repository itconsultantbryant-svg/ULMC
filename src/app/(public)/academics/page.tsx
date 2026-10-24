import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { getAcademicPages } from "@/server/public-queries";

export const metadata: Metadata = {
  title: "Academic programmes",
  description:
    "Undergraduate and graduate study in communication, journalism and media at the University of Liberia.",
};

const KIND_LABELS: Record<string, string> = {
  undergraduate: "Undergraduate study",
  graduate: "Graduate study",
  program: "Programmes",
  track: "Specialisation tracks",
  course: "Courses",
  minor: "Minors and electives",
  other: "Other academic information",
};

export default async function AcademicsPage() {
  const pages = await getAcademicPages();
  const groups = new Map<string, typeof pages>();
  for (const page of pages) {
    const key = page.kind || "program";
    groups.set(key, [...(groups.get(key) ?? []), page]);
  }

  return (
    <>
      <PageHeader
        kicker="Study with us"
        title="Academic programmes"
        lede="The Department offers a Bachelor of Arts in Communication and Media, with specialised tracks in print and broadcast journalism. Programme requirements and admissions information are confirmed by the University of Liberia."
      >
        <Breadcrumbs items={[{ label: "Academics" }]} />
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-10">
          {pages.length === 0 ? (
            <EmptyState title="Programme information is being prepared">
              Detailed programme pages will be published here. For now, please contact the
              department for information about current offerings.
            </EmptyState>
          ) : (
            [...groups.entries()].map(([kind, items]) => (
              <section key={kind}>
                <h2 className="editorial-rule mb-4 font-serif text-2xl text-navy">
                  {KIND_LABELS[kind] ?? kind}
                </h2>
                <ul className="divide-y divide-line">
                  {items.map((item) => (
                    <li key={item.id} className="py-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-xl">
                          <Link href={`/academics/${item.slug}`} className="hover:text-red">
                            {item.title}
                          </Link>
                        </h3>
                        {item.linkUrl ? (
                          <a
                            href={item.linkUrl}
                            className="text-xs font-semibold text-red hover:underline"
                            rel="noopener noreferrer"
                          >
                            External information
                          </a>
                        ) : null}
                      </div>
                      {item.summary ? (
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{item.summary}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        <Link
                          href={`/academics/${item.slug}`}
                          className="font-semibold text-navy underline decoration-line-strong underline-offset-4 hover:text-red"
                        >
                          Programme details
                        </Link>
                        {item.document ? (
                          <a
                            href={`/media/${item.document.id}`}
                            className="text-muted underline underline-offset-4 hover:text-navy"
                          >
                            Download document
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside className="space-y-6">
          <section className="border-t-4 border-navy bg-mist/60 p-5">
            <h2 className="font-serif text-xl text-navy">Admissions</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Admission to University of Liberia programmes is handled by the University. Entry
              requirements and application deadlines are published by the University, not by this
              department site.
            </p>
            <p className="mt-2 text-sm">
              <a
                href="https://ul.edu.lr"
                className="underline hover:text-navy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit the University of Liberia
              </a>
            </p>
            <Link href="/contact" className="btn btn-primary btn-sm mt-4">
              Contact the department
            </Link>
          </section>
          <section>
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
              Related
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link href="/faculty" className="underline underline-offset-4 hover:text-red">
                  Faculty and staff
                </Link>
              </li>
              <li>
                <Link href="/student-journalism" className="underline underline-offset-4 hover:text-red">
                  The Varsity Pilot
                </Link>
              </li>
              <li>
                <Link href="/resources" className="underline underline-offset-4 hover:text-red">
                  Student resources
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
