import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { relativeTime } from "@/lib/format";
import { can } from "@/server/permissions";
import { requirePagePermission } from "@/server/session";
import { listStudioArticles } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Stories",
  robots: { index: false, follow: false },
};

const TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "editorially_approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
];

export default async function StudioArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; scope?: string }>;
}) {
  const { user } = await requirePagePermission("article.create", "/studio/articles");
  const params = await searchParams;
  const status = params.status ?? "all";
  const q = params.q ?? "";
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const scope = params.scope === "all" && can(user, "article.editAny") ? "all" : "mine";

  const { rows, total, perPage } = await listStudioArticles(user, { status, q, page, scope });
  const totalPages = Math.ceil(total / perPage);
  const canSeeAll = can(user, "article.editAny");

  function tabHref(value: string) {
    const search = new URLSearchParams();
    if (value !== "all") search.set("status", value);
    if (q) search.set("q", q);
    if (scope === "all") search.set("scope", "all");
    const qs = search.toString();
    return qs ? `/studio/articles?${qs}` : "/studio/articles";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Newsroom</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Stories</h1>
          <p className="mt-1 text-sm text-muted">
            {total} {total === 1 ? "story" : "stories"} {scope === "all" ? "across the newsroom" : "in your workspace"}.
          </p>
        </div>
        <Link href="/studio/articles/new" className="btn btn-primary">
          New story
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tabHref(tab.value)}
              role="tab"
              aria-selected={status === tab.value}
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

        <form action="/studio/articles" className="flex items-center gap-2">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          {scope === "all" ? <input type="hidden" name="scope" value="all" /> : null}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="q" className="sr-only">
              Search stories
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search title or slug"
              className="field py-2 pl-9 text-sm"
            />
          </div>
          <button type="submit" className="btn btn-outline btn-sm">
            Search
          </button>
        </form>
      </div>

      {canSeeAll ? (
        <div className="flex gap-2 text-xs">
          <Link
            href={tabHref(status)}
            className={`rounded px-2 py-1 font-semibold ${scope === "mine" ? "bg-white text-navy shadow-sm" : "text-muted hover:text-navy"}`}
          >
            My work
          </Link>
          <Link
            href={`/studio/articles?scope=all${status !== "all" ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded px-2 py-1 font-semibold ${scope === "all" ? "bg-white text-navy shadow-sm" : "text-muted hover:text-navy"}`}
          >
            All newsroom
          </Link>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No stories match these filters"
          action={
            <Link href="/studio/articles/new" className="btn btn-primary">
              Start a story
            </Link>
          }
        >
          Try a different status or clear the search. New stories begin as private drafts.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="table-clean">
            <thead>
              <tr>
                <th scope="col">Story</th>
                <th scope="col">Byline</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-md">
                    <Link href={`/studio/articles/${row.id}`} className="font-semibold text-ink hover:text-red">
                      {row.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {row.categoryName ?? "Uncategorised"}
                      {row.revisionNumber ? ` · revision ${row.revisionNumber}` : ""}
                    </p>
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">{row.authorNames ?? "—"}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">{relativeTime(row.updatedAt)}</td>
                  <td className="text-right">
                    <Link href={`/studio/articles/${row.id}`} className="text-xs font-semibold text-navy hover:text-red">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/studio/articles"
        params={{ status: status === "all" ? undefined : status, q: q || undefined, scope: scope === "all" ? "all" : undefined }}
      />
    </div>
  );
}
