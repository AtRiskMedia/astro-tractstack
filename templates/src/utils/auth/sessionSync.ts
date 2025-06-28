export interface SessionData {
  sessionId?: string;
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

export class SessionSync {
  private static readonly STORAGE_KEYS = {
    consent: 'consent',
    encryptedEmail: 'encrypted_email',
    encryptedCode: 'encrypted_code',
    profileToken: 'profile_token',
    fpId: 'fp_id',
    visitId: 'visit_id',
  } as const;

  /**
   * Get current session data (backend controls fingerprint/visit IDs)
   */
  static getCurrentSession(): SessionData {
    return {
      sessionId: (window as any).tractStackSessionId || undefined,
      consent: StorageManager.get(this.STORAGE_KEYS.consent) || undefined,
      encryptedEmail: StorageManager.get(this.STORAGE_KEYS.encryptedEmail) || undefined,
      encryptedCode: StorageManager.get(this.STORAGE_KEYS.encryptedCode) || undefined,
      hasProfile: !!StorageManager.get(this.STORAGE_KEYS.profileToken),
    };
  }

  /**
   * Prepare minimal session data for backend (session-first approach)
   */
  static prepareHandshakeData(): {
    sessionId: string;
    encryptedEmail?: string;
    encryptedCode?: string;
    consent?: string;
  } {
    const sessionId = (window as any).tractStackSessionId;
    if (!sessionId) {
      throw new Error('Session ID not available - ensure SSR session generation is working');
    }

    const data: any = { sessionId };

    const encryptedEmail = StorageManager.get(this.STORAGE_KEYS.encryptedEmail);
    const encryptedCode = StorageManager.get(this.STORAGE_KEYS.encryptedCode);
    const consent = StorageManager.get(this.STORAGE_KEYS.consent);

    if (encryptedEmail) data.encryptedEmail = encryptedEmail;
    if (encryptedCode) data.encryptedCode = encryptedCode;
    if (consent) data.consent = consent;

    return data;
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
   * Clear entire session (localStorage)
   */
  static clearSession(): void {
    // Clear localStorage
    Object.values(this.STORAGE_KEYS).forEach(key => {
      StorageManager.remove(key);
    });

    console.log('TractStack: Session cleared completely');
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

    if (!session.sessionId) {
      missingFields.push('sessionId');
      recommendations.push('Ensure SSR session ID generation is working');
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
    console.log('TractStack LocalStorage:', {
      fp_id: StorageManager.get('fp_id'),
      visit_id: StorageManager.get('visit_id'),
      consent: StorageManager.get('consent'),
      encrypted_email: !!StorageManager.get('encrypted_email'),
      encrypted_code: !!StorageManager.get('encrypted_code'),
      profile_token: !!StorageManager.get('profile_token'),
    });
    console.groupEnd();
  }
}

// Global debug helper
if (typeof window !== 'undefined') {
  (window as any).tractStackDebug = {
    session: () => SessionSync.debugSession(),
    clear: () => SessionSync.clearSession(),
    prepare: () => SessionSync.prepareHandshakeData(),
  };
}
