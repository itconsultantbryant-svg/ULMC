import type { Metadata } from "next";
import Link from "next/link";
import { formatEventRange } from "@/lib/format";
import { requirePagePermission } from "@/server/session";
import { listAllEvents } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Events",
  robots: { index: false, follow: false },
};

export default async function EventsAdminPage() {
  await requirePagePermission("events.manage", "/studio/events");
  const events = await listAllEvents();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Department</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Events</h1>
          <p className="mt-1 text-sm text-muted">Public lectures, deadlines, workshops and departmental events.</p>
        </div>
        <Link href="/studio/events/new" className="btn btn-primary">
          New event
        </Link>
      </header>

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-white px-5 py-10 text-center text-sm text-muted">
          No events yet. Create one to show it on the public events calendar.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="table-clean">
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">When</th>
                <th scope="col">Venue</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <Link href={`/studio/events/${event.id}`} className="font-semibold text-ink hover:text-red">
                      {event.title}
                    </Link>
                    {event.isFeatured ? <span className="ml-2 text-[10px] font-bold uppercase text-red">Featured</span> : null}
                    <p className="text-xs text-muted">/events/{event.slug}</p>
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">{formatEventRange(event.startsAt, event.endsAt)}</td>
                  <td className="text-xs text-muted">{event.venue ?? "—"}</td>
                  <td className="text-xs">
                    <span className={event.isPublished ? "font-semibold text-success" : "font-semibold text-warning"}>
                      {event.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link href={`/studio/events/${event.id}`} className="text-xs font-semibold text-navy hover:text-red">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
