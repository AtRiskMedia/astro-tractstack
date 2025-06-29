import type { APIRoute } from 'astro';

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
    const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';
    const backendUrl = import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

    // Prepare request to Go backend
    const backendRequest = {
      password,
      tenantId,
    };

    // Call Go backend login endpoint
    const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TractStack-Tenant': tenantId,
      },
      body: JSON.stringify(backendRequest),
    });

    const result = await response.json();

    if (response.ok && result.status === 'ok') {
      // Get Set-Cookie header from backend response
      const setCookieHeader = response.headers.get('Set-Cookie');

      // Build response headers
      const responseHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
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
