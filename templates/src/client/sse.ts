export const VERBOSE = false;

// Module-specific state
let eventSource: EventSource | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;

let currentStoryfragmentId: string | null = null;
let isHtmxReady = false;

// --- TYPES ---
interface SessionHandshakePayload {
  sessionId: string;
  storyfragmentId: string;
  tractstack_session_id?: string;
  encryptedEmail?: string;
  encryptedCode?: string;
  consent?: string;
}

interface SessionHandshakeResponse {
  success: boolean;
  restored?: boolean;
  affectedPanes?: string[];
  hasProfile?: boolean;
  profile?: any;
  consent?: string;
  token?: string;
  fingerprint?: string;
  visitId?: string;
}

interface PanesUpdatedEventData {
  storyfragmentId: string;
  affectedPanes: string[];
  gotoPaneId?: string;
}

function log(message: string, ...args: any[]): void {
  console.log(`🔌 SSE DEBUG: ${message}`, ...args);
}

// ============================================================================
// SESSION HANDSHAKE & INITIALIZATION
// ============================================================================

/**
 * Performs the client-side handshake with the backend.
 */
async function performSSEHandshake(sessionId: string): Promise<void> {
  log('=== STARTING SSE HANDSHAKE ===');
  log('Session ID provided by server:', sessionId);

  const config = window.TRACTSTACK_CONFIG;
  if (!config) {
    log('❌ FATAL: TractStack config not found');
    console.error('TractStack config not found for SSE handshake.');
    return;
  }

  log('✅ Config found:', {
    backendUrl: config.backendUrl,
    tenantId: config.tenantId,
    storyfragmentId: config.storyfragmentId,
  });

  const payload: SessionHandshakePayload = {
    sessionId,
    storyfragmentId: config.storyfragmentId,
  };

  // Check for a previous session ID in localStorage for cross-tab cloning
  const existingSessionId = localStorage.getItem('tractstack_session_id');
  log('Checking localStorage for existing session:', existingSessionId);

  if (existingSessionId && existingSessionId !== sessionId) {
    payload.tractstack_session_id = existingSessionId;
    log('🔄 CROSS-TAB CLONING detected - will clone from:', existingSessionId);
  } else {
    log('ℹ️  No cross-tab cloning needed');
  }

  // Check for encrypted credentials for profile unlock
  const encryptedEmail = localStorage.getItem('tractstack_encrypted_email');
  const encryptedCode = localStorage.getItem('tractstack_encrypted_code');
  log('Checking localStorage for profile credentials:', {
    hasEmail: !!encryptedEmail,
    hasCode: !!encryptedCode,
  });

  if (encryptedEmail && encryptedCode) {
    payload.encryptedEmail = encryptedEmail;
    payload.encryptedCode = encryptedCode;
    log('🔐 PROFILE UNLOCK detected - will unlock profile');
  } else {
    log('ℹ️  No profile unlock needed');
  }

  // Include consent status
  const consent = localStorage.getItem('tractstack_consent') || 'unknown';
  payload.consent = consent;
  log('Consent status:', consent);

  log('📤 Sending handshake payload:', payload);

  try {
    const handshakeUrl = `${config.backendUrl}/api/v1/auth/visit`;
    log('🌐 Making handshake request to:', handshakeUrl);

    const response = await fetch(handshakeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
      },
      body: JSON.stringify(payload),
    });

    log('📡 Handshake response status:', response.status);
    log(
      '📡 Handshake response headers:',
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      log('❌ Handshake HTTP error:', response.status, errorText);
      throw new Error(
        `SSE handshake failed: ${response.status} - ${errorText}`
      );
    }

    const result: SessionHandshakeResponse = await response.json();
    log('📥 Handshake response received:', result);
    log('🔍 Restoration details:', {
      restored: result.restored,
      affectedPanes: result.affectedPanes,
      hasProfile: result.hasProfile,
      success: result.success,
    });

    if (!result.success) {
      log('❌ Handshake marked as unsuccessful:', result);
      throw new Error('Handshake returned success: false');
    }

    // Update localStorage with the latest data from the backend
    log('💾 Updating localStorage with handshake results...');
    localStorage.setItem('tractstack_session_id', sessionId);
    localStorage.setItem('tractstack_consent', result.consent || 'unknown');

    if (result.fingerprint) {
      localStorage.setItem('tractstack_fp_id', result.fingerprint);
      log('💾 Set fingerprint:', result.fingerprint);
    }
    if (result.visitId) {
      localStorage.setItem('tractstack_visit_id', result.visitId);
      log('💾 Set visit ID:', result.visitId);
    }
    if (result.token) {
      localStorage.setItem('tractstack_profile_token', result.token);
      log('💾 Set profile token');
    }

    // If the backend restored state, trigger UI updates
    if (
      result.restored &&
      result.affectedPanes &&
      result.affectedPanes.length > 0
    ) {
      log('🔄 STATE RESTORATION needed for panes:', result.affectedPanes);
      log('HTMX ready status:', isHtmxReady);

      // Ensure HTMX is ready before triggering refreshes
      if (isHtmxReady && window.htmx) {
        log('✅ HTMX is ready - triggering immediate pane refreshes');
        result.affectedPanes.forEach((paneId) => {
          const element = document.querySelector(`[data-pane-id="${paneId}"]`);
          if (element) {
            log(`🔄 Triggering refresh for pane: ${paneId}`);
            window.htmx.trigger(element, 'refresh');
          } else {
            log(`⚠️  Pane element not found: ${paneId}`);
          }
        });
      } else {
        log(
          '⏳ HTMX not ready - scheduling pane refreshes for after page load'
        );
        // If HTMX isn't ready, wait for page-load and then trigger
        document.addEventListener(
          'astro:page-load',
          () => {
            log('📄 Page loaded - now triggering delayed pane refreshes');
            if (!window.htmx) {
              log('❌ HTMX still not available after page load');
              return;
            }
            result?.affectedPanes?.forEach((paneId) => {
              const element = document.querySelector(
                `[data-pane-id="${paneId}"]`
              );
              if (element) {
                log(`🔄 Delayed refresh for pane: ${paneId}`);
                window.htmx.trigger(element, 'refresh');
              } else {
                log(`⚠️  Delayed pane element not found: ${paneId}`);
              }
            });
          },
          { once: true }
        );
      }
    } else {
      log('ℹ️  No state restoration needed');
    }

    // Mark session as ready in config
    if (window.TRACTSTACK_CONFIG) {
      window.TRACTSTACK_CONFIG.session = { isReady: true };
      log('✅ Marked session as ready in config');
    }

    // Dispatch session ready event for other modules
    log('📢 Dispatching tractstack:session-ready event');
    window.dispatchEvent(
      new CustomEvent('tractstack:session-ready', { detail: result })
    );

    log('✅ SSE HANDSHAKE COMPLETE');
  } catch (error) {
    log('❌ SSE HANDSHAKE ERROR:', error);
    console.error('🔴 SSE handshake error:', error);

    // Even on error, mark session as ready so other modules don't hang
    if (window.TRACTSTACK_CONFIG) {
      window.TRACTSTACK_CONFIG.session = { isReady: true };
      log('⚠️  Marked session as ready despite handshake error');
    }
    window.dispatchEvent(
      new CustomEvent('tractstack:session-ready', {
        detail: { success: false, error },
      })
    );
  }
}

function setupSSEConnection() {
  log('=== SSE CONNECTION SETUP ===');

  if (window.SSE_INITIALIZED) {
    log('ℹ️  SSE already initialized, skipping setup');
    return;
  }
  window.SSE_INITIALIZED = true;
  log('🚀 First-time SSE initialization');

  // Get the session ID provided by the server during SSR.
  const sessionId = window.TRACTSTACK_CONFIG?.sessionId;
  log('Session ID from config:', sessionId);

  if (!sessionId) {
    log('❌ FATAL: No session ID provided by server');
    console.error(
      '🔴 No session ID provided by server. Cannot initialize SSE.'
    );
    return;
  }

  log('✅ Session ID found, starting handshake process');

  // Perform the handshake to check for cloning/unlock, then start SSE.
  performSSEHandshake(sessionId)
    .then(() => {
      log('🔌 Handshake complete, initializing SSE connection');
      initializeSSE(sessionId);
    })
    .catch((error) => {
      log('❌ Handshake failed, but initializing SSE anyway:', error);
      initializeSSE(sessionId);
    });
}

// ============================================================================
// SSE CONNECTION MANAGEMENT
// ============================================================================

function initializeSSE(sessionId: string): void {
  log('=== SSE CONNECTION INITIALIZATION ===');

  if (eventSource) {
    log('🔄 Closing existing SSE connection');
    eventSource.close();
  }

  const config = window.TRACTSTACK_CONFIG;
  if (!config) {
    log('❌ Config not available for SSE connection');
    return;
  }

  const sseUrl = `${config.backendUrl}/api/v1/auth/sse?sessionId=${sessionId}&storyfragmentId=${config.storyfragmentId}&tenantId=${config.tenantId}`;
  log('🌐 Creating SSE connection to:', sseUrl);

  eventSource = new EventSource(sseUrl);

  eventSource.onopen = () => {
    log('✅ SSE Connection opened successfully');
    reconnectAttempts = 0;
  };

  eventSource.addEventListener('connected', (event) => {
    log('📡 SSE Connected event received:', (event as MessageEvent).data);
  });

  eventSource.addEventListener('heartbeat', (event) => {
    log('💓 SSE Heartbeat:', (event as MessageEvent).data);
  });

  eventSource.addEventListener('panes_updated', (event) => {
    if (!isHtmxReady) {
      log('⚠️  Panes update event arrived before HTMX was ready. Ignoring.');
      return;
    }

    log('📨 === PANES_UPDATED EVENT ===');
    try {
      const data: PanesUpdatedEventData = JSON.parse(
        (event as MessageEvent).data
      );
      log('Full panes_updated payload:', data);
      log(`Current page storyfragmentId: ${currentStoryfragmentId}`);

      if (data.storyfragmentId === currentStoryfragmentId) {
        log('✅ Storyfragment matches, processing updates');
        const uniquePaneIds = [...new Set(data.affectedPanes)];
        log('Unique pane IDs to refresh:', uniquePaneIds);

        uniquePaneIds.forEach((paneId) => {
          const element = document.querySelector(`[data-pane-id="${paneId}"]`);
          if (element && window.htmx) {
            log(`🔄 Triggering refresh for pane ${paneId}`);
            window.htmx.trigger(element, 'refresh');
          } else {
            log(`⚠️  Element or HTMX not found for pane ${paneId}`, {
              elementFound: !!element,
              htmxAvailable: !!window.htmx,
            });
          }
        });

        if (data.gotoPaneId && window.handleScrollToTarget) {
          log('🎯 Scroll target specified:', data.gotoPaneId);
          let swapsCompleted = 0;
          const expectedSwaps = uniquePaneIds.length;

          const handleSwapComplete = () => {
            swapsCompleted++;
            log(`Swap completed ${swapsCompleted}/${expectedSwaps}`);
            if (swapsCompleted >= expectedSwaps && data.gotoPaneId) {
              log('🎯 All swaps complete, scrolling to:', data.gotoPaneId);
              window.handleScrollToTarget(data.gotoPaneId);
              document.removeEventListener(
                'htmx:afterSwap',
                handleSwapComplete
              );
            }
          };

          document.addEventListener('htmx:afterSwap', handleSwapComplete);
        }
      } else {
        log('⚠️  Storyfragment mismatch - ignoring update:', {
          eventStoryfragment: data.storyfragmentId,
          currentStoryfragment: currentStoryfragmentId,
        });
      }
    } catch (parseError) {
      log('❌ Error parsing panes_updated event:', parseError);
      console.error('🔴 Error parsing panes_updated event:', parseError);
    }
  });

  eventSource.onerror = (error) => {
    log('❌ SSE Connection error:', error);
    console.error('🔴 SSE: Connection error:', error);
    handleReconnection(sessionId);
  };
}

function handleReconnection(sessionId: string): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log('❌ Max reconnection attempts reached');
    console.error('🔴 SSE: Max reconnection attempts reached');
    return;
  }

  reconnectAttempts++;
  const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);

  log(
    `🔄 Attempting reconnection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
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
  log('📄 Transition starting. HTMX is now considered NOT READY.');
});

document.addEventListener('astro:page-load', () => {
  log('📄 === ASTRO PAGE LOAD EVENT ===');

  // On page load, HTMX is available to process the body.
  if (window.htmx) {
    window.htmx.process(document.body);
    isHtmxReady = true;
    log('✅ Page loaded and processed. HTMX is now READY.');
  } else {
    log('⚠️  HTMX not available after page load');
  }

  // Update context for the current page.
  if (window.TRACTSTACK_CONFIG?.storyfragmentId) {
    currentStoryfragmentId = window.TRACTSTACK_CONFIG.storyfragmentId;
    log(
      `📖 Context updated. Now tracking storyfragmentId: ${currentStoryfragmentId}`
    );
  } else {
    log('⚠️  No storyfragmentId in config after page load');
  }

  // Note: The main SSE connection is persistent and does not need to be re-established
  // on every page navigation. The setupSSEConnection only runs once on initial load.
});

// ============================================================================
// INITIALIZATION
// ============================================================================

log('=== SSE MODULE INITIALIZATION ===');
setupSSEConnection();
log('SSE events module loaded and is persistent.');
