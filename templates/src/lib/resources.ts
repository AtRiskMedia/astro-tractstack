import { headerResourcesStore, HEADER_RESOURCES_TTL } from '@/stores/resources';
import type { ResourceNode } from '@/types/compositorTypes';

export async function getHeaderResources(
  tenantId: string,
  categories: string[],
  ttl: number = HEADER_RESOURCES_TTL
): Promise<ResourceNode[]> {
  const cache = headerResourcesStore.get();
  const now = Date.now();
  const cacheKey = [...categories].sort().join(',');

  if (
    cache.key === cacheKey &&
    cache.data.length > 0 &&
    now - cache.lastFetched < ttl
  ) {
    return cache.data;
  }

  if (!categories || categories.length === 0) {
    return [];
  }

  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    const response = await fetch(`${goBackend}/api/v1/nodes/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify({ categories }),
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch resources for [${cacheKey}]. Status: ${response.status}`
      );
      return cache.key === cacheKey ? cache.data : [];
    }

    const responsePayload = await response.json();
    const resources: ResourceNode[] = responsePayload.resources || [];

    headerResourcesStore.set({
      data: resources,
      lastFetched: now,
      key: cacheKey,
    });

    return resources;
  } catch (error) {
    console.error('Error fetching resources:', error);
    return cache.key === cacheKey ? cache.data : [];
  }
}
