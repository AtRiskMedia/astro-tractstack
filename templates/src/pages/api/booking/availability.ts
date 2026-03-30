import type { APIRoute } from '@/types/astro';

export const GET: APIRoute = async ({ request, locals }) => {
  const GO_BACKEND =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const tenantId =
      locals.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default';

    try {
      const response = await fetch(
        `${GO_BACKEND}/api/v1/bookings/availability?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
            ...(request.headers.get('Authorization') && {
              Authorization: request.headers.get('Authorization')!,
            }),
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const data = await response.json();

      return new Response(JSON.stringify(data), {
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
            error: 'Availability lookup timeout',
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
    console.error('Availability API proxy error:', error);
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
