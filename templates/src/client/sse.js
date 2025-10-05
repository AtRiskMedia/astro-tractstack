/**
 * SSE (Server-Sent Events) Client with Critical Debug Logging
 */

const VERBOSE = false;

// ============================================================================
// GLOBAL STATE
// ============================================================================

let eventSource = null;
let isHtmxReady = false;
let currentStoryfragmentId = null;
let reconnectAttempts = 0;

const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;

// ============================================================================
// CRITICAL DEBUG LOGGING
// ============================================================================

function log(...args) {
  if (VERBOSE) console.log('🔌 SSE DEBUG:', ...args);
}

function logCritical(...args) {
  if (VERBOSE) console.warn('🚨 SSE CRITICAL:', ...args);
}

function logStoryfragmentChange(action, oldId, newId, source) {
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

function logSSEEvent(eventType, data, willProcess, reason) {
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

async function performSSEHandshake(sessionId) {
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

  const handshakePayload = {
    sessionId,
    storyfragmentId: config.storyfragmentId,
    consent,
  };

  if (profileEmail) handshakePayload.encryptedEmail = profileEmail;
  if (profileCode) handshakePayload.encryptedCode = profileCode;

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

    const result = await response.json();
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

function initializeSSE(sessionId) {
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
      const data = JSON.parse(event.data);
      log('📡 SSE Connected event received:', data);
    } catch (error) {
      log('⚠️  Failed to parse connected event data:', event.data);
    }
  });

  eventSource.addEventListener('heartbeat', (event) => {
    try {
      const data = JSON.parse(event.data);
      log('💓 SSE Heartbeat:', data);
    } catch (error) {
      log('⚠️  Failed to parse heartbeat data:', event.data);
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
      const data = JSON.parse(event.data);

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
            payload: update,
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

function processStoryfragmentUpdate(update) {
  logCritical('🔄 PROCESSING UPDATE:', {
    storyfragmentId: update.storyfragmentId,
    affectedPanes: update.affectedPanes,
    gotoPaneId: update.gotoPaneId,
    codeHookVisibility: update.CodeHookVisibility,
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

  // Split pane IDs: code hooks vs regular panes
  const codeHookPaneIds = [];
  const regularPaneIds = [];

  uniquePaneIds.forEach((paneId) => {
    if (
      update.CodeHookVisibility &&
      update.CodeHookVisibility.hasOwnProperty(paneId)
    ) {
      codeHookPaneIds.push(paneId);
    } else {
      regularPaneIds.push(paneId);
    }
  });

  log('🎭 Code hook pane IDs:', codeHookPaneIds);
  log('📄 Regular pane IDs:', regularPaneIds);

  // Process code hook visibility changes (CSS toggling)
  if (codeHookPaneIds.length > 0) {
    log('🎭 Processing code hook visibility changes');
    codeHookPaneIds.forEach((paneId) => {
      const element = document.querySelector(`#pane-${paneId}`);
      if (element) {
        const visibilityValue = update.CodeHookVisibility[paneId];
        log(
          `🎭 Code hook ${paneId} visibility value:`,
          visibilityValue,
          typeof visibilityValue
        );

        // Handle pane visibility
        if (visibilityValue === false) {
          element.style.display = 'none';
          log(`🎭 Code hook pane ${paneId} HIDDEN`);
        } else if (visibilityValue === true || Array.isArray(visibilityValue)) {
          element.style.display = 'block';
          log(`🎭 Code hook pane ${paneId} VISIBLE`);
        }

        // Handle unset button visibility
        const unsetDiv = document.querySelector(`#pane-${paneId}-unset`);
        if (unsetDiv) {
          if (Array.isArray(visibilityValue)) {
            // Show unset button - pane is visible and has beliefs to unset
            const hxValsObject = {
              unsetBeliefIds: visibilityValue.join(','),
              paneId: paneId,
            };
            const hxValsJson = JSON.stringify(hxValsObject);

            unsetDiv.innerHTML = `
          <button
            type="button"
            class="text-mydarkgrey absolute right-2 top-2 z-10 rounded-full bg-white p-1.5 hover:bg-black hover:text-white"
            title="Go Back"
            hx-post="/api/v1/state"
            hx-trigger="click"
            hx-swap="none"
            hx-vals='${hxValsJson}'
            hx-preserve="true"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
              />
            </svg>
          </button>
        `;

            // Tell HTMX to process the new button so hx-post works
            if (window.htmx) {
              window.htmx.process(unsetDiv);
            }

            log(
              `🔄 Added unset button for pane ${paneId} with beliefs: ${visibilityValue.join(',')}`
            );
          } else {
            // Clear unset button - pane is hidden or visible without unset needs
            unsetDiv.innerHTML = '';
            log(`🚫 Cleared unset button for pane ${paneId}`);
          }
        } else {
          log(`⚠️ Unset div not found: pane-${paneId}-unset`);
        }
      } else {
        log(`⚠️ Code hook element not found: pane-${paneId}`);
      }
    });
  }

  // Process regular panes (HTMX refresh)
  let refreshedCount = 0;
  let errorCount = 0;

  regularPaneIds.forEach((paneId) => {
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
    // Wait a brief moment for the DOM to update and the element to become visible.
    setTimeout(() => {
      const targetElement = document.getElementById(
        `pane-${update.gotoPaneId}`
      );
      if (targetElement) {
        log(`🔍 Smart scrolling to target pane: ${update.gotoPaneId}`);
        try {
          const elementRect = targetElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          // If the element is taller than the viewport, just scroll to the top of it.
          if (elementRect.height > viewportHeight) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
            log('✅ Scroll completed (long element - align to top).');
          } else {
            // Otherwise, center it in the viewport.
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
            log('✅ Scroll completed (short element - align to center).');
          }
        } catch (error) {
          log('❌ Smart scroll failed:', error);
        }
      } else {
        log(
          `⚠️  Target pane element not found after delay: pane-${update.gotoPaneId}`
        );
      }
    }, 100);
  }

  log('🔄 === UPDATE PROCESSING COMPLETE ===');
}

function handleReconnection() {
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

function updateStoryfragmentContext(newStoryfragmentId, source) {
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

function setupSSEConnection() {
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
