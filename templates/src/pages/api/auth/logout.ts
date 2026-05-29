import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ cookies, url, locals }) => {
  const tenantId =
    locals.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default';

  try {
    const isLocalhost =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    const cookieOptions: any = {
      path: '/',
      secure: !isLocalhost,
      httpOnly: true,
      sameSite: 'lax',
    };

    cookies.delete('admin_auth', cookieOptions);
    cookies.delete('editor_auth', cookieOptions);

    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
    });

    const backendUrl =
      import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const backendResponse = await fetch(`${backendUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      for (const setCookie of backendResponse.headers.getSetCookie()) {
        responseHeaders.append('Set-Cookie', setCookie);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Logout backend request failed:', fetchError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Logged out successfully',
      }),
      {
        status: 200,
        headers: responseHeaders,
      }
    );
  } catch (error) {
    console.error('Logout API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Logout failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
