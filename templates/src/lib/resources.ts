import {
  HEADER_RESOURCES_TTL,
  RESOURCES_TTL,
  buildResourceCacheKey,
  getResourceCacheEntry,
  resourceInflight,
  setResourceCacheEntry,
} from '@/stores/resources';
import type { ResourceNode } from '@/types/compositorTypes';

export interface GetResourcesOptions {
  categories?: string[];
  slugs?: string[];
  ttlMs?: number;
}

/**
 * Tenant+query keyed resource fetch with TTL, in-flight dedup, and
 * If-None-Match revalidation against the Go resources version ETag.
 * Empty results are cached. Freshness is judged against the caller's ttlMs.
 */
export async function getResources(
  tenantId: string,
  options: GetResourcesOptions = {}
): Promise<ResourceNode[]> {
  const categories = options.categories ?? [];
  const slugs = options.slugs ?? [];
  const ttlMs = options.ttlMs ?? RESOURCES_TTL;

  if (categories.length === 0 && slugs.length === 0) {
    return [];
  }

  const cacheKey = buildResourceCacheKey(tenantId, categories, slugs);
  const now = Date.now();
  const cached = getResourceCacheEntry(cacheKey);

  if (cached && now - cached.fetchedAt < ttlMs) {
    return cached.data;
  }

  const inflight = resourceInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const promise = (async (): Promise<ResourceNode[]> => {
    const goBackend =
      import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      };
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      const response = await fetch(`${goBackend}/api/v1/nodes/resources`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ categories, slugs }),
      });

      if (response.status === 304 && cached) {
        setResourceCacheEntry(cacheKey, {
          data: cached.data,
          fetchedAt: Date.now(),
          etag: cached.etag,
        });
        return cached.data;
      }

      if (!response.ok) {
        console.error(
          `Failed to fetch resources for [${cacheKey}]. Status: ${response.status}`
        );
        return cached?.data ?? [];
      }

      const payload = await response.json();
      const resources: ResourceNode[] = payload.resources || [];
      const etag = response.headers.get('ETag') || undefined;

      setResourceCacheEntry(cacheKey, {
        data: resources,
        fetchedAt: Date.now(),
        etag,
      });

      return resources;
    } catch (error) {
      console.error('Error fetching resources:', error);
      return cached?.data ?? [];
    } finally {
      resourceInflight.delete(cacheKey);
    }
  })();

  resourceInflight.set(cacheKey, promise);
  return promise;
}

export async function getHeaderResources(
  tenantId: string,
  categories: string[],
  ttl: number = HEADER_RESOURCES_TTL
): Promise<ResourceNode[]> {
  return getResources(tenantId, { categories, ttlMs: ttl });
}

/**
 * Cached resource fetch for codehook blades. POSTs categories/slugs to the
 * nodes/resources endpoint, unwraps the { resources, count } envelope, and
 * returns the FLAT ResourceNode[] (the API shape) unchanged - no grouping.
 * Components that need a keyed view reshape internally.
 */
export async function getCodeHookResources(
  tenantId: string,
  categories: string[] = [],
  slugs: string[] = [],
  opts?: { ttlMs?: number }
): Promise<ResourceNode[]> {
  return getResources(tenantId, {
    categories,
    slugs,
    ttlMs: opts?.ttlMs ?? RESOURCES_TTL,
  });
}
