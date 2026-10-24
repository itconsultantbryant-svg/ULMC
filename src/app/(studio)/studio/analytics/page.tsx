import type { Metadata } from "next";
import Link from "next/link";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { can } from "@/server/permissions";
import { requirePagePermission } from "@/server/session";
import {
  getAuthorPerformance,
  getDailySeries,
  getDevices,
  getKpis,
  getLiveSnapshot,
  getReferrers,
  getTopArticles,
  getTopSearches,
  getTrafficSources,
} from "@/server/analytics/queries";
import { readSiteSettings } from "@/server/settings";
import { AnalyticsChart } from "./analytics-chart";
import { LivePanel } from "./live-panel";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { user } = await requirePagePermission("analytics.viewOwn", "/studio/analytics");
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params.days)) ? Number(params.days) : 30;
  const viewAll = can(user, "analytics.viewAll");
  const settings = await readSiteSettings();

  if (!viewAll) {
    const own = await getAuthorPerformance(user.id, days);
    return (
      <div className="space-y-6">
        <header>
          <p className="kicker">Insights</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Your audience</h1>
          <p className="mt-1 text-sm text-muted">
            Performance for stories you created in the last {days} days.
          </p>
        </header>
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ["Page views", formatNumber(own.views)],
            ["Unique visitors", formatNumber(own.uniques)],
            ["Stories with reads", formatNumber(own.articles)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-white p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
              <dd className="stat-value mt-2">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="rounded border border-line bg-white px-4 py-3 text-xs leading-relaxed text-muted">
          Department-wide analytics, live traffic and search insights are restricted to editors and
          administrators. Ask an administrator if you need broader reporting.
        </p>
      </div>
    );
  }

  const [kpis, daily, topArticles, sources, devices, referrers, searches, live] = await Promise.all([
    getKpis(days),
    getDailySeries(days),
    getTopArticles(days, 10),
    getTrafficSources(days),
    getDevices(days),
    getReferrers(days),
    getTopSearches(days, 10),
    getLiveSnapshot(),
  ]);

  const avgEngagement = kpis.pageViews > 0 ? kpis.engagedSeconds / kpis.pageViews : 0;
  const noResultRate = kpis.searches > 0 ? (kpis.noResultSearches / kpis.searches) * 100 : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Insights</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Audience analytics</h1>
          <p className="mt-1 text-sm text-muted">
            First-party, privacy-conscious measurement. Staff and demo traffic are excluded.
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((range) => (
            <Link
              key={range.days}
              href={`/studio/analytics?days=${range.days}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                days === range.days ? "bg-navy text-white" : "border border-line bg-white text-ink hover:border-navy"
              }`}
            >
              {range.label}
            </Link>
          ))}
        </div>
      </header>

      {settings.showDemoAnalytics ? (
        <p className="rounded border border-warning/40 bg-warning-tint px-4 py-2 text-xs font-semibold text-warning">
          Demo analytics are enabled. Records marked as demo are excluded from these totals.
        </p>
      ) : null}

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Page views", value: formatNumber(kpis.pageViews) },
          { label: "Unique visitors", value: formatNumber(kpis.visitors) },
          { label: "Sessions", value: formatNumber(kpis.sessions) },
          { label: "Avg. engaged time", value: formatDuration(avgEngagement) },
          {
            label: "Searches",
            value: `${formatNumber(kpis.searches)} · ${formatPercent(noResultRate, 0)} no results`,
          },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{metric.label}</p>
            <p className="stat-value mt-2 text-2xl">{metric.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-lg">Daily page views</h2>
          <p className="text-xs text-muted">Views and unique visitors in Africa/Monrovia time.</p>
          <div className="mt-4">
            <AnalyticsChart data={daily} />
          </div>
        </section>
        <LivePanel initial={live} />
      </div>

      <section className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg">Most-read stories</h2>
          <p className="text-xs text-muted">Top 10 by page views in the selected period.</p>
        </div>
        {topArticles.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No story traffic recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr>
                  <th scope="col">Story</th>
                  <th scope="col">Views</th>
                  <th scope="col">Unique</th>
                  <th scope="col">Engaged</th>
                </tr>
              </thead>
              <tbody>
                {topArticles.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/studio/articles/${row.id}`} className="font-semibold text-ink hover:text-red">
                        {row.title}
                      </Link>
                      <p className="text-xs text-muted">
                        <Link href={`/news/${row.slug}`} className="hover:underline">
                          /news/{row.slug}
                        </Link>
                      </p>
                    </td>
                    <td className="font-semibold">{formatNumber(row.views)}</td>
                    <td>{formatNumber(row.uniques)}</td>
                    <td>{formatDuration(row.engagedSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          { title: "Traffic sources", rows: sources },
          { title: "Devices", rows: devices },
          { title: "Referrers", rows: referrers },
        ].map((panel) => (
          <section key={panel.title} className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-lg">{panel.title}</h2>
            {panel.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No data for this period.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {panel.rows.map((row) => {
                  const max = Math.max(...panel.rows.map((item) => item.views), 1);
                  return (
                    <li key={row.value}>
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="truncate text-ink">{row.value}</span>
                        <span className="font-semibold text-muted">{formatNumber(row.views)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded bg-mist">
                        <div
                          className="h-1.5 rounded bg-navy"
                          style={{ width: `${Math.max(4, (row.views / max) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg">Search insights</h2>
          <p className="text-xs text-muted">
            What readers search for, and terms that returned no results (content opportunities).
          </p>
        </div>
        {searches.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No searches recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr>
                  <th scope="col">Term</th>
                  <th scope="col">Searches</th>
                  <th scope="col">No results</th>
                </tr>
              </thead>
              <tbody>
                {searches.map((row) => (
                  <tr key={row.term}>
                    <td className="font-semibold text-ink">{row.term}</td>
                    <td>{formatNumber(row.count)}</td>
                    <td className={row.noResult > 0 ? "font-semibold text-red-deep" : ""}>
                      {formatNumber(row.noResult)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Analytics retention is {settings.analyticsRetentionDays} days. We honour Do Not Track and Global
        Privacy Control signals, do not use advertising cookies, and do not store raw IP addresses.
      </p>
    </div>
  );
}
