import { useState, useEffect, useMemo } from 'react';
import type { TemplatePane } from '@/types/compositorTypes';
import { parseAiPane } from '@/utils/compositor/aiPaneParser';

interface AiPanePreviewProps {
  shellJson: string;
  copyHtml: string;
  layout: string;
  ownerId: string;
  onComplete: (pane: TemplatePane) => void;
  onBack: () => void;
}

export function AiPanePreview({
  shellJson,
  copyHtml,
  layout,
  onComplete,
  onBack,
}: AiPanePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [hasCompleted, setHasCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setError(null);
    setHasCompleted(false);
    setIsLoading(true);
    let isActive = true;

    if (shellJson && copyHtml) {
      try {
        const pane = parseAiPane(shellJson, copyHtml, layout);
        if (isActive && !hasCompleted) {
          onComplete(pane);
          setHasCompleted(true);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Error parsing AI Pane:', err);
        if (isActive) {
          setError(err.message || 'Failed to parse generated content.');
          setIsLoading(false);
        }
      }
    } else {
      // Handle case where inputs might be initially empty
      setIsLoading(false);
    }

    return () => {
      isActive = false;
    };
  }, [shellJson, copyHtml, layout, onComplete, hasCompleted]);

  const displayContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="p-4 text-center text-gray-500">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-400"></div>
          <p className="text-sm">Processing...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-4 text-center text-red-600">
          <p className="font-semibold">Error:</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      );
    }
    if (hasCompleted) {
      return (
        <div className="p-4 text-center text-green-700">
          <p className="font-semibold">Pane Applied Successfully!</p>
          <p className="mt-1 text-sm">
            You can now go back or continue editing.
          </p>
        </div>
      );
    }
    // Fallback/initial state before useEffect runs if needed
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">Preparing...</p>
      </div>
    );
  }, [isLoading, error, hasCompleted]);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="relative mb-4 flex min-h-[200px] flex-grow items-center justify-center overflow-auto rounded border bg-gray-50">
        {displayContent}
      </div>
      <div className="flex flex-shrink-0 justify-start">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          type="button"
        >
          Back
        </button>
      </div>
    </div>
  );
}
