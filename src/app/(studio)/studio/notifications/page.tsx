import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { relativeTime } from "@/lib/format";
import { requirePageUser } from "@/server/session";
import { listMyNotifications, markAllNotificationsRead } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const { user } = await requirePageUser("/studio/notifications");
  const notifications = await listMyNotifications(user.id, 80);

  async function markAll() {
    "use server";
    const { user: current } = await requirePageUser("/studio/notifications");
    await markAllNotificationsRead(current.id);
    revalidatePath("/studio/notifications");
    revalidatePath("/studio");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Workspace</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Editorial decisions, assignments and moderation alerts.</p>
        </div>
        <form action={markAll}>
          <button type="submit" className="btn btn-outline btn-sm">
            Mark all as read
          </button>
        </form>
      </header>

      {notifications.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-5 py-10 text-center text-sm text-muted">
          No notifications yet.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {notifications.map((item) => (
            <li key={item.id} className={item.readAt ? "px-5 py-4" : "bg-mist/60 px-5 py-4"}>
              <Link href={item.link ?? "/studio"} className="font-semibold text-ink hover:text-red">
                {item.title}
              </Link>
              {item.body ? <p className="mt-1 text-sm text-muted">{item.body}</p> : null}
              <p className="mt-1 text-xs text-muted">
                {relativeTime(item.createdAt)}
                {item.readAt ? "" : " · unread"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
