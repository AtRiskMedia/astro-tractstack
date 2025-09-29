import { useState, useEffect } from 'react';
import type { FullContentMapItem } from '@/types/tractstack';
import {
  PaneSnapshotGenerator,
  type SnapshotData,
} from '@/components/compositor/preview/PaneSnapshotGenerator';

interface FeaturedArticlePreviewProps {
  story: FullContentMapItem;
}

const PREVIEW_TIMEOUT = 10000; // 10 seconds

const FeaturedArticlePreview = ({ story }: FeaturedArticlePreviewProps) => {
  const [htmlFragment, setHtmlFragment] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    setSnapshot(null);
    setIsLoading(true);
    setHtmlFragment(null); // Reset HTML fragment as well
    console.log(
      `[Preview DEBUG] Starting generation for story: "${story.title}"`
    );

    const timeoutId = setTimeout(() => {
      if (!isCancelled) {
        console.error('[Preview DEBUG] Generation timed out after 10 seconds.');
        setIsLoading(false);
      }
    }, PREVIEW_TIMEOUT);

    const fetchHtml = async () => {
      try {
        if (!story.panes || story.panes.length === 0) {
          throw new Error('Story has no panes to generate a preview from.');
        }
        const paneIdsToFetch = story.panes.slice(0, 2);
        console.log(
          `[Preview DEBUG] 1. Fetching HTML for panes:`,
          paneIdsToFetch
        );

        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
        const response = await fetch(`${goBackend}/api/v1/fragments/panes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': window.TRACTSTACK_CONFIG?.tenantId || 'default',
          },
          body: JSON.stringify({ paneIds: paneIdsToFetch }),
        });

        if (isCancelled) return;
        if (!response.ok) {
          throw new Error(`API fetch failed with status: ${response.status}`);
        }
        const data = await response.json();
        const combinedHtml = paneIdsToFetch
          .map((id) => data.fragments?.[id] || '')
          .join('');
        if (!combinedHtml.trim()) {
          throw new Error('API returned no HTML content for the panes.');
        }
        console.log(
          `[Preview DEBUG] 2. HTML received (length: ${combinedHtml.length}). Will now render snapshot generator.`
        );
        if (!isCancelled) {
          setHtmlFragment(combinedHtml);
        }
      } catch (e) {
        if (!isCancelled) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          console.error(
            '[Preview DEBUG] An error occurred while fetching HTML:',
            errorMessage
          );
          setIsLoading(false);
        }
      }
    };

    fetchHtml();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [story.id]);

  const handleSnapshotComplete = (id: string, data: SnapshotData) => {
    console.log('[Preview DEBUG] 3. Snapshot generation successful.');
    setSnapshot(data);
    setIsLoading(false);
  };

  const handleSnapshotError = (id: string, err: string) => {
    console.error(
      '[Preview DEBUG] An error occurred during snapshot generation:',
      err
    );
    setIsLoading(false);
  };

  return (
    <>
      {/* This is the invisible worker component. It only renders when its input is ready. */}
      {htmlFragment && isLoading && (
        <PaneSnapshotGenerator
          id={`live-preview-${story.id}`}
          htmlString={htmlFragment}
          outputWidth={600}
          onComplete={handleSnapshotComplete}
          onError={handleSnapshotError}
        />
      )}

      {/* This is the visible UI that reacts to state changes. */}
      {isLoading && (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-gray-200">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-cyan-600 border-t-transparent"></div>
        </div>
      )}

      {!isLoading && snapshot && (
        <img
          src={snapshot.imageData}
          alt={`Live preview of ${story.title}`}
          className="h-auto w-full rounded-lg object-cover shadow-lg"
        />
      )}

      {!isLoading && !snapshot && (
        <>
          {story.thumbSrc ? (
            <img
              src={story.thumbSrc}
              alt={`Preview of ${story.title}`}
              className="h-auto w-full rounded-lg object-cover shadow-lg"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">
              Could not display preview.
            </div>
          )}
        </>
      )}
    </>
  );
};

export default FeaturedArticlePreview;
