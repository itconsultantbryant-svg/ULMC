import Link from "next/link";

export function SectionHeading({
  kicker,
  title,
  description,
  href,
  actionLabel = "View all",
  id,
}: {
  kicker?: string;
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
  id?: string;
}) {
  return (
    <div className="section-heading mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? <p className="kicker mb-1">{kicker}</p> : null}
        <h2 id={id} className="text-2xl leading-tight sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="text-sm font-semibold text-navy underline decoration-red decoration-2 underline-offset-4 hover:text-red"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
