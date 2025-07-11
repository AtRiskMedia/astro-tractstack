import { THRESHOLD_GLOSSED, THRESHOLD_READ } from '../constants';

const VERBOSE = false;

interface AnalyticsEvent {
  contentId: string;
  contentType: 'Pane' | 'StoryFragment';
  eventVerb: string;
}

// Track pane viewing times (replaces V1 panesVisible nanostore)
const paneViewTimes = new Map<string, number>();

// Session tracking for ENTERED event
let hasTrackedEntered =
  localStorage.getItem('tractstack_entered_tracked') === 'true';

// Current storyfragment ID passed from page
let currentStoryfragmentId: string | null = null;

// Initialization tracking to prevent duplicates
let isInitialized = false;

// Intersection Observer instance for cleanup
let globalObserver: IntersectionObserver | null = null;

// Initialize analytics tracking with storyfragment ID
export function initAnalyticsTracking(storyfragmentId?: string) {
  if (isInitialized) {
    if (VERBOSE) console.log('📊 ANALYTICS: Already initialized, skipping');
    return;
  }

  if (VERBOSE) {
    console.log('📊 ANALYTICS: Initializing tracking system');
  }

  // Store the passed storyfragment ID
  currentStoryfragmentId = storyfragmentId || null;

  if (VERBOSE) {
    console.log(
      '📊 ANALYTICS: Received storyfragmentId:',
      currentStoryfragmentId
    );
  }

  isInitialized = true;

  // Track ENTERED event on first page load
  trackEnteredEvent();

  // Track PAGEVIEWED on every page load
  trackPageViewedEvent();

  // Set up pane visibility tracking
  initPaneVisibilityTracking();

  // Set up navigation integration for page transitions
  setupNavigationIntegration();
}

// Track site entry (once per session) using localStorage state
function trackEnteredEvent() {
  if (VERBOSE) {
    console.log(
      '📊 ANALYTICS: trackEnteredEvent - hasTrackedEntered:',
      hasTrackedEntered
    );
  }

  // If we haven't tracked ENTERED yet for this session
  if (!hasTrackedEntered && currentStoryfragmentId) {
    sendAnalyticsEvent({
      contentId: currentStoryfragmentId,
      contentType: 'StoryFragment',
      eventVerb: 'ENTERED',
    });
    hasTrackedEntered = true;
    localStorage.setItem('tractstack_entered_tracked', 'true');

    if (VERBOSE) {
      console.log('📊 ANALYTICS: ENTERED event sent for site entry');
    }
  }
}

// Track page view (every page load)
function trackPageViewedEvent() {
  if (VERBOSE) {
    console.log(
      '📊 ANALYTICS: trackPageViewedEvent - storyfragmentId:',
      currentStoryfragmentId
    );
  }

  if (currentStoryfragmentId) {
    sendAnalyticsEvent({
      contentId: currentStoryfragmentId,
      contentType: 'StoryFragment',
      eventVerb: 'PAGEVIEWED',
    });
  }
}

// Initialize pane visibility tracking using native Intersection Observer
function initPaneVisibilityTracking() {
  // Clean up existing observer
  if (globalObserver) {
    globalObserver.disconnect();
    if (VERBOSE) console.log('📊 ANALYTICS: Cleaned up existing observer');
  }

  // Create new intersection observer
  globalObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const paneId = getPaneIdFromElement(entry.target as HTMLElement);
        if (!paneId) return;

        if (entry.isIntersecting) {
          // Pane entered viewport - start timing
          if (!paneViewTimes.has(paneId)) {
            paneViewTimes.set(paneId, Date.now());
          }
        } else {
          // Pane exited viewport - calculate duration and send event
          const startTime = paneViewTimes.get(paneId);
          if (startTime) {
            const duration = Date.now() - startTime;
            paneViewTimes.delete(paneId);

            // Determine event type based on duration (same logic as V1)
            let eventVerb: string | null = null;
            if (duration >= THRESHOLD_READ) {
              eventVerb = 'READ';
            } else if (duration >= THRESHOLD_GLOSSED) {
              eventVerb = 'GLOSSED';
            }

            if (eventVerb) {
              sendAnalyticsEvent({
                contentId: paneId,
                contentType: 'Pane',
                eventVerb: eventVerb,
              });

              if (VERBOSE) {
                console.log(
                  `📊 ANALYTICS: ${eventVerb} event sent for pane ${paneId} (${duration}ms)`
                );
              }
            }
          }
        }
      });
    },
    {
      threshold: 0.1, // Trigger when 10% visible
      rootMargin: '0px', // No margin extension
    }
  );

  // Observe all current panes
  observeAllPanes();
}

// Find and observe pane elements using V2 DOM structure
function observeAllPanes() {
  if (!globalObserver) return;

  // V2 uses [data-pane-id] attributes (confirmed from [...slug].astro analysis)
  const panes = document.querySelectorAll('[data-pane-id]');

  let observedCount = 0;
  panes.forEach((pane) => {
    const paneId = getPaneIdFromElement(pane as HTMLElement);
    if (paneId) {
      globalObserver!.observe(pane);
      observedCount++;
    }
  });
}

// Set up navigation integration for V2 page transitions
function setupNavigationIntegration() {
  // Before HTMX navigates away, flush pending events
  document.addEventListener('htmx:beforeSwap', () => {
    if (VERBOSE) console.log('📊 ANALYTICS: HTMX beforeSwap - flushing events');
    flushPendingPaneEvents();
  });

  // After HTMX loads new content, re-observe panes (but don't re-initialize)
  document.addEventListener('htmx:afterSwap', () => {
    setTimeout(() => {
      if (VERBOSE)
        console.log('📊 ANALYTICS: HTMX afterSwap - re-observing panes');
      observeAllPanes();
    }, 100);
  });

  // Handle Astro page transitions (these reload [...slug].astro completely)
  document.addEventListener('astro:before-preparation', () => {
    if (VERBOSE)
      console.log('📊 ANALYTICS: Astro before-preparation - flushing events');
    flushPendingPaneEvents();
  });

  document.addEventListener('astro:after-swap', () => {
    // For Astro navigation, [...slug].astro will reload and call initAnalyticsTracking again
    // So we just need to clean up here
    if (VERBOSE)
      console.log('📊 ANALYTICS: Astro after-swap - cleaning up for new page');
    isInitialized = false; // Allow re-initialization for new page
  });

  // Page unload cleanup
  window.addEventListener('beforeunload', () => {
    if (VERBOSE) console.log('📊 ANALYTICS: Page unload - flushing events');
    flushPendingPaneEvents();
  });
}

// Flush events for panes still in viewport before navigation
function flushPendingPaneEvents() {
  if (paneViewTimes.size === 0) return;

  if (VERBOSE)
    console.log(
      `📊 ANALYTICS: Flushing ${paneViewTimes.size} pending pane events`
    );

  paneViewTimes.forEach((startTime, paneId) => {
    const duration = Date.now() - startTime;

    let eventVerb: string | null = null;
    if (duration >= THRESHOLD_READ) {
      eventVerb = 'READ';
    } else if (duration >= THRESHOLD_GLOSSED) {
      eventVerb = 'GLOSSED';
    }

    if (eventVerb) {
      sendAnalyticsEvent({
        contentId: paneId,
        contentType: 'Pane',
        eventVerb: eventVerb,
      });
    }
  });

  paneViewTimes.clear();
}

// Send analytics event to V2 unified API endpoint
async function sendAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const goBackend = getGoBackend();
    const sessionId = getSessionId();
    const tenantId = getTenantId();

    if (VERBOSE) {
      console.log('📊 ANALYTICS: Sending event', {
        event,
        goBackend,
        sessionId,
        tenantId,
        storyfragmentId: currentStoryfragmentId,
      });
    }

    // Map to V2 unified API format (same form structure as belief events)
    const formData = {
      beliefId: event.contentId, // The content being tracked
      beliefType: event.contentType, // Routes to AnalyticsProcessor
      beliefValue: event.eventVerb, // The action performed
      paneId: '', // Always empty for analytics events
    };

    const response = await fetch(`${goBackend}/api/v1/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Tenant-ID': tenantId,
        'X-TractStack-Session-ID': sessionId || '',
        'X-StoryFragment-ID': currentStoryfragmentId || '',
      },
      body: new URLSearchParams(formData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    // Fail silently for analytics events - don't disrupt user experience
    console.error('📊 ANALYTICS: Event failed (silent failure)', error, event);
  }
}

// Utility functions for environment data - using existing V2 globals
function getGoBackend(): string {
  return (window as any).BACKEND_URL || 'http://localhost:8080';
}

function getTenantId(): string {
  return (window as any).TENANT_ID || 'default';
}

function getSessionId(): string | null {
  return localStorage.getItem('tractstack_session_id');
}

function getPaneIdFromElement(element: HTMLElement): string | null {
  return element.getAttribute('data-pane-id') || null;
}

// Make function globally available
window.initAnalyticsTracking = initAnalyticsTracking;

if (VERBOSE) {
  console.log('📊 ANALYTICS: Analytics events module loaded');
}
