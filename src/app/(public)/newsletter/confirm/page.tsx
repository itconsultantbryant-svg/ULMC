import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmSubscription } from "@/components/site/newsletter-actions";

export const metadata: Metadata = {
  title: "Confirm newsletter subscription",
  robots: { index: false, follow: false },
};

export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <>
      <PageHeader
        kicker="Newsletter"
        title="Confirm your subscription"
        lede="Confirm that you want to receive occasional email updates from the department."
      />
      <div className="container-page max-w-xl py-9">
        <ConfirmSubscription token={token} />
        <p className="mt-6 text-sm text-muted">
          Changed your mind? Return to the <Link href="/news" className="underline">newsroom</Link>.
        </p>
      </div>
    </>
  );
}
