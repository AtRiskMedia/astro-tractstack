/**
 * TractStack View Initializer
 *
 * This script is transient and runs on every page load and client-side navigation.
 * It is responsible for initializing all logic related to the current document,
 * including HTMX configuration, analytics, and DOM event listeners. It gets its
 * configuration state from the persistent `app.js` singleton.
 */

const VERBOSE = false;

// ============================================================================
// LOGGING UTILITIES
// ============================================================================
function log(message, ...args) {
  if (VERBOSE) console.log('📄 VIEW [view.js]:', message, ...args);
}

function logError(message, ...args) {
  if (VERBOSE) console.error('❌ VIEW [view.js]:', message, ...args);
}

// ============================================================================
// STATE & CONFIGURATION
// ============================================================================

let paneViewTimes = new Map();
let globalObserver = null;
let isPageInitialized = false;

// ============================================================================
// CORE LOGIC FUNCTIONS
// ============================================================================

/**
 * A generic utility to send state updates to the backend API.
 * @param {object} data - The payload for the state update.
 */
async function sendStateUpdate(data) {
  if (!window.TractStackApp) {
    logError('Singleton not found, cannot send state update.');
    return;
  }
  const config = window.TractStackApp.getConfig();

  if (!config.sessionId || !config.storyfragmentId) {
    return;
  }

  const url = `${config.backendUrl}/api/v1/state`;
  const body = { paneId: '', duration: 0, ...data };
  log('Sending state update to backend.', { url, body });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Tenant-ID': config.tenantId,
        'X-TractStack-Session-ID': config.sessionId,
        'X-StoryFragment-ID': config.storyfragmentId,
      },
      body: new URLSearchParams(body),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    logError('Failed to send state update.', { error, data });
  }
}

/**
 * Initializes all analytics tracking for the current page view.
 * @param {object} config - The configuration object for the current page.
 */
function initAnalyticsTracking(config) {
  const { storyfragmentId } = config;

  log(`Initializing analytics tracking for storyfragment: ${storyfragmentId}`);

  if (globalObserver) {
    globalObserver.disconnect();
  }

  globalObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const paneId = entry.target.getAttribute('data-pane-id');
        if (!paneId) return;
        if (entry.isIntersecting) {
          if (!paneViewTimes.has(paneId)) {
            paneViewTimes.set(paneId, Date.now());
          }
        } else {
          const startTime = paneViewTimes.get(paneId);
          if (startTime) {
            const duration = Date.now() - startTime;
            paneViewTimes.delete(paneId);
            const THRESHOLD_GLOSSED = 7000;
            const THRESHOLD_READ = 42000;
            let eventVerb = null;
            if (duration >= THRESHOLD_READ) eventVerb = 'READ';
            else if (duration >= THRESHOLD_GLOSSED) eventVerb = 'GLOSSED';
            if (eventVerb) {
              sendStateUpdate({
                beliefId: paneId,
                beliefType: 'Pane',
                beliefValue: eventVerb,
                duration,
              });
            }
          }
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px' }
  );

  const panes = document.querySelectorAll('[data-pane-id]');
  log(`Observing ${panes.length} panes for visibility tracking.`);
  panes.forEach((pane) => globalObserver.observe(pane));

  const hasTrackedEntered =
    localStorage.getItem('tractstack_entered_tracked') === 'true';
  if (!hasTrackedEntered && storyfragmentId) {
    log('Tracking first-ever "ENTERED" event.');
    sendStateUpdate({
      beliefId: storyfragmentId,
      beliefType: 'StoryFragment',
      beliefValue: 'ENTERED',
    });
    localStorage.setItem('tractstack_entered_tracked', 'true');
  }

  if (storyfragmentId) {
    log(`Tracking "PAGEVIEWED" event for storyfragment: ${storyfragmentId}`);
    sendStateUpdate({
      beliefId: storyfragmentId,
      beliefType: 'StoryFragment',
      beliefValue: 'PAGEVIEWED',
    });
  }
}

/**
 * Flushes any pending analytics events, typically called before the page unloads.
 */
function flushPendingPaneEvents() {
  if (paneViewTimes.size === 0) return;
  log('Flushing pending pane view events before page unload.');
  const flushTime = Date.now();
  paneViewTimes.forEach((startTime, paneId) => {
    const duration = flushTime - startTime;
    const THRESHOLD_GLOSSED = 7000;
    const THRESHOLD_READ = 42000;
    let eventVerb = null;
    if (duration >= THRESHOLD_READ) eventVerb = 'READ';
    else if (duration >= THRESHOLD_GLOSSED) eventVerb = 'GLOSSED';
    if (eventVerb) {
      sendStateUpdate({
        beliefId: paneId,
        beliefType: 'Pane',
        beliefValue: eventVerb,
        duration,
      });
    }
  });
  paneViewTimes.clear();
}

/**
 * Configures the fresh HTMX instance on each page load.
 */
function configureHtmxForPage() {
  if (!window.htmx) {
    logError('Cannot configure HTMX: window.htmx is not defined.');
    return;
  }

  htmx.config.selfRequestsOnly = false;

  log('Configuring HTMX listeners for new page view.', {
    selfRequestsOnly: htmx.config.selfRequestsOnly,
  });

  htmx.on('htmx:configRequest', function (evt) {
    if (!window.TractStackApp) return;
    const config = window.TractStackApp.getConfig();
    log('Intercepting HTMX request with `htmx:configRequest`.', {
      originalPath: evt.detail.path,
    });
    evt.detail.headers['X-Tenant-ID'] = config.tenantId;
    evt.detail.headers['X-StoryFragment-ID'] = config.storyfragmentId;
    evt.detail.headers['X-TractStack-Session-ID'] = config.sessionId;

    if (evt.detail.path && evt.detail.path.startsWith('/api/v1/')) {
      evt.detail.path = config.backendUrl + evt.detail.path;
      log('Request path rewritten.', { newPath: evt.detail.path });
    }
  });

  htmx.on('htmx:beforeRequest', async function (evt) {
    const params = evt.detail.requestConfig.parameters;
    if (params && params.beliefVerb === 'IDENTIFY_AS') {
      log('Intercepting IDENTIFY_AS action to perform pre-unset.');
      evt.preventDefault();

      const originalPayload = { ...params };
      const unsetPayload = {
        unsetBeliefIds: originalPayload.beliefId,
        paneId: originalPayload.paneId || '',
        gotoPaneID: originalPayload.gotoPaneID || '',
      };

      log('Step 1: Sending UNSET request.', unsetPayload);
      await sendStateUpdate(unsetPayload);

      log('Step 2: Sending original IDENTIFY_AS request.', originalPayload);
      await sendStateUpdate(originalPayload);
    }
  });

  log('Processing the document body with htmx.process().');
  htmx.process(document.body);
}

/**
 * Processes a `panes_updated` event received from the singleton.
 * @param {object} update - The update payload from the SSE event.
 * @param {object} config - The current page's configuration.
 */
function processStoryfragmentUpdate(update, config) {
  if (update.storyfragmentId !== config.storyfragmentId) {
    log('Ignoring update for a different storyfragment.', {
      eventStoryfragment: update.storyfragmentId,
      currentStoryfragment: config.storyfragmentId,
    });
    return;
  }

  log('Processing storyfragment update from Singleton.', { update });

  const uniquePaneIds = [...new Set(update.affectedPanes)];
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

  log('Split panes for processing.', { codeHookPaneIds, regularPaneIds });

  codeHookPaneIds.forEach((paneId) => {
    const element = document.querySelector(`#pane-${paneId}`);
    if (!element) {
      logError(`Code hook element not found: #pane-${paneId}`);
      return;
    }
    const visibilityValue = update.CodeHookVisibility[paneId];
    log(`Handling Code Hook pane: ${paneId}`, { visibilityValue });
    element.style.display = visibilityValue === false ? 'none' : 'block';

    const unsetDiv = document.querySelector(`#pane-${paneId}-unset`);
    if (unsetDiv) {
      if (Array.isArray(visibilityValue)) {
        log(
          `Generating "unset" button for pane ${paneId} with beliefs:`,
          visibilityValue
        );
        const hxValsObject = {
          unsetBeliefIds: visibilityValue.join(','),
          paneId: paneId,
          gotoPaneID: update.gotoPaneId || '',
        };
        unsetDiv.innerHTML = `
          <button
            type="button"
            class="text-mydarkgrey absolute right-2 top-2 z-10 rounded-full bg-white p-1.5 hover:bg-black hover:text-white"
            title="Go Back"
            hx-post="/api/v1/state"
            hx-trigger="click"
            hx-swap="none"
            hx-vals='${JSON.stringify(hxValsObject)}'
            hx-preserve="true"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>`;
        htmx.process(unsetDiv);
      } else {
        log(`Clearing "unset" button for pane ${paneId}`);
        unsetDiv.innerHTML = '';
      }
    }
  });

  regularPaneIds.forEach((paneId) => {
    const element = document.querySelector(`[data-pane-id="${paneId}"]`);
    if (element && window.htmx) {
      log(`Triggering 'refresh' on regular pane element: ${paneId}`);
      htmx.trigger(element, 'refresh');
    } else {
      logError(`Could not find regular pane element to refresh: ${paneId}`);
    }
  });

  if (update.gotoPaneId) {
    setTimeout(() => {
      const targetElement = document.getElementById(
        `pane-${update.gotoPaneId}`
      );
      if (targetElement) {
        log(`Smart scrolling to target pane: ${update.gotoPaneId}`);
        const elementRect = targetElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const scrollBlock =
          elementRect.height > viewportHeight ? 'start' : 'center';
        log(`Using scroll behavior: block: '${scrollBlock}'`);
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: scrollBlock,
        });
      } else {
        logError(
          `Target pane element for scrolling not found: #pane-${update.gotoPaneId}`
        );
      }
    }, 350);
  }
}

// ============================================================================
// MAIN EXECUTION & LIFECYCLE MANAGEMENT
// ============================================================================

function initializeCurrentView() {
  if (isPageInitialized) {
    log('View already initialized for this page. Skipping redundant setup.');
    return;
  }

  log('INITIALIZING VIEW for new page.');

  if (!window.TractStackApp) {
    logError('Singleton `TractStackApp` not found! Cannot initialize view.');
    return;
  }
  const config = window.TractStackApp.getConfig();
  if (!config.configured) {
    logError('Singleton config not ready. Aborting view initialization.');
    return;
  }

  configureHtmxForPage();
  initAnalyticsTracking(config);

  isPageInitialized = true;
}

function resetViewState() {
  log('Resetting view state before new page preparation.');
  flushPendingPaneEvents();
  isPageInitialized = false;
  paneViewTimes.clear();
}

if (!window.tractstackViewLifecycleListenersAttached) {
  log(
    'Attaching one-time lifecycle listeners that persist across navigations.'
  );

  document.addEventListener('astro:before-preparation', resetViewState);

  document.addEventListener('change', function (event) {
    const target = event.target;
    if (
      target.matches &&
      (target.matches('select[data-belief-id]') ||
        target.matches('input[type="checkbox"][data-belief-id]'))
    ) {
      const beliefId = target.getAttribute('data-belief-id');
      const beliefType = target.getAttribute('data-belief-type');
      const paneId = target.getAttribute('data-pane-id');

      let beliefValue;
      if (target.type === 'checkbox') {
        const onVerb = target.getAttribute('data-verb');
        const offVerb = target.getAttribute('data-off-verb');
        if (onVerb && offVerb) {
          beliefValue = target.checked ? onVerb : offVerb;
        } else {
          beliefValue = target.checked ? 'BELIEVES_YES' : 'BELIEVES_NO';
        }
      } else {
        beliefValue = target.value;
      }

      sendStateUpdate({
        beliefId,
        beliefType,
        beliefValue,
        paneId: paneId || '',
      });
    }
  });

  window.addEventListener('tractstack:panes-updated', (event) => {
    log('Received `tractstack:panes-updated` event from Singleton.');
    if (!window.TractStackApp) return;
    const data = event.detail;
    const currentConfig = window.TractStackApp.getConfig();
    if (data.updates) {
      data.updates.forEach((update) =>
        processStoryfragmentUpdate(update, currentConfig)
      );
    } else {
      processStoryfragmentUpdate(data, currentConfig);
    }
  });

  window.addEventListener('beforeunload', flushPendingPaneEvents);

  function closeModal() {
    const el = document.getElementById('t8k-modal');
    if (el) el.remove();
    document.documentElement.style.overflow = '';
  }

  document.addEventListener('open-modal', (e) => {
    const detail = e.detail || {};
    let src = '';
    if (detail.url) {
      let parsed;
      try {
        parsed = new URL(detail.url);
      } catch {
        return;
      }
      if (parsed.protocol !== 'https:') return;
      src = parsed.href;
    } else if (detail.hookId && /^[A-Za-z0-9_-]+$/.test(detail.hookId)) {
      const cfg = window.TractStackApp ? window.TractStackApp.getConfig() : {};
      const q = new URLSearchParams({
        paneId: '',
        tenantId: cfg.tenantId || 'default',
        modal: '1',
      });
      src = `/codehooks/${detail.hookId}?${q}`;
    } else {
      return;
    }

    closeModal();

    const shell = document.createElement('div');
    shell.id = 't8k-modal';
    shell.setAttribute('role', 'dialog');
    shell.className = 'fixed inset-0 bg-black bg-opacity-75';
    shell.style.zIndex = '9005';

    const relative = document.createElement('div');
    relative.className = 'relative h-full w-full';

    const closeWrap = document.createElement('div');
    closeWrap.className = 'absolute right-4 top-4 z-10';

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.title = 'Close';
    close.className =
      'flex h-10 w-10 items-center justify-center rounded-full bg-white bg-opacity-90 shadow-lg transition-all duration-200 hover:bg-opacity-100';
    close.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>';
    close.addEventListener('click', closeModal);
    closeWrap.appendChild(close);

    const frame = document.createElement('iframe');
    frame.src = src;
    frame.className = 'h-full w-full border-0';
    frame.allow = 'fullscreen; pointer-lock; gamepad; autoplay; xr-spatial-tracking';
    frame.setAttribute('allowfullscreen', '');
    frame.tabIndex = 0;
    frame.addEventListener('load', () => frame.focus());

    relative.append(closeWrap, frame);
    shell.appendChild(relative);
    document.body.appendChild(shell);
    document.documentElement.style.overflow = 'hidden';
    frame.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  document.addEventListener('astro:before-swap', closeModal);

  document.addEventListener('astro:after-swap', () => {
    document.querySelectorAll('video').forEach((video) => {
      if (video.closest('[data-astro-transition-persist]')) return;
      video.load();
      if (video.autoplay) {
        video.play().catch(() => {});
      }
    });
  });

  window.tractstackViewLifecycleListenersAttached = true;
}

initializeCurrentView();
document.addEventListener('astro:page-load', initializeCurrentView);
