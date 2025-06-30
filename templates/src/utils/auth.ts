import type { APIContext } from 'astro';

/**
 * Admin/Editor Authentication Utilities
 * Uses JWT tokens in Authorization headers for secure admin authentication
 */

export interface AdminAuthClaims {
  role: 'admin' | 'editor';
  tenantId: string;
  type: 'admin_auth';
  iat: number;
  exp: number;
}

/**
 * Check if user is authenticated (either admin or editor)
 */
export function isAuthenticated(context: APIContext): boolean {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.substring(7);
  try {
    const claims = validateAdminToken(token);
    return claims !== null;
  } catch {
    return false;
  }
}

/**
 * Check if user has admin role
 */
export function isAdmin(context: APIContext): boolean {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.substring(7);
  try {
    const claims = validateAdminToken(token);
    return claims?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Check if user has editor role
 */
export function isEditor(context: APIContext): boolean {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.substring(7);
  try {
    const claims = validateAdminToken(token);
    return claims?.role === 'editor';
  } catch {
    return false;
  }
}

/**
 * Get user role (admin, editor, or null)
 */
export function getUserRole(context: APIContext): 'admin' | 'editor' | null {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    const claims = validateAdminToken(token);
    return claims?.role || null;
  } catch {
    return null;
  }
}

/**
 * Page-level protection: Require admin role
 * Redirects to login if unauthorized
 */
export function requireAdmin(context: APIContext): void {
  if (!isAdmin(context)) {
    throw new Response(null, {
      status: 302,
      headers: { Location: '/storykeep/login' },
    });
  }
}

/**
 * Page-level protection: Require editor role
 * Redirects to login if unauthorized
 */
export function requireEditor(context: APIContext): void {
  if (!isEditor(context)) {
    throw new Response(null, {
      status: 302,
      headers: { Location: '/storykeep/login' },
    });
  }
}

/**
 * Page-level protection: Require admin OR editor role
 * Redirects to login if unauthorized
 */
export function requireAdminOrEditor(context: APIContext): void {
  if (!isAuthenticated(context)) {
    throw new Response(null, {
      status: 302,
      headers: { Location: '/storykeep/login' },
    });
  }
}

/**
 * API-level protection: Require admin role
 * Returns 401 JSON response if unauthorized
 */
export function requireAdminAPI(context: APIContext): void {
  if (!isAdmin(context)) {
    throw new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * API-level protection: Require editor role
 * Returns 401 JSON response if unauthorized
 */
export function requireEditorAPI(context: APIContext): void {
  if (!isEditor(context)) {
    throw new Response(JSON.stringify({ error: 'Editor access required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * API-level protection: Require admin OR editor role
 * Returns 401 JSON response if unauthorized
 */
export function requireAdminOrEditorAPI(context: APIContext): void {
  if (!isAuthenticated(context)) {
    throw new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Validate JWT token and extract claims
 * Note: This is a simplified client-side validation
 * Real validation happens on the backend
 */
function validateAdminToken(token: string): AdminAuthClaims | null {
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

    return claims;
  } catch {
    return null;
  }
}
