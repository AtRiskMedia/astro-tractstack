// templates/src/pages/api/auth/profile/decode.ts
// Astro SSR API endpoint to proxy profile decode requests to Go backend

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

  try {
    // Get Authorization header from frontend
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          profile: null,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Forward request to Go backend
    const response = await fetch(`${goBackend}/api/v1/auth/profile/decode`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'X-TractStack-Tenant': tenantId,
      },
    });

    // Get response from Go backend
    const data = await response.json();

    // Return Go backend response as-is
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, Authorization, X-TractStack-Tenant',
      },
    });
  } catch (error) {
    console.error('Profile decode API proxy error:', error);

    return new Response(
      JSON.stringify({
        profile: null,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Handle OPTIONS for CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-TractStack-Tenant',
    },
  });
};
