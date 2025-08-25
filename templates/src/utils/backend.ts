import {
  freshInstallStore,
  FRESH_INSTALL_CACHE_DURATION,
} from '@/stores/backend';

/**
 * Backend health check utilities for TractStack
 * Handles proper failover logic between maintenance and 404 responses
 */

export interface BackendHealthResponse {
  isHealthy: boolean;
  shouldRedirectToMaint: boolean;
  shouldReturn404: boolean;
}

/**
 * Check if backend is healthy and determine appropriate response action
 * @param goBackend - Backend URL
 * @param tenantId - Tenant ID for headers
 * @param httpStatus - The original HTTP status from the failed request
 * @returns Object indicating what action to take
 */
export async function checkBackendHealth(
  goBackend: string,
  tenantId: string,
  httpStatus: number
): Promise<BackendHealthResponse> {
  try {
    // Quick health check with short timeout
    const healthCheck = await fetch(`${goBackend}/api/v1/health`, {
      headers: { 'X-Tenant-ID': tenantId },
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    const isHealthy = healthCheck.ok;

    // If backend is healthy but we got 404/500, it's a legitimate content error
    if (isHealthy && (httpStatus === 404 || httpStatus >= 500)) {
      return {
        isHealthy: true,
        shouldRedirectToMaint: false,
        shouldReturn404: true,
      };
    }

    // If backend is unhealthy, go to maintenance
    if (!isHealthy) {
      return {
        isHealthy: false,
        shouldRedirectToMaint: true,
        shouldReturn404: false,
      };
    }

    // Backend is healthy and status is not 404/500 - shouldn't happen but handle gracefully
    return {
      isHealthy: true,
      shouldRedirectToMaint: false,
      shouldReturn404: true,
    };
  } catch (healthError) {
    // Health check failed - backend is likely down
    return {
      isHealthy: false,
      shouldRedirectToMaint: true,
      shouldReturn404: false,
    };
  }
}

/**
 * Handle response based on backend health check
 * @param healthResponse - Result from checkBackendHealth
 * @param originalStatus - Original HTTP status code
 * @param currentPath - Current URL path for redirect
 * @returns Astro Response or redirect
 */
export function handleBackendResponse(
  healthResponse: BackendHealthResponse,
  originalStatus: number,
  currentPath: string
) {
  if (healthResponse.shouldRedirectToMaint) {
    // Backend is down - redirect to maintenance page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/maint?from=${encodeURIComponent(currentPath)}`,
      },
    });
  }

  if (healthResponse.shouldReturn404) {
    // Backend is up but content not found - return proper error
    const statusText =
      originalStatus === 404
        ? 'Story not found'
        : originalStatus >= 500
          ? 'Server error'
          : 'Request failed';

    return new Response(null, {
      status: originalStatus,
      statusText,
    });
  }

  // Fallback - should not reach here
  return new Response(null, {
    status: 500,
    statusText: 'Unexpected error',
  });
}

/**
 * Handle failed backend response - determines if backend is down or content is missing
 * This replaces the entire if (!response.ok) block in Astro pages
 * @param response - The failed fetch response
 * @param goBackend - Backend URL
 * @param tenantId - Tenant ID
 * @param currentPath - Current URL path
 * @returns Astro Response or null (if response was actually ok)
 */
export async function handleFailedResponse(
  response: Response,
  goBackend: string,
  tenantId: string,
  currentPath: string
): Promise<Response | null> {
  if (response.ok) {
    return null; // Response was actually ok, let caller handle it normally
  }

  if (response.status >= 500 || response.status === 404) {
    // Use the backend health helper to determine proper response
    const healthResponse = await checkBackendHealth(
      goBackend,
      tenantId,
      response.status
    );

    return handleBackendResponse(healthResponse, response.status, currentPath);
  }

  // Other error status codes (401, 403, etc.) - return as-is
  return new Response(null, {
    status: response.status,
    statusText: 'Story not found',
  });
}

/**
 * Performs a pre-check to detect if the system requires initial setup.
 * This function is designed to work idiomatically with Astro's control flow.
 *
 * - If setup is needed, it returns a Response object to trigger a redirect.
 * - If the system is healthy, it completes silently by returning void.
 * - If an unexpected error occurs (e.g., backend is unreachable), it logs
 * the error and returns a Response object to redirect to a maintenance page.
 *
 * @param tenantId The tenant ID for which to perform the health check.
 * @returns {Promise<Response | void>} A promise that resolves to a Response object
 * if a redirect is needed, or void if the request can proceed.
 */
export async function preHealthCheck(
  tenantId: string
): Promise<Response | void> {
  const currentState = freshInstallStore.get();
  const now = Date.now();

  // Fast path: Use cache if the tenant is known to be active and the check is recent.
  if (
    currentState.activeTenants.includes(tenantId) &&
    !currentState.needsSetup &&
    now - currentState.lastChecked < FRESH_INSTALL_CACHE_DURATION
  ) {
    return;
  }

  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const healthCheckUrl = `${goBackend}/api/v1/health`;

  try {
    const response = await fetch(healthCheckUrl, {
      headers: { 'X-Tenant-ID': tenantId },
      signal: AbortSignal.timeout(5000), // 5-second timeout
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error(
        `[preHealthCheck] Health check responded with a non-OK status: ${response.status}`,
        { tenantId, responseBody }
      );
      throw new Error(
        `Health check failed with status code: ${response.status}`
      );
    }

    const result = await response.json();

    if (result.needsSetup === true) {
      // System requires initial setup. Update state and return a redirect Response.
      freshInstallStore.set({
        needsSetup: true,
        activeTenants: currentState.activeTenants.filter(
          (id) => id !== tenantId
        ),
        lastChecked: now,
      });

      return new Response(null, {
        status: 302,
        headers: { Location: '/storykeep/init' },
      });
    }

    // If we reach here, the system is considered initialized and healthy.
    // Update the cache to reflect this state and continue.
    freshInstallStore.set({
      needsSetup: false,
      activeTenants: [...new Set([...currentState.activeTenants, tenantId])],
      lastChecked: now,
    });
  } catch (error) {
    // For any error (network failure, JSON parsing error, etc.), log it
    // and return a Response to redirect to the maintenance page.
    console.error(
      '[preHealthCheck] An unexpected error occurred during the health check process.',
      { tenantId, originalError: error }
    );

    const maintUrl = `/maint?from=${encodeURIComponent(
      globalThis.location?.pathname || '/'
    )}`;
    return new Response(null, {
      status: 302,
      headers: { Location: maintUrl },
    });
  }
}
