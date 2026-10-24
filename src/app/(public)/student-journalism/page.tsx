import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArticleCard } from "@/components/ui/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { departmentContact, pilotCoreValues, pilotObjectives, team } from "@/content/team";
import { countPublished, getLatestArticles } from "@/server/public-queries";

export const metadata: Metadata = {
  title: "The Varsity Pilot",
  description:
    "The Varsity Pilot is the practicum newspaper of the University of Liberia's Department of Communication and Media Studies, providing a platform for student journalism and newsroom experience.",
};

export default async function StudentJournalismPage() {
  const [articles, total] = await Promise.all([
    getLatestArticles({ contentType: "student", limit: 24 }),
    countPublished({ contentType: "student" }),
  ]);
  const editors = team.filter((member) => member.group === "editorial");

  return (
    <>
      <PageHeader
        kicker="Student journalism"
        title="The Varsity Pilot"
        lede="The practicum newspaper of the Department of Communication and Media Studies — a dynamic platform for aspiring journalists to develop their skills, gain newsroom experience and serve the university community and the wider public."
      >
        <Breadcrumbs items={[{ label: "The Varsity Pilot" }]} />
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div>
          <div className="mb-8 overflow-hidden rounded-lg border border-line bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Image
                src="/brand/varsity-pilot-480.webp"
                alt="The Varsity Pilot online newspaper"
                width={480}
                height={160}
                className="h-auto w-full max-w-[20rem] object-contain"
              />
              <div className="sm:border-l sm:border-line sm:pl-6">
                <p className="kicker">Our motto</p>
                <p className="mt-1 font-serif text-xl leading-tight text-navy">
                  “Illuminating journalism for a brighter future”
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Lux In Tenebris — light in darkness — guides our work as student journalists at
                  the University of Liberia.
                </p>
              </div>
            </div>
          </div>

          <div className="prose-article max-w-none">
            <h2>About The Varsity Pilot</h2>
            <p>
              The Varsity Pilot is the practicum newspaper of the University of Liberia&apos;s
              Department of Communication and Media Studies, providing a dynamic platform for aspiring
              journalists to develop their skills, gain newsroom experience and serve both the
              university community and the wider public.
            </p>
            <p>
              The Department was established to train media professionals with a strong emphasis on
              print and broadcast journalism. Over time, its teaching has expanded to prepare
              graduates for careers in public relations, advertising and other communication fields.
              From the outset, the Department&apos;s leadership recognised that professional training
              required a strong connection between classroom learning and practical experience. Before
              the establishment of Lux FM, broadcast students gained hands-on training through
              partnerships with local radio stations, while print journalism students honed their
              craft through The Varsity Pilot, a student-run newspaper.
            </p>
            <p>
              Over the years, The Varsity Pilot has served as a rigorous training ground where
              students conduct interviews, gather and verify information, report news, and write
              features, editorials and commentaries. It also provides opportunities to develop skills
              in editing, photography, publication design and collaborative newsroom work. Through
              these experiences, students learn to exercise editorial judgment, meet deadlines and
              uphold professional and ethical standards.
            </p>
            <p>
              As The Varsity Pilot expands its online presence, it extends this tradition into digital
              journalism, offering students opportunities to produce multimedia stories, engage
              audiences and adapt to the rapidly changing media landscape. Revitalising and sustaining
              the newspaper strengthens the Department&apos;s commitment to practical training while
              providing a forum for campus news, student perspectives and informed public dialogue at
              both university and national levels.
            </p>

            <h2>Mission</h2>
            <p>
              Our mission is to illuminate the path from classroom learning to professional practice
              by providing students with a rigorous platform for experiential journalism. Through The
              Varsity Pilot, we equip aspiring communicators with the skills, ethical grounding and
              critical judgment needed to serve as “light in darkness,” informing the university
              community and the nation with accuracy, fairness and integrity.
            </p>

            <h2>Vision</h2>
            <p>
              Our vision is to be a beacon of student journalism that embodies the University of
              Liberia&apos;s motto, Lux In Tenebris. We aspire to bridge theory and practice, fostering
              innovation in print, broadcast and digital media while preparing graduates to shine as
              principled voices in Liberia&apos;s communication landscape and beyond.
            </p>
          </div>

          <section className="mt-10">
            <h2 className="editorial-rule mb-4 font-serif text-2xl text-navy">Core values</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {pilotCoreValues.map((value) => (
                <li key={value.title} className="rounded-lg border border-line bg-mist/40 p-4">
                  <h3 className="font-serif text-lg text-navy">{value.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{value.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="editorial-rule mb-4 font-serif text-2xl text-navy">Our objectives</h2>
            <ol className="space-y-3">
              {pilotObjectives.map((objective, index) => {
                const [title, ...rest] = objective.split(" — ");
                return (
                  <li key={title} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span>
                      <strong className="text-ink">{title}.</strong>{" "}
                      <span className="text-muted">
                        {rest.join(" — ").replace(/^./, (char) => char.toUpperCase())}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="mt-10 rounded-lg border border-line bg-navy p-6 text-white">
            <p className="kicker text-red-tint">The editorial team</p>
            <h2 className="mt-1 font-serif text-2xl text-white">Who puts the paper together</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
              The Varsity Pilot is edited and produced by students, with faculty guidance. Meet the
              editor-in-chief, news editor, multimedia editor and faculty adviser.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {editors.map((editor) => (
                <li key={editor.name} className="rounded border border-white/15 p-3">
                  <p className="font-serif text-lg text-white">{editor.name}</p>
                  <p className="text-xs text-white/70">{editor.role}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/team"
              className="btn btn-outline btn-sm mt-4 border-white/40 bg-transparent text-white hover:bg-white hover:text-navy"
            >
              Full leadership and team
            </Link>
          </section>

          <section className="mt-10">
            <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="font-serif text-2xl text-navy">Student reporting</h2>
              <p className="text-sm text-muted">
                {total} student {total === 1 ? "story" : "stories"}
              </p>
            </div>
            {articles.length > 0 ? (
              <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Student work will be published here"
                action={
                  <Link href="/contact" className="btn btn-primary">
                    Contact the newsroom
                  </Link>
                }
              >
                Stories produced in department courses and student newsroom sessions appear here
                after editorial review and admin approval.
              </EmptyState>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border-t-4 border-red bg-mist/60 p-5">
            <h2 className="font-serif text-xl text-navy">How student work is published</h2>
            <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>1. A student drafts a story with a supervising editor.</li>
              <li>2. The story receives editorial review for accuracy and fairness.</li>
              <li>3. A department administrator approves the final version.</li>
              <li>4. The story is published with the student named as author.</li>
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Student journalism is clearly labelled. Opinions are labelled as opinion and do not
              represent the views of the University of Liberia.
            </p>
          </section>

          <section className="rounded-md border border-line p-5">
            <h2 className="font-serif text-xl text-navy">Contact the newsroom</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Story tips, corrections and letters to the editor can be sent to the department.
            </p>
            <p className="mt-2 text-sm">
              <a href={`mailto:${departmentContact.email}`} className="underline hover:text-navy">
                {departmentContact.email}
              </a>
            </p>
            <p className="text-sm text-muted">{departmentContact.phone}</p>
            <Link href="/contact" className="btn btn-primary btn-sm mt-3">
              Contact us
            </Link>
          </section>

          <section>
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
              Policies
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link href="/policies/editorial" className="underline underline-offset-4 hover:text-red">
                  Editorial standards
                </Link>
              </li>
              <li>
                <Link href="/policies/corrections" className="underline underline-offset-4 hover:text-red">
                  Corrections policy
                </Link>
              </li>
              <li>
                <Link href="/policies/comments" className="underline underline-offset-4 hover:text-red">
                  Comments policy
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
