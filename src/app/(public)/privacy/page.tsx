import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How the Department of Communication and Media Studies collects, uses and protects personal information on this website.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        kicker="Privacy"
        title="Privacy notice"
        lede="This notice explains what information this website collects, why, and the choices available to you."
      >
        <Breadcrumbs items={[{ label: "Privacy" }]} />
      </PageHeader>

      <article className="container-page prose-article max-w-3xl py-9">
        <h2>Who we are</h2>
        <p>
          This website is operated by the Department of Communication and Media Studies at the
          University of Liberia. References to “we”, “us” and “the department” mean that department.
          For privacy questions, use the <Link href="/contact">contact page</Link>.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>
            <strong>Newsroom analytics.</strong> We record page views and basic interaction events to
            understand which stories are read. We use a first-party system, not third-party advertising
            trackers. We store the page path, the referring page, a coarse device category, the time of
            the visit and a random session identifier kept in your browser&apos;s session storage. IP
            addresses are hashed with a secret salt and are not stored in raw form.
          </li>
          <li>
            <strong>Comments.</strong> If you submit a comment, we store your display name, email
            address, comment text and the time of submission. Your email is used for moderation and is
            not published.
          </li>
          <li>
            <strong>Contact messages.</strong> If you use the contact form, we store your name, email
            address, subject, message and basic technical information (a hashed IP address and browser
            user agent) to manage and protect the service.
          </li>
          <li>
            <strong>Newsletter.</strong> If you subscribe, we store your email address and confirmation
            status. Subscriptions use a confirmation email. You can unsubscribe at any time.
          </li>
          <li>
            <strong>Staff accounts.</strong> Authorised staff have accounts for the editorial system.
            Authentication uses secure, HTTP-only cookies and, for privileged roles, two-factor
            authentication. Staff account data is used to operate the publishing workflow and audit
            trail.
          </li>
        </ul>

        <h2>Cookies and similar technologies</h2>
        <p>
          The public site does not use advertising or cross-site tracking cookies. Staff authentication
          uses essential cookies. Analytics uses a session identifier in session storage rather than a
          persistent cookie. You can block or clear these through your browser, though staff cannot sign
          in without essential cookies.
        </p>

        <h2>Why we use information</h2>
        <ul>
          <li>To publish and improve the department&apos;s reporting and public information.</li>
          <li>To moderate comments and respond to enquiries.</li>
          <li>To send newsletters to people who have confirmed they want them.</li>
          <li>To operate the editorial system securely and keep an audit trail.</li>
          <li>To understand aggregate readership without profiling individuals.</li>
        </ul>

        <h2>Legal basis and consent</h2>
        <p>
          We rely on consent for newsletters, on legitimate interests for operating and securing the
          site and understanding aggregate readership, and on the necessity of processing for staff
          accounts. You may withdraw consent for the newsletter at any time.
        </p>

        <h2>Retention</h2>
        <p>
          Analytics data is retained for a limited period set by the department and then deleted or
          aggregated. Comments, contact messages and newsletter records are retained only as long as
          needed for moderation, correspondence, legal obligations or archival purposes. Staff audit
          records are retained to maintain accountability for publication decisions.
        </p>

        <h2>Sharing</h2>
        <p>
          We do not sell personal information. We may use service providers for hosting, email delivery
          and media storage. Those providers process information on our instructions. We may disclose
          information where required by law or to protect the safety and rights of others.
        </p>

        <h2>Your choices and rights</h2>
        <p>
          You may ask for access to personal information we hold about you, request correction or
          deletion, object to processing, or ask us to stop sending newsletters. Use the{" "}
          <Link href="/contact">contact page</Link> and describe your request. We may need to verify
          your identity before acting. Some records, such as published corrections or audit trails, may
          be retained for accountability.
        </p>

        <h2>Security</h2>
        <p>
          We use access controls, role-based permissions, password hashing, two-factor authentication
          for privileged accounts, audit logging and encrypted connections where available. No system
          is completely secure; if we become aware of a breach affecting personal information, we will
          investigate and notify affected people where appropriate.
        </p>

        <h2>Children</h2>
        <p>
          This site is intended for a general audience. We do not knowingly collect personal information
          from children for marketing. Student work may name students where appropriate and with
          editorial consideration.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this notice as the site changes. The current version always applies. Material
          changes will be described on this page.
        </p>
      </article>
    </>
  );
}
