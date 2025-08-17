import type { AstroGlobal } from '@/types/astro';

/**
 * Calls the backend's /api/v1/auth/visit endpoint to create a new session.
 * This function is decoupled from Astro-specific objects.
 * @param tenantId The tenant ID to use for the backend request.
 * @returns A promise that resolves to the new session ID from the backend.
 */
export async function createBackendSession(tenantId: string): Promise<string> {
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    const response = await fetch(`${goBackend}/api/v1/auth/visit`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Backend session creation failed: ${response.status}`,
        errorBody
      );
      throw new Error(`Backend session creation failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.sessionId) {
      console.error('Backend did not return a sessionId on warming', result);
      throw new Error('Backend did not return a sessionId');
    }
    return result.sessionId;
  } catch (error) {
    console.warn(
      'Backend session creation failed, using client-side SSR fallback for session ID'
    );
    return `ssr-fallback-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;
  }
}

/**
 * Get or create a session ID with proper validation
 * This is the main function that should be used in [...slug].astro
 */
export async function getOrSetSessionId(
  astro: AstroGlobal,
  tenantId: string
): Promise<string> {
  // Check if we already have a session ID in the cookie
  let sessionId = astro.cookies.get('tractstack_session_id')?.value;

  if (sessionId) {
    // Validate session exists in backend before using it
    const isValid = await validateSessionWithBackend(sessionId, tenantId);
    if (!isValid) {
      console.warn(`Session ${sessionId} invalid, creating new session`);
      sessionId = ''; // Force new session creation
    }
  }

  if (!sessionId) {
    // Call backend to generate collision-free session ID AND warm session
    sessionId = await createBackendSession(tenantId);

    // Set cookie with backend-provided session ID
    astro.cookies.set('tractstack_session_id', sessionId, {
      httpOnly: false, // Client needs to read for SSE handshake
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    //  console.log(`Created new session: ${sessionId}`);
    //} else {
    //  console.log(`Using existing session: ${sessionId}`);
  }

  return sessionId;
}

/**
 * Validate that a session exists in the backend cache
 * This prevents using stale session IDs after server restarts
 */
async function validateSessionWithBackend(
  sessionId: string,
  tenantId: string
): Promise<boolean> {
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  try {
    // Use a lightweight endpoint to check if session exists
    const response = await fetch(`${goBackend}/api/v1/auth/visit`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.warn('Session validation failed:', error);
    return false;
  }
}
