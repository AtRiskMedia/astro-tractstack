import { preParseClicked } from './preParse_Clicked';
import { preParseBunny } from './preParse_Bunny';
import { dispatchUpdateVideoEvent } from './domHelpers';
import type { BrandConfig } from '@/types/tractstack';

interface ActionButtonParams {
  callbackPayload: any;
  targetUrl: string;
  paneId: string;
  config: BrandConfig;
}

export function handleActionButtonClick({
  callbackPayload,
  targetUrl,
  paneId,
  config,
}: ActionButtonParams): void {
  const bunny = preParseBunny(callbackPayload);
  const event = preParseClicked(paneId, callbackPayload, config);

  // Handle bunny video events
  if (bunny) {
    if (bunny.videoId) {
      dispatchUpdateVideoEvent(`${bunny.t}s`, bunny.videoId);
    } else {
      // Fallback to legacy behavior for backward compatibility
      const videoContainer = document.getElementById('video-container');
      if (videoContainer) {
        dispatchUpdateVideoEvent(`${bunny.t}s`);
      }
    }

    // TODO:
    console.log(`did not send event`, event);
    return;
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
