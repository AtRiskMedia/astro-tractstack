import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const GO_BACKEND = import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  
  try {
    // Forward the request to the Go backend
    const body = await request.text();
    
    const response = await fetch(`${GO_BACKEND}/api/v1/auth/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any relevant headers
        ...(request.headers.get('Authorization') && {
          'Authorization': request.headers.get('Authorization')!
        }),
      },
      body: body,
    });

    const data = await response.json();

    // Return the response with the same status code
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Profile API proxy error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to connect to backend service'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
