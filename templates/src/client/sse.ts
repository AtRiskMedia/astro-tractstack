export const VERBOSE = true;

// Module-specific state
let eventSource: EventSource | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;
let currentStoryfragmentId: string | null = null;
let isHtmxReady = false; // This remains a good safeguard

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

function setupSSEConnection() {
  if (window.SSE_INITIALIZED) {
    return;
  }
  window.SSE_INITIALIZED = true;
  log('First-time initialization. Setting up connection...');

  function waitForSession(): void {
    const sessionId = localStorage.getItem('tractstack_session_id');
    if (sessionId && window.TRACTSTACK_CONFIG?.session?.isReady) {
      initializeSSE(sessionId);
    } else {
      setTimeout(waitForSession, 100);
    }
  }

  function initializeSSE(sessionId: string): void {
    if (eventSource) {
      eventSource.close();
    }
    const config = window.TRACTSTACK_CONFIG;
    if (!config) return;

    const sseUrl = `${config.backendUrl}/api/v1/auth/sse?sessionId=${sessionId}&tenantId=${config.tenantId}`;
    log('Creating connection to:', sseUrl);

    eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      log('✅ Connection opened');
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
            const element = document.querySelector(
              `[data-pane-id="${paneId}"]`
            );
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
    };
  }

  waitForSession();
}

setupSSEConnection();

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

log('SSE events module loaded and is persistent.');
