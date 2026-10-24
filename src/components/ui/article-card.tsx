import Link from "next/link";
import type { PublicArticleCard } from "@/server/public-queries";
import { ContentTypeBadge } from "./badge";
import { formatDate } from "@/lib/format";

function Hero({
  article,
  className = "",
  eager = false,
}: {
  article: PublicArticleCard;
  className?: string;
  eager?: boolean;
}) {
  if (!article.hero) {
    return (
      <div
        className={`article-placeholder flex items-center justify-center ${className}`}
        aria-hidden="true"
      >
        <span className="font-serif text-3xl font-semibold tracking-tight text-white/80">VP</span>
      </div>
    );
  }
  return (
    <img
      src={`/media/${article.hero.id}`}
      alt={article.hero.alt ?? ""}
      width={article.hero.width ?? 1200}
      height={article.hero.height ?? 800}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

function Byline({ article }: { article: PublicArticleCard }) {
  const names = article.authors.map((a) => a.name).filter(Boolean);
  return (
    <p className="mt-2 text-xs text-muted">
      {names.length > 0 ? (
        <span>
          By {names.slice(0, 2).join(" and ")}
          {names.length > 2 ? ` and ${names.length - 2} more` : ""}
        </span>
      ) : null}
      {names.length > 0 ? <span aria-hidden="true"> · </span> : null}
      <time dateTime={article.publishedAt.toISOString()}>{formatDate(article.publishedAt)}</time>
    </p>
  );
}

export function ArticleCard({
  article,
  variant = "standard",
  eager = false,
  showSummary = true,
}: {
  article: PublicArticleCard;
  variant?: "lead" | "standard" | "compact" | "list";
  eager?: boolean;
  showSummary?: boolean;
}) {
  const href = `/news/${article.slug}`;
  const category = article.category;

  if (variant === "lead") {
    return (
      <article className="card-link group grid gap-5 md:grid-cols-12 md:items-center">
        <Link
          href={href}
          className="media-zoom block overflow-hidden rounded-md bg-navy-tint md:col-span-7"
          tabIndex={-1}
          aria-hidden="true"
        >
          <div className="aspect-[16/10]">
            <Hero article={article} eager={eager} />
          </div>
        </Link>
        <div className="md:col-span-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ContentTypeBadge type={article.contentType} />
            {category ? (
              <Link
                href={`/news/category/${category.slug}`}
                className="text-xs font-bold uppercase tracking-widest text-red hover:text-red-deep"
              >
                {category.name}
              </Link>
            ) : null}
          </div>
          <h3 className="text-balance text-2xl leading-[1.15] sm:text-3xl">
            <Link href={href}>{article.title}</Link>
          </h3>
          {showSummary && article.summary ? (
            <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-muted">
              {article.summary}
            </p>
          ) : null}
          <Byline article={article} />
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="card-link group flex gap-3 py-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <ContentTypeBadge type={article.contentType} />
            {category ? (
              <span className="text-[0.68rem] font-bold uppercase tracking-widest text-red">
                {category.name}
              </span>
            ) : null}
          </div>
          <h3 className="text-[0.98rem] font-semibold leading-snug">
            <Link href={href}>{article.title}</Link>
          </h3>
          <p className="mt-1 text-xs text-muted">
            <time dateTime={article.publishedAt.toISOString()}>
              {formatDate(article.publishedAt)}
            </time>
          </p>
        </div>
        {article.hero ? (
          <Link href={href} className="media-zoom block w-24 flex-none overflow-hidden rounded" tabIndex={-1}>
            <div className="aspect-square">
              <Hero article={article} />
            </div>
          </Link>
        ) : null}
      </article>
    );
  }

  if (variant === "list") {
    return (
      <article className="card-link group grid grid-cols-[7.5rem_1fr] gap-4 py-4 sm:grid-cols-[11rem_1fr]">
        <Link
          href={href}
          className="media-zoom block overflow-hidden rounded bg-navy-tint"
          tabIndex={-1}
          aria-hidden="true"
        >
          <div className="aspect-[4/3]">
            <Hero article={article} />
          </div>
        </Link>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <ContentTypeBadge type={article.contentType} />
            {category ? <span className="kicker">{category.name}</span> : null}
          </div>
          <h3 className="text-[1.02rem] font-semibold leading-snug sm:text-lg">
            <Link href={href}>{article.title}</Link>
          </h3>
          {showSummary && article.summary ? (
            <p className="mt-1 hidden line-clamp-2 text-sm text-muted sm:block">{article.summary}</p>
          ) : null}
          <Byline article={article} />
        </div>
      </article>
    );
  }

  return (
    <article className="card-link group flex h-full flex-col">
      <Link
        href={href}
        className="media-zoom mb-3 block overflow-hidden rounded bg-navy-tint"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="aspect-[16/10]">
          <Hero article={article} eager={eager} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <ContentTypeBadge type={article.contentType} />
          {category ? (
            <Link
              href={`/news/category/${category.slug}`}
              className="kicker hover:text-red-deep"
            >
              {category.name}
            </Link>
          ) : null}
        </div>
        <h3 className="text-lg leading-snug">
          <Link href={href}>{article.title}</Link>
        </h3>
        {showSummary && article.summary ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{article.summary}</p>
        ) : null}
        <div className="mt-auto">
          <Byline article={article} />
        </div>
      </div>
    </article>
  );
}
