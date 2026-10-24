import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/session";
import { getEventById } from "@/server/studio/queries";
import { toDateTimeLocal } from "@/lib/format";
import { EventForm } from "../event-form";

export const metadata: Metadata = {
  title: "Edit event",
  robots: { index: false, follow: false },
};

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePagePermission("events.manage", `/studio/events/${id}`);
  const event = await getEventById(id);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="kicker">Events</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Edit event</h1>
        <p className="mt-1 text-sm text-muted">/events/{event.slug}</p>
      </header>
      <EventForm
        timezone={event.timezone}
        initial={{
          id: event.id,
          title: event.title,
          slug: event.slug,
          summary: event.summary,
          descriptionHtml: event.descriptionHtml,
          startsAt: toDateTimeLocal(event.startsAt),
          endsAt: event.endsAt ? toDateTimeLocal(event.endsAt) : "",
          venue: event.venue ?? "",
          organizer: event.organizer ?? "",
          registrationUrl: event.registrationUrl ?? "",
          isPublished: event.isPublished,
          isFeatured: event.isFeatured,
        }}
      />
    </div>
  );
}
