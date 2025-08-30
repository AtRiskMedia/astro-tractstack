import { VERBOSE } from './sse';
import { THRESHOLD_GLOSSED, THRESHOLD_READ } from '@/constants';

interface AnalyticsEvent {
  contentId: string;
  contentType: 'Pane' | 'StoryFragment';
  eventVerb: string;
  duration?: number;
}

const paneViewTimes = new Map<string, number>();
let hasTrackedEntered =
  localStorage.getItem('tractstack_entered_tracked') === 'true';
let currentStoryfragmentId: string | null = null;
let isPageInitialized = false;
let globalObserver: IntersectionObserver | null = null;

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

export async function initAnalyticsTracking(storyfragmentId?: string) {
  if (isPageInitialized) return;
  isPageInitialized = true;

  if (VERBOSE)
    console.log('📊 ANALYTICS: Initializing tracking for page view.');
  currentStoryfragmentId = storyfragmentId || null;
  initPaneVisibilityTracking();
  await waitForSessionReady();
  trackEnteredEvent();
  trackPageViewedEvent();
}

function trackEnteredEvent() {
  if (!hasTrackedEntered && currentStoryfragmentId) {
    sendAnalyticsEvent({
      contentId: currentStoryfragmentId,
      contentType: 'StoryFragment',
      eventVerb: 'ENTERED',
    });
    hasTrackedEntered = true;
    localStorage.setItem('tractstack_entered_tracked', 'true');
  }
}

function trackPageViewedEvent() {
  if (currentStoryfragmentId) {
    // This event is now PURELY for analytics. It no longer triggers
    // a synchronization workaround on the backend.
    sendAnalyticsEvent({
      contentId: currentStoryfragmentId,
      contentType: 'StoryFragment',
      eventVerb: 'PAGEVIEWED',
    });
  }
}

function initPaneVisibilityTracking() {
  if (globalObserver) {
    globalObserver.disconnect();
  }
  globalObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const paneId = getPaneIdFromElement(entry.target as HTMLElement);
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
            let eventVerb: string | null = null;
            if (duration >= THRESHOLD_READ) eventVerb = 'READ';
            else if (duration >= THRESHOLD_GLOSSED) eventVerb = 'GLOSSED';
            if (eventVerb) {
              sendAnalyticsEvent({
                contentId: paneId,
                contentType: 'Pane',
                eventVerb,
                duration,
              });
            }
          }
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px' }
  );
  observeAllPanes();
}

function observeAllPanes() {
  if (!globalObserver) return;
  const panes = document.querySelectorAll('[data-pane-id]');
  panes.forEach((pane) => globalObserver!.observe(pane));
}

function setupLifecycleListeners() {
  if (window.ANALYTICS_INITIALIZED) return;
  window.ANALYTICS_INITIALIZED = true;

  if (VERBOSE)
    console.log(
      '📊 ANALYTICS: Setting up lifecycle listeners for the first time.'
    );

  window.addEventListener('beforeunload', () => {
    flushPendingPaneEvents();
  });

  document.addEventListener('astro:page-load', () => {
    isPageInitialized = false;
    flushPendingPaneEvents();
    if (window.TRACTSTACK_CONFIG?.storyfragmentId) {
      initAnalyticsTracking(window.TRACTSTACK_CONFIG.storyfragmentId);
    }
  });

  if (document.readyState === 'complete') {
    if (window.TRACTSTACK_CONFIG?.storyfragmentId) {
      initAnalyticsTracking(window.TRACTSTACK_CONFIG.storyfragmentId);
    }
  } else {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        if (window.TRACTSTACK_CONFIG?.storyfragmentId) {
          initAnalyticsTracking(window.TRACTSTACK_CONFIG.storyfragmentId);
        }
      },
      { once: true }
    );
  }
}

function flushPendingPaneEvents() {
  if (paneViewTimes.size === 0) return;
  const flushTime = Date.now();
  paneViewTimes.forEach((startTime, paneId) => {
    const duration = flushTime - startTime;
    let eventVerb: string | null = null;
    if (duration >= THRESHOLD_READ) eventVerb = 'READ';
    else if (duration >= THRESHOLD_GLOSSED) eventVerb = 'GLOSSED';
    if (eventVerb) {
      sendAnalyticsEvent({
        contentId: paneId,
        contentType: 'Pane',
        eventVerb,
        duration,
      });
    }
  });
  paneViewTimes.clear();
}

async function sendAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const config = window.TRACTSTACK_CONFIG;
    if (!config || !config.sessionId) return; // Use server-provided session ID

    const sessionId = config.sessionId;
    const formData: { [key: string]: string } = {
      beliefId: event.contentId,
      beliefType: event.contentType,
      beliefValue: event.eventVerb,
      paneId: '',
    };

    if (event.duration !== undefined) {
      formData.duration = event.duration.toString();
    }

    await fetch(`${config.backendUrl}/api/v1/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Tenant-ID': config.tenantId,
        'X-TractStack-Session-ID': sessionId,
        'X-StoryFragment-ID': config.storyfragmentId,
      },
      body: new URLSearchParams(formData),
    });
  } catch (error) {
    console.error('❌ API ERROR: Analytics event failed', error, event);
  }
}

function getPaneIdFromElement(element: HTMLElement): string | null {
  return element.getAttribute('data-pane-id');
}

(window as any).initAnalyticsTracking = initAnalyticsTracking;

setupLifecycleListeners();

if (VERBOSE) {
  console.log(
    '📊 ANALYTICS: Analytics events module loaded and is persistent.'
  );
}
