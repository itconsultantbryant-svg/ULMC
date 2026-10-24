import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/session";
import { getSitePageById } from "@/server/studio/queries";
import { PageEditor } from "./page-editor";

export const metadata: Metadata = {
  title: "Edit page",
  robots: { index: false, follow: false },
};

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePagePermission("institutional.manage", `/studio/content/pages/${id}`);
  const page = await getSitePageById(id);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="kicker">
          <Link href="/studio/content" className="hover:text-red">Content</Link> · Site page
        </p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Edit page</h1>
      </header>
      <PageEditor
        id={page.id}
        slug={page.slug}
        initial={{
          title: page.title,
          bodyHtml: page.bodyHtml,
          section: page.section,
          orderIndex: page.orderIndex,
          isPublished: page.isPublished,
        }}
      />
    </div>
  );
}
