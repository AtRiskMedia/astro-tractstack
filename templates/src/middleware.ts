import type { APIContext, MiddlewareNext } from '@/types/astro';
import { resolveTenantId } from '@/utils/tenantResolver';

interface Locals {
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

  if (isMultiTenantEnabled && !import.meta.env.DEV) {
    // Use the shared utility to resolve the tenant ID
    const resolution = await resolveTenantId(context.request);

    if (resolution.id && resolution.id !== 'default') {
      const hostname =
        context.request.headers.get('x-forwarded-host') ||
        context.request.headers.get('host');

      context.locals.tenant = {
        id: resolution.id,
        domain: hostname,
        isMultiTenant: true,
        isLocalhost: false,
      };

      context.request.headers.set('X-Tenant-ID', resolution.id);
    }
  }

  return next();
}
