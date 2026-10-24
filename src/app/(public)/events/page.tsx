import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EventList } from "@/components/site/event-list";
import { getPastEvents, getUpcomingEvents } from "@/server/public-queries";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Lectures, workshops, seminars and public events hosted by the Department of Communication and Media Studies at the University of Liberia.",
};

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([getUpcomingEvents(30), getPastEvents(12)]);

  return (
    <>
      <PageHeader
        kicker="Calendar"
        title="Events and public programmes"
        lede="Lectures, workshops, seminars and student showcases hosted by the department. Event details are added by the editorial team."
      >
        <Breadcrumbs items={[{ label: "Events" }]} />
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <h2 className="editorial-rule mb-4 font-serif text-2xl text-navy">Upcoming</h2>
          <EventList events={upcoming} />

          <h2 className="editorial-rule mb-4 mt-10 font-serif text-2xl text-navy">Past events</h2>
          {past.length > 0 ? (
            <EventList events={past} compact />
          ) : (
            <p className="rounded border border-dashed border-line-strong px-4 py-6 text-sm text-muted">
              No past events are listed yet.
            </p>
          )}
        </div>

        <aside>
          <section className="border-t-4 border-navy bg-mist/60 p-5">
            <h2 className="font-serif text-xl text-navy">Hosting an event?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Department staff can request a listing through the editorial team. Events are reviewed
              before they appear on the public calendar.
            </p>
            <Link href="/contact" className="btn btn-primary btn-sm mt-4">
              Contact the editorial team
            </Link>
          </section>
          <section className="mt-6 text-sm leading-relaxed text-muted">
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">Venue note</h2>
            <p className="mt-2">
              Unless stated otherwise, events take place on the University of Liberia campus in
              Monrovia. Room and building details are included in each listing when confirmed.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
