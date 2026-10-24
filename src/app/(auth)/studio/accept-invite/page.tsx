import type { Metadata } from "next";
import Link from "next/link";
import { findInvitationByToken } from "@/server/users";
import { AcceptInviteForm } from "./accept-form";

export const metadata: Metadata = {
  title: "Accept invitation",
  robots: { index: false, follow: false },
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const invitation = await findInvitationByToken(token);

  if (!invitation) {
    return (
      <div>
        <p className="kicker">Invitation</p>
        <h1 className="mt-1 text-3xl leading-tight">This invitation is not available</h1>
        <p className="mt-2 text-sm text-muted">
          The link may have expired, already been used, or been revoked. Ask the person who invited you
          to send a new invitation.
        </p>
        <Link href="/studio/login" className="btn btn-outline mt-6">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="kicker">Invitation · {invitation.role}</p>
      <h1 className="mt-1 text-3xl leading-tight">Set up your account</h1>
      <p className="mt-2 text-sm text-muted">
        You are accepting an invitation for <strong className="text-ink">{invitation.email}</strong>.
        Choose the name that will appear on your byline and a password of at least 12 characters.
      </p>
      <AcceptInviteForm token={token} defaultName={invitation.name ?? ""} email={invitation.email} />
      <p className="mt-6 text-sm">
        <Link href="/studio/login" className="text-navy underline underline-offset-4 hover:text-red">
          Already set up? Sign in
        </Link>
      </p>
    </div>
  );
}
