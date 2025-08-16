import { preParseClicked } from './preParse_Clicked';
import type { BrandConfig } from '@/types/tractstack';

interface ActionButtonParams {
  callbackPayload: any;
  targetUrl: string;
  paneId: string;
  config: BrandConfig;
}

// Import the sendAnalyticsEvent function to send events to backend
async function sendAnalyticsEvent(event: {
  contentId: string;
  contentType: 'Pane' | 'StoryFragment';
  eventVerb: string;
  duration?: number;
}): Promise<void> {
  try {
    const config = window.TRACTSTACK_CONFIG;
    if (!config || !config.sessionId) return;

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
    console.error('⛔ API ERROR: Analytics event failed', error, event);
  }
}

export function handleActionButtonClick({
  callbackPayload,
  targetUrl,
  paneId,
  config,
}: ActionButtonParams): void {
  const event = preParseClicked(paneId, callbackPayload, config);

  if (event) {
    console.log(event);
    sendAnalyticsEvent({
      contentId: event.targetId || event.targetSlug || event.id,
      contentType: 'Pane',
      eventVerb: event.verb,
    });
  }

  // Handle URL navigation and scroll
  if (targetUrl.startsWith('#') || targetUrl.includes('#')) {
    const id = targetUrl.split('#')[1];
    const element = document.getElementById(id);

    if (element) {
      // Calculate the target position
      const elementRect = element.getBoundingClientRect();
      const targetPosition = elementRect.top + window.scrollY;

      // Perform smooth scroll
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });

      // After scrolling, ensure the page layout is preserved
      const checkScrollEnd = setInterval(() => {
        if (
          window.scrollY === targetPosition ||
          Math.abs(window.scrollY - targetPosition) < 2
        ) {
          clearInterval(checkScrollEnd);
          document.body.style.minHeight = `${Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          )}px`;
        }
      }, 100);
    } else {
      window.location.href = targetUrl;
    }
  } else {
    window.location.href = targetUrl;
  }
}
