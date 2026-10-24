import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { departmentContact, team, teamGroups } from "@/content/team";

export const metadata: Metadata = {
  title: "Leadership and team",
  description:
    "Meet the leadership, editorial team and faculty adviser of the Department of Communication and Media Studies and The Varsity Pilot at the University of Liberia.",
};

function initials(name: string) {
  return name
    .replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s+/i, "")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export default function TeamPage() {
  return (
    <>
      <PageHeader
        kicker="People"
        title="Leadership and team"
        lede="The academic leaders, student editors and faculty adviser who guide the Department of Communication and Media Studies and The Varsity Pilot."
      >
        <Breadcrumbs items={[{ label: "Our team" }]} />
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-10">
          {teamGroups.map((group) => {
            const members = team.filter((member) => member.group === group.key);
            if (members.length === 0) return null;
            return (
              <section key={group.key}>
                <h2 className="editorial-rule mb-2 font-serif text-2xl text-navy">{group.title}</h2>
                <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
                  {group.description}
                </p>
                <ul className="grid gap-5 sm:grid-cols-2">
                  {members.map((member) => (
                    <li
                      key={member.name}
                      className="flex flex-col gap-4 rounded-lg border border-line bg-white p-5 shadow-soft"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-navy-tint font-serif text-xl text-navy"
                          aria-hidden="true"
                        >
                          {initials(member.name)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-serif text-xl leading-tight text-navy">{member.name}</h3>
                          <p className="text-sm font-semibold text-red">{member.role}</p>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-muted">{member.bio}</p>
                      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                        {member.email ? (
                          <a href={`mailto:${member.email}`} className="underline hover:text-navy">
                            {member.email}
                          </a>
                        ) : null}
                        {member.phone ? <a href={`tel:${member.phone}`}>{member.phone}</a> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <section className="rounded-lg border border-line bg-mist/50 p-6">
            <h2 className="font-serif text-2xl text-navy">Student reporters</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              Student reporters cover campus news, features, sports and student perspectives for
              The Varsity Pilot. Their work is published under editorial supervision and clearly
              labelled as student journalism.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/student-journalism" className="btn btn-primary btn-sm">
                Read student journalism
              </Link>
              <Link href="/contact" className="btn btn-outline btn-sm">
                Join the newsroom
              </Link>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border-t-4 border-navy bg-mist/60 p-5">
            <h2 className="font-serif text-xl text-navy">Department office</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                  Address
                </dt>
                <dd className="mt-0.5 text-ink">{departmentContact.address}</dd>
              </div>
              <div>
                <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                  Department email
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${departmentContact.email}`}
                    className="text-ink underline hover:text-navy"
                  >
                    {departmentContact.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                  Chairman
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${departmentContact.chairmanEmail}`}
                    className="text-ink underline hover:text-navy"
                  >
                    {departmentContact.chairmanEmail}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                  Phone
                </dt>
                <dd className="mt-0.5 text-ink">{departmentContact.phone}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
              Related
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link href="/about" className="underline underline-offset-4 hover:text-red">
                  About the department
                </Link>
              </li>
              <li>
                <Link href="/faculty" className="underline underline-offset-4 hover:text-red">
                  Faculty and staff
                </Link>
              </li>
              <li>
                <Link href="/academics" className="underline underline-offset-4 hover:text-red">
                  Academic programmes
                </Link>
              </li>
              <li>
                <Link href="/contact" className="underline underline-offset-4 hover:text-red">
                  Contact
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
