type Advertisement = {
  id: string;
  title: string;
  body: string;
  destinationUrl: string | null;
  mediaId: string | null;
  mimeType: string | null;
  alt: string | null;
};

export function AdColumn({ advertisements }: { advertisements: Advertisement[] }) {
  if (!advertisements.length) return null;
  return (
    <section aria-label="Advertisements" className="space-y-3">
      <p className="text-center text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Advertisement</p>
      {advertisements.map((ad) => {
        const content = <>
          {ad.mediaId && ad.mimeType?.startsWith("image/") ? <img src={`/media/${ad.mediaId}`} alt={ad.alt || ad.title} className="aspect-[4/3] w-full object-cover" /> : null}
          {ad.mediaId && ad.mimeType?.startsWith("video/") ? <video src={`/media/${ad.mediaId}`} controls playsInline className="aspect-[4/3] w-full bg-navy object-cover" aria-label={ad.alt || ad.title} /> : null}
          <div className="p-4"><h2 className="font-serif text-lg leading-tight text-navy">{ad.title}</h2>{ad.body ? <p className="mt-1 text-sm leading-relaxed text-muted">{ad.body}</p> : null}</div>
        </>;
        return ad.destinationUrl ? <a key={ad.id} href={ad.destinationUrl} target="_blank" rel="sponsored noopener noreferrer" className="block overflow-hidden rounded-lg border border-line bg-white shadow-soft transition hover:border-navy">{content}</a> : <div key={ad.id} className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">{content}</div>;
      })}
    </section>
  );
}
