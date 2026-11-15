import { map } from 'nanostores';
import type { ResourceNode } from '@/types/compositorTypes';

/** Default SSR resource TTL (5 minutes). Callers may pass a shorter/longer ttlMs. */
export const RESOURCES_TTL = 5 * 60 * 1000;

/** Alias kept for getHeaderResources default arg / existing call sites. */
export const HEADER_RESOURCES_TTL = RESOURCES_TTL;

const MAX_RESOURCE_CACHE_ENTRIES = 200;

export interface ResourceCacheEntry {
  data: ResourceNode[];
  fetchedAt: number;
  etag?: string;
}

type ResourceCacheGlobals = {
  __t8kResourceQueryCache?: Map<string, ResourceCacheEntry>;
  __t8kResourceInflight?: Map<string, Promise<ResourceNode[]>>;
};
const g = globalThis as typeof globalThis & ResourceCacheGlobals;
if (!g.__t8kResourceQueryCache) g.__t8kResourceQueryCache = new Map();
if (!g.__t8kResourceInflight) g.__t8kResourceInflight = new Map();

/** Keyed query cache: freshness is judged against the caller's TTL on every read. Pinned on globalThis so Vite SSR module re-evaluation does not reset it. */
export const resourceQueryCache: Map<string, ResourceCacheEntry> =
  g.__t8kResourceQueryCache;

/** In-flight dedup: concurrent callers with the same key share one Promise. Pinned on globalThis with resourceQueryCache. */
export const resourceInflight: Map<string, Promise<ResourceNode[]>> =
  g.__t8kResourceInflight;

export function buildResourceCacheKey(
  tenantId: string,
  categories: string[] = [],
  slugs: string[] = []
): string {
  const cats = [...categories].sort().join(',');
  const slugPart = [...slugs].sort().join(',');
  return `${tenantId}|${cats}|${slugPart}`;
}

export function getResourceCacheEntry(
  key: string
): ResourceCacheEntry | undefined {
  return resourceQueryCache.get(key);
}

export function setResourceCacheEntry(
  key: string,
  entry: ResourceCacheEntry
): void {
  resourceQueryCache.set(key, entry);
  evictOldestIfNeeded();
}

function evictOldestIfNeeded(): void {
  if (resourceQueryCache.size <= MAX_RESOURCE_CACHE_ENTRIES) {
    return;
  }
  let oldestKey: string | undefined;
  let oldestAt = Infinity;
  for (const [k, v] of resourceQueryCache) {
    if (v.fetchedAt < oldestAt) {
      oldestAt = v.fetchedAt;
      oldestKey = k;
    }
  }
  if (oldestKey !== undefined) {
    resourceQueryCache.delete(oldestKey);
  }
}

/**
 * @deprecated Single-slot store replaced by resourceQueryCache.
 * Kept so stray imports still type-check after install.
 */
export const headerResourcesStore = map<{
  data: ResourceNode[];
  lastFetched: number;
  key?: string;
}>({
  data: [],
  lastFetched: 0,
  key: '',
});
