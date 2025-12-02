const VERBOSE = false;

interface TenantResolution {
  id: string;
  source: 'regex' | 'cache' | 'fetch' | 'default';
}

interface CacheEntry {
  tenantId: string;
  timestamp: number;
}

const domainCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function resolveTenantId(
  request: Request
): Promise<TenantResolution> {
  const hostname =
    request.headers.get('x-forwarded-host') || request.headers.get('host');

  if (VERBOSE) console.log(`[TenantResolver] Resolving: ${hostname}`);

  if (!hostname) return { id: 'default', source: 'default' };

  // Strategy 1: Regex Pattern (Fastest - Zero Latency)
  const parts = hostname.split('.');

  // Standard Subdomain (e.g. pro.freewebpress.com or pro.freewebpress.com:443)
  if (
    parts.length === 3 &&
    ['freewebpress', 'tractstack'].includes(parts[1]) &&
    parts[2].startsWith('com')
  ) {
    if (VERBOSE) console.log(`[TenantResolver] Regex Match: ${parts[0]}`);
    return { id: parts[0], source: 'regex' };
  }

  // Sandbox Subdomain (e.g. id.sandbox.freewebpress.com)
  if (
    parts.length >= 4 &&
    parts[1] === 'sandbox' &&
    ['freewebpress', 'tractstack'].includes(parts[2]) &&
    parts[3].startsWith('com')
  ) {
    if (VERBOSE)
      console.log(`[TenantResolver] Regex Sandbox Match: ${parts[0]}`);
    return { id: parts[0], source: 'regex' };
  }

  // Strategy 2: Cache Lookup (Fast - In Memory)
  const cached = domainCache.get(hostname);
  if (cached) {
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      if (VERBOSE)
        console.log(`[TenantResolver] Cache Hit: ${cached.tenantId}`);
      return { id: cached.tenantId, source: 'cache' };
    } else {
      domainCache.delete(hostname);
      if (VERBOSE)
        console.log(`[TenantResolver] Cache Expired for: ${hostname}`);
    }
  }

  // Strategy 3: Backend Lookup (Fallback - Network Request)
  try {
    const backendUrl =
      import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:10000';
    const urlObj = new URL(backendUrl);
    // Force localhost to avoid Hairpin NAT / Loopback firewall blocks
    const localBackend = `${urlObj.protocol}//127.0.0.1:${urlObj.port}`;

    if (VERBOSE) console.log(`[TenantResolver] Fetching from: ${localBackend}`);

    // Temporarily disable TLS validation because 127.0.0.1 won't match the cert
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const response = await fetch(
      `${localBackend}/api/v1/resolve-domain?host=${encodeURIComponent(hostname)}`
    );

    // Restore security immediately
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

    if (response.ok) {
      const data = await response.json();
      if (data.tenantId) {
        if (VERBOSE)
          console.log(`[TenantResolver] Fetch Success: ${data.tenantId}`);

        // Cache the result
        domainCache.set(hostname, {
          tenantId: data.tenantId,
          timestamp: Date.now(),
        });

        return { id: data.tenantId, source: 'fetch' };
      }
    } else {
      if (VERBOSE)
        console.log(`[TenantResolver] Fetch Failed: ${response.status}`);
    }
  } catch (error) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    console.error(
      `[TenantResolver] Error resolving domain ${hostname}:`,
      error
    );
  }

  if (VERBOSE) console.warn(`[TenantResolver] Failed to resolve. Defaulting.`);
  return { id: 'default', source: 'default' };
}
