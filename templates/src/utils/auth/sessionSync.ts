export interface SessionData {
  fingerprint?: string;
  visitId?: string;
  consent?: string;
  encryptedEmail?: string;
  encryptedCode?: string;
  hasProfile: boolean;
}

class StorageManager {
  static get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  static set(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  }
}

class CookieManager {
  static get(name: string): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name && cookieValue) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  }

  static remove(name: string): void {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

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
   * Get current session data (cookies take precedence over localStorage)
   */
  static getCurrentSession(): SessionData {
    // Prefer cookies over localStorage for authoritative state
    const fingerprint = CookieManager.get(this.COOKIE_KEYS.fingerprint) ||
      StorageManager.get(this.STORAGE_KEYS.fingerprint);

    const visitId = CookieManager.get(this.COOKIE_KEYS.visitId) ||
      StorageManager.get(this.STORAGE_KEYS.visitId);

    const consent = CookieManager.get(this.COOKIE_KEYS.consent) ||
      StorageManager.get(this.STORAGE_KEYS.consent);

    return {
      fingerprint: fingerprint || undefined,
      visitId: visitId || undefined,
      consent: consent || undefined,
      encryptedEmail: StorageManager.get(this.STORAGE_KEYS.encryptedEmail) || undefined,
      encryptedCode: StorageManager.get(this.STORAGE_KEYS.encryptedCode) || undefined,
      hasProfile: !CookieManager.get(this.COOKIE_KEYS.profileToken),
    };
  }

  /**
   * Prepare data for session handshake request
   */
  static prepareHandshakeData(): { fingerprint: string; visit_id?: string } {
    let fingerprint = this.ensureFingerprint();
    const visitId = CookieManager.get(this.COOKIE_KEYS.visitId) ||
      StorageManager.get(this.STORAGE_KEYS.visitId);

    return {
      fingerprint,
      visit_id: visitId || undefined
    };
  }

  /**
   * Sync localStorage with cookies after successful handshake
   */
  static syncAfterHandshake(): SessionData {
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
    let fingerprint = CookieManager.get(this.COOKIE_KEYS.fingerprint) ||
      StorageManager.get(this.STORAGE_KEYS.fingerprint);

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
    sync: () => SessionSync.syncAfterHandshake(),
    prepare: () => SessionSync.prepareHandshakeData(),
  };
}
