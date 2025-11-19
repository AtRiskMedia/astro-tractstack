import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ request }) => {
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const sharedSecret = import.meta.env.PRIVATE_SANDBOX_SECRET;
  const tenantId =
    request.headers.get('X-Tenant-ID') ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  if (!sharedSecret || sharedSecret === 'false' || sharedSecret === 'true') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Sandbox feature is not configured on the server.',
      }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const profileCookie = request.headers
    .get('cookie')
    ?.includes('tractstack_profile');
  if (!profileCookie) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Forbidden: Missing sandbox profile.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action !== 'askLemur') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const backendResponse = await fetch(`${goBackend}/api/v1/aai/askLemur`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        Authorization: `Bearer ${sharedSecret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new Response(errorText, {
        status: backendResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await backendResponse.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
