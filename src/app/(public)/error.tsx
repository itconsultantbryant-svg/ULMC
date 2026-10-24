"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page max-w-2xl py-20">
      <p className="kicker">Something went wrong</p>
      <h1 className="mt-2 text-4xl leading-tight">We could not load this page</h1>
      <p className="mt-3 text-muted">
        This may be a temporary problem. Please try again. If it continues, contact the department
        and mention the reference below.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-muted">Reference: {error.digest}</p>
      ) : null}
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
