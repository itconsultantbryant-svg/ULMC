import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { coreValues } from "@/content/team";
import { getSitePage } from "@/server/public-queries";

export const metadata: Metadata = {
  title: "About the department",
  description:
    "The history, mission, vision and core values of the Department of Communication and Media Studies at the University of Liberia, founded in 1983 with UNESCO support.",
};

const facts = [
  { label: "Founded", value: "1983, with UNESCO funding" },
  { label: "Degree", value: "Bachelor of Arts in Communication and Media" },
  { label: "Tracks", value: "Print and broadcast journalism" },
  { label: "Practicum", value: "The Varsity Pilot and Lux FM 106.6" },
  { label: "Campus", value: "Fendell Campus, Louisiana, Montserrado" },
];

export default async function AboutPage() {
  const page = await getSitePage("about");

  return (
    <>
      <PageHeader
        kicker="About us"
        title="A legacy of journalism education at the University of Liberia"
        lede="Founded in 1983, the Department of Communication and Media Studies has grown into Liberia's largest and most recognised centre for training journalists and communication professionals."
      >
        <Breadcrumbs items={[{ label: "About" }]} />
      </PageHeader>

      <div className="container-page grid gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div>
          {page?.bodyHtml && !page.bodyHtml.includes("Content coming soon") ? (
            <div
              className="prose-article max-w-none"
              dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
            />
          ) : (
            <div className="prose-article max-w-none">
              <h2>Our story</h2>
              <p>
                In 1983, the University of Liberia, with funding from UNESCO, established the Mass
                Communication Department to meet the growing demand for professionally trained
                personnel in Liberia&apos;s broadcast and print media. The Department was founded with
                a clear mission: to equip communication professionals with the knowledge, skills and
                ethical grounding required to provide accurate, credible and trustworthy news and
                information to the public.
              </p>
              <p>
                At its inception, the Department was led by Professor T. Nelson Williams, an
                accomplished media practitioner and educator who served as its first chairman. He was
                joined by a pioneering team of recent graduates who had earned advanced degrees in
                media studies in the United States. Among them were Associate Professors Alhaji G. V.
                Kromah, Lamini A. Warritay and Weade Kobbah-Boley, who today serves as a vice
                president at the University of Liberia. Joe W. Mulbah, initially appointed as a
                teaching assistant, later pursued advanced studies in the United Kingdom, returned as
                an assistant professor and subsequently rose to serve as chairman of the Department.
              </p>

              <h2>Growth and reputation</h2>
              <p>
                Since its founding, the Department has grown into Liberia&apos;s largest and most
                recognised centre for the training of aspiring journalists and communication
                professionals. Guided by a commitment to excellence, professionalism and the highest
                ethical standards of journalism, the Department has become a leading source of
                skilled communicators serving the media, government and corporate institutions.
              </p>
              <p>
                The Department offers a Bachelor of Arts degree in Communication and Media, with
                specialised tracks in print and broadcast journalism. A hallmark of the programme is
                its emphasis on practical learning: students write articles for{" "}
                <em>The Varsity Pilot</em> newspaper, both online and print, and produce programmes
                and news content for Lux FM 106.6, the student-operated radio station. These platforms
                provide invaluable opportunities to apply classroom knowledge in real newsroom and
                broadcast settings, cultivating professional competence and ethical responsibility.
              </p>

              <h2>Looking ahead</h2>
              <p>
                In 2021, the Department undertook a comprehensive curriculum revision to address
                contemporary gaps in the field and evolving societal needs. At the same time, it
                transitioned from the Mass Communication Department to its current name, the
                Department of Communication and Media Studies. This change marked the first step in a
                broader, gradual transformation into a full School of Communication.
              </p>
              <p>
                The envisioned School will introduce multiple career tracks and areas of
                specialisation, enabling students to pursue focused and advanced learning. Through
                this evolution, graduates will be better equipped to build strong professional
                careers, positioning them as attractive and resourceful contributors to future
                employers and to the wider communication landscape.
              </p>

              <h2>Our mission</h2>
              <p>
                Our mission is to prepare students for professional careers in communication and
                journalism by equipping them with the digital competencies, ethical grounding and
                critical thinking skills essential to thrive in an evolving media and communication
                landscape. We are committed to positioning students to sufficiently and effectively
                contribute to knowledge in the fields of journalism and communication through
                rigorous research and scholarship, thereby advancing both professional practice and
                academic inquiry.
              </p>

              <h2>Our vision</h2>
              <p>
                Our vision is to evolve into a distinguished School of Communication that serves as a
                national and regional hub for excellence in media and communication education and
                research. We aspire to cultivate a new generation of journalists, scholars and
                communication professionals who embody integrity, innovation and leadership. By
                expanding career tracks and areas of specialisation, fostering rigorous research and
                strengthening partnerships with media, government and corporate institutions, we seek
                to position the University of Liberia as a premier centre for advancing knowledge,
                shaping public discourse and empowering society through communication.
              </p>
            </div>
          )}

          <section className="mt-10">
            <h2 className="editorial-rule mb-5 font-serif text-2xl text-navy">Our core values</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {coreValues.map((value) => (
                <li key={value.title} className="rounded-lg border border-line bg-mist/40 p-4">
                  <h3 className="font-serif text-lg text-navy">{value.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{value.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link href="/academics" className="panel group p-5 hover:border-navy">
              <p className="kicker">Study</p>
              <h2 className="mt-1 font-serif text-xl text-navy group-hover:text-red">
                Academic programmes
              </h2>
              <p className="mt-1 text-sm text-muted">
                The BA in Communication and Media, with print and broadcast journalism tracks.
              </p>
            </Link>
            <Link href="/student-journalism" className="panel group p-5 hover:border-navy">
              <p className="kicker">Read</p>
              <h2 className="mt-1 font-serif text-xl text-navy group-hover:text-red">
                The Varsity Pilot
              </h2>
              <p className="mt-1 text-sm text-muted">
                Student reporting, features, opinion and multimedia from the practicum newsroom.
              </p>
            </Link>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="border-t-4 border-navy bg-mist/60 p-5">
            <h2 className="font-serif text-xl text-navy">Department at a glance</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                    {fact.label}
                  </dt>
                  <dd className="mt-0.5 text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="border-t-4 border-red bg-mist/60 p-5">
            <h2 className="font-serif text-xl text-navy">Our commitments</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>Accuracy and verification before publication.</li>
              <li>Clear labelling of opinion, student work and sponsored content.</li>
              <li>Fair correction of errors, promptly and transparently.</li>
              <li>Accessible design and respectful moderation of discussion.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-navy">
              Department policies
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link href="/policies/editorial" className="underline underline-offset-4 hover:text-red">
                  Editorial standards
                </Link>
              </li>
              <li>
                <Link href="/policies/corrections" className="underline underline-offset-4 hover:text-red">
                  Corrections
                </Link>
              </li>
              <li>
                <Link href="/policies/comments" className="underline underline-offset-4 hover:text-red">
                  Comments
                </Link>
              </li>
              <li>
                <Link href="/policies/accessibility" className="underline underline-offset-4 hover:text-red">
                  Accessibility
                </Link>
              </li>
            </ul>
          </section>

          <section className="rounded-md border border-line p-5">
            <h2 className="font-serif text-xl text-navy">Visit or write</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              MassComm Building, Fendell Campus, Louisiana, Montserrado, Liberia.
            </p>
            <Link href="/contact" className="btn btn-outline btn-sm mt-3">
              Contact the department
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
