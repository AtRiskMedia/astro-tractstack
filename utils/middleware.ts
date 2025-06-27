// templates/src/middleware.ts
export interface TenantContext {
  id: string;
  domain: string;
  subdomain?: string;
  isMultiTenant: boolean;
  isLocalhost: boolean;
}

export interface SessionContext {
  fingerprint?: string;
  visitId?: string;
  consent?: string;
  hasProfile?: boolean;
  isReady: boolean;
}

function extractTenantFromHostname(hostname: string): TenantContext {
  const isMultiTenantEnabled = (globalThis as any).import?.meta?.env?.PUBLIC_ENABLE_MULTI_TENANT === "true";

  const isLocalhost = hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('localhost:') ||
    hostname.startsWith('127.0.0.1:');

  if (isLocalhost) {
    return {
      id: (globalThis as any).import?.meta?.env?.DEV ? 'localhost' : 'default',
      domain: hostname,
      isMultiTenant: isMultiTenantEnabled,
      isLocalhost: true
    };
  }

  if (isMultiTenantEnabled) {
    const parts = hostname.split('.');

    if (parts.length >= 4 &&
      parts[1] === 'sandbox' &&
      ['tractstack', 'freewebpress'].includes(parts[2]) &&
      parts[3] === 'com') {

      return {
        id: parts[0],
        domain: hostname,
        subdomain: parts[0],
        isMultiTenant: true,
        isLocalhost: false
      };
    }
  }

  return {
    id: (globalThis as any).import?.meta?.env?.PUBLIC_TENANTID || 'default',
    domain: hostname,
    isMultiTenant: false,
    isLocalhost: false
  };
}

export function createMiddleware() {
  return async function middleware(context: any, next: any) {
    const hostname = context.request.headers.get("x-forwarded-host") ||
      context.request.headers.get("host") ||
      context.url.hostname;

    if (!hostname) {
      return new Response("Missing hostname", { status: 400 });
    }

    const tenant = extractTenantFromHostname(hostname);
    context.locals.tenant = tenant;

    // For page requests, check existing session from cookies
    let session: SessionContext = { isReady: false };

    const cookieHeader = context.request.headers.get('cookie') || '';
    const existingCookies: Record<string, string> = {};

    cookieHeader.split(';').forEach((cookie: string) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        existingCookies[name] = value;
      }
    });

    if (existingCookies.fp_id || existingCookies.visit_id) {
      session = {
        fingerprint: existingCookies.fp_id,
        visitId: existingCookies.visit_id,
        consent: existingCookies.consent,
        hasProfile: !!existingCookies.profile_token,
        isReady: true
      };
    }

    // Make session available to all components
    context.locals.session = session;

    return next();
  };
}

export const onRequest = createMiddleware();
