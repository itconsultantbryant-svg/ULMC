"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { relativeTime } from "@/lib/format";

type Comment = {
  id: string;
  displayName: string;
  body: string;
  createdAt: string;
};

export function CommentsSection({
  slug,
  commentsClosed,
}: {
  slug: string;
  commentsClosed: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { comments?: Comment[] };
      setComments(payload.comments ?? []);
    } finally {
      setLoaded(true);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          body: String(form.get("body") ?? ""),
          consent: form.get("consent") === "on",
          website: String(form.get("website") ?? ""),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error ?? "We could not submit your comment. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(
        payload.message ??
          "Thank you. Your comment has been received and will appear after moderation.",
      );
      event.currentTarget.reset();
      await load();
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-12 border-t border-line pt-8">
      <h2 id="comments-heading" className="font-serif text-2xl text-navy">
        Comments
      </h2>
      <p className="mt-1 text-sm text-muted">
        Comments are moderated against our{" "}
        <Link href="/policies/comments" className="underline">
          comments policy
        </Link>
        . Approved comments appear below; email addresses are never published.
      </p>

      {commentsClosed ? (
        <p className="mt-5 rounded border border-line bg-mist px-4 py-3 text-sm text-muted">
          Comments are closed for this story.
        </p>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          <div>
            {!loaded ? (
              <p className="text-sm text-muted">Loading comments…</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted">
                No approved comments yet. Be the first to contribute to the discussion.
              </p>
            ) : (
              <ul className="space-y-5">
                {comments.map((comment) => (
                  <li key={comment.id} className="border-l-2 border-line pl-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-sm font-semibold text-ink">{comment.displayName}</p>
                      <time className="text-xs text-muted" dateTime={comment.createdAt}>
                        {relativeTime(comment.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink/90">
                      {comment.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-line bg-mist/50 p-4">
            <h3 className="font-sans text-sm font-bold text-navy">Add a comment</h3>
            {status === "success" ? (
              <p role="status" className="mt-2 rounded bg-success-tint px-3 py-2 text-sm text-success">
                {message}
              </p>
            ) : null}
            <form onSubmit={onSubmit} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="comment-name" className="label">
                    Display name
                  </label>
                  <input
                    id="comment-name"
                    name="name"
                    required
                    maxLength={80}
                    autoComplete="name"
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="comment-email" className="label">
                    Email (not published)
                  </label>
                  <input
                    id="comment-email"
                    name="email"
                    type="email"
                    required
                    maxLength={200}
                    autoComplete="email"
                    className="field"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="comment-body" className="label">
                  Comment
                </label>
                <textarea
                  id="comment-body"
                  name="body"
                  required
                  minLength={2}
                  maxLength={4000}
                  rows={5}
                  className="field resize-y"
                />
                <p className="help">Maximum 4,000 characters. Links may be removed.</p>
              </div>
              <div className="hidden" aria-hidden="true">
                <label htmlFor="comment-website">Website</label>
                <input id="comment-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 flex-none accent-[#10104F]" />
                <span>
                  I understand that my comment will be reviewed before publication and may be edited
                  for length or clarity.
                </span>
              </label>
              {status === "error" ? (
                <p role="alert" className="text-sm font-semibold text-red-deep">
                  {message}
                </p>
              ) : null}
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Submitting…" : "Submit comment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
