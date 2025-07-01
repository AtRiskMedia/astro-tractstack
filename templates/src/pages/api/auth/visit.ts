import type { APIRoute } from 'astro';

// Define Locals interface locally if global declaration isn't picked up
interface Locals {
  session?: Record<string, any>;
}

export const prerender = false;

export const POST: APIRoute = async ({
  request,
  locals,
  cookies,
}: {
  request: Request;
  locals: Locals;
  cookies: any;
}) => {
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    // Forward the request to Go backend
    const body = await request.text();

    // Create abort controller for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const goResponse = await fetch(`${goBackend}/api/v1/auth/visit`, {
        method: 'POST',
        headers: {
          'Content-Type':
            request.headers.get('Content-Type') ||
            'application/x-www-form-urlencoded',
          'X-Tenant-ID': request.headers.get('X-Tenant-ID') || 'default',
          Origin: request.headers.get('Origin') || 'http://localhost:4321',
        },
        body: body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!goResponse.ok) {
        console.error('API Proxy: Go backend error:', goResponse.status);
        return new Response(JSON.stringify({ error: 'Backend error' }), {
          status: goResponse.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const responseData = await goResponse.json();

      // Build session data for locals (JWT-only approach)
      interface SessionData {
        isReady: boolean;
        fingerprint?: string;
        visitId?: string;
        consent?: string;
        hasProfile?: boolean;
      }

      const sessionData: SessionData = {
        isReady: !!responseData.fingerprint,
        fingerprint: responseData.fingerprint,
        visitId: responseData.visitId,
        consent: responseData.consent,
        hasProfile: !!responseData.token,
      };

      if (sessionData.fingerprint || sessionData.visitId) {
        locals.session = sessionData;
      }

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Visit request timeout');
        return new Response(JSON.stringify({ error: 'Request timeout' }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('API Proxy: Error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
