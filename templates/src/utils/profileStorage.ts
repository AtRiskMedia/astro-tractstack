// Profile storage utility - replaces nanostore for profile management
// Works across tabs via localStorage, no reactivity overhead

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
      sessionId: (window as any).tractStackSessionId || undefined,
      consent: StorageManager.get(this.STORAGE_KEYS.consent) || undefined,
      encryptedEmail: StorageManager.get(this.STORAGE_KEYS.encryptedEmail) || undefined,
      encryptedCode: StorageManager.get(this.STORAGE_KEYS.encryptedCode) || undefined,
      hasProfile: !!StorageManager.get(this.STORAGE_KEYS.profileToken),
    };
  }

  /**
   * Get stored profile data
   */
  static getProfileData(): ProfileData {
    return {
      firstname: StorageManager.get(this.STORAGE_KEYS.firstname) || undefined,
      contactPersona: StorageManager.get(this.STORAGE_KEYS.contactPersona) || undefined,
      email: StorageManager.get(this.STORAGE_KEYS.email) || undefined,
      shortBio: StorageManager.get(this.STORAGE_KEYS.shortBio) || undefined,
    };
  }

  /**
   * Store profile data
   */
  static setProfileData(profile: ProfileData): void {
    if (profile.firstname) StorageManager.set(this.STORAGE_KEYS.firstname, profile.firstname);
    if (profile.contactPersona) StorageManager.set(this.STORAGE_KEYS.contactPersona, profile.contactPersona);
    if (profile.email) StorageManager.set(this.STORAGE_KEYS.email, profile.email);
    if (profile.shortBio) StorageManager.set(this.STORAGE_KEYS.shortBio, profile.shortBio);
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
   * Check if profile is unlocked
   */
  static isProfileUnlocked(): boolean {
    return !!StorageManager.get(this.STORAGE_KEYS.unlockedProfile);
  }

  /**
   * Check if should show unlock form
   */
  static shouldShowUnlock(): boolean {
    return !!StorageManager.get(this.STORAGE_KEYS.showUnlock);
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

  /**
   * Store consent
   */
  static storeConsent(consent: string): void {
    StorageManager.set(this.STORAGE_KEYS.consent, consent);
  }

  /**
   * Get consent
   */
  static getConsent(): string | null {
    return StorageManager.get(this.STORAGE_KEYS.consent);
  }

  /**
   * Store last email for unlock form
   */
  static storeLastEmail(email: string): void {
    StorageManager.set(this.STORAGE_KEYS.lastEmail, email);
  }

  /**
   * Get last email
   */
  static getLastEmail(): string | null {
    return StorageManager.get(this.STORAGE_KEYS.lastEmail);
  }

  /**
   * Clear entire session (localStorage)
   */
  static clearSession(): void {
    // Clear all localStorage keys
    Object.values(this.STORAGE_KEYS).forEach(key => {
      StorageManager.remove(key);
    });

    console.log('TractStack: Session cleared completely');
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
    });
    console.groupEnd();
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
