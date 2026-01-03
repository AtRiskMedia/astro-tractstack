/**
 * TractStack Singleton Application Manager
 *
 * This script is loaded with `is:persist` and runs only once per session.
 * Its purpose is to manage long-lived application state and services,
 * primarily the Server-Sent Events (SSE) connection. It provides a stable
 * API on `window.TractStackApp` for transient view scripts to interact with.
 * It is completely decoupled from the DOM and HTMX.
 */

const VERBOSE = false;

function log(message, ...args) {
  if (VERBOSE) console.log('✅ SINGLETON [app.js]:', message, ...args);
}

function logError(message, ...args) {
  if (VERBOSE) console.error('❌ SINGLETON [app.js]:', message, ...args);
}

if (!window.TractStackApp) {
  log('INITIALIZING SINGLETON for the first time.');

  const TractStackApp = {
    config: {},
    eventSource: null,

    initialize(config) {
      log('Initializing with config from first page load.', config);

      // 1. Capture the existing local session BEFORE we potentially overwrite it
      // This is the "Memory" the Healer uses.
      const localSessionId = localStorage.getItem('tractstack_session_id');

      this.config = config;

      // 2. Pass the captured local ID into the reconciliation logic
      this.reconcileAndStart(localSessionId);
    },

    async reconcileAndStart(lsSession) {
      const ssrSession = this.config.sessionId;

      // Check for Split-Brain (LocalStorage has an ID that doesn't match what Astro sent)
      if (lsSession && lsSession !== ssrSession) {
        log(
          'Session mismatch detected (Split-Brain). Attempting reconciliation.',
          {
            local: lsSession,
            server: ssrSession,
          }
        );

        try {
          const response = await fetch(
            `${this.config.backendUrl}/api/v1/auth/visit`,
            {
              method: 'POST',
              headers: {
                'X-Tenant-ID': this.config.tenantId,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId: lsSession }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            log('Reconciliation successful. Switching to local session.', data);

            // This function handles updating Cookies AND LocalStorage
            this.updateSession(data.sessionId, data.fingerprint);
            return; // EXIT HERE so we don't overwrite with the server session below
          } else {
            log(
              'Reconciliation failed (session likely expired). Adopting server session.'
            );
          }
        } catch (e) {
          logError('Reconciliation network error.', e);
        }
      }

      // 3. Finalize state: Persist the "Winner" to LocalStorage
      // This runs if:
      // A) There was no mismatch (Clean Start) -> Seeds the storage
      // B) Reconciliation failed -> Resets storage to new Server ID
      if (ssrSession) {
        localStorage.setItem('tractstack_session_id', ssrSession);
      }

      if (this.config.sessionId && !this.eventSource) {
        this.startSSE();
      } else {
        log(
          'SSE connection not started: missing sessionId or already connected.'
        );
      }
    },

    updateSession(sessionId, fingerprintId) {
      document.cookie = `tractstack_session_id=${sessionId}; path=/; SameSite=Lax; max-age=86400`;
      if (fingerprintId) {
        document.cookie = `tractstack_fingerprint=${fingerprintId}; path=/; SameSite=Lax; max-age=31536000`;
      }

      this.config.sessionId = sessionId;
      if (fingerprintId) this.config.fingerprintId = fingerprintId;

      localStorage.setItem('tractstack_session_id', sessionId);

      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.startSSE();
    },

    updateConfig(newConfig) {
      const oldStoryfragmentId = this.config.storyfragmentId;
      this.config = { ...this.config, ...newConfig };
      log('Configuration updated due to page navigation.', {
        newConfig,
        storyfragmentIdChanged:
          oldStoryfragmentId !== newConfig.storyfragmentId,
      });

      if (this.config.sessionId && !this.eventSource) {
        log(
          'Session ID became available after navigation. Starting SSE connection.'
        );
        this.startSSE();
      }
    },

    getConfig() {
      return this.config;
    },

    startSSE() {
      if (this.eventSource) {
        log('Closing existing SSE connection before starting a new one.');
        this.eventSource.close();
      }

      const { backendUrl, sessionId, storyfragmentId, tenantId } = this.config;
      if (!sessionId || !tenantId) {
        logError('Cannot start SSE connection: missing sessionId or tenantId.');
        return;
      }

      const sseUrl = `${backendUrl}/api/v1/auth/sse?sessionId=${sessionId}&storyfragmentId=${storyfragmentId}&tenantId=${tenantId}`;
      log('Attempting to establish SSE connection...', { url: sseUrl });

      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        log('SSE Connection opened successfully.');
      };

      this.eventSource.onerror = (error) => {
        logError('SSE Connection error occurred.', error);
        this.eventSource.close();
        this.eventSource = null;
      };

      this.eventSource.addEventListener('panes_updated', (event) => {
        try {
          const data = JSON.parse(event.data);
          log('Received `panes_updated` event from server.', data);

          log(
            'Dispatching `tractstack:panes-updated` CustomEvent to the window.'
          );
          window.dispatchEvent(
            new CustomEvent('tractstack:panes-updated', { detail: data })
          );
        } catch (error) {
          logError('Failed to parse `panes_updated` event data.', {
            error,
            rawData: event.data,
          });
        }
      });
    },
  };

  window.TractStackApp = TractStackApp;

  if (window.TRACTSTACK_CONFIG) {
    window.TractStackApp.initialize(window.TRACTSTACK_CONFIG);
  } else {
    logError('Initial config not found at singleton creation time.');
  }

  document.addEventListener('astro:page-load', () => {
    log('`astro:page-load` detected. Updating internal config.');
    if (window.TRACTSTACK_CONFIG) {
      window.TractStackApp.updateConfig(window.TRACTSTACK_CONFIG);
    } else {
      logError(
        '`astro:page-load` fired, but `window.TRACTSTACK_CONFIG` was not found!'
      );
    }
  });
}
