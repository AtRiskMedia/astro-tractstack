import type { APIRoute } from '@/types/astro';
import { resolveTenantId } from '@/utils/tenantResolver';

export const prerender = false;

interface CreateCartPayload {
  lines: Array<{
    merchandiseId: string;
    quantity: number;
  }>;
  attributes?: Array<{
    key: string;
    value: string;
  }>;
  email?: string;
}

const getBackendUrl = () => {
  return import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';
};

export const POST: APIRoute = async ({ request }) => {
  const resolution = await resolveTenantId(request);
  const tenantId = resolution.id;

  const backendEndpoint = `${getBackendUrl()}/api/v1/shopify/checkout`;
  const cookieHeader = request.headers.get('cookie') || '';

  try {
    const body = (await request.json()) as CreateCartPayload;

    const payload: CreateCartPayload = {
      lines: body.lines,
      attributes: body.attributes || [],
      email: body.email,
    };

    const backendResponse = await fetch(backendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        Cookie: cookieHeader,
      },
      body: JSON.stringify(payload),
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
    console.error('Shopify proxy create cart failed:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create cart',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
