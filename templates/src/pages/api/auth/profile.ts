import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const GO_BACKEND =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    // Forward the request to the Go backend
    const body = await request.text();

    // Create abort controller for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const tenantId =
      locals.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default';

    try {
      const response = await fetch(`${GO_BACKEND}/api/v1/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          ...(request.headers.get('Authorization') && {
            Authorization: request.headers.get('Authorization')!,
          }),
        },
        body: body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Return the response with the same status code
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Profile request timeout');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request timeout - please try again',
          }),
          {
            status: 408,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Profile API proxy error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to connect to backend service',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
