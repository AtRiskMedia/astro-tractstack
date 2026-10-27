export type ExtendFetchOptions = RequestInit & {
  /** SysOp bearer for multi source calls; never replaces X-Tenant-ID. */
  sysopToken?: string | null;
};

function tenantId(): string | null {
  if (typeof window === 'undefined') return null;
  const id = (window as any).TRACTSTACK_CONFIG?.tenantId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function goBackend(): string {
  if (typeof window === 'undefined') return '';
  return (
    (window as any).TRACTSTACK_CONFIG?.backendUrl ||
    (import.meta as any).env?.PUBLIC_GO_BACKEND ||
    ''
  );
}

/**
 * Every Extend call to PUBLIC_GO_BACKEND: X-Tenant-ID from TRACTSTACK_CONFIG,
 * credentials include; skip if tenant id missing.
 */
export async function extendFetch(
  path: string,
  options: ExtendFetchOptions = {}
): Promise<Response> {
  const tid = tenantId();
  if (!tid) {
    throw new Error('X-Tenant-ID missing: window.TRACTSTACK_CONFIG.tenantId');
  }
  const base = goBackend().replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const { sysopToken, headers: extra, ...rest } = options;
  const headers: Record<string, string> = {
    'X-Tenant-ID': tid,
    ...(extra as Record<string, string>),
  };
  if (sysopToken) {
    headers['Authorization'] = `Bearer ${sysopToken}`;
  }
  if (
    rest.body &&
    typeof rest.body === 'string' &&
    !headers['Content-Type'] &&
    !headers['content-type']
  ) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, {
    ...rest,
    credentials: 'include',
    headers,
  });
}

export function getTenantId(): string | null {
  return tenantId();
}
