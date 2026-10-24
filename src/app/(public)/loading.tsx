export default function Loading() {
  return (
    <div className="container-page animate-pulse py-12" aria-busy="true" aria-live="polite">
      <div className="h-3 w-28 rounded bg-line" />
      <div className="mt-4 h-9 w-3/4 max-w-2xl rounded bg-line" />
      <div className="mt-3 h-4 w-1/2 max-w-xl rounded bg-line" />
      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item}>
            <div className="aspect-[16/10] rounded bg-line" />
            <div className="mt-3 h-5 w-4/5 rounded bg-line" />
            <div className="mt-2 h-4 w-2/3 rounded bg-line" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
