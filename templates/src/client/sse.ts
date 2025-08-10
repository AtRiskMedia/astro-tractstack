/**
 * SSE (Server-Sent Events) Client with Critical Debug Logging
 */

export const VERBOSE = false;

interface StoryfragmentUpdate {
  storyfragmentId: string;
  affectedPanes: string[];
  gotoPaneId?: string;
}

interface BatchPanesUpdatedEventData {
  updates: StoryfragmentUpdate[];
}

interface PanesUpdatedEventData {
  storyfragmentId: string;
  affectedPanes: string[];
  gotoPaneId?: string;
}

type PanesEventData = BatchPanesUpdatedEventData | PanesUpdatedEventData;

interface HandshakeRequest {
  sessionId: string;
  storyfragmentId: string;
  consent: string;
  email?: string;
  code?: string;
}

interface HandshakeResponse {
  fingerprint: string;
  visitId: string;
  sessionId: string;
  hasProfile: boolean;
  consent: string;
  restored?: boolean;
  affectedPanes?: string[];
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

let eventSource: EventSource | null = null;
let isHtmxReady = false;
let currentStoryfragmentId: string | null = null;
let reconnectAttempts = 0;

const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;

// ============================================================================
// CRITICAL DEBUG LOGGING
// ============================================================================

function log(...args: any[]): void {
  if (VERBOSE) console.log('🔌 SSE DEBUG:', ...args);
}

function logCritical(...args: any[]): void {
  if (VERBOSE) console.error('🚨 SSE CRITICAL:', ...args);
}

function logStoryfragmentChange(
  action: string,
  oldId: string | null,
  newId: string | null,
  source: string
): void {
  logCritical(`STORYFRAGMENT ${action}:`, {
    action,
    oldId,
    newId,
    source,
    configValue: window.TRACTSTACK_CONFIG?.storyfragmentId,
    timestamp: new Date().toISOString(),
    changed: oldId !== newId,
  });
}

function logSSEEvent(
  eventType: string,
  data: any,
  willProcess: boolean,
  reason?: string
): void {
  logCritical(`SSE EVENT ${eventType}:`, {
    eventType,
    data,
    currentContext: currentStoryfragmentId,
    configContext: window.TRACTSTACK_CONFIG?.storyfragmentId,
    willProcess,
    reason,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// SSE HANDSHAKE
// ============================================================================

async function performSSEHandshake(
  sessionId: string
): Promise<HandshakeResponse> {
  log('=== STARTING SSE HANDSHAKE ===');
  log('📤 Session ID provided by server:', sessionId);

  const config = window.TRACTSTACK_CONFIG;
  if (!config) {
    throw new Error('❌ No TRACTSTACK_CONFIG available for handshake');
  }

  log('✅ Config found:', {
    backendUrl: config.backendUrl,
    tenantId: config.tenantId,
    storyfragmentId: config.storyfragmentId,
  });

  const existingSession = localStorage.getItem('tractstack_session_id');
  log(
    '🔍 Checking localStorage for existing session:',
    existingSession ? 'found' : 'not found'
  );

  if (!existingSession) {
    log('ℹ️  No existing session in localStorage - fresh session');
  }

  const profileEmail = localStorage.getItem('tractstack_encrypted_email');
  const profileCode = localStorage.getItem('tractstack_encrypted_code');

  log('🔍 Checking localStorage for profile credentials:', {
    hasEmail: !!profileEmail,
    hasCode: !!profileCode,
  });

  if (!profileEmail && !profileCode) {
    log('ℹ️  No profile unlock needed');
  }

  const consent = localStorage.getItem('tractstack_consent') || '0';
  log('📋 Consent status:', consent);

  const handshakePayload: HandshakeRequest = {
    sessionId,
    storyfragmentId: config.storyfragmentId,
    consent,
  };

  if (profileEmail) handshakePayload.email = profileEmail;
  if (profileCode) handshakePayload.code = profileCode;

  log('📤 Sending handshake payload:', handshakePayload);

  const handshakeUrl = `${config.backendUrl}/api/v1/auth/visit`;
  log('🌐 Making handshake request to:', handshakeUrl);

  try {
    const response = await fetch(handshakeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
      },
      body: JSON.stringify(handshakePayload),
    });

    log('📡 Handshake response status:', response.status);
    log(
      '📡 Handshake response headers:',
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      throw new Error(`Handshake failed with status ${response.status}`);
    }

    const result: HandshakeResponse = await response.json();
    log('📥 Handshake response received:', result);

    const restorationDetails = {
      restored: result.restored || false,
      affectedPanes: result.affectedPanes || null,
      hasProfile: result.hasProfile,
      success: response.ok,
    };
    log('🔍 Restoration details:', restorationDetails);

    log('💾 Updating localStorage with handshake results...');
    localStorage.setItem('tractstack_session_id', result.sessionId);
    log('💾 Set session ID:', result.sessionId);
    localStorage.setItem('tractstack_fingerprint', result.fingerprint);
    log('💾 Set fingerprint:', result.fingerprint);
    localStorage.setItem('tractstack_visit', result.visitId);
    log('💾 Set visit ID:', result.visitId);
    localStorage.setItem('tractstack_consent', result.consent);
    log('💾 Set consent:', result.consent);

    if (
      result.restored &&
      result.affectedPanes &&
      result.affectedPanes.length > 0
    ) {
      log('🔄 State restoration needed. Affected panes:', result.affectedPanes);

      if (window.htmx && isHtmxReady) {
        log('✅ HTMX ready, triggering immediate pane refreshes');
        result.affectedPanes.forEach((paneId) => {
          const element = document.querySelector(`[data-pane-id="${paneId}"]`);
          if (element) {
            log(`🔄 Restoring pane: ${paneId}`);
            window.htmx.trigger(element, 'refresh');
          } else {
            log(`⚠️  Restoration pane element not found: ${paneId}`);
          }
        });
      } else {
        log(
          '⚠️  HTMX not ready during restoration, setting up delayed refresh'
        );
        document.addEventListener(
          'astro:page-load',
          () => {
            if (window.htmx && result.affectedPanes) {
              log(
                '🔄 HTMX now ready after page load, triggering delayed pane refreshes'
              );
              result.affectedPanes.forEach((paneId) => {
                const element = document.querySelector(
                  `[data-pane-id="${paneId}"]`
                );
                if (element) {
                  log(`🔄 Delayed restoration for pane: ${paneId}`);
                  window.htmx.trigger(element, 'refresh');
                } else {
                  log(
                    `⚠️  Delayed restoration pane element not found: ${paneId}`
                  );
                }
              });
            }
          },
          { once: true }
        );
      }
    } else {
      log('ℹ️  No state restoration needed');
    }

    if (window.TRACTSTACK_CONFIG) {
      window.TRACTSTACK_CONFIG.session = { isReady: true };
      log('✅ Marked session as ready in config');
    }

    log('📢 Dispatching tractstack:session-ready event');
    window.dispatchEvent(
      new CustomEvent('tractstack:session-ready', { detail: result })
    );

    log('✅ SSE HANDSHAKE COMPLETE');
    return result;
  } catch (error) {
    log('❌ Handshake request failed:', error);
    throw error;
  }
}

// ============================================================================
// SSE CONNECTION
// ============================================================================

function initializeSSE(sessionId: string): void {
  log('=== SSE CONNECTION INITIALIZATION ===');

  if (eventSource) {
    log('🔄 Closing existing SSE connection');
    eventSource.close();
    eventSource = null;
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
    try {
      const data = JSON.parse((event as MessageEvent).data);
      log('📡 SSE Connected event received:', data);
    } catch (error) {
      log(
        '⚠️  Failed to parse connected event data:',
        (event as MessageEvent).data
      );
    }
  });

  eventSource.addEventListener('heartbeat', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data);
      log('💓 SSE Heartbeat:', data);
    } catch (error) {
      log('⚠️  Failed to parse heartbeat data:', (event as MessageEvent).data);
    }
  });

  eventSource.addEventListener('panes_updated', (event) => {
    logCritical('📨 PANES_UPDATED EVENT RECEIVED');

    if (!isHtmxReady) {
      logSSEEvent('panes_updated', null, false, 'HTMX not ready');
      log('⚠️  Panes update event arrived before HTMX was ready. Ignoring.');
      return;
    }

    log('📨 === PANES_UPDATED EVENT ===');

    try {
      const data: PanesEventData = JSON.parse((event as MessageEvent).data);

      logCritical('📨 PANES_UPDATED PARSED:', {
        data,
        currentStoryfragmentId,
        configStoryfragmentId: window.TRACTSTACK_CONFIG?.storyfragmentId,
      });

      log('📨 Full panes_updated payload:', data);
      log(`📖 Current page storyfragmentId: ${currentStoryfragmentId}`);

      // Handle batch format (new)
      if ('updates' in data) {
        log('✅ Processing batch updates format');

        for (const update of data.updates) {
          logCritical(`🔍 CHECKING UPDATE:`, {
            updateStoryfragment: update.storyfragmentId,
            currentStoryfragment: currentStoryfragmentId,
            configStoryfragment: window.TRACTSTACK_CONFIG?.storyfragmentId,
            willProcess: update.storyfragmentId === currentStoryfragmentId,
          });

          log(
            `🔍 Checking update for storyfragment: ${update.storyfragmentId}`
          );

          if (update.storyfragmentId === currentStoryfragmentId) {
            logSSEEvent('panes_updated', update, true, 'storyfragment match');
            log('✅ Storyfragment matches, processing update');
            processStoryfragmentUpdate(update);
          } else {
            logSSEEvent(
              'panes_updated',
              update,
              false,
              'storyfragment mismatch'
            );
            log('⚠️  Storyfragment mismatch - ignoring update:', {
              eventStoryfragment: update.storyfragmentId,
              currentStoryfragment: currentStoryfragmentId,
              updateDetails: update,
            });
          }
        }
      }
      // Handle legacy single-update format
      else if ('storyfragmentId' in data) {
        log('✅ Processing legacy single update format');

        logCritical(`🔍 LEGACY UPDATE CHECK:`, {
          dataStoryfragment: data.storyfragmentId,
          currentStoryfragment: currentStoryfragmentId,
          willProcess: data.storyfragmentId === currentStoryfragmentId,
        });

        if (data.storyfragmentId === currentStoryfragmentId) {
          logSSEEvent(
            'panes_updated_legacy',
            data,
            true,
            'storyfragment match'
          );
          log('✅ Storyfragment matches, processing updates');
          processStoryfragmentUpdate(data);
        } else {
          logSSEEvent(
            'panes_updated_legacy',
            data,
            false,
            'storyfragment mismatch'
          );
          log('⚠️  Storyfragment mismatch - ignoring update:', {
            eventStoryfragment: data.storyfragmentId,
            currentStoryfragment: currentStoryfragmentId,
            updateDetails: data,
          });
        }
      } else {
        logCritical('❌ UNKNOWN PANES_UPDATED FORMAT:', data);
        log('❌ Unknown panes_updated format:', data);
      }
    } catch (error) {
      logCritical('❌ ERROR PROCESSING PANES_UPDATED:', error);
      log('❌ Error processing panes_updated event:', error);
    }

    log('📨 === PANES_UPDATED EVENT COMPLETE ===');
  });

  eventSource.onerror = (error) => {
    log('❌ SSE Connection error:', error);
    handleReconnection();
  };
}

function processStoryfragmentUpdate(update: StoryfragmentUpdate): void {
  logCritical('🔄 PROCESSING UPDATE:', {
    storyfragmentId: update.storyfragmentId,
    affectedPanes: update.affectedPanes,
    gotoPaneId: update.gotoPaneId,
    currentContext: currentStoryfragmentId,
  });

  log('🔄 === PROCESSING STORYFRAGMENT UPDATE ===');
  log('📖 Current storyfragment context:', currentStoryfragmentId);
  log('📤 Update storyfragment:', update.storyfragmentId);

  const uniquePaneIds = [...new Set(update.affectedPanes)];
  log('🎯 Unique pane IDs to refresh:', uniquePaneIds);

  if (uniquePaneIds.length === 0) {
    log('⚠️  No panes to refresh in update');
    return;
  }

  let refreshedCount = 0;
  let errorCount = 0;

  uniquePaneIds.forEach((paneId) => {
    const element = document.querySelector(`[data-pane-id="${paneId}"]`);

    if (element && window.htmx) {
      log(`🔄 Triggering refresh for pane ${paneId} - Element found: ✅`);
      try {
        window.htmx.trigger(element, 'refresh');
        refreshedCount++;
        logCritical(`✅ PANE REFRESHED: ${paneId}`);
      } catch (error) {
        log(`❌ Failed to trigger HTMX refresh for pane ${paneId}:`, error);
        errorCount++;
      }
    } else {
      const issues = [];
      if (!element) issues.push('element not found');
      if (!window.htmx) issues.push('HTMX not available');

      log(`⚠️  Cannot refresh pane ${paneId}: ${issues.join(', ')}`, {
        elementFound: !!element,
        htmxAvailable: !!window.htmx,
        querySelector: `[data-pane-id="${paneId}"]`,
        domElementCount: document.querySelectorAll('[data-pane-id]').length,
      });
      errorCount++;
    }
  });

  log(`📊 Refresh summary: ${refreshedCount} successful, ${errorCount} failed`);

  if (update.gotoPaneId) {
    const targetElement = document.getElementById(`pane-${update.gotoPaneId}`);
    if (targetElement) {
      log(`📍 Scrolling to target pane: ${update.gotoPaneId}`);
      try {
        targetElement.scrollIntoView({ behavior: 'smooth' });
        log('✅ Scroll completed successfully');
      } catch (error) {
        log('❌ Scroll failed:', error);
      }
    } else {
      log(`⚠️  Target pane element not found: pane-${update.gotoPaneId}`, {
        expectedId: `pane-${update.gotoPaneId}`,
        availablePaneElements: Array.from(
          document.querySelectorAll('[id^="pane-"]')
        ).map((el) => el.id),
      });
    }
  }

  log('🔄 === UPDATE PROCESSING COMPLETE ===');
}

function handleReconnection(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log(
      `❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`
    );
    return;
  }

  reconnectAttempts++;
  const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
  log(
    `🔄 Attempting reconnection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
  );

  setTimeout(() => {
    const sessionId = window.TRACTSTACK_CONFIG?.sessionId;
    if (sessionId) {
      log('🔄 Reconnecting with session ID:', sessionId);
      initializeSSE(sessionId);
    } else {
      log('❌ No session ID available for reconnection');
    }
  }, delay);
}

// ============================================================================
// CONTEXT MANAGEMENT
// ============================================================================

function updateStoryfragmentContext(
  newStoryfragmentId: string,
  source: string
): void {
  const oldId = currentStoryfragmentId;

  if (currentStoryfragmentId !== newStoryfragmentId) {
    logStoryfragmentChange('UPDATE', oldId, newStoryfragmentId, source);
    log(
      `📖 Context updated [${source}]. Storyfragment changed from ${currentStoryfragmentId} to ${newStoryfragmentId}`
    );
    currentStoryfragmentId = newStoryfragmentId;
  } else {
    logStoryfragmentChange('CONFIRM', oldId, newStoryfragmentId, source);
    log(
      `📖 Context confirmed [${source}]. Still tracking storyfragmentId: ${currentStoryfragmentId}`
    );
  }
}

// ============================================================================
// CONNECTION SETUP
// ============================================================================

function setupSSEConnection(): void {
  log('=== SSE CONNECTION SETUP ===');
  log('🚀 First-time SSE initialization');

  const sessionId = window.TRACTSTACK_CONFIG?.sessionId;
  log('🔍 Session ID from config:', sessionId);

  if (!sessionId) {
    // Changed: Graceful dormancy instead of error
    log('ℹ️  No session ID available - SSE will remain dormant until needed');
    log('💤 SSE module loaded but inactive (no session context)');
    return;
  }

  log('✅ Session ID found, starting handshake process');

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
// PAGE LIFECYCLE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  log('📄 === DOM CONTENT LOADED EVENT ===');

  if (window.htmx) {
    isHtmxReady = true;
    log('✅ HTMX is ready after DOM load');
  } else {
    log('⚠️  HTMX not available after DOM load');
  }

  if (window.TRACTSTACK_CONFIG?.storyfragmentId) {
    const initialId = window.TRACTSTACK_CONFIG.storyfragmentId;
    logStoryfragmentChange('INIT', null, initialId, 'DOM_LOADED');
    currentStoryfragmentId = initialId;
    log(
      `📖 Initial context set. Tracking storyfragmentId: ${currentStoryfragmentId}`
    );
  } else {
    log('⚠️  No storyfragmentId in config on DOM load');
  }

  log('📄 SSE module is persistent across page navigation');
});

document.addEventListener('astro:page-load', () => {
  log('📄 === ASTRO PAGE LOAD EVENT ===');

  if (window.htmx) {
    window.htmx.process(document.body);
    isHtmxReady = true;
    log('✅ Page loaded and processed. HTMX is now READY.');
  } else {
    log('⚠️  HTMX not available after page load');
  }

  // Check if SSE should wake up from dormancy
  const sessionId = window.TRACTSTACK_CONFIG?.sessionId;
  if (sessionId && !eventSource && window.SSE_INITIALIZED) {
    log('🌅 SSE was dormant but session ID now available - waking up');
    setupSSEConnection();
  }

  // Single context update with extensive logging
  setTimeout(() => {
    const configId = window.TRACTSTACK_CONFIG?.storyfragmentId;
    const currentId = currentStoryfragmentId;

    logCritical('ASTRO PAGE LOAD CONTEXT CHECK:', {
      configId,
      currentId,
      willUpdate: configId !== currentId,
      configExists: !!window.TRACTSTACK_CONFIG,
      configFull: window.TRACTSTACK_CONFIG,
    });

    if (configId) {
      updateStoryfragmentContext(configId, 'astro:page-load');
    } else {
      log('⚠️  No storyfragmentId in config after page load');
      logCritical('NO STORYFRAGMENT IN CONFIG:', window.TRACTSTACK_CONFIG);
    }
  }, 0);
});

// ============================================================================
// INITIALIZATION - Use existing SSE_INITIALIZED flag
// ============================================================================

log('=== SSE MODULE INITIALIZATION ===');

// Use the existing flag from astro.d.ts
if (!window.SSE_INITIALIZED) {
  window.SSE_INITIALIZED = true;
  setupSSEConnection();
} else {
  log('ℹ️  SSE already initialized, skipping setup');
}

log('SSE events module loaded and is persistent.');
