import type { Metadata } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/server/session";
import { listCategoryOptions } from "@/server/studio/queries";
import { NewStoryForm } from "./new-story-form";

export const metadata: Metadata = {
  title: "New story",
  robots: { index: false, follow: false },
};

const CONTENT_TYPES = [
  { value: "news", label: "Department news" },
  { value: "campus", label: "Campus news" },
  { value: "education", label: "Education" },
  { value: "community", label: "Community reporting" },
  { value: "media_society", label: "Media and society" },
  { value: "research", label: "Research" },
  { value: "feature", label: "Feature" },
  { value: "opinion", label: "Opinion and analysis" },
  { value: "student", label: "Student journalism" },
  { value: "announcement", label: "Announcement" },
  { value: "sponsored", label: "Sponsored" },
];

export default async function NewStoryPage() {
  const { user } = await requirePagePermission("article.create", "/studio/articles/new");
  const categories = await listCategoryOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="kicker">Newsroom</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Start a new story</h1>
        <p className="mt-1 text-sm text-muted">
          Begin with the essentials. You can refine the body, byline, media and metadata in the
          editor before submitting for review.
        </p>
      </header>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-line bg-white p-6">
          <p className="font-serif text-xl text-navy">No categories are available yet</p>
          <p className="mt-2 text-sm text-muted">
            An administrator must create at least one active category before stories can be drafted.
          </p>
          <Link href="/studio/content/taxonomy" className="btn btn-outline mt-4">
            Manage categories
          </Link>
        </div>
      ) : (
        <NewStoryForm
          categories={categories}
          contentTypes={CONTENT_TYPES}
          defaultAuthor={user.name}
        />
      )}
    </div>
  );
}
