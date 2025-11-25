import type { APIContext, MiddlewareNext } from '@/types/astro';

interface Locals {
  tenant?: {
    id: string;
    domain: string | null;
    isMultiTenant: boolean;
    isLocalhost: boolean;
  };
}

interface CacheEntry {
  tenantId: string;
  timestamp: number;
}

const domainCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function onRequest(
  context: APIContext & { locals: Locals },
  next: MiddlewareNext
) {
  const isMultiTenantEnabled =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === 'true';

  if (isMultiTenantEnabled && !import.meta.env.DEV) {
    const hostname =
      context.request.headers.get('x-forwarded-host') ||
      context.request.headers.get('host');

    if (hostname) {
      let tenantId: string | null = null;

      // Strategy 1: Regex Pattern (Fastest)
      const parts = hostname.split('.');
      if (
        parts.length === 3 &&
        ['freewebpress', 'tractstack'].includes(parts[1]) &&
        parts[2] === 'com'
      ) {
        tenantId = parts[0];
      } else if (
        parts.length >= 4 &&
        parts[1] === 'sandbox' &&
        ['freewebpress', 'tractstack'].includes(parts[2]) &&
        parts[3] === 'com'
      ) {
        tenantId = parts[0];
      }

      // Strategy 2: Cache Lookup (Fast)
      if (!tenantId) {
        const cached = domainCache.get(hostname);
        if (cached) {
          if (Date.now() - cached.timestamp < CACHE_TTL) {
            tenantId = cached.tenantId;
          } else {
            domainCache.delete(hostname);
          }
        }
      }

      // Strategy 3: Backend Lookup (Fallback)
      if (!tenantId) {
        try {
          const backendUrl = import.meta.env.PUBLIC_GO_BACKEND;
          const response = await fetch(
            `${backendUrl}/api/v1/resolve-domain?host=${encodeURIComponent(hostname)}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.tenantId) {
              tenantId = data.tenantId;
              domainCache.set(hostname, {
                tenantId: data.tenantId,
                timestamp: Date.now(),
              });
            }
          }
        } catch (error) {
          console.error(`Failed to resolve domain ${hostname}:`, error);
        }
      }

      if (tenantId) {
        context.locals.tenant = {
          id: tenantId,
          domain: hostname,
          isMultiTenant: true,
          isLocalhost: false,
        };

        context.request.headers.set('X-Tenant-ID', tenantId);
      }
    }
  }

  return next();
}
