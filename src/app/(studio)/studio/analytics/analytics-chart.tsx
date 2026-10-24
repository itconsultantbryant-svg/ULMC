import type { DailyPoint } from "@/server/analytics/queries";

export function AnalyticsChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="rounded border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        No analytics recorded for this period yet.
      </p>
    );
  }

  const width = 720;
  const height = 200;
  const padding = 24;
  const max = Math.max(1, ...data.map((point) => point.views));
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const points = data.map((point, index) => {
    const x = padding + index * step;
    const y = height - padding - (point.views / max) * (height - padding * 2);
    return { x, y, point };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padding},${height - padding} ${line} ${padding + step * (data.length - 1)},${height - padding}`;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Daily page views over the last ${data.length} days. Peak ${max} views.`}
        className="h-auto w-full"
      >
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e5ea" />
        <polygon points={area} fill="rgba(201,0,22,0.08)" />
        <polyline points={line} fill="none" stroke="#C90016" strokeWidth="2" strokeLinejoin="round" />
        {points.map((point, index) =>
          index === points.length - 1 ? (
            <circle key={point.point.day} cx={point.x} cy={point.y} r="3.5" fill="#C90016" />
          ) : null,
        )}
      </svg>
      <figcaption className="mt-2 flex justify-between text-xs text-muted">
        <span>{data[0]?.day}</span>
        <span>Peak {max} daily views</span>
        <span>{data[data.length - 1]?.day}</span>
      </figcaption>
    </figure>
  );
}
