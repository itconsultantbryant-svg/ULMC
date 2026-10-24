"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ExternalLink, Eye, Save } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/studio/rich-text-editor";
import { relativeTime } from "@/lib/format";
import type { StudioArticleDetail } from "@/server/studio/queries";

type CategoryOption = { id: string; name: string };
type AuthorOption = { id: string; name: string; role: string | null; title: string | null };
type MediaOption = {
  id: string;
  originalName: string | null;
  alt: string;
  caption: string | null;
  credit: string | null;
  mimeType: string;
};

export type EditorPermissions = {
  canEdit: boolean;
  canManageByline: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canApproveAdmin: boolean;
  canPublish: boolean;
  canSchedule: boolean;
  canUnpublish: boolean;
  canArchive: boolean;
  canAssign: boolean;
};

type FormState = {
  title: string;
  subtitle: string;
  summary: string;
  bodyHtml: string;
  categoryId: string;
  contentType: string;
  authorIds: string[];
  tagNames: string;
  heroMediaId: string;
  heroAlt: string;
  heroCaption: string;
  heroCredit: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  allowComments: boolean;
  slug: string;
};

const CONTENT_TYPES = [
  ["news", "Department news"],
  ["campus", "Campus news"],
  ["education", "Education"],
  ["community", "Community reporting"],
  ["media_society", "Media and society"],
  ["research", "Research"],
  ["feature", "Feature"],
  ["opinion", "Opinion and analysis"],
  ["student", "Student journalism"],
  ["announcement", "Announcement"],
  ["sponsored", "Sponsored"],
] as const;

const CHECKLIST: { key: string; label: string }[] = [
  { key: "sources_verified", label: "Sources verified and claims supported" },
  { key: "image_rights", label: "Images are owned or cleared for use" },
  { key: "captions_credit", label: "Captions, credits and alt text are complete" },
  { key: "accessibility", label: "Headings, links and formatting are accessible" },
  { key: "quality", label: "Headline, summary and body meet editorial standards" },
];

type DialogKind =
  | "submit"
  | "request_changes"
  | "editorial_approve"
  | "editorial_reject"
  | "admin_approve"
  | "admin_return"
  | "admin_reject"
  | "schedule"
  | "unpublish"
  | "archive"
  | "publish";

const EDITABLE_STATUSES = new Set(["draft", "changes_requested"]);

function toPayload(form: FormState) {
  return {
    title: form.title,
    subtitle: form.subtitle,
    summary: form.summary,
    bodyHtml: form.bodyHtml,
    categoryId: form.categoryId,
    contentType: form.contentType,
    authorIds: form.authorIds,
    tagNames: form.tagNames
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    heroMediaId: form.heroMediaId || null,
    heroAlt: form.heroAlt,
    heroCaption: form.heroCaption,
    heroCredit: form.heroCredit,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    canonicalUrl: form.canonicalUrl,
    allowComments: form.allowComments,
    slug: form.slug,
  };
}

function initialForm(detail: StudioArticleDetail): FormState {
  const revision = detail.revision;
  return {
    title: revision?.title ?? "",
    subtitle: revision?.subtitle ?? "",
    summary: revision?.summary ?? "",
    bodyHtml: revision?.bodyHtml ?? "<p></p>",
    categoryId: detail.article.categoryId ?? detail.category?.id ?? "",
    contentType: detail.article.contentType,
    authorIds: detail.authors.length ? detail.authors.map((author) => author.userId) : [],
    tagNames: detail.tags.map((tag) => tag.name).join(", "),
    heroMediaId: revision?.heroMediaId ?? "",
    heroAlt: revision?.heroAlt ?? "",
    heroCaption: revision?.heroCaption ?? "",
    heroCredit: revision?.heroCredit ?? "",
    seoTitle: revision?.seoTitle ?? "",
    seoDescription: revision?.seoDescription ?? "",
    canonicalUrl: revision?.canonicalUrl ?? "",
    allowComments: detail.article.allowComments,
    slug: revision?.slugOverride ?? detail.article.slug,
  };
}

export function ArticleEditor({
  detail,
  categories,
  authors,
  media,
  permissions,
  currentUserId,
}: {
  detail: StudioArticleDetail;
  categories: CategoryOption[];
  authors: AuthorOption[];
  media: MediaOption[];
  permissions: EditorPermissions;
  currentUserId: string;
}) {
  const router = useRouter();
  const editableStatus = EDITABLE_STATUSES.has(detail.article.workflowStatus);
  const canEdit = permissions.canEdit && editableStatus && Boolean(detail.revision);
  const [form, setForm] = useState<FormState>(() => initialForm(detail));
  const baselineRef = useRef(JSON.stringify(toPayload(initialForm(detail))));
  const [version, setVersion] = useState(detail.revision?.version ?? 1);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error" | "conflict">("saved");
  const [saveError, setSaveError] = useState("");
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const payloadString = JSON.stringify(toPayload(form));
  const dirty = payloadString !== baselineRef.current;
  const wordCount = useMemo(
    () => form.bodyHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length,
    [form.bodyHtml],
  );

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaveState("unsaved");
  }, []);

  const save = useCallback(
    async (options: { silent?: boolean } = {}): Promise<boolean> => {
      if (!canEdit || !detail.revision) return false;
      if (!options.silent) setSaveState("saving");
      setSaveError("");
      try {
        const response = await fetch(`/api/studio/articles/${detail.article.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            revisionId: detail.revision.id,
            expectedVersion: version,
            input: toPayload(form),
          }),
        });
        const result = (await response.json()) as {
          version?: number;
          error?: string;
          code?: string;
          details?: { issues?: { message: string }[] };
        };
        if (!response.ok) {
          if (result.code === "conflict" || result.code === "locked") {
            setSaveState("conflict");
            setSaveError(result.error ?? "This draft changed elsewhere. Reload before saving.");
          } else {
            setSaveState("error");
            const issues = result.details?.issues?.map((issue) => issue.message).filter(Boolean);
            setSaveError(issues?.length ? issues.join(" · ") : (result.error ?? "Could not save."));
          }
          return false;
        }
        if (typeof result.version === "number") setVersion(result.version);
        baselineRef.current = payloadString;
        setSaveState("saved");
        return true;
      } catch {
        setSaveState("error");
        setSaveError("Network error while saving.");
        return false;
      }
    },
    [canEdit, detail.article.id, detail.revision, form, payloadString, version],
  );

  useEffect(() => {
    if (!canEdit || !dirty || saveState === "conflict") return;
    const timer = window.setTimeout(() => {
      void save({ silent: true });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [canEdit, dirty, payloadString, save, saveState]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (canEdit) void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, save]);

  async function runAction(action: string, extra: Record<string, unknown> = {}) {
    if (action === "submit" && dirty) {
      setActionError("Save your changes before submitting for review.");
      return false;
    }
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/studio/articles/${detail.article.id}/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          revisionId: detail.revision?.id,
          expectedVersion: version,
          ...extra,
        }),
      });
      const result = (await response.json()) as { error?: string; slug?: string };
      if (!response.ok) {
        setActionError(result.error ?? "The action could not be completed.");
        setBusy(false);
        return false;
      }
      setDialog(null);
      setBusy(false);
      router.refresh();
      return true;
    } catch {
      setActionError("Network error. Please try again.");
      setBusy(false);
      return false;
    }
  }

  const latestReview = detail.reviews.find((review) => !review.invalidatedAt);
  const changesRequested =
    latestReview &&
    (latestReview.decision === "changes_requested" || latestReview.decision === "rejected")
      ? latestReview
      : null;
  const status = detail.article.workflowStatus;
  const hero = media.find((asset) => asset.id === form.heroMediaId) ?? null;

  const primaryActions: { label: string; kind: DialogKind; tone?: "primary" | "outline" }[] = [];
  if (canEdit && (status === "draft" || status === "changes_requested") && permissions.canSubmit) {
    primaryActions.push({ label: "Submit for review", kind: "submit" });
  }
  if ((status === "submitted" || status === "resubmitted") && permissions.canReview) {
    primaryActions.push({ label: "Start editorial review", kind: "submit" });
  }
  if (status === "in_review" && permissions.canReview) {
    primaryActions.push({ label: "Approve editorially", kind: "editorial_approve" });
    primaryActions.push({ label: "Request changes", kind: "request_changes", tone: "outline" });
  }
  if (status === "editorially_approved" && permissions.canApproveAdmin) {
    primaryActions.push({ label: "Give final approval", kind: "admin_approve" });
    primaryActions.push({ label: "Return to editor", kind: "admin_return", tone: "outline" });
  }
  if (status === "admin_approved" && permissions.canPublish) {
    primaryActions.push({ label: "Publish now", kind: "publish" });
    if (permissions.canSchedule) primaryActions.push({ label: "Schedule", kind: "schedule", tone: "outline" });
  }
  if (status === "scheduled" && permissions.canSchedule) {
    primaryActions.push({ label: "Publish now", kind: "publish" });
  }
  if (status === "published" && permissions.canUnpublish) {
    primaryActions.push({ label: "Unpublish", kind: "unpublish", tone: "outline" });
  }

  const showReplacement =
    permissions.canEdit &&
    ["published", "rejected", "archived", "unpublished", "admin_approved", "scheduled"].includes(status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/studio/articles" className="text-xs font-semibold text-muted hover:text-navy">
            ← Stories
          </Link>
          <StatusBadge status={status} />
          {detail.revision ? (
            <span className="text-xs text-muted">
              Revision {detail.revision.revisionNumber} · v{version}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <span
                className={`text-xs ${
                  saveState === "error" || saveState === "conflict"
                    ? "text-red-deep"
                    : "text-muted"
                }`}
                role="status"
              >
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "unsaved"
                    ? "Unsaved changes"
                    : saveState === "conflict"
                      ? "Save conflict"
                      : saveState === "error"
                        ? "Save failed"
                        : "All changes saved"}
              </span>
              <button
                type="button"
                onClick={() => void save()}
                disabled={!dirty || busy}
                className="btn btn-outline btn-sm"
              >
                <Save className="h-4 w-4" aria-hidden />
                Save draft
              </button>
            </>
          ) : null}
          {detail.revision ? (
            <Link
              href={`/studio/articles/${detail.article.id}/preview`}
              className="btn btn-outline btn-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="h-4 w-4" aria-hidden />
              Preview
            </Link>
          ) : null}
          {status === "published" ? (
            <Link
              href={`/news/${detail.article.slug}`}
              className="btn btn-outline btn-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              View live
            </Link>
          ) : null}
          {primaryActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                setActionError("");
                if (action.kind === "submit" && status === "submitted") {
                  void runAction("claim_review");
                } else if (action.kind === "submit" && status === "resubmitted") {
                  void runAction("claim_review");
                } else {
                  setDialog(action.kind);
                }
              }}
              className={`btn btn-sm ${action.tone === "outline" ? "btn-outline" : "btn-primary"}`}
              disabled={busy}
            >
              {action.label}
            </button>
          ))}
          {showReplacement ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void runAction("replacement_draft")}
              disabled={busy}
            >
              Start replacement draft
            </button>
          ) : null}
        </div>
      </div>

      {saveError ? (
        <div role="alert" className="rounded border border-red/30 bg-red-tint px-4 py-3 text-sm text-red-deep">
          {saveError}
          {saveState === "conflict" ? (
            <button type="button" onClick={() => router.refresh()} className="ml-2 underline">
              Reload
            </button>
          ) : null}
        </div>
      ) : null}
      {actionError && !dialog ? (
        <div role="alert" className="rounded border border-red/30 bg-red-tint px-4 py-3 text-sm text-red-deep">
          {actionError}
        </div>
      ) : null}

      {changesRequested ? (
        <div className="rounded border border-warning/40 bg-warning-tint px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-warning">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {changesRequested.decision === "rejected" ? "Editorial rejection" : "Changes requested"}
          </p>
          <p className="mt-1 text-ink">{changesRequested.note || "See the editorial note."}</p>
          <p className="mt-1 text-xs text-muted">
            {changesRequested.editorName ?? "Editor"} · {relativeTime(changesRequested.createdAt)}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <section className="space-y-4 rounded-lg border border-line bg-white p-5">
            <div>
              <label htmlFor="story-title" className="label">
                Headline
              </label>
              <input
                id="story-title"
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                disabled={!canEdit}
                maxLength={180}
                className="field font-serif text-xl font-semibold"
              />
            </div>
            <div>
              <label htmlFor="story-subtitle" className="label">
                Subtitle <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="story-subtitle"
                value={form.subtitle}
                onChange={(event) => setField("subtitle", event.target.value)}
                disabled={!canEdit}
                maxLength={240}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="story-summary" className="label">
                Summary / standfirst
              </label>
              <textarea
                id="story-summary"
                value={form.summary}
                onChange={(event) => setField("summary", event.target.value)}
                disabled={!canEdit}
                rows={3}
                maxLength={600}
                className="field"
              />
              <p className="mt-1 text-xs text-muted">{form.summary.length}/600</p>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Body</h2>
              <span className="text-xs text-muted">
                {wordCount} {wordCount === 1 ? "word" : "words"} · approx.{" "}
                {Math.max(1, Math.ceil(wordCount / 220))} min read
              </span>
            </div>
            {canEdit ? (
              <RichTextEditor
                key={detail.revision?.id}
                initialHtml={form.bodyHtml}
                onChange={(html) => setField("bodyHtml", html)}
              />
            ) : (
              <div
                className="prose-article rounded-lg border border-line bg-white p-6"
                dangerouslySetInnerHTML={{ __html: form.bodyHtml }}
              />
            )}
          </section>

          {detail.reviews.length > 0 || detail.approvals.length > 0 ? (
            <section className="rounded-lg border border-line bg-white p-5">
              <h2 className="text-lg">Review history</h2>
              <ol className="mt-3 space-y-3">
                {detail.reviews.map((review) => (
                  <li key={review.id} className="border-l-2 border-line pl-3 text-sm">
                    <p className="font-semibold text-ink">
                      {review.decision.replaceAll("_", " ")} · {review.editorName ?? "Editor"}
                    </p>
                    {review.note ? <p className="mt-0.5 text-muted">{review.note}</p> : null}
                    <p className="mt-0.5 text-xs text-muted">
                      {relativeTime(review.createdAt)}
                      {review.invalidatedAt ? " · superseded" : ""}
                    </p>
                  </li>
                ))}
                {detail.approvals.map((approval) => (
                  <li key={approval.id} className="border-l-2 border-navy/30 pl-3 text-sm">
                    <p className="font-semibold text-ink">
                      Final decision: {approval.decision} · {approval.adminName ?? "Administrator"}
                    </p>
                    {approval.reason ? <p className="mt-0.5 text-muted">{approval.reason}</p> : null}
                    <p className="mt-0.5 text-xs text-muted">{relativeTime(approval.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Publication</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Status</dt>
                <dd>
                  <StatusBadge status={status} />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Created</dt>
                <dd>{relativeTime(detail.article.createdAt)}</dd>
              </div>
              {detail.article.publishedAt ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Published</dt>
                  <dd>{relativeTime(detail.article.publishedAt)}</dd>
                </div>
              ) : null}
              {detail.article.scheduledFor ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Scheduled</dt>
                  <dd>{relativeTime(detail.article.scheduledFor)}</dd>
                </div>
              ) : null}
            </dl>
            {status === "scheduled" && permissions.canSchedule ? (
              <button
                type="button"
                className="btn btn-outline btn-sm mt-3 w-full"
                onClick={() => void runAction("cancel_schedule")}
                disabled={busy}
              >
                Cancel schedule
              </button>
            ) : null}
            {permissions.canArchive && !["archived", "published", "scheduled"].includes(status) ? (
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-muted hover:text-red-deep"
                onClick={() => setDialog("archive")}
              >
                Archive this story
              </button>
            ) : null}
          </section>

          <section className="space-y-3 rounded-lg border border-line bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Organisation</h2>
            <div>
              <label htmlFor="category" className="label">
                Category
              </label>
              <select
                id="category"
                value={form.categoryId}
                onChange={(event) => setField("categoryId", event.target.value)}
                disabled={!canEdit}
                className="field"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="content-type" className="label">
                Story type
              </label>
              <select
                id="content-type"
                value={form.contentType}
                onChange={(event) => setField("contentType", event.target.value)}
                disabled={!canEdit}
                className="field"
              >
                {CONTENT_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="slug" className="label">
                URL slug
              </label>
              <input
                id="slug"
                value={form.slug}
                onChange={(event) => setField("slug", event.target.value)}
                disabled={!canEdit}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className="field font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-muted">/news/{form.slug || "…"}</p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowComments}
                onChange={(event) => setField("allowComments", event.target.checked)}
                disabled={!canEdit}
                className="mt-0.5"
              />
              Allow moderated comments
            </label>
          </section>

          <section className="space-y-3 rounded-lg border border-line bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Byline</h2>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {authors.map((author) => {
                const checked = form.authorIds.includes(author.id);
                const locked = !permissions.canManageByline && author.id !== currentUserId;
                return (
                  <label key={author.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!canEdit || locked}
                      onChange={(event) => {
                        setField(
                          "authorIds",
                          event.target.checked
                            ? [...form.authorIds, author.id]
                            : form.authorIds.filter((id) => id !== author.id),
                        );
                      }}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-ink">{author.name}</span>
                      <span className="block text-[11px] text-muted">
                        {author.title ?? author.role ?? "Contributor"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {!permissions.canManageByline ? (
              <p className="text-[11px] text-muted">
                Editors can add co-authors. Your byline must remain on stories you submit.
              </p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-lg border border-line bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Tags</h2>
            <label htmlFor="tags" className="sr-only">
              Tags, separated by commas
            </label>
            <input
              id="tags"
              value={form.tagNames}
              onChange={(event) => setField("tagNames", event.target.value)}
              disabled={!canEdit}
              placeholder="campus, journalism, media literacy"
              className="field"
            />
            <p className="text-[11px] text-muted">Up to 12 tags, separated by commas.</p>
          </section>

          <section className="space-y-3 rounded-lg border border-line bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Featured image</h2>
            {hero ? (
              <img
                src={`/media/${hero.id}`}
                alt={form.heroAlt || hero.alt || ""}
                className="aspect-[16/9] w-full rounded object-cover"
              />
            ) : null}
            <div>
              <label htmlFor="hero" className="label">
                Media asset
              </label>
              <select
                id="hero"
                value={form.heroMediaId}
                onChange={(event) => {
                  const asset = media.find((item) => item.id === event.target.value);
                  setField("heroMediaId", event.target.value);
                  if (asset) {
                    setForm((current) => ({
                      ...current,
                      heroMediaId: asset.id,
                      heroAlt: current.heroAlt || asset.alt,
                      heroCaption: current.heroCaption || asset.caption || "",
                      heroCredit: current.heroCredit || asset.credit || "",
                    }));
                  }
                }}
                disabled={!canEdit}
                className="field"
              >
                <option value="">No featured image</option>
                {media.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.originalName ?? asset.id.slice(0, 8)} ({asset.mimeType})
                  </option>
                ))}
              </select>
            </div>
            {form.heroMediaId ? (
              <>
                <div>
                  <label htmlFor="hero-alt" className="label">
                    Alt text (required)
                  </label>
                  <input
                    id="hero-alt"
                    value={form.heroAlt}
                    onChange={(event) => setField("heroAlt", event.target.value)}
                    disabled={!canEdit}
                    maxLength={300}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="hero-caption" className="label">
                    Caption
                  </label>
                  <input
                    id="hero-caption"
                    value={form.heroCaption}
                    onChange={(event) => setField("heroCaption", event.target.value)}
                    disabled={!canEdit}
                    maxLength={400}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="hero-credit" className="label">
                    Credit (required)
                  </label>
                  <input
                    id="hero-credit"
                    value={form.heroCredit}
                    onChange={(event) => setField("heroCredit", event.target.value)}
                    disabled={!canEdit}
                    maxLength={200}
                    className="field"
                  />
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted">
                Upload images in the <Link href="/studio/media" className="underline">media library</Link>.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-line bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Search and social</h2>
            <div>
              <label htmlFor="seo-title" className="label">
                SEO title
              </label>
              <input
                id="seo-title"
                value={form.seoTitle}
                onChange={(event) => setField("seoTitle", event.target.value)}
                disabled={!canEdit}
                maxLength={80}
                className="field"
              />
              <p className="mt-1 text-[11px] text-muted">{form.seoTitle.length}/80</p>
            </div>
            <div>
              <label htmlFor="seo-description" className="label">
                Meta description
              </label>
              <textarea
                id="seo-description"
                value={form.seoDescription}
                onChange={(event) => setField("seoDescription", event.target.value)}
                disabled={!canEdit}
                rows={3}
                maxLength={200}
                className="field"
              />
              <p className="mt-1 text-[11px] text-muted">{form.seoDescription.length}/200</p>
            </div>
            <div>
              <label htmlFor="canonical" className="label">
                Canonical URL
              </label>
              <input
                id="canonical"
                type="url"
                value={form.canonicalUrl}
                onChange={(event) => setField("canonicalUrl", event.target.value)}
                disabled={!canEdit}
                placeholder="https://…"
                className="field"
              />
            </div>
          </section>
        </aside>
      </div>

      {dialog ? (
        <ActionDialog
          kind={dialog}
          busy={busy}
          error={actionError}
          onClose={() => {
            if (!busy) {
              setDialog(null);
              setActionError("");
            }
          }}
          onSubmit={(extra) => {
            const mapping: Record<DialogKind, string> = {
              submit: "submit",
              request_changes: "request_changes",
              editorial_approve: "editorial_approve",
              editorial_reject: "editorial_reject",
              admin_approve: "admin_approve",
              admin_return: "admin_return",
              admin_reject: "admin_reject",
              schedule: "schedule",
              unpublish: "unpublish",
              archive: "archive",
              publish: "publish",
            };
            return runAction(mapping[dialog], extra);
          }}
        />
      ) : null}
    </div>
  );
}

function ActionDialog({
  kind,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  kind: DialogKind;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (extra: Record<string, unknown>) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const needsReason = ["request_changes", "editorial_reject", "admin_return", "admin_reject", "unpublish"].includes(kind);
  const isChecklist = kind === "editorial_approve";
  const isSchedule = kind === "schedule";

  const titles: Record<DialogKind, string> = {
    submit: "Submit for editorial review",
    request_changes: "Request changes",
    editorial_approve: "Editorial approval",
    editorial_reject: "Reject story",
    admin_approve: "Final approval",
    admin_return: "Return to editorial review",
    admin_reject: "Reject story",
    schedule: "Schedule publication",
    unpublish: "Unpublish story",
    archive: "Archive story",
    publish: "Publish now",
  };

  const allChecked = CHECKLIST.every((item) => checked[item.key]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const extra: Record<string, unknown> = {};
    if (needsReason) {
      if (reason.trim().length < 10) return;
      extra.reason = reason.trim();
    }
    if (isChecklist) {
      if (!allChecked) return;
      extra.checklist = { ...checked, notes: note.trim() || undefined };
    }
    if (isSchedule) {
      if (!scheduledFor) return;
      extra.scheduledFor = new Date(scheduledFor).toISOString();
    }
    await onSubmit(extra);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 id="action-dialog-title" className="font-serif text-xl text-navy">
          {titles[kind]}
        </h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {kind === "submit" ? (
            <p className="text-sm leading-relaxed text-muted">
              Submitting locks this revision and sends it to the editorial queue. You will be able to
              respond to editorial notes by creating a new draft revision if changes are requested.
            </p>
          ) : null}
          {kind === "admin_approve" ? (
            <p className="text-sm leading-relaxed text-muted">
              Final approval confirms editorial review is complete and the revision is ready to
              publish. You cannot approve a story you wrote or editorially reviewed.
            </p>
          ) : null}
          {kind === "publish" ? (
            <p className="text-sm leading-relaxed text-muted">
              This will make the story public immediately. The publication is recorded with your
              account and the current revision.
            </p>
          ) : null}
          {kind === "archive" ? (
            <p className="text-sm leading-relaxed text-muted">
              Archiving removes the story from active queues. Published stories must be unpublished
              first.
            </p>
          ) : null}
          {needsReason ? (
            <div>
              <label htmlFor="reason" className="label">
                Reason (required, at least 10 characters)
              </label>
              <textarea
                id="reason"
                required
                minLength={10}
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="field"
              />
            </div>
          ) : null}
          {isChecklist ? (
            <fieldset className="space-y-2">
              <legend className="label">Editorial checklist</legend>
              {CHECKLIST.map((item) => (
                <label key={item.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(checked[item.key])}
                    onChange={(event) => setChecked((current) => ({ ...current, [item.key]: event.target.checked }))}
                    className="mt-0.5"
                  />
                  {item.label}
                </label>
              ))}
              <div>
                <label htmlFor="note" className="label">
                  Note to the administration (optional)
                </label>
                <textarea
                  id="note"
                  rows={3}
                  maxLength={2000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="field"
                />
              </div>
              {!allChecked ? (
                <p className="text-xs text-muted">All checklist items are required to approve.</p>
              ) : null}
            </fieldset>
          ) : null}
          {isSchedule ? (
            <div>
              <label htmlFor="scheduled-for" className="label">
                Publication date and time
              </label>
              <input
                id="scheduled-for"
                type="datetime-local"
                required
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="field"
              />
              <p className="mt-1 text-xs text-muted">Times are interpreted in your local timezone.</p>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded border border-red/30 bg-red-tint px-3 py-2 text-sm text-red-deep">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || (isChecklist && !allChecked) || (needsReason && reason.trim().length < 10)}
            >
              {busy ? "Working…" : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
