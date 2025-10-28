import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TemplatePane } from '@/types/compositorTypes';
import { parseAiPane } from '@/utils/compositor/aiPaneParser';
import {
  PaneSnapshotGenerator,
  type SnapshotData,
} from '@/components/compositor/preview/PaneSnapshotGenerator';
import { ulid } from 'ulid';

type LLMShellLayer = {
  mobile?: Record<string, string>;
  tablet?: Record<string, string>;
  desktop?: Record<string, string>;
};

type ShellJson = {
  bgColour: string;
  parentClasses: LLMShellLayer[];
  defaultClasses: Record<string, any>;
};

interface AiPanePreviewProps {
  shellJson: string;
  copyHtml: string;
  layout: string;
  ownerId: string;
  onComplete: (pane: TemplatePane) => void;
  onBack: () => void;
}

function convertObjectToTailwindString(
  styleObj: Record<string, string> | undefined
): string {
  if (!styleObj) return '';
  return Object.entries(styleObj)
    .map(([key, value]) => {
      // Basic mapping, might need adjustment based on tailwindClasses structure if prefixes differ
      const prefixMap: Record<string, string> = {
        mx: 'mx',
        my: 'my',
        px: 'px',
        py: 'py',
        textALIGN: 'text',
        textSIZE: 'text',
        textCOLOR: 'text',
        fontWEIGHT: 'font',
        fontFACE: 'font',
        letterSPACING: 'tracking',
        lineHEIGHT: 'leading',
        bgCOLOR: 'bg',
        rounded: 'rounded',
        shadow: 'shadow',
        maxW: 'max-w',
        // Add other mappings as needed based on keys used in compositorTypes vs tailwindClasses
      };
      const prefix = prefixMap[key] || key.toLowerCase();
      if (value === '') return key; // Handle boolean classes like 'relative', 'flex'
      return `${prefix}-${value}`;
    })
    .join(' ');
}

function getPreviewClasses(classes: LLMShellLayer | undefined): string {
  if (!classes) return '';

  const mobileStyles = convertObjectToTailwindString(classes.mobile);
  const tabletStyles = convertObjectToTailwindString(classes.tablet);
  const desktopStyles = convertObjectToTailwindString(classes.desktop);

  const combined = `${mobileStyles} ${tabletStyles ? `md:${tabletStyles.split(' ').join(' md:')}` : ''} ${desktopStyles ? `xl:${desktopStyles.split(' ').join(' xl:')}` : ''}`;
  return combined.replace(/\s+/g, ' ').trim();
}

export function AiPanePreview({
  shellJson,
  copyHtml,
  layout,
  onComplete,
  onBack,
}: AiPanePreviewProps) {
  const [parsedPaneForApply, setParsedPaneForApply] =
    useState<TemplatePane | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshotData, setSnapshotData] = useState<SnapshotData | null>(null);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] =
    useState<boolean>(false);
  const previewId = useMemo(() => `ai-preview-${ulid()}`, []);

  useEffect(() => {
    let isActive = true;
    setError(null);
    setParsedPaneForApply(null);
    setSnapshotData(null);
    setIsGeneratingSnapshot(false);
    try {
      const pane = parseAiPane(shellJson, copyHtml, layout);
      if (isActive) {
        setParsedPaneForApply(pane);
      }
    } catch (err: any) {
      console.error('Error parsing AI Pane for apply:', err);
      if (isActive) {
        setError(
          err.message || 'Failed to parse generated content for application.'
        );
        setParsedPaneForApply(null);
      }
    }
    return () => {
      isActive = false;
    };
  }, [shellJson, copyHtml, layout]);

  const previewHtmlString = useMemo(() => {
    try {
      if (!shellJson || !copyHtml) return '';
      const shell: ShellJson = JSON.parse(shellJson);

      let currentHtml = copyHtml;
      if (shell.parentClasses && shell.parentClasses.length > 0) {
        [...shell.parentClasses].reverse().forEach((layer) => {
          const layerClasses = getPreviewClasses(layer);
          currentHtml = `<div class="${layerClasses}">${currentHtml}</div>`;
        });
      }

      const outerStyle = shell.bgColour
        ? `background-color: ${shell.bgColour};`
        : '';
      // Wrap in a div that sets width similar to snapshot generator default for better preview consistency
      return `<div style="${outerStyle} width: 800px; padding: 1px; margin: auto;">${currentHtml}</div>`;
    } catch (err: any) {
      console.error('Error constructing preview HTML string:', err);
      setError(err.message || 'Failed to construct preview HTML.');
      return '';
    }
  }, [shellJson, copyHtml]);

  const handleSnapshotComplete = useCallback(
    (id: string, data: SnapshotData) => {
      if (id === previewId) {
        setSnapshotData(data);
        setIsGeneratingSnapshot(false);
      }
    },
    [previewId]
  );

  const handleSnapshotError = useCallback(
    (id: string, errorMsg: string) => {
      if (id === previewId) {
        console.error(`Snapshot generation failed for ${id}:`, errorMsg);
        setError(`Snapshot generation failed: ${errorMsg}`);
        setIsGeneratingSnapshot(false);
      }
    },
    [previewId]
  );

  const handleApply = () => {
    if (parsedPaneForApply) {
      onComplete(parsedPaneForApply);
      console.log('FINAL TEMPLATE PANE PAYLOAD:', parsedPaneForApply);
    } else if (!error) {
      // Attempt parsing again if it failed silently initially
      try {
        const pane = parseAiPane(shellJson, copyHtml, layout);
        onComplete(pane);
      } catch (err: any) {
        setError(
          err.message || 'Failed to parse generated content before applying.'
        );
      }
    }
  };

  useEffect(() => {
    if (previewHtmlString && !snapshotData && !error && !isGeneratingSnapshot) {
      setIsGeneratingSnapshot(true);
    }
  }, [previewHtmlString, snapshotData, error, isGeneratingSnapshot]);

  const showLoading =
    isGeneratingSnapshot ||
    (!previewHtmlString && !error && !parsedPaneForApply);
  const showPreview = !isGeneratingSnapshot && snapshotData && !error;
  const showError = !!error;

  return (
    <div className="flex h-full flex-col p-4">
      <div className="relative mb-4 flex min-h-[200px] flex-grow items-center justify-center overflow-auto rounded border bg-gray-50">
        {showError && (
          <div className="p-4 text-center text-red-600">
            <p className="font-semibold">Error:</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}
        {showLoading && !showError && (
          <div className="p-4 text-center text-gray-500">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-400"></div>
            <p className="text-sm">
              {isGeneratingSnapshot
                ? 'Generating Snapshot...'
                : 'Constructing Preview...'}
            </p>
          </div>
        )}
        {isGeneratingSnapshot && previewHtmlString && (
          <div className="pointer-events-none absolute left-[-9999px] top-[-9999px] w-[800px] opacity-0">
            <PaneSnapshotGenerator
              id={previewId}
              htmlString={previewHtmlString}
              onComplete={handleSnapshotComplete}
              onError={handleSnapshotError}
            />
          </div>
        )}
        {showPreview && snapshotData && (
          <img
            src={snapshotData.imageData}
            alt="AI Pane Preview"
            className="block h-auto max-w-full"
          />
        )}
      </div>
      <div className="flex flex-shrink-0 justify-between">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          type="button"
        >
          Back
        </button>
        <button
          onClick={handleApply}
          disabled={
            !parsedPaneForApply ||
            !!error ||
            !snapshotData ||
            isGeneratingSnapshot
          }
          className={`rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-150 ${
            !parsedPaneForApply ||
            !!error ||
            !snapshotData ||
            isGeneratingSnapshot
              ? 'cursor-not-allowed bg-gray-400'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
          }`}
          type="button"
        >
          Apply Pane
        </button>
      </div>
    </div>
  );
}
