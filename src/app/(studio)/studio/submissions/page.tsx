import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { requirePagePermission } from "@/server/session";
import { listContactMessages, listNewsletterSubscribers } from "@/server/studio/queries";
import { LiveRefresh } from "./live-refresh";
import { SubmissionActions } from "./submission-actions";

export const metadata: Metadata = { title: "Website submissions", robots: { index: false, follow: false } };

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePagePermission("submissions.manage", "/studio/submissions");
  const { status = "new" } = await searchParams;
  const [messages, subscribers] = await Promise.all([
    listContactMessages(["new", "reviewed", "closed", "all"].includes(status) ? status : "new"),
    listNewsletterSubscribers(),
  ]);

  return (
    <div className="space-y-8">
      <LiveRefresh />
      <header>
        <p className="kicker">Public website</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Website submissions</h1>
        <p className="mt-1 text-sm text-muted">New enquiries appear here automatically. This page refreshes every 15 seconds.</p>
      </header>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl">Contact enquiries</h2>
          <div className="flex gap-2 text-xs font-semibold">
            {["new", "reviewed", "closed", "all"].map((value) => <Link key={value} href={value === "new" ? "/studio/submissions" : `/studio/submissions?status=${value}`} className={status === value || (value === "new" && !status) ? "text-red" : "text-navy hover:text-red"}>{value[0].toUpperCase() + value.slice(1)}</Link>)}
          </div>
        </div>
        {messages.length === 0 ? <EmptyState title="No enquiries in this view">New contact-form messages will appear here.</EmptyState> : (
          <ul className="space-y-3">{messages.map((message) => <li key={message.id} className="rounded-lg border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-ink">{message.subject}</p><p className="text-xs text-muted">{message.name} · <a className="underline" href={`mailto:${message.email}`}>{message.email}</a> · {formatDateTime(message.createdAt)}</p></div><span className="rounded bg-mist px-2 py-0.5 text-xs font-semibold capitalize text-muted">{message.status}</span></div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{message.body}</p><div className="mt-3 border-t border-line pt-3"><SubmissionActions id={message.id} status={message.status} /></div>
          </li>)}</ul>
        )}
      </section>

      <section>
        <h2 className="text-xl">Newsletter requests</h2>
        <p className="mt-1 text-sm text-muted">Subscription requests are retained even if confirmation email delivery is temporarily unavailable.</p>
        {subscribers.length === 0 ? <EmptyState title="No newsletter requests yet" /> : <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white"><table className="table-clean"><thead><tr><th>Email</th><th>Status</th><th>Requested</th></tr></thead><tbody>{subscribers.map((subscriber) => <tr key={subscriber.id}><td>{subscriber.email}</td><td className="capitalize">{subscriber.status}</td><td className="whitespace-nowrap text-xs text-muted">{formatDateTime(subscriber.createdAt)}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
