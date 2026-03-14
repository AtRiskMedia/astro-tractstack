import type { APIRoute } from '@/types/astro';
import { map } from 'nanostores'; // Replaces the persistent store import
import { resolveTenantId } from '@/utils/tenantResolver';

export const prerender = false;

/**
 * Standard nanostore map for server-side memory caching keyed by Tenant ID.
 * This is non-persistent and safe for Node/SSR execution, ensuring it
 * does not trigger the Proxy trap error in development environments.
 */
const serverCache = map<
  Record<string, { products: any[]; lastFetched: number }>
>({});
const CACHE_TTL = 300000; // 5 minute cache duration

const getBackendUrl = () => {
  return import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
};

export const GET: APIRoute = async ({ request }) => {
  // 1. Resolve Tenant Identity
  const resolution = await resolveTenantId(request);
  const tenantId = resolution.id;

  // 2. Check Server-Side Cache for this specific tenant
  const tenantCache = serverCache.get()[tenantId];
  if (tenantCache && Date.now() - tenantCache.lastFetched < CACHE_TTL) {
    return new Response(JSON.stringify(tenantCache), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Fetch from Backend Proxy (Cache Miss)
  const backendEndpoint = `${getBackendUrl()}/api/v1/shopify/products`;
  const cookieHeader = request.headers.get('cookie') || '';

  try {
    const backendResponse = await fetch(backendEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        Cookie: cookieHeader,
      },
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      throw new Error(
        `Backend Proxy Error: ${backendResponse.status} - ${errorText}`
      );
    }

    const result = await backendResponse.json();

    // 4. Update the Tenant-specific Cache
    const newState = {
      products: result.products || [],
      lastFetched: Date.now(),
    };

    serverCache.setKey(tenantId, newState);

    return new Response(JSON.stringify(newState), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Shopify proxy fetch failed:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : 'Failed to fetch products',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
