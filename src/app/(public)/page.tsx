import Image from "next/image";
import Link from "next/link";
import { ArticleCard } from "@/components/ui/article-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { EventList } from "@/components/site/event-list";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { getHomepage } from "@/server/public-queries";
import { env } from "@/lib/env";

export default async function HomePage() {
  const { lead, supporting, latest, student, multimedia, categories, events, settings } =
    await getHomepage();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName,
    url: env.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${env.siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <h1 className="sr-only">
        {settings.siteName} — student journalism and news from the Department of Communication and Media Studies at the {settings.institutionName}
      </h1>

      <section className="border-b border-line bg-mist/60">
        <div className="container-page py-8 lg:py-12">
          {lead ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="ticker-dot" aria-hidden="true" />
                  <p className="kicker">Top story</p>
                </div>
                <ArticleCard article={lead} variant="lead" eager />
              </div>

              <aside className="lg:border-l lg:border-line lg:pl-8">
                <div className="editorial-rule mb-2">
                  <h2 className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-navy">
                    Also in the newsroom
                  </h2>
                </div>
                {supporting.length > 0 ? (
                  <div className="divide-y divide-line">
                    {supporting.map((article) => (
                      <ArticleCard key={article.id} article={article} variant="compact" />
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-sm text-muted">
                    More stories will appear here as the newsroom publishes.
                  </p>
                )}
                <div className="mt-5 border-t border-line pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-navy">
                      Upcoming events
                    </h2>
                    <Link href="/events" className="text-xs font-semibold text-red hover:underline">
                      Calendar
                    </Link>
                  </div>
                  <div className="mt-2">
                    <EventList events={events.slice(0, 3)} compact />
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="grid items-center gap-8 py-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div>
                <div className="editorial-rule mb-4 max-w-2xl">
                  <p className="kicker mb-1">The student newspaper</p>
                  <h2 className="text-balance text-3xl leading-tight text-navy sm:text-4xl">
                    Illuminating journalism for a brighter future
                  </h2>
                </div>
                <p className="max-w-2xl text-[0.98rem] leading-relaxed text-muted">
                  The Varsity Pilot is the practicum newspaper of the Department of Communication
                  and Media Studies at the University of Liberia. Student reporters cover campus
                  news, features, sports, opinion and the issues shaping the university and the
                  nation — with accuracy, fairness and integrity.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/student-journalism" className="btn btn-primary">
                    About The Varsity Pilot
                  </Link>
                  <Link href="/team" className="btn btn-outline">
                    Meet the editorial team
                  </Link>
                </div>
                <p className="mt-5 text-sm text-muted">
                  Published stories, student reporting and department announcements will appear
                  here as soon as the editorial team publishes them.
                </p>
              </div>
              <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
                <Image
                  src="/brand/varsity-pilot-480.webp"
                  alt="The Varsity Pilot online newspaper"
                  width={480}
                  height={160}
                  className="mx-auto h-auto w-full max-w-[18rem] object-contain"
                  priority
                />
                <div className="mt-4 border-t border-line pt-4 text-center">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted">
                    Published by
                  </p>
                  <p className="mt-1 font-serif text-lg leading-tight text-navy">
                    Department of Communication and Media Studies
                  </p>
                  <p className="text-xs text-muted">University of Liberia · Fendell Campus</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div>
          <SectionHeading
            kicker="Across the department"
            title="Latest reporting"
            href="/news"
            actionLabel="All stories"
          />
          {latest.length > 0 ? (
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {latest.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <EmptyState title="No further stories yet">
              New reporting from faculty and student journalists will be added here.
            </EmptyState>
          )}

          {categories.length > 0 ? (
            <div className="mt-10 border-t border-line pt-5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Browse sections</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/news/category/${category.slug}`}
                      className="inline-flex min-h-[36px] items-center rounded-full border border-line px-3 text-sm font-medium hover:border-navy hover:text-navy"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="space-y-8">
          <section className="rounded-2xl border border-line bg-mist/70 p-5 shadow-soft">
            <h2 className="font-serif text-xl leading-tight text-navy">Study communication at UL</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Earn a BA in Communication and Media with specialised tracks in print and broadcast
              journalism, grounded in newsroom practice at The Varsity Pilot and Lux FM.
            </p>
            <Link href="/academics" className="btn btn-primary btn-sm mt-4">
              Academic programmes
            </Link>
          </section>

          <section>
            <SectionHeading title="Events" href="/events" actionLabel="All events" kicker="On campus" />
            <EventList events={events} compact />
          </section>

          <section className="relative overflow-hidden rounded-2xl border-t-4 border-red bg-navy p-5 text-white shadow-lift">
            <p className="kicker text-red-tint">Student work</p>
            <h2 className="mt-1 font-serif text-xl leading-tight text-white">
              Reporting by students, for the campus and community
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Student journalists publish under editorial supervision. Their work appears alongside
              faculty reporting and department news.
            </p>
            <Link href="/student-journalism" className="btn btn-outline btn-sm mt-4 border-white/40 bg-transparent text-white hover:bg-white hover:text-navy">
              Student journalism
            </Link>
          </section>
        </aside>
      </div>

      {student.length > 0 ? (
        <section className="border-y border-line bg-navy-tint/60 py-10">
          <div className="container-page">
            <SectionHeading
              kicker="Student journalism"
              title="Voices from the classroom"
              href="/student-journalism"
              actionLabel="More student work"
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {student.slice(0, 4).map((article) => (
                <ArticleCard key={article.id} article={article} showSummary={false} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {multimedia.length > 0 ? (
        <div className="container-page py-10">
          <SectionHeading
            kicker="Watch and listen"
            title="Multimedia"
            href="/multimedia"
            actionLabel="All multimedia"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {multimedia.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      ) : null}

      <section className="border-t border-line bg-mist/40 py-10">
        <div className="container-page">
          <SectionHeading
            kicker="Explore"
            title="The department behind the newspaper"
            href="/about"
            actionLabel="About us"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: "/about",
                kicker: "Our story",
                title: "About the department",
                body: "Founded in 1983 with UNESCO support and home to Liberia's largest journalism programme.",
              },
              {
                href: "/academics",
                kicker: "Study",
                title: "Academic programmes",
                body: "The BA in Communication and Media, with print and broadcast journalism tracks.",
              },
              {
                href: "/team",
                kicker: "People",
                title: "Leadership and team",
                body: "The chairman, student editors and faculty adviser who guide our work.",
              },
              {
                href: "/student-journalism",
                kicker: "Practicum",
                title: "The Varsity Pilot",
                body: "Reporting by students, for the campus and the nation, under editorial supervision.",
              },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="card-interactive group p-5">
                <p className="kicker">{item.kicker}</p>
                <h3 className="mt-1 font-serif text-xl leading-tight text-navy group-hover:text-red">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {settings.newsletterEnabled ? (
        <section className="bg-navy py-12 text-white">
          <div className="container-page grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <p className="kicker text-red-tint">Stay informed</p>
              <h2 className="mt-1 font-serif text-3xl leading-tight text-white">
                Department news, delivered
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
                Occasional updates on reporting, events, student work and academic announcements from
                The Varsity Pilot and the Department of Communication and Media Studies.
              </p>
            </div>
            <div className="rounded-md bg-white p-4 text-ink">
              <NewsletterForm />
            </div>
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
