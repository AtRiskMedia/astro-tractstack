export const VERBOSE = false;

// Module-specific state
let eventSource: EventSource | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;

// NEW: Add state for tracking initial session connection attempts
let sessionInitAttempts = 0;
const MAX_SESSION_INIT_ATTEMPTS = 3; // Give up after 3 tries

let currentStoryfragmentId: string | null = null;
let isHtmxReady = false;

interface PanesUpdatedEventData {
  storyfragmentId: string;
  affectedPanes: string[];
  gotoPaneId?: string;
}

function log(message: string, ...args: any[]): void {
  if (VERBOSE) {
    console.log(`🔌 SSE: ${message}`, ...args);
  }
}

// ============================================================================
// SESSION INITIALIZATION
// ============================================================================

// Get existing sessionId from localStorage or generate new one
function getOrCreateSessionId(): string {
  const SESSION_KEY = 'tractstack_session_id';

  // Try to get existing sessionId
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    // Generate new sessionId
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    sessionId = `sess_${timestamp}_${random}`;

    // Store it for future page loads
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

// Cleanup expired sessions based on consent
function cleanupExpiredSessions(): void {
  const lastActive = localStorage.getItem('tractstack_lastActive');
  const consent = localStorage.getItem('tractstack_consent');

  if (!lastActive) return;

  const lastActiveTime = parseInt(lastActive, 10);
  const now = Date.now();
  const timeDiff = now - lastActiveTime;
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  // If no consent and more than 2 hours passed, clear all tractstack data
  if (consent !== '1' && timeDiff > TWO_HOURS) {
    clearAllTractStackData();
  }
}

// Clear all TractStack data from localStorage
function clearAllTractStackData(): void {
  const tractStackKeys = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tractstack_')) {
      tractStackKeys.push(key);
    }
  }

  tractStackKeys.forEach((key) => {
    localStorage.removeItem(key);
  });
}

// Initialize session with backend (replaces SessionInit.astro logic)
async function initializeSession(): Promise<string | null> {
  log('Starting session initialization...');

  // Wait for configuration to be available
  if (!window.TRACTSTACK_CONFIG?.configured) {
    log('TRACTSTACK_CONFIG not ready, retrying...');
    await new Promise((resolve) => setTimeout(resolve, 100));
    return initializeSession();
  }

  // Check and cleanup expired sessions first
  cleanupExpiredSessions();

  try {
    // Get or create persistent sessionId
    const sessionId = getOrCreateSessionId();
    log('Session ID:', sessionId);

    // Prepare session data (session-only, no client-generated IDs)
    const encryptedEmail = localStorage.getItem('tractstack_encrypted_email');
    const encryptedCode = localStorage.getItem('tractstack_encrypted_code');
    const consent = localStorage.getItem('tractstack_consent') || '';

    const sessionData = {
      sessionId: sessionId,
      consent: consent,
      ...(typeof encryptedEmail === 'string' && encryptedEmail
        ? { encryptedEmail }
        : {}),
      ...(typeof encryptedCode === 'string' && encryptedCode
        ? { encryptedCode }
        : {}),
    };

    log('Making direct backend call for session initialization');

    // Make direct fetch request to backend (no proxy)
    const response = await fetch(
      `${window.TRACTSTACK_CONFIG.backendUrl}/api/v1/auth/visit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': window.TRACTSTACK_CONFIG.tenantId,
          Origin: window.location.origin,
        },
        body: JSON.stringify(sessionData),
      }
    );

    log('Backend response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      log('Backend response data:', data);

      // Store backend-generated session data
      localStorage.setItem('tractstack_fp_id', data.fingerprint);
      localStorage.setItem('tractstack_visit_id', data.visitId);
      localStorage.setItem('tractstack_consent', data.consent);
      localStorage.setItem('tractstack_lastActive', Date.now().toString());

      // Store JWT token if provided
      if (data.token && localStorage.getItem('tractstack_consent') === '1') {
        localStorage.setItem('tractstack_profile_token', data.token);
      }

      // Update global TRACTSTACK_CONFIG session
      window.TRACTSTACK_CONFIG.session = {
        isReady: true,
        fingerprint: data.fingerprint,
        visitId: data.visitId,
        hasProfile: data.hasProfile,
        consent: data.consent,
      };

      // Dispatch session ready event
      window.dispatchEvent(
        new CustomEvent('tractstack:session-ready', {
          detail: data,
        })
      );

      log('✅ Session initialization complete');
      return sessionId;
    } else if (response.status === 429) {
      // Rate limited - retry after delay
      log('Rate limited, retrying session initialization...');
      await new Promise((resolve) => setTimeout(resolve, 500));
      return initializeSession();
    } else {
      console.error(
        'TractStack: Session handshake failed:',
        response.status,
        await response.text()
      );
      return null;
    }
  } catch (error) {
    console.error('TractStack: Session initialization error:', error);
    return null;
  }
}

// ============================================================================
// SSE CONNECTION MANAGEMENT
// ============================================================================

function setupSSEConnection() {
  if (window.SSE_INITIALIZED) {
    return;
  }
  window.SSE_INITIALIZED = true;
  log('First-time initialization. Setting up connection...');

  // Initialize session first, then setup SSE
  // MODIFIED: This function now handles retry limits and redirection
  async function initializeSessionAndSSE(): Promise<void> {
    const sessionId = await initializeSession();
    if (sessionId && window.TRACTSTACK_CONFIG?.session?.isReady) {
      // On success, reset the attempt counter and start SSE
      sessionInitAttempts = 0;
      initializeSSE(sessionId);
    } else {
      // On failure, increment the attempt counter
      sessionInitAttempts++;
      log(`Session initialization failed, attempt ${sessionInitAttempts}/${MAX_SESSION_INIT_ATTEMPTS}`);

      // If we've exceeded the max attempts, redirect to the maintenance page
      if (sessionInitAttempts >= MAX_SESSION_INIT_ATTEMPTS) {
        console.error('🔴 TractStack: Max session initialization attempts reached. Redirecting to maintenance page.');
        const currentPath = window.location.pathname;
        window.location.href = `/maint?from=${encodeURIComponent(currentPath)}`;
      } else {
        // Otherwise, schedule another attempt
        setTimeout(initializeSessionAndSSE, 2000); // Retry after 2 seconds
      }
    }
  }

  initializeSessionAndSSE();
}

function initializeSSE(sessionId: string): void {
  if (eventSource) {
    eventSource.close();
  }
  const config = window.TRACTSTACK_CONFIG;
  if (!config) return;

  const sseUrl = `${config.backendUrl}/api/v1/auth/sse?sessionId=${sessionId}&tenantId=${config.tenantId}`;
  log('Creating SSE connection to:', sseUrl);

  eventSource = new EventSource(sseUrl);

  eventSource.onopen = () => {
    log('✅ SSE Connection opened');
    reconnectAttempts = 0;
  };

  eventSource.addEventListener('panes_updated', (event) => {
    if (!isHtmxReady) {
      log('⚠️ Event arrived before HTMX was ready. Ignoring.');
      return;
    }

    log('📨 === PANES_UPDATED EVENT ===');
    try {
      const data: PanesUpdatedEventData = JSON.parse(
        (event as MessageEvent).data
      );
      if (VERBOSE) {
        log('Full payload:', data);
        log(`Current page storyfragmentId: ${currentStoryfragmentId}`);
      }

      if (data.storyfragmentId === currentStoryfragmentId) {
        log('✅ Storyfragment matches, processing updates');
        const uniquePaneIds = [...new Set(data.affectedPanes)];

        // TEMPORARILY override the config storyfragmentId for HTMX requests
        const originalStoryfragmentId =
          window.TRACTSTACK_CONFIG.storyfragmentId;
        window.TRACTSTACK_CONFIG.storyfragmentId = data.storyfragmentId;

        uniquePaneIds.forEach((paneId) => {
          const element = document.querySelector(`[data-pane-id="${paneId}"]`);
          if (element && window.htmx) {
            log(`🔄 Triggering refresh for pane ${paneId}`);
            window.htmx.trigger(element, 'refresh');
          }
        });

        // RESTORE the original storyfragmentId
        window.TRACTSTACK_CONFIG.storyfragmentId = originalStoryfragmentId;

        if (data.gotoPaneId && window.handleScrollToTarget) {
          let swapsCompleted = 0;
          const expectedSwaps = uniquePaneIds.length;

          const handleSwapComplete = () => {
            swapsCompleted++;
            if (swapsCompleted >= expectedSwaps && data.gotoPaneId) {
              window.handleScrollToTarget(data.gotoPaneId);
              document.removeEventListener(
                'htmx:afterSwap',
                handleSwapComplete
              );
            }
          };

          document.addEventListener('htmx:afterSwap', handleSwapComplete);
        }
      }
    } catch (parseError) {
      console.error('🔴 Error parsing panes_updated event:', parseError);
    }
  });

  eventSource.onerror = (error) => {
    console.error('🔴 SSE: Connection error:', error);
    handleReconnection(sessionId);
  };
}

function handleReconnection(sessionId: string): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('🔴 SSE: Max reconnection attempts reached');
    return;
  }

  reconnectAttempts++;
  const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);

  log(
    `Attempting reconnection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
  );

  setTimeout(() => {
    initializeSSE(sessionId);
  }, delay);
}

// ============================================================================
// ASTRO TRANSITION HANDLERS
// ============================================================================

document.addEventListener('astro:before-swap', () => {
  isHtmxReady = false;
  log('Transition starting. HTMX is now considered NOT READY.');
});

document.addEventListener('astro:page-load', () => {
  if (window.TRACTSTACK_CONFIG?.storyfragmentId) {
    currentStoryfragmentId = window.TRACTSTACK_CONFIG.storyfragmentId;
    log(
      `Context updated. Now tracking storyfragmentId: ${currentStoryfragmentId}`
    );
  }
  if (window.htmx) {
    window.htmx.process(document.body);
    isHtmxReady = true;
    log('Page loaded and processed. HTMX is now READY.');
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

setupSSEConnection();

log('SSE events module loaded and is persistent.');
