import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms governing use of the Department of Communication and Media Studies website.",
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        kicker="Terms"
        title="Terms of use"
        lede="The conditions that apply when you use this website."
      >
        <Breadcrumbs items={[{ label: "Terms of use" }]} />
      </PageHeader>

      <article className="container-page prose-article max-w-3xl py-9">
        <h2>About this site</h2>
        <p>
          This website is maintained by the Department of Communication and Media Studies at the
          University of Liberia. It provides departmental news, academic information, events and
          resources.
        </p>
        <p>
          This site is not the University&apos;s official admissions, registration, examination or
          student-records system. Information here does not replace official University publications,
          policies or decisions.
        </p>

        <h2>Editorial content</h2>
        <p>
          Reporting, features, opinion and student work are produced under the department&apos;s
          editorial standards. Opinion is labelled and represents the views of the named author, not
          the University. Sponsored content, if any, is clearly labelled.
        </p>
        <p>
          We aim for accuracy but do not warrant that every item is complete or current. If you believe
          something is wrong, please read our <Link href="/policies/corrections">corrections policy</Link>{" "}
          and contact the editorial team.
        </p>

        <h2>Intellectual property</h2>
        <p>
          Text, photographs, video, audio, graphics and the department&apos;s marks are protected by
          copyright and other rights. You may share links and quote short extracts with attribution.
          You may not republish substantial parts of a story, or use images, without permission.
        </p>
        <p>
          Student work remains the work of its authors and is published with editorial supervision.
          Requests to reuse student work should be directed to the department.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Do not attempt to gain unauthorised access to the site or its systems.</li>
          <li>Do not interfere with the availability or integrity of the site.</li>
          <li>Do not submit unlawful, abusive, misleading or infringing content.</li>
          <li>Do not scrape the site in a way that imposes unreasonable load.</li>
          <li>Do not misrepresent your identity or affiliation.</li>
        </ul>

        <h2>Comments and submissions</h2>
        <p>
          Comments are governed by our <Link href="/policies/comments">comments policy</Link>. By
          submitting a comment or message, you confirm that you have the right to share the content and
          grant the department permission to publish, edit for clarity or decline it in line with its
          policies. You retain ownership of your submission.
        </p>

        <h2>Third-party links and embeds</h2>
        <p>
          The site may link to or embed content from other providers, including video platforms and
          University pages. We are not responsible for those services, their availability or their
          privacy practices. Following an external link takes you to a site with its own terms.
        </p>

        <h2>Availability and changes</h2>
        <p>
          We may change, suspend or withdraw parts of the site without notice, including during
          maintenance or editorial review. We do not guarantee uninterrupted access.
        </p>

        <h2>Disclaimer and liability</h2>
        <p>
          The site is provided on an “as is” basis to the extent permitted by law. Nothing in these
          terms excludes liability that cannot lawfully be excluded. The department is not liable for
          indirect losses arising from use of the site, or for reliance on information that has been
          superseded by an official University source.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the Republic of Liberia. Disputes are subject to the
          jurisdiction of the competent Liberian courts, without prejudice to any University procedures
          that may apply.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent through the <Link href="/contact">contact page</Link>.
          See also our <Link href="/privacy">privacy notice</Link>.
        </p>
      </article>
    </>
  );
}
