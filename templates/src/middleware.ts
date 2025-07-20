import type { APIContext, MiddlewareNext } from 'astro';

interface Locals {
  session?: Record<string, any>;
  fullContentMap?: any[];
  tenant?: {
    id: string;
    domain: string | null;
    isMultiTenant: boolean;
    isLocalhost: boolean;
  };
}

export async function onRequest(
  context: APIContext & { locals: Locals },
  next: MiddlewareNext
) {
  const isMultiTenantEnabled =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === 'true';

  // Only set tenant in locals if we have a trusted subdomain (production multi-tenant)
  if (isMultiTenantEnabled && !import.meta.env.DEV) {
    const hostname =
      context.request.headers.get('x-forwarded-host') ||
      context.request.headers.get('host');

    if (hostname) {
      // Parse production subdomain pattern: {tenantId}.sandbox.{platform}.com
      const parts = hostname.split('.');
      if (
        parts.length >= 4 &&
        parts[1] === 'sandbox' &&
        ['freewebpress', 'tractstack'].includes(parts[2]) &&
        parts[3] === 'com'
      ) {
        // Only set locals.tenant when we have a trusted subdomain
        context.locals.tenant = {
          id: parts[0],
          domain: hostname,
          isMultiTenant: true,
          isLocalhost: false,
        };

        // Set header for backend communication
        context.request.headers.set('X-Tenant-ID', parts[0]);
      }
    }
  }

  // If no trusted subdomain detected, leave locals.tenant undefined
  // This allows the cascading check to fall through to PUBLIC_TENANTID

  return next();
}
