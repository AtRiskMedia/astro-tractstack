import { VERBOSE } from './sse';

// This function now contains all essential one-time and recurring HTMX setup.
function configureHtmx() {
  if (!window.htmx) return;

  if (!window.HTMX_CONFIGURED) {
    window.htmx.config.selfRequestsOnly = false;
    window.HTMX_CONFIGURED = true;
  }

  window.htmx.on(document.body, 'htmx:configRequest', function (evt: any) {
    const config = window.TRACTSTACK_CONFIG;
    if (!config) return;

    if (evt.detail.path && evt.detail.path.startsWith('/api/v1/')) {
      evt.detail.path = config.backendUrl + evt.detail.path;
    }

    const sessionId = localStorage.getItem('tractstack_session_id');
    evt.detail.headers['X-Tenant-ID'] = config.tenantId;
    evt.detail.headers['X-StoryFragment-ID'] = config.storyfragmentId;
    if (sessionId) {
      evt.detail.headers['X-TractStack-Session-ID'] = sessionId;
    }
  });
}

interface BeliefUpdateData {
  [key: string]: string;
  beliefId: string;
  beliefType: string;
  beliefValue: string;
  paneId: string;
}

const pageBeliefs: {
  [storyfragmentId: string]: { [beliefId: string]: string };
} = {};
let activeStoryfragmentId: string | null = null;

function waitForSessionReady(): Promise<void> {
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

  configureHtmx(); // Run config on initial load.

  document.addEventListener('change', function (event: Event) {
    const target = event.target as HTMLElement;
    if (
      target.matches &&
      (target.matches('select[data-belief-id]') ||
        target.matches('input[type="checkbox"][data-belief-id]'))
    ) {
      handleBeliefChange(target as HTMLSelectElement | HTMLInputElement);
    }
  });
}

async function handleBeliefChange(
  element: HTMLSelectElement | HTMLInputElement
): Promise<void> {
  const beliefId = element.getAttribute('data-belief-id');
  const beliefType = element.getAttribute('data-belief-type');
  const paneId = element.getAttribute('data-pane-id');

  if (!beliefId || !beliefType) {
    if (VERBOSE)
      console.error('🔴 BELIEF: Missing required attributes on', element.id);
    return;
  }

  let beliefValue: string;
  if ((element as HTMLInputElement).type === 'checkbox') {
    beliefValue = (element as HTMLInputElement).checked
      ? 'BELIEVES_YES'
      : 'BELIEVES_NO';
  } else {
    beliefValue = (element as HTMLSelectElement).value;
  }

  if (VERBOSE)
    console.log('🔄 BELIEF: Widget changed', {
      beliefId,
      beliefType,
      beliefValue,
      paneId,
    });

  trackBeliefState(beliefId, beliefValue);

  // Pass the current page's beliefs to the backend
  await sendBeliefUpdate({
    beliefId,
    beliefType,
    beliefValue,
    paneId: paneId || '',
  });
}

async function sendBeliefUpdate(data: BeliefUpdateData): Promise<void> {
  await waitForSessionReady();

  try {
    const config = window.TRACTSTACK_CONFIG;
    if (!config) return;

    const sessionId = localStorage.getItem('tractstack_session_id');
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Tenant-ID': config.tenantId,
      'X-StoryFragment-ID': config.storyfragmentId,
      'X-TractStack-Session-ID': sessionId || '',
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

function trackBeliefState(beliefId: string, beliefValue: string) {
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
    // Ensure a state object exists for the newly active page
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

// Also set the active story on the very first page load.
document.addEventListener('DOMContentLoaded', setActiveStoryFragment);

if (VERBOSE)
  console.log('🔧 BELIEF: Belief events module loaded and is persistent.');
