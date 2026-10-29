import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText, ShieldCheck, MessageSquare, Send } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/format";
import { can } from "@/server/permissions";
import { requirePageUser } from "@/server/session";
import { getDashboardFeed, getStudioCounts, listMyNotifications } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Studio dashboard",
  robots: { index: false, follow: false },
};

export default async function StudioDashboard() {
  const { user } = await requirePageUser("/studio");
  const [counts, feed, notifications] = await Promise.all([
    getStudioCounts(user),
    getDashboardFeed(user, 8),
    listMyNotifications(user.id, 5),
  ]);

  const today = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Monrovia",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const stats = [
    {
      label: "Drafts & revisions",
      value: counts.myDrafts,
      href: "/studio/articles?status=draft",
      icon: FileText,
    },
    {
      label: "In editorial review",
      value: counts.review,
      href: "/studio/review",
      icon: ClipboardCheck,
      hide: !can(user, "editorial.viewQueue"),
    },
    {
      label: "Awaiting admin approval",
      value: counts.approvals,
      href: "/studio/approvals",
      icon: ShieldCheck,
      hide: !can(user, "admin.viewApprovalQueue"),
    },
    {
      label: "Comments to moderate",
      value: counts.pendingComments,
      href: "/studio/comments",
      icon: MessageSquare,
      hide: !can(user, "comments.moderate"),
    },
    {
      label: "New website enquiries",
      value: counts.pendingSubmissions,
      href: "/studio/submissions",
      icon: Send,
      hide: !can(user, "submissions.manage"),
    },
  ].filter((stat) => !stat.hide);

  return (
    <div className="space-y-8">
      <header className="surface-grid relative overflow-hidden rounded-2xl border border-line bg-white px-5 py-6 shadow-soft sm:px-7 sm:py-7">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-red/5 blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
          <p className="kicker">{today}</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Good to see you, {user.name.split(" ")[0]}.</h1>
          <p className="mt-1 text-sm text-muted">
            Everything assigned to you, plus the queues that need attention today.
          </p>
        </div>
          <Link href="/studio/articles/new" className="btn btn-primary">
            Start a new story
          </Link>
        </div>
      </header>

      <section aria-label="Work overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="card group p-5"
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{stat.label}</p>
                <Icon className="h-4 w-4 text-navy/60" aria-hidden />
              </div>
              <p className="stat-value mt-3">{stat.value}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy group-hover:text-red">
                Open queue <ArrowRight className="h-3 w-3" aria-hidden />
              </p>
            </Link>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-lg">Your recent work</h2>
              <p className="text-xs text-muted">Updated drafts, submissions and published stories.</p>
            </div>
            <Link href="/studio/articles" className="text-xs font-semibold text-navy hover:text-red">
              All stories
            </Link>
          </div>

          {feed.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-serif text-xl text-navy">No stories yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                Start with a headline and a short summary. You can save a draft at any point and
                submit it for editorial review when it is ready.
              </p>
              <Link href="/studio/articles/new" className="btn btn-primary mt-5">
                Write your first story
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th scope="col">Story</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {feed.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link
                          href={`/studio/articles/${item.id}`}
                          className="font-semibold text-ink hover:text-red"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-muted">
                          {item.categoryName ?? "Uncategorised"}
                          {item.authorNames ? ` · ${item.authorNames}` : ""}
                        </p>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="whitespace-nowrap text-xs text-muted">
                        {relativeTime(item.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <h2 className="text-lg">How publishing works</h2>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                ["Draft", "You write and revise. Saves are versioned automatically."],
                ["Editorial review", "An editor other than the author checks standards and approves."],
                ["Admin approval", "An administrator who did not author or edit the story gives final approval."],
                ["Publish or schedule", "Publishing is recorded with revision, actor and timestamp."],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{title}</p>
                    <p className="text-xs leading-relaxed text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded border border-line bg-mist px-3 py-2 text-xs leading-relaxed text-muted">
              Separation of duties is enforced by the system: no one can approve their own story,
              and final approval must come from someone who was not the editorial reviewer.
            </p>
          </section>

          <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg">Notifications</h2>
              <Link href="/studio/notifications" className="text-xs font-semibold text-navy hover:text-red">
                View all
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">You are all caught up.</p>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((item) => (
                  <li key={item.id} className="px-5 py-3">
                    <Link href={item.link ?? "/studio"} className="text-sm font-semibold text-ink hover:text-red">
                      {item.title}
                    </Link>
                    {item.body ? <p className="mt-0.5 text-xs text-muted">{item.body}</p> : null}
                    <p className="mt-1 text-[11px] text-muted">{relativeTime(item.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
