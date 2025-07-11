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
