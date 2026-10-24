import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (p > 1) search.set("page", String(p));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted">
        Page {page} of {totalPages}
      </div>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              rel="prev"
              className="btn btn-outline btn-sm"
              aria-label="Previous page"
            >
              Previous
            </Link>
          ) : (
            <span className="btn btn-outline btn-sm pointer-events-none opacity-40">Previous</span>
          )}
        </li>
        {list.map((p, index) => {
          const previous = list[index - 1];
          return (
            <li key={p} className="flex items-center gap-1">
              {previous && p - previous > 1 ? <span className="px-1 text-muted">…</span> : null}
              <Link
                href={href(p)}
                aria-current={p === page ? "page" : undefined}
                className={`btn btn-sm ${
                  p === page ? "btn-primary" : "btn-outline"
                } min-w-[38px]`}
              >
                {p}
              </Link>
            </li>
          );
        })}
        <li>
          {page < totalPages ? (
            <Link
              href={href(page + 1)}
              rel="next"
              className="btn btn-outline btn-sm"
              aria-label="Next page"
            >
              Next
            </Link>
          ) : (
            <span className="btn btn-outline btn-sm pointer-events-none opacity-40">Next</span>
          )}
        </li>
      </ul>
    </nav>
  );
}
