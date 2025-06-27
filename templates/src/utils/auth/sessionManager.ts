export class SessionManager {
  private static readonly SESSION_ID_KEY = 'tractstack_session_id';

  static getOrCreateSessionID(): string {
    if (typeof window === 'undefined') {
      // SSR context - generate new session ID
      return this.generateSessionID();
    }

    let sessionID = localStorage.getItem(this.SESSION_ID_KEY);
    if (!sessionID) {
      sessionID = this.generateSessionID();
      localStorage.setItem(this.SESSION_ID_KEY, sessionID);
    }
    return sessionID;
  }

  private static generateSessionID(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
