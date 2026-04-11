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
}

/**
 * Helper to get the current expected tenant ID from the Astro context
 */
function getExpectedTenantId(astro: any): string {
  return (
    astro.locals?.tenant?.id || import.meta.env.PUBLIC_TENANTID || 'default'
  );
}

/**
 * Check if user is authenticated (either admin or editor)
 */
export function isAuthenticated(astro: any): boolean {
  const expectedTenantId = getExpectedTenantId(astro);
  const adminCookie = astro.cookies.get('admin_auth');
  const editorCookie = astro.cookies.get('editor_auth');

  if (adminCookie?.value) {
    const claims = validateAdminToken(adminCookie.value, expectedTenantId);
    if (claims && claims.role === 'admin') return true;
  }

  if (editorCookie?.value) {
    const claims = validateAdminToken(editorCookie.value, expectedTenantId);
    if (claims && claims.role === 'editor') return true;
  }

  return false;
}

/**
 * Check if user has admin role
 */
export function isAdmin(astro: any): boolean {
  const expectedTenantId = getExpectedTenantId(astro);
  const adminCookie = astro.cookies.get('admin_auth');
  if (!adminCookie?.value) return false;

  const claims = validateAdminToken(adminCookie.value, expectedTenantId);
  return claims?.role === 'admin';
}

/**
 * Check if user has editor role
 */
export function isEditor(astro: any): boolean {
  const expectedTenantId = getExpectedTenantId(astro);
  const editorCookie = astro.cookies.get('editor_auth');
  if (!editorCookie?.value) return false;

  const claims = validateAdminToken(editorCookie.value, expectedTenantId);
  return claims?.role === 'editor';
}

/**
 * Get user role (admin, editor, or null)
 */
export function getUserRole(astro: any): 'admin' | 'editor' | null {
  const expectedTenantId = getExpectedTenantId(astro);
  const adminCookie = astro.cookies.get('admin_auth');
  if (adminCookie?.value) {
    const claims = validateAdminToken(adminCookie.value, expectedTenantId);
    if (claims?.role === 'admin') return 'admin';
  }

  const editorCookie = astro.cookies.get('editor_auth');
  if (editorCookie?.value) {
    const claims = validateAdminToken(editorCookie.value, expectedTenantId);
    if (claims?.role === 'editor') return 'editor';
  }

  return null;
}

/**
 * Page-level protection: Require admin role
 * Returns redirect response if unauthorized, undefined if authorized
 */
export function requireAdmin(astro: any): Response | undefined {
  if (!isAdmin(astro)) {
    const target = encodeURIComponent(astro.url.pathname + astro.url.search);
    return astro.redirect(`/storykeep/login?redirect=${target}`);
  }
}

/**
 * Page-level protection: Require editor role
 * Returns redirect response if unauthorized, undefined if authorized
 */
export function requireEditor(astro: any): Response | undefined {
  if (!isEditor(astro)) {
    const target = encodeURIComponent(astro.url.pathname + astro.url.search);
    return astro.redirect(`/storykeep/login?redirect=${target}`);
  }
}

/**
 * Page-level protection: Require admin OR editor role
 * Returns redirect response if unauthorized, undefined if authorized
 */
export function requireAdminOrEditor(astro: any): Response | undefined {
  if (!isAuthenticated(astro)) {
    const target = encodeURIComponent(astro.url.pathname + astro.url.search);
    return astro.redirect(`/storykeep/login?redirect=${target}`);
  }
}

/**
 * Get admin token for API requests
 * Returns the JWT token from the appropriate cookie
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
    // Split JWT token
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode payload (base64url)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(decoded) as AdminAuthClaims;

    // Basic validation
    if (claims.type !== 'admin_auth') return null;
    if (!claims.role || !['admin', 'editor'].includes(claims.role)) return null;
    if (Date.now() / 1000 > claims.exp) return null; // Token expired

    // Tenant validation
    if (claims.tenantId !== expectedTenantId) return null; // Must match current environment

    return claims;
  } catch {
    return null;
  }
}
