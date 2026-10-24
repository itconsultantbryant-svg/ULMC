import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access restricted",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-line bg-white p-8 text-center">
      <p className="kicker">Permission required</p>
      <h1 className="mt-2 font-serif text-3xl text-navy">This area is restricted</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Your account does not have permission to view this part of the workspace. If you believe you
        need access, contact a department administrator.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/studio" className="btn btn-primary">
          Back to dashboard
        </Link>
        <Link href="/" className="btn btn-outline">
          Public site
        </Link>
      </div>
    </div>
  );
}
