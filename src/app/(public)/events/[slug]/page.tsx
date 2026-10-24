import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getEventBySlug } from "@/server/public-queries";
import { formatEventRange } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.summary,
    alternates: { canonical: `/events/${event.slug}` },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const isPast = event.startsAt.getTime() < Date.now();

  return (
    <>
      <div className="border-b border-line bg-mist/50">
        <div className="container-page max-w-4xl py-8">
          <Breadcrumbs items={[{ href: "/events", label: "Events" }, { label: event.title }]} />
          <p className="kicker mb-2">{isPast ? "Past event" : "Department event"}</p>
          <h1 className="text-balance text-3xl leading-tight sm:text-4xl">{event.title}</h1>
          <p className="mt-3 text-lg text-muted">{formatEventRange(event.startsAt, event.endsAt)}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a href={`/events/${event.slug}/event.ics`} className="btn btn-outline btn-sm">
              Add to calendar
            </a>
            {event.registrationUrl ? (
              <a
                href={event.registrationUrl}
                className="btn btn-primary btn-sm"
                rel="noopener noreferrer"
              >
                Registration details
              </a>
            ) : null}
            <Link href="/events" className="btn btn-ghost btn-sm">
              All events
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page grid max-w-4xl gap-8 py-8 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          {event.summary ? (
            <p className="border-l-2 border-red pl-3 font-serif text-lg leading-relaxed text-ink/85">
              {event.summary}
            </p>
          ) : null}
          {event.descriptionHtml ? (
            <div
              className="prose-article mt-6"
              dangerouslySetInnerHTML={{ __html: event.descriptionHtml }}
            />
          ) : (
            <p className="mt-6 text-sm text-muted">
              Full event details have not been published yet. Please check back or contact the
              department for more information.
            </p>
          )}
        </div>
        <aside className="space-y-4 border-t border-line pt-4 text-sm md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <div>
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-muted">When</h2>
            <p className="mt-1 text-ink">{formatEventRange(event.startsAt, event.endsAt)}</p>
            <p className="text-xs text-muted">Times shown in Monrovia time (GMT).</p>
          </div>
          <div>
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-muted">Where</h2>
            <p className="mt-1 text-ink">{event.venue ?? "Venue to be confirmed."}</p>
          </div>
          {event.organizer ? (
            <div>
              <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-muted">
                Organiser
              </h2>
              <p className="mt-1 text-ink">{event.organizer}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
