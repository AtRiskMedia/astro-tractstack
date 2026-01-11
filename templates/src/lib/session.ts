const VERBOSE = false;

/**
 * Calls the backend's /api/v1/auth/visit endpoint to create a new session.
 * This function is decoupled from Astro-specific objects.
 * @param tenantId The tenant ID to use for the backend request.
 * @returns A promise that resolves to the new session object from the backend.
 */
export async function createBackendSession(
  tenantId: string
): Promise<{ sessionId: string; fingerprintId?: string }> {
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  if (VERBOSE)
    console.log(
      `[session.ts] createBackendSession called for tenant: ${tenantId}`
    );

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
    if (VERBOSE)
      console.log(`[session.ts] createBackendSession success:`, result);

    if (!result.sessionId) {
      console.error('Backend did not return a sessionId on warming', result);
      throw new Error('Backend did not return a sessionId');
    }
    return {
      sessionId: result.sessionId,
      fingerprintId: result.fingerprint,
    };
  } catch (error) {
    console.error('Failed to initialize backend session:', error);
    throw error;
  }
}

/**
 * Get or create a session ID with proper validation
 * This is the main function that should be used in [...slug].astro
 */
export async function getOrSetSessionId(
  astro: {
    cookies: {
      get: (name: string) => { value?: string } | undefined;
      set: (name: string, value: string, options?: any) => void;
    };
  },
  tenantId: string
): Promise<string> {
  // Check if we already have a session ID in the cookie
  let sessionId = astro.cookies.get('tractstack_session_id')?.value;
  const fingerprintId = astro.cookies.get('tractstack_fingerprint')?.value;

  if (VERBOSE)
    console.log(`[session.ts] getOrSetSessionId - Cookies Found:`, {
      sessionId,
      fingerprintId,
    });

  if (sessionId) {
    // Validate session exists in backend before using it
    // We pass fingerprintId to allow the backend to restore the session from DB if RAM is empty
    const isValid = await validateSessionWithBackend(
      sessionId,
      tenantId,
      fingerprintId
    );

    if (VERBOSE)
      console.log(`[session.ts] Session Validation Result:`, isValid);

    if (!isValid) {
      console.warn(`Session ${sessionId} invalid, creating new session`);
      sessionId = ''; // Force new session creation
    }
  }

  if (!sessionId) {
    if (VERBOSE)
      console.log(`[session.ts] No valid session found. Creating new one...`);

    // Call backend to generate collision-free session ID AND warm session
    const sessionData = await createBackendSession(tenantId);
    sessionId = sessionData.sessionId;

    // Set cookie with backend-provided session ID
    astro.cookies.set('tractstack_session_id', sessionId, {
      httpOnly: false, // Client needs to read for SSE handshake
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    if (sessionData.fingerprintId) {
      astro.cookies.set('tractstack_fingerprint', sessionData.fingerprintId, {
        httpOnly: false,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year persistence
      });
    }
    if (VERBOSE)
      console.log(`[session.ts] New Cookies Set:`, {
        sessionId,
        fingerprintId: sessionData.fingerprintId,
      });
  }

  return sessionId;
}

/**
 * Validate that a session exists in the backend cache
 * This prevents using stale session IDs after server restarts
 */
async function validateSessionWithBackend(
  sessionId: string,
  tenantId: string,
  fingerprintId?: string
): Promise<boolean> {
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  if (VERBOSE)
    console.log(`[session.ts] Validating session with backend...`, {
      sessionId,
      fingerprintId,
    });

  try {
    const response = await fetch(`${goBackend}/api/v1/auth/visit`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        fingerprintId: fingerprintId, // Explicitly pass for restoration (fixes SSR Cookie Gap)
      }),
    });

    if (!response.ok) {
      if (VERBOSE)
        console.log(
          `[session.ts] Validation returned non-200 status:`,
          response.status
        );
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.warn('Session validation failed:', error);
    if (VERBOSE) console.log(`[session.ts] Validation network error:`, error);
    return false;
  }
}
