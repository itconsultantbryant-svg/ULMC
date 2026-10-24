"use client";

import { useEffect, useState } from "react";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const url = () => pageUrl || (typeof window === "undefined" ? "" : window.location.href);

  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url: url() });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted">Share</span>
      <button type="button" onClick={share} className="btn btn-outline btn-sm">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {copied ? "Link copied" : "Share"}
      </button>
      <a
        href={x}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline btn-sm"
        aria-label="Share on X"
      >
        X
      </a>
      <a
        href={facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline btn-sm"
        aria-label="Share on Facebook"
      >
        Facebook
      </a>
      <a
        href={`mailto:?subject=${encodeURIComponent(title)}`}
        className="btn btn-outline btn-sm"
        aria-label="Share by email"
        onClick={(event) => {
          event.currentTarget.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
            url(),
          )}`;
        }}
      >
        Email
      </a>
    </div>
  );
}
