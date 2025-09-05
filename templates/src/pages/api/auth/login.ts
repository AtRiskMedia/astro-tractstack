import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { password, redirect } = body;

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get tenant info from environment
    const tenantId =
      request.headers.get('X-Tenant-ID') ||
      import.meta.env.PUBLIC_TENANTID ||
      'default';
    const backendUrl =
      import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

    // Prepare request to Go backend
    const backendRequest = {
      password,
      tenantId,
    };

    // Create abort controller for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      // Call Go backend login endpoint
      const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify(backendRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (response.ok && result.status === 'ok') {
        // Get Set-Cookie header from backend response
        const setCookieHeader = response.headers.get('Set-Cookie');

        // Build response headers
        const responseHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (setCookieHeader) {
          responseHeaders['Set-Cookie'] = setCookieHeader;
        }

        // Success response
        return new Response(
          JSON.stringify({
            success: true,
            role: result.role || 'authenticated',
            redirect: redirect || '/storykeep',
          }),
          {
            status: 200,
            headers: responseHeaders,
          }
        );
      } else {
        // Login failed
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error || 'Invalid credentials',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Login request timeout');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request timeout - please try again',
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
    console.error('Login API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
