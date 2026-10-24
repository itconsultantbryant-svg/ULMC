import type { Metadata } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/server/session";
import { listAllCategories, listAllTags } from "@/server/studio/queries";
import { TaxonomyManager } from "./taxonomy-manager";

export const metadata: Metadata = {
  title: "Taxonomy",
  robots: { index: false, follow: false },
};

export default async function TaxonomyPage() {
  await requirePagePermission("taxonomy.manage", "/studio/content/taxonomy");
  const [categories, tags] = await Promise.all([listAllCategories(), listAllTags()]);

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">
          <Link href="/studio/content" className="hover:text-red">Content</Link> · Taxonomy
        </p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Categories and tags</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Categories group reporting by desk; tags describe topics across desks. Slugs are generated automatically when left blank.
        </p>
      </header>
      <TaxonomyManager
        categories={categories.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          kind: row.kind,
          description: row.description,
          orderIndex: row.orderIndex,
          isActive: row.isActive,
        }))}
        tags={tags.map((row) => ({ id: row.id, name: row.name, slug: row.slug }))}
      />
    </div>
  );
}
