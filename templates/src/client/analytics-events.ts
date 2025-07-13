import { THRESHOLD_GLOSSED, THRESHOLD_READ } from '../constants';

const VERBOSE = true;

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
          const wasAlreadyTracked = paneViewTimes.has(paneId);
          const wasInitiallyVisible =
            (entry.target as HTMLElement).dataset.wasInitiallyVisible ===
            'true';

          if (!wasAlreadyTracked && !wasInitiallyVisible) {
            const startTime = Date.now();
            paneViewTimes.set(paneId, startTime);

            if (VERBOSE) {
              console.log(
                `🟢 PANE ENTER: ${paneId} entered viewport at ${new Date(startTime).toISOString()}`
              );
              console.log(
                `📊 TRACKING MAP: Now tracking ${paneViewTimes.size} panes:`,
                Array.from(paneViewTimes.keys())
              );
            }
          } else if (wasInitiallyVisible) {
            // Remove the flag now that we've processed the initial state
            (entry.target as HTMLElement).removeAttribute(
              'data-was-initially-visible'
            );

            if (VERBOSE) {
              console.log(
                `🚫 SKIP INITIAL: ${paneId} was already visible, skipping initial enter event`
              );
            }
          } else if (wasAlreadyTracked) {
            if (VERBOSE) {
              console.log(
                `⚠️  PANE RE-ENTER: ${paneId} re-entered but already being tracked (no action taken)`
              );
            }
          }
        } else {
          // Pane exited viewport - calculate duration and send event
          const startTime = paneViewTimes.get(paneId);

          if (startTime) {
            const exitTime = Date.now();
            const duration = exitTime - startTime;

            // Remove from tracking immediately
            paneViewTimes.delete(paneId);

            if (VERBOSE) {
              console.log(
                `🔴 PANE EXIT: ${paneId} exited viewport at ${new Date(exitTime).toISOString()}`
              );
              console.log(
                `⏱️  DURATION: ${duration}ms (${(duration / 1000).toFixed(1)}s)`
              );
              console.log(
                `📊 TRACKING MAP: Now tracking ${paneViewTimes.size} panes:`,
                Array.from(paneViewTimes.keys())
              );
            }

            // Determine event type based on duration (same logic as V1)
            let eventVerb: string | null = null;
            if (duration >= THRESHOLD_READ) {
              eventVerb = 'READ';
            } else if (duration >= THRESHOLD_GLOSSED) {
              eventVerb = 'GLOSSED';
            }

            if (eventVerb) {
              if (VERBOSE) {
                console.log(
                  `✅ EVENT SEND: Sending ${eventVerb} event for pane ${paneId} (duration: ${duration}ms)`
                );
              }

              sendAnalyticsEvent({
                contentId: paneId,
                contentType: 'Pane',
                eventVerb: eventVerb,
              });
            } else {
              if (VERBOSE) {
                console.log(
                  `❌ BELOW THRESHOLD: Pane ${paneId} viewed for ${duration}ms (below ${THRESHOLD_GLOSSED}ms threshold)`
                );
              }
            }
          } else {
            if (VERBOSE) {
              console.log(
                `⚠️  PANE EXIT ERROR: ${paneId} exited but was not being tracked`
              );
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
  const paneIds: string[] = [];

  panes.forEach((pane) => {
    const paneId = getPaneIdFromElement(pane as HTMLElement);
    if (paneId) {
      // Check if pane is already visible to prevent false entry events
      const rect = pane.getBoundingClientRect();
      const isCurrentlyVisible =
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0;

      if (isCurrentlyVisible) {
        // Mark as already visible to skip initial intersection event
        (pane as HTMLElement).dataset.wasInitiallyVisible = 'true';
        if (VERBOSE) {
          console.log(
            `👁️  ALREADY VISIBLE: Pane ${paneId} is already in viewport, will skip initial enter event`
          );
        }
      } else {
        // Remove the flag if it exists
        (pane as HTMLElement).removeAttribute('data-was-initially-visible');
      }

      globalObserver!.observe(pane);
      observedCount++;
      paneIds.push(paneId);
    }
  });

  if (VERBOSE) {
    console.log(
      `🔍 OBSERVE SETUP: Found and observing ${observedCount} panes:`,
      paneIds
    );
  }
}

// Set up navigation integration for V2 page transitions
function setupNavigationIntegration() {
  // Before HTMX navigates away, flush pending events
  document.addEventListener('htmx:beforeSwap', () => {
    if (VERBOSE) {
      console.log(
        '🚀 HTMX BEFORE SWAP: Navigation starting, flushing pending events'
      );
      console.log(
        `📊 PENDING PANES: ${paneViewTimes.size} panes still being tracked:`,
        Array.from(paneViewTimes.keys())
      );
    }
    flushPendingPaneEvents();
  });

  // After HTMX loads new content, re-observe panes (but don't re-initialize)
  document.addEventListener('htmx:afterSwap', () => {
    setTimeout(() => {
      if (VERBOSE) {
        console.log(
          '🔄 HTMX AFTER SWAP: Re-observing panes after content swap'
        );
      }
      observeAllPanes();
    }, 100);
  });

  // Handle Astro page transitions (these reload [...slug].astro completely)
  document.addEventListener('astro:before-preparation', () => {
    if (VERBOSE) {
      console.log(
        '🚀 ASTRO BEFORE PREP: Navigation starting, flushing pending events'
      );
      console.log(
        `📊 PENDING PANES: ${paneViewTimes.size} panes still being tracked:`,
        Array.from(paneViewTimes.keys())
      );
    }
    flushPendingPaneEvents();
  });

  document.addEventListener('astro:after-swap', () => {
    // For Astro navigation, [...slug].astro will reload and call initAnalyticsTracking again
    // So we just need to clean up here
    if (VERBOSE) {
      console.log(
        '🔄 ASTRO AFTER SWAP: Cleaning up for new page initialization'
      );
    }
    isInitialized = false; // Allow re-initialization for new page
  });

  // Page unload cleanup
  window.addEventListener('beforeunload', () => {
    if (VERBOSE) {
      console.log('👋 PAGE UNLOAD: Flushing events before page unload');
      console.log(
        `📊 PENDING PANES: ${paneViewTimes.size} panes still being tracked:`,
        Array.from(paneViewTimes.keys())
      );
    }
    flushPendingPaneEvents();
  });
}

// Flush events for panes still in viewport before navigation
function flushPendingPaneEvents() {
  if (paneViewTimes.size === 0) {
    if (VERBOSE) {
      console.log('💨 FLUSH: No pending pane events to flush');
    }
    return;
  }

  if (VERBOSE) {
    console.log(
      `💨 FLUSH START: Flushing ${paneViewTimes.size} pending pane events`
    );
  }

  const flushTime = Date.now();
  let flushedCount = 0;
  let sentEventCount = 0;

  paneViewTimes.forEach((startTime, paneId) => {
    const duration = flushTime - startTime;
    flushedCount++;

    if (VERBOSE) {
      console.log(
        `💨 FLUSH PANE: ${paneId} - started at ${new Date(startTime).toISOString()}, duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`
      );
    }

    let eventVerb: string | null = null;
    if (duration >= THRESHOLD_READ) {
      eventVerb = 'READ';
    } else if (duration >= THRESHOLD_GLOSSED) {
      eventVerb = 'GLOSSED';
    }

    if (eventVerb) {
      sentEventCount++;
      if (VERBOSE) {
        console.log(
          `✅ FLUSH EVENT: Sending ${eventVerb} event for pane ${paneId} (duration: ${duration}ms)`
        );
      }

      sendAnalyticsEvent({
        contentId: paneId,
        contentType: 'Pane',
        eventVerb: eventVerb,
      });
    } else {
      if (VERBOSE) {
        console.log(
          `❌ FLUSH SKIP: Pane ${paneId} below threshold (${duration}ms < ${THRESHOLD_GLOSSED}ms)`
        );
      }
    }
  });

  paneViewTimes.clear();

  if (VERBOSE) {
    console.log(
      `💨 FLUSH COMPLETE: Processed ${flushedCount} panes, sent ${sentEventCount} events`
    );
    console.log(
      `📊 TRACKING MAP: Cleared - now tracking ${paneViewTimes.size} panes`
    );
  }
}

// Send analytics event to V2 unified API endpoint
async function sendAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const goBackend = getGoBackend();
    const sessionId = getSessionId();
    const tenantId = getTenantId();

    if (VERBOSE) {
      console.log('📡 API CALL: Sending event', {
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

    if (VERBOSE) {
      console.log(
        `✅ API SUCCESS: Event sent successfully for ${event.contentType} ${event.contentId} → ${event.eventVerb}`
      );
    }
  } catch (error) {
    // Fail silently for analytics events - don't disrupt user experience
    console.error('❌ API ERROR: Event failed (silent failure)', error, event);
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
(window as any).initAnalyticsTracking = initAnalyticsTracking;

if (VERBOSE) {
  console.log(
    '📊 ANALYTICS: Analytics events module loaded with enhanced logging'
  );
}
