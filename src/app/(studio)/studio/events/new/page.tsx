import type { Metadata } from "next";
import { requirePagePermission } from "@/server/session";
import { toDateTimeLocal } from "@/lib/format";
import { EventForm } from "../event-form";

export const metadata: Metadata = {
  title: "New event",
  robots: { index: false, follow: false },
};

export default async function NewEventPage() {
  await requirePagePermission("events.manage", "/studio/events/new");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="kicker">Events</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Create an event</h1>
      </header>
      <EventForm
        timezone="Africa/Monrovia"
        initial={{
          title: "",
          slug: "",
          summary: "",
          descriptionHtml: "",
          startsAt: toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
          endsAt: "",
          venue: "",
          organizer: "Department of Communication and Media Studies",
          registrationUrl: "",
          isPublished: false,
          isFeatured: false,
        }}
      />
    </div>
  );
}
