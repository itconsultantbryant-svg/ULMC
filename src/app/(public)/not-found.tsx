import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex max-w-2xl flex-col items-start py-20">
      <p className="kicker">404</p>
      <h1 className="mt-2 text-4xl leading-tight">Page not found</h1>
      <p className="mt-3 text-muted">
        The page you requested may have moved, been unpublished, or never existed. You can search the
        newsroom or return to the homepage.
      </p>
      <form action="/search" role="search" className="mt-6 flex w-full max-w-md gap-2">
        <label htmlFor="notfound-q" className="sr-only">
          Search
        </label>
        <input id="notfound-q" name="q" type="search" className="field" placeholder="Search stories…" />
        <button type="submit" className="btn btn-primary flex-none">
          Search
        </button>
      </form>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-outline">Homepage</Link>
        <Link href="/news" className="btn btn-outline">Newsroom</Link>
        <Link href="/contact" className="btn btn-ghost">Contact</Link>
      </div>
    </div>
  );
}
