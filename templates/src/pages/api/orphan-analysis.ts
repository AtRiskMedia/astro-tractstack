import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    // Forward authentication cookies to the backend
    const cookieHeader = request.headers.get('cookie') || '';

    // Create abort controller for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for analysis

    try {
      const goResponse = await fetch(
        `${goBackend}/api/v1/admin/orphan-analysis`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookieHeader,
            'X-Tenant-ID': request.headers.get('X-Tenant-ID') || 'default',
            Origin: request.headers.get('Origin') || 'http://localhost:4321',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!goResponse.ok) {
        console.error(
          'Orphan Analysis API: Go backend error:',
          goResponse.status
        );

        // Handle authentication errors
        if (goResponse.status === 401 || goResponse.status === 403) {
          return new Response(
            JSON.stringify({
              error: 'Authentication required',
              status: 'error',
            }),
            {
              status: goResponse.status,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            error: 'Backend error',
            status: 'error',
          }),
          {
            status: goResponse.status,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const responseData = await goResponse.json();

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Orphan analysis request timeout');
        return new Response(
          JSON.stringify({
            error: 'Analysis timeout - this may indicate a large dataset',
            status: 'error',
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
    console.error('Orphan Analysis API Proxy: Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Proxy error',
        status: 'error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
