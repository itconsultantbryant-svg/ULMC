import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { getFaculty } from "@/server/public-queries";

export const metadata: Metadata = {
  title: "Faculty and staff",
  description:
    "Faculty and staff of the Department of Communication and Media Studies at the University of Liberia.",
};

export default async function FacultyPage() {
  const faculty = await getFaculty();

  return (
    <>
      <PageHeader
        kicker="People"
        title="Faculty and staff"
        lede="Teachers, researchers and media practitioners who lead the Department's academic and newsroom work. Profiles are maintained by the department."
      >
        <Breadcrumbs items={[{ label: "Faculty and staff" }]} />
      </PageHeader>

      <div className="container-page py-9">
        {faculty.length > 0 ? (
          <ul className="grid gap-6 md:grid-cols-2">
            {faculty.map((person) => (
              <li key={person.id} className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row">
                {person.photo ? (
                  <img
                    src={`/media/${person.photo.id}`}
                    alt={person.photo.alt}
                    width={person.photo.width ?? 320}
                    height={person.photo.height ?? 400}
                    className="h-44 w-36 flex-none rounded object-cover"
                  />
                ) : (
                  <div
                    className="flex h-44 w-36 flex-none items-center justify-center rounded bg-navy-tint font-serif text-3xl text-navy/40"
                    aria-hidden="true"
                  >
                    {person.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-serif text-xl leading-tight text-navy">{person.name}</h2>
                  <p className="text-sm font-semibold text-red">{person.role}</p>
                  {person.qualifications ? (
                    <p className="mt-1 text-xs text-muted">{person.qualifications}</p>
                  ) : null}
                  {person.bio ? (
                    <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted">{person.bio}</p>
                  ) : null}
                  {person.teachingInterests ? (
                    <p className="mt-2 text-xs leading-relaxed text-ink/80">
                      <span className="font-semibold">Teaching: </span>
                      {person.teachingInterests}
                    </p>
                  ) : null}
                  {person.researchInterests ? (
                    <p className="mt-1 text-xs leading-relaxed text-ink/80">
                      <span className="font-semibold">Research: </span>
                      {person.researchInterests}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {person.office ? <span>{person.office}</span> : null}
                    {person.email ? (
                      <a href={`mailto:${person.email}`} className="underline hover:text-navy">
                        {person.email}
                      </a>
                    ) : null}
                    {person.phone ? <span>{person.phone}</span> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Faculty profiles are being prepared">
            Profiles, teaching areas and contact details will be published as the department
            confirms them. Please use the contact page for general enquiries.
          </EmptyState>
        )}

        <p className="mt-8 max-w-2xl border-t border-line pt-4 text-xs leading-relaxed text-muted">
          Contact details are published only with the consent of each staff member. For editorial
          enquiries, see our <Link className="underline" href="/team">leadership and team</Link> page.
        </p>
      </div>
    </>
  );
}
