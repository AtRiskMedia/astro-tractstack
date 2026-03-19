import type { APIRoute } from '@/types/astro';
import { resolveTenantId } from '@/utils/tenantResolver';

export const prerender = false;

const getBackendUrl = () => {
  return import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
};

export const GET: APIRoute = async ({ request }) => {
  const resolution = await resolveTenantId(request);
  const tenantId = resolution.id;

  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const cursor = url.searchParams.get('cursor') || '';

  const backendUrl = new URL(`${getBackendUrl()}/api/v1/shopify/products`);
  if (q) {
    backendUrl.searchParams.set('q', q);
  }
  if (cursor) {
    backendUrl.searchParams.set('cursor', cursor);
  }

  const cookieHeader = request.headers.get('cookie') || '';

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
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

    return new Response(JSON.stringify(result), {
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
