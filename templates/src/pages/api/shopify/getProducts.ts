import type { APIRoute } from '@/types/astro';
import { shopifyData } from '@/stores/shopify';
import { resolveTenantId } from '@/utils/tenantResolver';

export const prerender = false;

const CACHE_TTL = 15 * 60 * 1000;

const getBackendUrl = () => {
  return import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';
};

export const GET: APIRoute = async ({ request }) => {
  // 1. Check Cache
  const currentStore = shopifyData.get();
  const now = Date.now();

  if (
    currentStore.products.length > 0 &&
    currentStore.lastFetched &&
    now - currentStore.lastFetched < CACHE_TTL
  ) {
    return new Response(JSON.stringify(currentStore), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Resolve Tenant Identity
  // We must identify the tenant to the backend to satisfy the TenantMiddleware
  const resolution = await resolveTenantId(request);
  const tenantId = resolution.id;

  // 3. Fetch from Backend Proxy
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

    // The backend returns { "products": [...] }
    const result = await backendResponse.json();

    // 4. Update Cache
    const newState = {
      products: result.products || [],
      lastFetched: now,
    };

    shopifyData.set(newState);

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
