import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const goBackend = import.meta.env.PUBLIC_GO_BACKEND || 'http://127.0.0.1:8080';

  try {
    console.log('API Proxy: Forwarding session handshake to Go backend');

    // Forward the request to Go backend
    const body = await request.text();
    console.log('API Proxy: Request body:', body);

    const goResponse = await fetch(`${goBackend}/api/v1/auth/visit`, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/x-www-form-urlencoded',
        'X-TractStack-Tenant': request.headers.get('X-TractStack-Tenant') || 'default',
        'Origin': request.headers.get('Origin') || 'http://localhost:4321',
      },
      body: body,
    });

    if (!goResponse.ok) {
      console.error('API Proxy: Go backend error:', goResponse.status);
      return new Response(JSON.stringify({ error: 'Backend error' }), {
        status: goResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const responseData = await goResponse.json();
    console.log('API Proxy: Go response:', responseData);

    // Extract cookies from Go response
    const setCookieHeaders = goResponse.headers.getSetCookie ? goResponse.headers.getSetCookie() : [];
    console.log('API Proxy: Received cookies from Go:', setCookieHeaders);

    // Parse and set cookies in Astro
    const sessionData: any = { isReady: false };
    setCookieHeaders.forEach(cookieHeader => {
      const [nameValue] = cookieHeader.split(';');
      const [name, value] = nameValue.split('=');

      if (name && value) {
        const cookieName = name.trim();
        const cookieValue = value.trim();

        console.log('API Proxy: Setting cookie:', cookieName, '=', cookieValue);

        // Set non-sensitive cookies accessible to JS
        if (['fp_id', 'visit_id', 'consent'].includes(cookieName)) {
          cookies.set(cookieName, cookieValue, {
            path: '/',
            maxAge: cookieName === 'fp_id' ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
            httpOnly: false, // Allow JS access
            sameSite: 'lax'
          });
        }

        // Profile token stays HttpOnly for security
        if (cookieName === 'profile_token') {
          cookies.set(cookieName, cookieValue, {
            path: '/',
            maxAge: 30 * 24 * 60 * 60,
            httpOnly: true,
            sameSite: 'lax'
          });
        }

        // Build session data for locals
        if (cookieName === 'fp_id') sessionData.fingerprint = cookieValue;
        if (cookieName === 'visit_id') sessionData.visitId = cookieValue;
        if (cookieName === 'consent') sessionData.consent = cookieValue;
        if (cookieName === 'profile_token') sessionData.hasProfile = true;
      }
    });

    if (sessionData.fingerprint || sessionData.visitId) {
      sessionData.isReady = true;
      console.log('API Proxy: Session established:', sessionData);
      locals.session = sessionData;
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Proxy: Error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
