import { createHmac } from 'node:crypto';
import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const tenantId =
    locals.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default';
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const sharedSecret = import.meta.env.PRIVATE_SANDBOX_SECRET;

  if (!sharedSecret || sharedSecret === 'false' || sharedSecret === 'true') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Sandbox feature is not configured on the server.',
      }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const tokenHeader = request.headers.get('X-Sandbox-Token');
  if (!tokenHeader) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized: Missing sandbox token',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const [timestamp, signature] = tokenHeader.split('.');
  if (!timestamp || !signature) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid token format',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const now = Date.now();
  if (now - parseInt(timestamp, 10) > 2 * 60 * 60 * 1000) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Session expired. Please refresh the page.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const expectedSignature = createHmac('sha256', sharedSecret)
    .update(timestamp)
    .digest('hex');

  if (signature !== expectedSignature) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid signature',
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
