import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime, relativeTime } from "@/lib/format";
import { requirePagePermission } from "@/server/session";
import { listCommentsForModeration } from "@/server/studio/queries";
import { CommentActions } from "./comment-actions";

export const metadata: Metadata = {
  title: "Comment moderation",
  robots: { index: false, follow: false },
};

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "spam", label: "Spam" },
  { value: "all", label: "All" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning-tint text-warning",
  approved: "bg-success-tint text-success",
  rejected: "bg-mist text-muted",
  spam: "bg-red-tint text-red-deep",
  deleted: "bg-mist text-muted",
};

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requirePagePermission("comments.moderate", "/studio/comments");
  const params = await searchParams;
  const status = params.status ?? "pending";
  const q = params.q ?? "";
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const { rows, total, perPage } = await listCommentsForModeration({ status, q, page });
  const totalPages = Math.ceil(total / perPage);

  function hrefFor(nextStatus: string) {
    const search = new URLSearchParams();
    if (nextStatus !== "pending") search.set("status", nextStatus);
    if (q) search.set("q", q);
    const qs = search.toString();
    return qs ? `/studio/comments?${qs}` : "/studio/comments";
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Community</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Comment moderation</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Comments are held for moderation before appearing publicly. Approve constructive
          contributions; reject or remove abuse, spam and off-topic material.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={hrefFor(tab.value)}
              aria-current={status === tab.value ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                status === tab.value
                  ? "bg-navy text-white"
                  : "border border-line bg-white text-ink hover:border-navy"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <form action="/studio/comments" className="flex items-center gap-2">
          {status !== "pending" ? <input type="hidden" name="status" value={status} /> : null}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="comment-q" className="sr-only">
              Search comments
            </label>
            <input
              id="comment-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search comments or names"
              className="field py-2 pl-9 text-sm"
            />
          </div>
          <button type="submit" className="btn btn-outline btn-sm">
            Search
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No comments in this view">
          When readers comment, new submissions will wait here for moderation.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{row.authorName}</p>
                  <p className="text-xs text-muted">
                    {row.authorEmail ? `${row.authorEmail} · ` : ""}
                    {relativeTime(row.createdAt)} · {formatDateTime(row.createdAt)}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    STATUS_STYLES[row.status] ?? "bg-mist text-muted"
                  }`}
                >
                  {row.status}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{row.body}</p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <p className="text-xs text-muted">
                  On{" "}
                  <Link
                    href={`/studio/articles/${row.articleId}`}
                    className="font-semibold text-navy hover:text-red"
                  >
                    {row.articleTitle ?? "story"}
                  </Link>
                </p>
                <CommentActions commentId={row.id} />
              </div>
              {row.moderationNote ? (
                <p className="mt-2 text-xs text-muted">Moderator note: {row.moderationNote}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/studio/comments"
        params={{ status: status === "pending" ? undefined : status, q: q || undefined }}
      />
    </div>
  );
}
