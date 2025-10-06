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
      this.config = config;
      if (config.sessionId && !this.eventSource) {
        this.startSSE();
      } else {
        log(
          'SSE connection not started: missing sessionId or already connected.'
        );
      }
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
