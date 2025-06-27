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
  const isLocalhost = hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('localhost:') ||
    hostname.startsWith('127.0.0.1:');

  if (isLocalhost) {
    return {
      id: 'default',
      domain: hostname,
      isMultiTenant: false,
      isLocalhost: true
    };
  }

  return {
    id: 'default',
    domain: hostname,
    isMultiTenant: false,
    isLocalhost: false
  };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie: string) => {
    const trimmed = cookie.trim();
    const equalIndex = trimmed.indexOf('=');

    if (equalIndex > 0) {
      const name = trimmed.substring(0, equalIndex);
      const value = trimmed.substring(equalIndex + 1);
      if (name && value) {
        cookies[name] = value;
      }
    }
  });

  return cookies;
}

// This export will be transformed during injection
export const onRequest = async (context: any, next: any) => {
  console.log('MIDDLEWARE RUNNING - URL:', context.url.pathname);

  const hostname = context.request.headers.get("x-forwarded-host") ||
    context.request.headers.get("host") ||
    context.url.hostname;

  if (!hostname) {
    return new Response("Missing hostname", { status: 400 });
  }

  const tenant = extractTenantFromHostname(hostname);

  // Parse cookies from request headers (can read HttpOnly cookies)
  const cookieHeader = context.request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);

  console.log('Middleware cookies:', cookies);

  // Session ready if we have fingerprint OR visit_id
  const hasFingerprint = !!(cookies.fp_id && cookies.fp_id.trim());
  const hasVisitId = !!(cookies.visit_id && cookies.visit_id.trim());
  const hasProfile = !!cookies.profile_token; // HttpOnly cookie only visible here
  const isSessionReady = hasFingerprint || hasVisitId;

  const session: SessionContext = {
    fingerprint: cookies.fp_id || undefined,
    visitId: cookies.visit_id || undefined,
    consent: cookies.consent || undefined,
    hasProfile: hasProfile,
    isReady: isSessionReady
  };

  console.log('Middleware - Session State:', {
    hasFingerprint,
    hasVisitId,
    hasProfile,
    isReady: isSessionReady,
    cookieCount: Object.keys(cookies).length
  });

  context.locals.tenant = tenant;
  context.locals.session = session;

  return next();
};
