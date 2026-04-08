import type { APIRoute } from '@/types/astro';
import { getAdminToken } from '@/utils/auth';

export const GET: APIRoute = async (context) => {
  const { request, locals } = context;
  const GO_BACKEND =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const tenantId =
      locals.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default';
    const token = getAdminToken(context);

    try {
      const response = await fetch(`${GO_BACKEND}/api/v1/bookings/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(request.headers.get('Authorization') && {
            Authorization: request.headers.get('Authorization')!,
          }),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Booking metrics lookup timeout',
          }),
          { status: 408, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Booking metrics API proxy error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to connect to backend service',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
