import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Unsubscribe } from "@/components/site/newsletter-actions";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; sig?: string }>;
}) {
  const { id = "", sig = "" } = await searchParams;

  return (
    <>
      <PageHeader
        kicker="Newsletter"
        title="Unsubscribe"
        lede="Stop receiving occasional email updates from the department."
      />
      <div className="container-page max-w-xl py-9">
        <Unsubscribe id={id} sig={sig} />
        <p className="mt-6 text-sm text-muted">
          You can also contact the department through the <Link href="/contact" className="underline">contact page</Link>.
        </p>
      </div>
    </>
  );
}
