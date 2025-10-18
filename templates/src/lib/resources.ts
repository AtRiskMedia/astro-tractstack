import { headerResourcesStore, HEADER_RESOURCES_TTL } from '@/stores/resources';
import type { ResourceNode } from '@/types/compositorTypes';

/**
 * Fetches resource nodes based on categories, with server-side in-memory caching
 * to prevent redundant API calls for high-traffic, site-wide components.
 *
 * @param tenantId The ID of the current tenant.
 * @param categories An array of resource category slugs to fetch.
 * @param ttl Optional. The Time-To-Live for the cache in milliseconds. Defaults to 5 minutes.
 * @returns A promise that resolves to an array of ResourceNode objects.
 */
export async function getHeaderResources(
  tenantId: string,
  categories: string[],
  ttl: number = HEADER_RESOURCES_TTL
): Promise<ResourceNode[]> {
  const cache = headerResourcesStore.get();
  const now = Date.now();

  // If we have fresh data in the cache, return it immediately.
  if (cache.data.length > 0 && now - cache.lastFetched < ttl) {
    return cache.data;
  }

  // If no categories are requested, there's nothing to fetch.
  if (!categories || categories.length === 0) {
    return [];
  }

  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    // THIS IS THE CORRECTED ENDPOINT
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
        `Failed to fetch header resources. Status: ${response.status}`
      );
      // Gracefully degrade: return old data if we have it, otherwise an empty array.
      return cache.data;
    }

    // The backend returns a payload like { resources: [...] }
    const responsePayload = await response.json();
    const resources: ResourceNode[] = responsePayload.resources || [];

    // Update the store with the new data and timestamp.
    headerResourcesStore.set({
      data: resources,
      lastFetched: now,
    });

    return resources;
  } catch (error) {
    console.error('Error fetching header resources:', error);
    // On network error, also return stale data if available.
    return cache.data;
  }
}
