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
