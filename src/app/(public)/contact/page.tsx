import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ContactForm } from "@/components/site/contact-form";
import { departmentContact } from "@/content/team";
import { getSitePage } from "@/server/public-queries";
import { readSiteSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact the Department of Communication and Media Studies at the University of Liberia — phone, email, office address and The Varsity Pilot newsroom.",
};

export default async function ContactPage() {
  const [settings, page] = await Promise.all([readSiteSettings(), getSitePage("contact")]);
  const address = settings.address || departmentContact.address;
  const phone = settings.contactPhone || departmentContact.phone;
  const email = settings.contactEmail || departmentContact.email;

  return (
    <>
      <PageHeader
        kicker="Get in touch"
        title="Contact the department"
        lede="Use this form for enquiries about programmes, student journalism, events, corrections or accessibility. Messages are reviewed by the department team."
      >
        <Breadcrumbs items={[{ label: "Contact" }]} />
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[minmax(0,1.4fr)_20rem]">
        <div>
          <h2 className="editorial-rule mb-4 font-serif text-2xl text-navy">Send a message</h2>
          <ContactForm />
          {page?.bodyHtml && !page.bodyHtml.includes("Content coming soon") ? (
            <div
              className="prose-article mt-8 max-w-none"
              dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
            />
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="border-t-4 border-navy bg-mist/60 p-5">
            <h2 className="font-serif text-xl text-navy">Department office</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                  Address
                </dt>
                <dd className="mt-0.5 text-ink">{address}</dd>
              </div>
              <div>
                <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                  Department email
                </dt>
                <dd className="mt-0.5">
                  <a href={`mailto:${email}`} className="text-ink underline hover:text-navy">
                    {email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                  Chairman&apos;s email
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
                <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">Phone</dt>
                <dd className="mt-0.5 text-ink">
                  <a href={`tel:${phone}`} className="hover:text-navy">
                    {phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                  Facebook
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={departmentContact.facebook}
                    className="text-ink underline hover:text-navy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Department of Communication and Media Studies
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-line p-5">
            <h2 className="font-serif text-xl text-navy">The Varsity Pilot newsroom</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              For story tips, letters to the editor and newsroom corrections, contact the editorial
              team.
            </p>
            <Link href="/team" className="mt-3 inline-block text-sm font-semibold text-navy underline underline-offset-4 hover:text-red">
              Leadership and editorial team
            </Link>
          </section>

          <section className="text-sm leading-relaxed text-muted">
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
              For newsroom corrections
            </h2>
            <p className="mt-2">
              Choose “Newsroom correction” in the form and include the story headline and URL. Read
              our{" "}
              <Link href="/policies/corrections" className="underline hover:text-navy">
                corrections policy
              </Link>{" "}
              first.
            </p>
          </section>

          <section className="text-sm leading-relaxed text-muted">
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
              Admissions and records
            </h2>
            <p className="mt-2">
              The department cannot process applications, transcripts or registration. Please use the
              official University of Liberia channels for those services.
            </p>
            <a
              href={settings.universityUrl || "https://ul.edu.lr"}
              className="mt-2 inline-block underline hover:text-navy"
              rel="noopener noreferrer"
              target="_blank"
            >
              University of Liberia website
            </a>
          </section>
        </aside>
      </div>
    </>
  );
}
