import { useState, useEffect, useRef } from 'react';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import Impression from './Impression';
import type { ImpressionNode } from '@/types/compositorTypes';
import type { BrandConfig } from '@/types/tractstack';

interface ImpressionWrapperProps {
  payload: ImpressionNode[];
  currentPage: {
    id: string;
    slug: string;
    title: string;
  };
  config: BrandConfig;
  icon?: boolean;
}

const ImpressionWrapper = ({
  payload,
  currentPage,
  config,
  icon = true,
}: ImpressionWrapperProps) => {
  const [visibleImpressions, setVisibleImpressions] = useState<
    ImpressionNode[]
  >([]);
  const [seenPaneIds, setSeenPaneIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImpressionIndex, setCurrentImpressionIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pane visibility tracking (existing logic)
  useEffect(() => {
    if (payload.length === 0) return;

    const impressionPaneIds = new Set(
      payload
        .map((impression) => impression.parentId)
        .filter((id): id is string => Boolean(id))
    );

    const unseenPaneIds = Array.from(impressionPaneIds).filter(
      (paneId) => !seenPaneIds.has(paneId)
    );

    if (unseenPaneIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const paneId = entry.target.getAttribute('data-pane-id');
            if (paneId && impressionPaneIds.has(paneId)) {
              setSeenPaneIds((prev) => new Set(prev).add(paneId));
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
      }
    );

    unseenPaneIds.forEach((paneId) => {
      const paneElement = document.querySelector(`[data-pane-id="${paneId}"]`);
      if (paneElement) {
        observer.observe(paneElement);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [payload, seenPaneIds]);

  // Update visible impressions when seen panes change
  useEffect(() => {
    const newVisibleImpressions = payload.filter(
      (impression) =>
        impression.parentId && seenPaneIds.has(impression.parentId)
    );
    setVisibleImpressions(newVisibleImpressions);

    // Reset index when impressions change
    if (
      newVisibleImpressions.length > 0 &&
      currentImpressionIndex >= newVisibleImpressions.length
    ) {
      setCurrentImpressionIndex(0);
    }
  }, [payload, seenPaneIds, currentImpressionIndex]);

  // Cycling logic for multiple impressions
  useEffect(() => {
    if (isExpanded && visibleImpressions.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentImpressionIndex(
          (prevIndex) => (prevIndex + 1) % visibleImpressions.length
        );
      }, 5000); // 5 second interval
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isExpanded, visibleImpressions.length]);

  // No impressions to show
  if (visibleImpressions.length === 0) {
    return null;
  }

  // Header icon mode (when icon=true and not expanded)
  if (icon && !isExpanded) {
    return (
      <div className="impression-header-icon">
        <button
          type="button"
          title="Click for notifications"
          className="bg-brand-1 hover:bg-brand-3 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white transition-colors motion-safe:animate-bounce"
          onClick={() => setIsExpanded(true)}
        >
          <span className="sr-only">Show impressions</span>
          <span>{visibleImpressions.length}</span>
        </button>
      </div>
    );
  }

  // Expanded overlay mode (bottom-right)
  if (isExpanded) {
    const currentImpression = visibleImpressions[currentImpressionIndex];

    return (
      <div className="impression-overlay fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
        <div className="relative rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Close button */}
          <button
            type="button"
            className="focus:ring-brand-1 absolute right-2 top-2 z-10 rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2"
            onClick={() => setIsExpanded(false)}
          >
            <span className="sr-only">Close impressions</span>
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Impression content */}
          {currentImpression && (
            <div className="p-4">
              <Impression
                payload={currentImpression}
                currentPage={currentPage}
                config={config}
              />
            </div>
          )}

          {/* Multiple impressions indicator */}
          {visibleImpressions.length > 1 && (
            <div className="flex justify-center space-x-1 border-t border-gray-100 px-4 py-2">
              {visibleImpressions.map((_, index) => (
                <button
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === currentImpressionIndex
                      ? 'bg-brand-1'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  onClick={() => setCurrentImpressionIndex(index)}
                  aria-label={`Show impression ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback to existing behavior when icon=false
  return (
    <div
      className="impressions-wrapper pointer-events-none fixed z-50"
      style={{
        right: '16px',
      }}
    >
      <div className="impressions-container pointer-events-auto">
        <div className="impressions-list space-y-3">
          {visibleImpressions.map((impression) => (
            <Impression
              key={impression.id}
              payload={impression}
              currentPage={currentPage}
              config={config}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImpressionWrapper;
