import type { APIRoute } from '@/types/astro';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Clear admin and editor auth cookies
    cookies.delete('admin_auth', {
      path: '/',
    });

    cookies.delete('editor_auth', {
      path: '/',
    });

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
