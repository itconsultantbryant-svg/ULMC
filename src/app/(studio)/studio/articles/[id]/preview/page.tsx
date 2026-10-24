import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDate } from "@/lib/format";
import { can } from "@/server/permissions";
import { requirePagePermission } from "@/server/session";
import { canEditArticle, getStudioArticle, STATUS_LABELS } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Preview story",
  robots: { index: false, follow: false },
};

export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requirePagePermission("article.preview", `/studio/articles/${id}/preview`);
  const detail = await getStudioArticle(id);
  if (!detail) notFound();

  const mayReview =
    canEditArticle(user, detail) ||
    can(user, "article.editAny") ||
    can(user, "editorial.approve") ||
    can(user, "admin.approve");
  if (!mayReview) redirect("/studio/forbidden");

  const { article, revision } = detail;
  const title = revision?.title ?? article.slug;
  const byline = detail.authors.map((a) => a.bylineName ?? a.name).join(", ") || "Staff writer";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning-tint px-4 py-3 text-xs text-warning-deep">
        <p className="font-semibold">
          Preview · working revision · {STATUS_LABELS[article.workflowStatus] ?? article.workflowStatus}
        </p>
        <Link href={`/studio/articles/${article.id}`} className="font-semibold underline underline-offset-4">
          Back to editor
        </Link>
      </div>

      <article className="rounded-lg border border-line bg-white px-6 py-8 sm:px-10">
        <p className="kicker">{detail.category?.name ?? "Newsroom"}</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">{title}</h1>
        {revision?.summary ? <p className="mt-3 text-lg text-muted">{revision.summary}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-line py-3 text-xs text-muted">
          <span>By {byline}</span>
          <span aria-hidden>·</span>
          <time dateTime={(revision?.createdAt ?? article.updatedAt).toISOString()}>
            {formatDate(revision?.createdAt ?? article.updatedAt)}
          </time>
          <span aria-hidden>·</span>
          <span className="font-mono text-[11px]">{article.slug}</span>
        </div>
        {revision?.bodyHtml ? (
          <div className="prose-article mt-6" dangerouslySetInnerHTML={{ __html: revision.bodyHtml }} />
        ) : (
          <p className="mt-6 rounded border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
            This revision has no body yet.
          </p>
        )}
        {detail.tags.length > 0 ? (
          <ul className="mt-8 flex flex-wrap gap-2 border-t border-line pt-4">
            {detail.tags.map((tag) => (
              <li key={tag.slug} className="rounded-full bg-mist px-3 py-1 text-xs text-muted">
                {tag.name}
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </div>
  );
}
