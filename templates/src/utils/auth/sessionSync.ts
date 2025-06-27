// templates/src/utils/auth/sessionSync.ts
// localStorage/cookie synchronization utilities

export interface SessionData {
  fingerprint: string | null;
  visitId: string | null;
  consent: string | null;
  encryptedEmail: string | null;
  encryptedCode: string | null;
  hasProfile: boolean;
}

export interface CookieOptions {
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Cookie utilities
 */
export class CookieManager {
  static get(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const part = parts.pop();
      return part ? decodeURIComponent(part.split(';').shift() || '') : null;
    }
    return null;
  }

  static set(name: string, value: string, options: CookieOptions = {}): void {
    let cookieString = `${name}=${encodeURIComponent(value)}`;

    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`;
    }

    cookieString += `; path=${options.path || '/'}`;

    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }

    if (options.secure) {
      cookieString += `; secure`;
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieString;
  }

  static remove(name: string, path: string = '/'): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
  }
}

/**
 * LocalStorage utilities with error handling
 */
export class StorageManager {
  static get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`TractStack: Failed to read from localStorage: ${key}`, error);
      return null;
    }
  }

  static set(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`TractStack: Failed to write to localStorage: ${key}`, error);
      return false;
    }
  }

  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`TractStack: Failed to remove from localStorage: ${key}`, error);
      return false;
    }
  }

  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('TractStack: Failed to clear localStorage', error);
      return false;
    }
  }
}

/**
 * Session synchronization between localStorage and cookies
 */
export class SessionSync {
  private static readonly STORAGE_KEYS = {
    fingerprint: 'fp_id',
    visitId: 'visit_id',
    consent: 'consent',
    encryptedEmail: 'encrypted_email',
    encryptedCode: 'encrypted_code',
  } as const;

  private static readonly COOKIE_KEYS = {
    fingerprint: 'fp_id',
    visitId: 'visit_id',
    consent: 'consent',
    profileToken: 'profile_token',
  } as const;

  /**
   * Get current session data from localStorage and cookies
   */
  static getCurrentSession(): SessionData {
    return {
      fingerprint: StorageManager.get(this.STORAGE_KEYS.fingerprint),
      visitId: StorageManager.get(this.STORAGE_KEYS.visitId),
      consent: StorageManager.get(this.STORAGE_KEYS.consent),
      encryptedEmail: StorageManager.get(this.STORAGE_KEYS.encryptedEmail),
      encryptedCode: StorageManager.get(this.STORAGE_KEYS.encryptedCode),
      hasProfile: !!CookieManager.get(this.COOKIE_KEYS.profileToken),
    };
  }

  /**
   * Sync localStorage with cookies (cookies take precedence)
   */
  static syncFromCookies(): SessionData {
    const cookieFingerprint = CookieManager.get(this.COOKIE_KEYS.fingerprint);
    const cookieVisitId = CookieManager.get(this.COOKIE_KEYS.visitId);
    const cookieConsent = CookieManager.get(this.COOKIE_KEYS.consent);

    if (cookieFingerprint) {
      StorageManager.set(this.STORAGE_KEYS.fingerprint, cookieFingerprint);
    }

    if (cookieVisitId) {
      StorageManager.set(this.STORAGE_KEYS.visitId, cookieVisitId);
    }

    if (cookieConsent) {
      StorageManager.set(this.STORAGE_KEYS.consent, cookieConsent);
    }

    return this.getCurrentSession();
  }

  /**
   * Store encrypted credentials for profile fast-pass
   */
  static storeEncryptedCredentials(email: string, code: string): boolean {
    const emailStored = StorageManager.set(this.STORAGE_KEYS.encryptedEmail, email);
    const codeStored = StorageManager.set(this.STORAGE_KEYS.encryptedCode, code);
    return emailStored && codeStored;
  }

  /**
   * Clear encrypted credentials
   */
  static clearEncryptedCredentials(): void {
    StorageManager.remove(this.STORAGE_KEYS.encryptedEmail);
    StorageManager.remove(this.STORAGE_KEYS.encryptedCode);
  }

  /**
   * Clear entire session (localStorage and cookies)
   */
  static clearSession(): void {
    // Clear localStorage
    Object.values(this.STORAGE_KEYS).forEach(key => {
      StorageManager.remove(key);
    });

    // Clear cookies
    Object.values(this.COOKIE_KEYS).forEach(cookieName => {
      CookieManager.remove(cookieName);
    });

    console.log('TractStack: Session cleared completely');
  }

  /**
   * Generate a fingerprint ID if none exists
   */
  static ensureFingerprint(): string {
    let fingerprint = StorageManager.get(this.STORAGE_KEYS.fingerprint);

    if (!fingerprint) {
      fingerprint = this.generateFingerprint();
      StorageManager.set(this.STORAGE_KEYS.fingerprint, fingerprint);
    }

    return fingerprint;
  }

  /**
   * Generate a simple but unique fingerprint
   */
  private static generateFingerprint(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    const userAgent = navigator.userAgent.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
    return `fp_${timestamp}_${random}_${userAgent}`;
  }

  /**
   * Validate session data completeness
   */
  static validateSession(session: SessionData): {
    isValid: boolean;
    missingFields: string[];
    recommendations: string[];
  } {
    const missingFields: string[] = [];
    const recommendations: string[] = [];

    if (!session.fingerprint) {
      missingFields.push('fingerprint');
      recommendations.push('Generate fingerprint automatically');
    }

    if (!session.visitId) {
      missingFields.push('visitId');
      recommendations.push('Trigger session handshake');
    }

    if (!session.consent) {
      recommendations.push('Request user consent for longer session');
    }

    if (session.encryptedEmail && !session.encryptedCode) {
      missingFields.push('encryptedCode');
      recommendations.push('Both email and code needed for fast-pass');
    }

    if (session.encryptedCode && !session.encryptedEmail) {
      missingFields.push('encryptedEmail');
      recommendations.push('Both email and code needed for fast-pass');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      recommendations,
    };
  }

  /**
   * Debug helper to log current session state
   */
  static debugSession(): void {
    const session = this.getCurrentSession();
    const validation = this.validateSession(session);

    console.group('TractStack Session Debug');
    console.log('Current Session:', session);
    console.log('Validation:', validation);
    console.log('All Cookies:', document.cookie);
    console.log('TractStack LocalStorage:', {
      fp_id: StorageManager.get('fp_id'),
      visit_id: StorageManager.get('visit_id'),
      consent: StorageManager.get('consent'),
      encrypted_email: !!StorageManager.get('encrypted_email'),
      encrypted_code: !!StorageManager.get('encrypted_code'),
    });
    console.groupEnd();
  }
}

// Global debug helper
if (typeof window !== 'undefined') {
  (window as any).tractStackDebug = {
    session: () => SessionSync.debugSession(),
    clear: () => SessionSync.clearSession(),
    sync: () => SessionSync.syncFromCookies(),
  };
}
