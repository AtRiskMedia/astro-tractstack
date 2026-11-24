/**
 * Admin/Editor Authentication Utilities
 * Uses role-specific cookies for secure admin authentication
 */

export interface AdminAuthClaims {
  role: 'admin' | 'editor';
  tenantId: string;
  type: 'admin_auth';
  iat: number;
  exp: number;
  sub?: string;
  email?: string;
  name?: string;
  username?: string;
  tv?: string;
  main?: boolean;
  mcp?: boolean;
}

export interface CurrentUser {
  sub: string;
  email: string;
  name: string;
  username: string;
  role: 'admin' | 'editor';
  isMain: boolean;
  mustChangePassword: boolean;
}

/**
 * Helper to get the current expected tenant ID from the Astro context
 */
function getExpectedTenantId(astro: any): string {
  return (
    astro.locals?.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default'
  );
}

function getClaims(astro: any): AdminAuthClaims | null {
  const expectedTenantId = getExpectedTenantId(astro);
  const adminCookie = astro.cookies.get('admin_auth');
  if (adminCookie?.value) {
    const claims = validateAdminToken(adminCookie.value, expectedTenantId);
    if (claims && claims.role === 'admin') return claims;
  }
  const editorCookie = astro.cookies.get('editor_auth');
  if (editorCookie?.value) {
    const claims = validateAdminToken(editorCookie.value, expectedTenantId);
    if (claims && claims.role === 'editor') return claims;
  }
  return null;
}

/**
 * Check if user is authenticated (either admin or editor)
 */
export function isAuthenticated(astro: any): boolean {
  return getClaims(astro) !== null;
}

/**
 * Check if user has admin role
 */
export function isAdmin(astro: any): boolean {
  const claims = getClaims(astro);
  return claims?.role === 'admin';
}

/**
 * Check if user has editor role
 */
export function isEditor(astro: any): boolean {
  const claims = getClaims(astro);
  return claims?.role === 'editor';
}

/**
 * Get user role (admin, editor, or null)
 */
export function getUserRole(astro: any): 'admin' | 'editor' | null {
  return getClaims(astro)?.role ?? null;
}

export function getCurrentUser(astro: any): CurrentUser | null {
  const claims = getClaims(astro);
  if (!claims) return null;
  return {
    sub: claims.sub || '',
    email: claims.email || '',
    name: claims.name || '',
    username: claims.username || '',
    role: claims.role,
    isMain: claims.main === true || (!claims.sub && claims.role === 'admin'),
    mustChangePassword: claims.mcp === true,
  };
}

export function isMainAdmin(astro: any): boolean {
  return getCurrentUser(astro)?.isMain === true;
}

export function mustChangePassword(astro: any): boolean {
  return getCurrentUser(astro)?.mustChangePassword === true;
}

/**
 * Page-level protection: Require admin role
 */
export function requireAdmin(astro: any): Response | undefined {
  if (!isAdmin(astro)) {
    const target = encodeURIComponent(astro.url.pathname + astro.url.search);
    return astro.redirect(`/storykeep/login?redirect=${target}`);
  }
  return requireMustChangeGate(astro);
}

/**
 * Page-level protection: Require editor role
 */
export function requireEditor(astro: any): Response | undefined {
  if (!isEditor(astro)) {
    const target = encodeURIComponent(astro.url.pathname + astro.url.search);
    return astro.redirect(`/storykeep/login?redirect=${target}`);
  }
  return requireMustChangeGate(astro);
}

/**
 * Page-level protection: Require admin OR editor role
 */
export function requireAdminOrEditor(astro: any): Response | undefined {
  if (!isAuthenticated(astro)) {
    const target = encodeURIComponent(astro.url.pathname + astro.url.search);
    return astro.redirect(`/storykeep/login?redirect=${target}`);
  }
  return requireMustChangeGate(astro);
}

function requireMustChangeGate(astro: any): Response | undefined {
  const path = astro.url.pathname;
  const allowed =
    path === '/storykeep/account' ||
    path === '/storykeep/logout' ||
    path === '/storykeep/login' ||
    path.startsWith('/storykeep/forgot') ||
    path.startsWith('/storykeep/reset');
  if (mustChangePassword(astro) && !allowed) {
    return astro.redirect('/storykeep/account');
  }
}

/**
 * Get admin token for API requests
 */
export function getAdminToken(astro: any): string | null {
  const expectedTenantId = getExpectedTenantId(astro);
  const adminCookie = astro.cookies.get('admin_auth');
  if (adminCookie?.value) {
    const claims = validateAdminToken(adminCookie.value, expectedTenantId);
    if (claims?.role === 'admin') return adminCookie.value;
  }

  const editorCookie = astro.cookies.get('editor_auth');
  if (editorCookie?.value) {
    const claims = validateAdminToken(editorCookie.value, expectedTenantId);
    if (claims?.role === 'editor') return editorCookie.value;
  }

  return null;
}

/**
 * Validate JWT token and extract claims
 * Note: This is a simplified client-side validation
 * Real validation happens on the backend
 */
function validateAdminToken(
  token: string,
  expectedTenantId: string
): AdminAuthClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(decoded) as AdminAuthClaims;

    if (claims.type !== 'admin_auth') return null;
    if (!claims.role || !['admin', 'editor'].includes(claims.role)) return null;
    if (Date.now() / 1000 > claims.exp) return null;

    if (claims.tenantId !== expectedTenantId) return null;

    // Pre-cutover editor cookies without sub are rejected (backend also rejects)
    if (claims.role === 'editor' && !claims.sub) return null;

    return claims;
  } catch {
    return null;
  }
}
