const VERBOSE = false;

function configureHtmx() {
  if (!window.htmx || window.HTMX_LISTENER_ATTACHED) {
    return;
  }
  window.HTMX_LISTENER_ATTACHED = true;

  if (!window.HTMX_CONFIGURED) {
    window.htmx.config.selfRequestsOnly = false;
    window.HTMX_CONFIGURED = true;
  }

  window.htmx.on(document.body, 'htmx:configRequest', function (evt) {
    const config = window.TRACTSTACK_CONFIG;
    if (!config || !config.sessionId) return;

    if (evt.detail.path && evt.detail.path.startsWith('/api/v1/')) {
      evt.detail.path = config.backendUrl + evt.detail.path;
    }

    const sessionId = config.sessionId;
    evt.detail.headers['X-Tenant-ID'] = config.tenantId;
    evt.detail.headers['X-StoryFragment-ID'] = config.storyfragmentId;
    if (sessionId) {
      evt.detail.headers['X-TractStack-Session-ID'] = sessionId;
    }
  });

  window.htmx.on(document.body, 'htmx:beforeRequest', async function (evt) {
    const params = evt.detail.requestConfig.parameters;
    if (params && params.beliefVerb === 'IDENTIFY_AS') {
      evt.preventDefault();

      const originalPayload = params;
      const unsetPayload = {
        unsetBeliefIds: originalPayload.beliefId,
        paneId: originalPayload.paneId || '',
      };

      try {
        await sendBeliefUpdate(unsetPayload);
        await sendBeliefUpdate(originalPayload);
      } catch (error) {
        if (VERBOSE)
          console.error('🔴 BELIEF: Two-step identifyAs update failed', error);
      }
    }
  });
}

const pageBeliefs = {};
let activeStoryfragmentId = null;

function waitForSessionReady() {
  return new Promise((resolve) => {
    if (window.TRACTSTACK_CONFIG?.session?.isReady) {
      resolve();
    } else {
      window.addEventListener('tractstack:session-ready', () => resolve(), {
        once: true,
      });
    }
  });
}

function initializeBeliefs() {
  if (window.BELIEF_INITIALIZED) {
    return;
  }
  window.BELIEF_INITIALIZED = true;

  if (VERBOSE)
    console.log(
      '🔧 BELIEF: First-time initialization of belief handlers and HTMX config.'
    );

  configureHtmx();

  document.addEventListener('change', function (event) {
    const target = event.target;
    if (
      target.matches &&
      (target.matches('select[data-belief-id]') ||
        target.matches('input[type="checkbox"][data-belief-id]'))
    ) {
      handleBeliefChange(target);
    }
  });
}

async function handleBeliefChange(element) {
  const beliefId = element.getAttribute('data-belief-id');
  const beliefType = element.getAttribute('data-belief-type');
  const paneId = element.getAttribute('data-pane-id');

  if (!beliefId || !beliefType) {
    if (VERBOSE)
      console.error('🔴 BELIEF: Missing required attributes on', element.id);
    return;
  }

  let beliefValue;
  if (element.type === 'checkbox') {
    beliefValue = element.checked ? 'BELIEVES_YES' : 'BELIEVES_NO';
  } else {
    beliefValue = element.value;
  }

  if (VERBOSE)
    console.log('🔄 BELIEF: Widget changed', {
      beliefId,
      beliefType,
      beliefValue,
      paneId,
    });

  trackBeliefState(beliefId, beliefValue);

  await sendBeliefUpdate({
    beliefId,
    beliefType,
    beliefValue,
    paneId: paneId || '',
  });
}

async function sendBeliefUpdate(data) {
  await waitForSessionReady();

  try {
    const config = window.TRACTSTACK_CONFIG;
    if (!config || !config.sessionId) return;

    if (VERBOSE)
      console.log('🚨 FRONTEND DEBUG: Sending belief update with headers:', {
        'X-StoryFragment-ID': config.storyfragmentId,
        beliefData: data,
        currentSSEContext: 'check sse.ts logs',
      });

    const sessionId = config.sessionId;
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Tenant-ID': config.tenantId,
      'X-StoryFragment-ID': config.storyfragmentId,
      'X-TractStack-Session-ID': sessionId,
    };

    if (VERBOSE)
      console.log('📡 BELIEF: Session ready, sending update.', { data });

    const response = await fetch(`${config.backendUrl}/api/v1/state`, {
      method: 'POST',
      headers: headers,
      body: new URLSearchParams(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (VERBOSE)
      console.error('🔴 BELIEF: Update failed', {
        error: errorMessage,
        beliefId: data.beliefId,
      });
  }
}

function trackBeliefState(beliefId, beliefValue) {
  if (!activeStoryfragmentId) return;

  if (!pageBeliefs[activeStoryfragmentId]) {
    pageBeliefs[activeStoryfragmentId] = {};
  }
  pageBeliefs[activeStoryfragmentId][beliefId] = beliefValue;
  if (VERBOSE)
    console.log(`📝 BELIEF: Tracked state for page ${activeStoryfragmentId}`, {
      ...pageBeliefs[activeStoryfragmentId],
    });
}

function setActiveStoryFragment() {
  if (window.TRACTSTACK_CONFIG?.storyfragmentId) {
    activeStoryfragmentId = window.TRACTSTACK_CONFIG.storyfragmentId;
    if (VERBOSE)
      console.log(
        `📖 BELIEF: Active story fragment set to ${activeStoryfragmentId}`
      );

    if (!pageBeliefs[activeStoryfragmentId]) {
      pageBeliefs[activeStoryfragmentId] = {};
    }
  }
}

initializeBeliefs();

document.addEventListener('astro:page-load', () => {
  configureHtmx();
  setActiveStoryFragment();
});

document.addEventListener('DOMContentLoaded', setActiveStoryFragment);

if (VERBOSE)
  console.log('🔧 BELIEF: Belief events module loaded and is persistent.');
