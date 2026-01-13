import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ cookies, url }) => {
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
