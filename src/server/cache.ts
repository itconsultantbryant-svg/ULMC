type Entry = {
  value: unknown;
  expiresAt: number;
  tags: string[];
};

type Store = {
  entries: Map<string, Entry>;
  inflight: Map<string, Promise<unknown>>;
};

const globalForCache = globalThis as unknown as { __ulmcCache?: Store };
const store: Store =
  globalForCache.__ulmcCache ?? (globalForCache.__ulmcCache = { entries: new Map(), inflight: new Map() });

export const PUBLIC_CONTENT_TAG = "public:content";
export const PUBLIC_SETTINGS_TAG = "public:settings";

/**
 * Small in-process TTL cache for public read surfaces. Explicit invalidation
 * happens on publish/unpublish/settings changes; the TTL is a safety net and
 * the multi-instance fallback (documented in docs/ARCHITECTURE.md).
 */
export async function cached<T>(
  key: string,
  tags: string[],
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.entries.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const pending = store.inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = loader()
    .then((value) => {
      store.entries.set(key, { value, expiresAt: Date.now() + ttlMs, tags });
      return value;
    })
    .finally(() => {
      store.inflight.delete(key);
    });
  store.inflight.set(key, promise);
  return promise;
}

export function invalidateCacheTags(tags: string[]): void {
  const set = new Set(tags);
  for (const [key, entry] of store.entries) {
    if (entry.tags.some((tag) => set.has(tag))) store.entries.delete(key);
  }
}

export function clearAllCaches(): void {
  store.entries.clear();
}

/**
 * Also ask the Next.js router cache to refresh known paths. Safe to call from
 * the worker: the import is dynamic and failures are swallowed.
 */
export async function invalidatePublicContent(paths: string[] = []): Promise<void> {
  invalidateCacheTags([PUBLIC_CONTENT_TAG]);
  try {
    const { revalidatePath } = await import("next/cache");
    for (const path of new Set(["/", "/newsroom", "/search", "/sitemap.xml", "/rss.xml", ...paths])) {
      try {
        revalidatePath(path);
      } catch {
        // not in a Next request scope
      }
    }
  } catch {
    // next/cache unavailable (worker process)
  }
}

export async function invalidateSettingsCache(): Promise<void> {
  invalidateCacheTags([PUBLIC_SETTINGS_TAG]);
  try {
    const { revalidatePath } = await import("next/cache");
    try {
      revalidatePath("/", "layout");
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}
