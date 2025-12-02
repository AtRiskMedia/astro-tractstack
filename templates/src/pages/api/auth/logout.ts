import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const goBackend =
      import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
    let rootDomain: string | undefined;

    try {
      const url = new URL(goBackend);
      // Only set domain for non-localhost to preserve local dev behavior
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        rootDomain = url.hostname;
      }
    } catch (e) {
      console.warn('Logout: Failed to parse backend URL for cookie domain', e);
    }

    // Determine the options ONCE to prevent overwriting
    const cookieOptions: any = { path: '/' };
    if (rootDomain) {
      cookieOptions.domain = rootDomain;
    }

    // Execute deletion with the single, correct configuration
    cookies.delete('admin_auth', cookieOptions);
    cookies.delete('editor_auth', cookieOptions);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Logged out successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
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
