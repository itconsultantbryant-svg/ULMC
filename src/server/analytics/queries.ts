import { sqlClient } from "@/server/db/client";

export type Kpis = {
  pageViews: number;
  visitors: number;
  sessions: number;
  engagedSeconds: number;
  searches: number;
  noResultSearches: number;
};

export type DailyPoint = { day: string; views: number; visitors: number };
export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  views: number;
  uniques: number;
  engagedSeconds: number;
};
export type DimensionRow = { value: string; views: number; uniques: number };
export type SearchRow = { term: string; count: number; noResult: number };

const EXCLUDE = sqlClient`is_staff = false and is_demo = false`;

export async function getKpis(days = 30): Promise<Kpis> {
  const rows = await sqlClient<
    {
      page_views: string;
      visitors: string;
      sessions: string;
      engaged_seconds: string;
      searches: string;
      no_result: string;
    }[]
  >`
    select
      count(*) filter (where type = 'pageview') as page_views,
      count(distinct visitor_id) filter (where type = 'pageview') as visitors,
      count(distinct session_id) as sessions,
      coalesce(sum(duration_ms) filter (where type = 'engagement'), 0) / 1000 as engaged_seconds,
      count(*) filter (where type = 'search') as searches,
      count(*) filter (where type = 'search' and coalesce((metadata->>'resultCount')::int, -1) = 0) as no_result
    from analytics_event
    where created_at >= now() - ${`${days} days`}::interval
      and ${EXCLUDE}
  `;
  const row = rows[0];
  return {
    pageViews: Number(row?.page_views ?? 0),
    visitors: Number(row?.visitors ?? 0),
    sessions: Number(row?.sessions ?? 0),
    engagedSeconds: Number(row?.engaged_seconds ?? 0),
    searches: Number(row?.searches ?? 0),
    noResultSearches: Number(row?.no_result ?? 0),
  };
}

export async function getDailySeries(days = 30): Promise<DailyPoint[]> {
  const rows = await sqlClient<{ day: string; views: string; visitors: string }[]>`
    select
      to_char((created_at at time zone 'Africa/Monrovia')::date, 'YYYY-MM-DD') as day,
      count(*) filter (where type = 'pageview') as views,
      count(distinct visitor_id) as visitors
    from analytics_event
    where created_at >= now() - ${`${days} days`}::interval
      and ${EXCLUDE}
    group by 1
    order by 1
  `;
  return rows.map((row) => ({
    day: row.day,
    views: Number(row.views),
    visitors: Number(row.visitors),
  }));
}

export async function getTopArticles(days = 30, limit = 10): Promise<ArticleRow[]> {
  const rows = await sqlClient<
    { id: string; slug: string; title: string; views: string; uniques: string; engaged_seconds: string }[]
  >`
    select
      a.id,
      a.slug,
      coalesce(r.title, a.slug) as title,
      count(e.id) as views,
      count(distinct e.visitor_id) as uniques,
      coalesce(sum(e.duration_ms) filter (where e.type = 'engagement'), 0) / 1000 as engaged_seconds
    from analytics_event e
    join article a on a.id = e.article_id
    left join article_revision r on r.id = a.published_revision_id
    where e.created_at >= now() - ${`${days} days`}::interval
      and e.type = 'pageview'
      and e.is_staff = false
      and e.is_demo = false
    group by a.id, a.slug, r.title
    order by views desc
    limit ${limit}
  `;
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    views: Number(row.views),
    uniques: Number(row.uniques),
    engagedSeconds: Number(row.engaged_seconds),
  }));
}

async function dimension(column: "source" | "device" | "referrer", days: number): Promise<DimensionRow[]> {
  const rows = await sqlClient<{ value: string | null; views: string; uniques: string }[]>`
    select
      coalesce(nullif(${sqlClient(column)}, ''), 'unknown') as value,
      count(*) as views,
      count(distinct visitor_id) as uniques
    from analytics_event
    where created_at >= now() - ${`${days} days`}::interval
      and type = 'pageview'
      and ${EXCLUDE}
    group by 1
    order by views desc
    limit 8
  `;
  return rows.map((row) => ({
    value: row.value ?? "unknown",
    views: Number(row.views),
    uniques: Number(row.uniques),
  }));
}

export function getTrafficSources(days = 30) {
  return dimension("source", days);
}

export function getDevices(days = 30) {
  return dimension("device", days);
}

export function getReferrers(days = 30) {
  return dimension("referrer", days);
}

export async function getTopSearches(days = 30, limit = 10): Promise<SearchRow[]> {
  const rows = await sqlClient<{ term: string; count: string; no_result: string }[]>`
    select
      metadata->>'searchTerm' as term,
      count(*) as count,
      count(*) filter (where coalesce((metadata->>'resultCount')::int, -1) = 0) as no_result
    from analytics_event
    where created_at >= now() - ${`${days} days`}::interval
      and type = 'search'
      and metadata->>'searchTerm' is not null
      and ${EXCLUDE}
    group by 1
    order by count desc
    limit ${limit}
  `;
  return rows.map((row) => ({ term: row.term, count: Number(row.count), noResult: Number(row.no_result) }));
}

export type LiveSnapshot = {
  activeVisitors: number;
  viewsLast30: number;
  viewsToday: number;
  topPaths: { path: string; views: number }[];
  generatedAt: string;
};

export async function getLiveSnapshot(): Promise<LiveSnapshot> {
  const [sessions, views, today, paths] = await Promise.all([
    sqlClient<{ count: string }[]>`
      select count(*) as count from analytics_session
      where last_seen_at >= now() - interval '5 minutes' and is_staff = false and is_demo = false
    `,
    sqlClient<{ count: string }[]>`
      select count(*) as count from analytics_event
      where type = 'pageview' and created_at >= now() - interval '30 minutes'
        and ${EXCLUDE}
    `,
    sqlClient<{ count: string }[]>`
      select count(*) as count from analytics_event
      where type = 'pageview'
        and (created_at at time zone 'Africa/Monrovia')::date = (now() at time zone 'Africa/Monrovia')::date
        and ${EXCLUDE}
    `,
    sqlClient<{ path: string; views: string }[]>`
      select path, count(*) as views from analytics_event
      where type = 'pageview' and created_at >= now() - interval '30 minutes'
        and ${EXCLUDE}
      group by path order by views desc limit 6
    `,
  ]);
  return {
    activeVisitors: Number(sessions[0]?.count ?? 0),
    viewsLast30: Number(views[0]?.count ?? 0),
    viewsToday: Number(today[0]?.count ?? 0),
    topPaths: paths.map((row) => ({ path: row.path, views: Number(row.views) })),
    generatedAt: new Date().toISOString(),
  };
}

export async function getArticlePerformance(articleId: string, days = 30) {
  const [totals, daily] = await Promise.all([
    sqlClient<{ views: string; uniques: string; engaged: string; scrolls: string }[]>`
      select
        count(*) filter (where type = 'pageview') as views,
        count(distinct visitor_id) filter (where type = 'pageview') as uniques,
        coalesce(sum(duration_ms) filter (where type = 'engagement'), 0) / 1000 as engaged,
        count(*) filter (where type = 'scroll') as scrolls
      from analytics_event
      where article_id = ${articleId}
        and created_at >= now() - ${`${days} days`}::interval
        and ${EXCLUDE}
    `,
    sqlClient<{ day: string; views: string; visitors: string }[]>`
      select
        to_char((created_at at time zone 'Africa/Monrovia')::date, 'YYYY-MM-DD') as day,
        count(*) filter (where type = 'pageview') as views,
        count(distinct visitor_id) as visitors
      from analytics_event
      where article_id = ${articleId}
        and created_at >= now() - ${`${days} days`}::interval
        and ${EXCLUDE}
      group by 1 order by 1
    `,
  ]);
  return {
    views: Number(totals[0]?.views ?? 0),
    uniques: Number(totals[0]?.uniques ?? 0),
    engagedSeconds: Number(totals[0]?.engaged ?? 0),
    scrolls: Number(totals[0]?.scrolls ?? 0),
    daily: daily.map((row) => ({
      day: row.day,
      views: Number(row.views),
      visitors: Number(row.visitors),
    })),
  };
}

export async function getAuthorPerformance(userId: string, days = 30) {
  const rows = await sqlClient<{ views: string; uniques: string; articles: string }[]>`
    select
      count(*) filter (where e.type = 'pageview') as views,
      count(distinct e.visitor_id) filter (where e.type = 'pageview') as uniques,
      count(distinct e.article_id) as articles
    from analytics_event e
    join article a on a.id = e.article_id
    where a.created_by = ${userId}
      and e.created_at >= now() - ${`${days} days`}::interval
      and e.is_staff = false
      and e.is_demo = false
  `;
  return {
    views: Number(rows[0]?.views ?? 0),
    uniques: Number(rows[0]?.uniques ?? 0),
    articles: Number(rows[0]?.articles ?? 0),
  };
}
