import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const GO_BACKEND =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    const { traceId } = await request.json();

    if (!traceId) {
      return new Response(JSON.stringify({ error: 'traceId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const tenantId =
      locals.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default';

    try {
      const response = await fetch(
        `${GO_BACKEND}/api/v1/bookings/hold/${traceId}`,
        {
          method: 'DELETE',
          headers: {
            'X-Tenant-ID': tenantId,
            ...(request.headers.get('Authorization') && {
              Authorization: request.headers.get('Authorization')!,
            }),
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      return new Response(JSON.stringify({ success: response.ok }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Release-hold request timeout',
          }),
          {
            status: 408,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Release-hold API proxy error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to connect to backend service',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
