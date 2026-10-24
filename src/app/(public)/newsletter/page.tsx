import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { readSiteSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Newsletter",
  description:
    "Subscribe for occasional email updates from the Department of Communication and Media Studies at the University of Liberia.",
};

export default async function NewsletterPage() {
  const settings = await readSiteSettings();

  return (
    <>
      <PageHeader
        kicker="Stay informed"
        title="Department newsletter"
        lede="Occasional updates on reporting, events, student work and academic announcements. We do not sell or share subscriber lists."
      >
        <Breadcrumbs items={[{ label: "Newsletter" }]} />
      </PageHeader>

      <div className="container-page grid max-w-4xl gap-8 py-9 md:grid-cols-[1.2fr_1fr]">
        <div>
          {settings.newsletterEnabled ? (
            <>
              <h2 className="font-serif text-2xl text-navy">Subscribe</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Enter your email address. You will receive a confirmation message; your subscription
                begins only after you confirm.
              </p>
              <div className="mt-5">
                <NewsletterForm />
              </div>
            </>
          ) : (
            <div className="rounded border border-line bg-mist/60 p-5">
              <h2 className="font-serif text-xl text-navy">Subscriptions are currently closed</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The department has not enabled newsletter sign-ups. Check back later, or follow the
                newsroom for updates.
              </p>
              <Link href="/news" className="btn btn-primary btn-sm mt-4">
                Visit the newsroom
              </Link>
            </div>
          )}
        </div>

        <aside className="text-sm leading-relaxed text-muted">
          <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
            What to expect
          </h2>
          <ul className="mt-2 space-y-2">
            <li>Occasional messages, not a daily digest.</li>
            <li>Department reporting, events and student work.</li>
            <li>One-click unsubscribe in every message.</li>
            <li>No advertising or list sharing.</li>
          </ul>
          <p className="mt-4 text-xs">
            Read the <Link href="/privacy" className="underline">privacy notice</Link> for how
            subscriber data is handled.
          </p>
        </aside>
      </div>
    </>
  );
}
