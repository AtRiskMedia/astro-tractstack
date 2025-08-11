export interface ProfileData {
  firstname?: string;
  contactPersona?: string;
  email?: string;
  shortBio?: string;
}

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
      return localStorage.getItem(`tractstack_${key}`);
    } catch {
      return null;
    }
  }

  static set(key: string, value: string): boolean {
    try {
      localStorage.setItem(`tractstack_${key}`, value);
      return true;
    } catch {
      return false;
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(`tractstack_${key}`);
    } catch {
      // Silently fail
    }
  }
}

export class ProfileStorage {
  private static readonly STORAGE_KEYS = {
    consent: 'consent',
    encryptedEmail: 'encrypted_email',
    encryptedCode: 'encrypted_code',
    profileToken: 'profile_token',
    hasProfile: 'has_profile',
    unlockedProfile: 'unlocked_profile',
    showUnlock: 'show_unlock',
    lastEmail: 'last_email',
    // Profile data
    firstname: 'profile_firstname',
    contactPersona: 'profile_contact_persona',
    email: 'profile_email',
    shortBio: 'profile_short_bio',
  } as const;

  /**
   * Get current session data (backend controls fingerprint/visit IDs)
   */
  static getCurrentSession(): SessionData {
    return {
      sessionId: localStorage.getItem('tractstack_session_id') || undefined,
      consent: StorageManager.get(this.STORAGE_KEYS.consent) || undefined,
      encryptedEmail:
        StorageManager.get(this.STORAGE_KEYS.encryptedEmail) || undefined,
      encryptedCode:
        StorageManager.get(this.STORAGE_KEYS.encryptedCode) || undefined,
      hasProfile: !!StorageManager.get(this.STORAGE_KEYS.hasProfile),
    };
  }

  /**
   * Check if profile is unlocked
   */
  static isProfileUnlocked(): boolean {
    return !!StorageManager.get(this.STORAGE_KEYS.unlockedProfile);
  }

  /**
   * Check if should show unlock form
   */
  static shouldShowUnlock(): boolean {
    return !!StorageManager.get(this.STORAGE_KEYS.hasProfile);
  }

  /**
   * Prepare handshake data for backend calls
   */
  static prepareHandshakeData(): {
    sessionId: string;
    encryptedEmail?: string;
    encryptedCode?: string;
    consent?: string;
  } {
    let sessionId = localStorage.getItem('tractstack_session_id');

    // If no session ID exists, generate one client-side
    if (!sessionId) {
      sessionId = `client-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`;
      localStorage.setItem('tractstack_session_id', sessionId);
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
    const emailStored = StorageManager.set(
      this.STORAGE_KEYS.encryptedEmail,
      email
    );
    const codeStored = StorageManager.set(
      this.STORAGE_KEYS.encryptedCode,
      code
    );
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
   * Store profile token and mark as having profile
   */
  static storeProfileToken(token: string): void {
    StorageManager.set(this.STORAGE_KEYS.profileToken, token);
    StorageManager.set(this.STORAGE_KEYS.hasProfile, '1');
    StorageManager.set(this.STORAGE_KEYS.unlockedProfile, '1');
  }

  /**
   * Clear profile token and profile state
   */
  static clearProfileToken(): void {
    StorageManager.remove(this.STORAGE_KEYS.profileToken);
    StorageManager.remove(this.STORAGE_KEYS.hasProfile);
    StorageManager.remove(this.STORAGE_KEYS.unlockedProfile);
  }

  /**
   * Check if user has a profile
   */
  static hasProfile(): boolean {
    return !!StorageManager.get(this.STORAGE_KEYS.hasProfile);
  }

  /**
   * Clear entire session (localStorage) INCLUDING session ID
   */
  static clearSession(): void {
    Object.values(this.STORAGE_KEYS).forEach((key) => {
      StorageManager.remove(key);
    });

    try {
      localStorage.removeItem('tractstack_session_id');
      localStorage.removeItem('tractstack_fingerprint');
      localStorage.removeItem('tractstack_visit');
      localStorage.removeItem('tractstack_entered_tracked');
    } catch {
      // Silently fail
    }

    // Clear session cookie
    try {
      document.cookie =
        'tractstack_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    } catch {
      // Silently fail
    }

    console.log('TractStack: Session cleared completely including session ID');
  }

  /**
   * Clear only profile data (keep session)
   */
  static clearProfile(): void {
    StorageManager.remove(this.STORAGE_KEYS.profileToken);
    StorageManager.remove(this.STORAGE_KEYS.hasProfile);
    StorageManager.remove(this.STORAGE_KEYS.unlockedProfile);
    StorageManager.remove(this.STORAGE_KEYS.firstname);
    StorageManager.remove(this.STORAGE_KEYS.contactPersona);
    StorageManager.remove(this.STORAGE_KEYS.email);
    StorageManager.remove(this.STORAGE_KEYS.shortBio);
  }

  /**
   * Debug helper to log current state
   */
  static debugProfile(): void {
    const session = this.getCurrentSession();
    const profile = this.getProfileData();

    console.group('TractStack Profile Debug');
    console.log('Current Session:', session);
    console.log('Profile Data:', profile);
    console.log('Has Profile:', this.hasProfile());
    console.log('Profile Unlocked:', this.isProfileUnlocked());
    console.log('Should Show Unlock:', this.shouldShowUnlock());
    console.log('TractStack LocalStorage:', {
      profile_token: !!StorageManager.get('profile_token'),
      encrypted_email: !!StorageManager.get('encrypted_email'),
      encrypted_code: !!StorageManager.get('encrypted_code'),
      consent: StorageManager.get('consent'),
      session_id: localStorage.getItem('tractstack_session_id'),
    });
    console.groupEnd();
  }

  /**
   * Get profile data from localStorage
   */
  static getProfileData(): ProfileData {
    return {
      firstname: StorageManager.get(this.STORAGE_KEYS.firstname) || undefined,
      contactPersona:
        StorageManager.get(this.STORAGE_KEYS.contactPersona) || undefined,
      email: StorageManager.get(this.STORAGE_KEYS.email) || undefined,
      shortBio: StorageManager.get(this.STORAGE_KEYS.shortBio) || undefined,
    };
  }

  /**
   * Set profile data in localStorage
   */
  static setProfileData(data: ProfileData): void {
    if (data.firstname)
      StorageManager.set(this.STORAGE_KEYS.firstname, data.firstname);
    if (data.contactPersona)
      StorageManager.set(this.STORAGE_KEYS.contactPersona, data.contactPersona);
    if (data.email) StorageManager.set(this.STORAGE_KEYS.email, data.email);
    if (data.shortBio)
      StorageManager.set(this.STORAGE_KEYS.shortBio, data.shortBio);
  }

  /**
   * Get consent status
   */
  static getConsent(): string | null {
    return StorageManager.get(this.STORAGE_KEYS.consent);
  }

  /**
   * Store consent status
   */
  static storeConsent(consent: string): void {
    StorageManager.set(this.STORAGE_KEYS.consent, consent);
  }

  /**
   * Get last used email
   */
  static getLastEmail(): string | null {
    return StorageManager.get(this.STORAGE_KEYS.lastEmail);
  }

  /**
   * Store last used email
   */
  static storeLastEmail(email: string): void {
    StorageManager.set(this.STORAGE_KEYS.lastEmail, email);
  }

  /**
   * Set show unlock flag
   */
  static setShowUnlock(show: boolean): void {
    if (show) {
      StorageManager.set(this.STORAGE_KEYS.showUnlock, '1');
    } else {
      StorageManager.remove(this.STORAGE_KEYS.showUnlock);
    }
  }
}

// Global debug helper
if (typeof window !== 'undefined') {
  (window as any).tractStackProfileDebug = {
    profile: () => ProfileStorage.debugProfile(),
    clear: () => ProfileStorage.clearSession(),
    clearProfile: () => ProfileStorage.clearProfile(),
  };
}
