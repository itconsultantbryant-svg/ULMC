import Link from "next/link";
import { formatEventRange } from "@/lib/format";

export type EventListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  startsAt: Date;
  endsAt: Date | null;
  venue: string | null;
};

export function EventList({ events, compact = false }: { events: EventListItem[]; compact?: boolean }) {
  if (events.length === 0) {
    return (
      <p className="rounded border border-dashed border-line-strong px-4 py-6 text-sm text-muted">
        No upcoming events are listed yet.
      </p>
    );
  }
  return (
    <ul className={compact ? "divide-y divide-line" : "divide-y divide-line border-y border-line"}>
      {events.map((event) => {
        const start = new Date(event.startsAt);
        return (
          <li key={event.id}>
            <Link
              href={`/events/${event.slug}`}
              className="group flex gap-4 py-4 transition-colors hover:bg-mist/60"
            >
              <div className="w-14 flex-none border-r border-line pr-3 text-center">
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-red">
                  {new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Africa/Monrovia" }).format(start)}
                </p>
                <p className="font-serif text-2xl leading-none text-navy">
                  {new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Africa/Monrovia" }).format(start)}
                </p>
              </div>
              <div className="min-w-0">
                <h3 className="text-[0.98rem] font-semibold leading-snug group-hover:text-red">
                  {event.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted">{formatEventRange(event.startsAt, event.endsAt)}</p>
                {event.venue ? <p className="mt-0.5 text-xs text-muted">{event.venue}</p> : null}
                {!compact && event.summary ? (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">{event.summary}</p>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
