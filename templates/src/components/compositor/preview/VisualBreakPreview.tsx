import { useEffect, useState } from 'react';
import { NodesContext } from '@/stores/nodes';
import { createEmptyStorykeep } from '@/utils/compositor/nodesHelper';
import { getTemplateVisualBreakPane } from '@/utils/compositor/TemplatePanes';
import {
  PanesPreviewGenerator,
  type PanePreviewRequest,
  type PaneFragmentResult,
} from '@/components/compositor/preview/PanesPreviewGenerator';
import {
  PaneSnapshotGenerator,
  type SnapshotData,
} from '@/components/compositor/preview/PaneSnapshotGenerator';

interface VisualBreakPreviewProps {
  bgColour: string;
  fillColour: string;
  variant?: string; // Optional variant name for the visual break
  height?: number; // Optional height for the container
}

// The state is managed as a single object since this component only ever handles one preview at a time.
// This is slightly simpler than managing an array with a single item.
type PreviewState = {
  htmlFragment?: string;
  snapshot?: SnapshotData;
  error?: string;
};

/**
 * Renders a preview of a single visual break variant.
 *
 * This component uses a modern two-step process for efficiency:
 * 1. It uses PanesPreviewGenerator to fetch an HTML fragment of the break.
 * 2. It then uses PaneSnapshotGenerator to convert that HTML into an image snapshot.
 */
export const VisualBreakPreview = ({
  bgColour,
  fillColour,
  variant = 'cutwide2', // Default to cutwide2 as it's a commonly used break
  height = 120, // Default height that works well for most breaks
}: VisualBreakPreviewProps) => {
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [fragmentRequest, setFragmentRequest] = useState<PanePreviewRequest[]>(
    []
  );

  useEffect(() => {
    // Reset state whenever the props change to trigger a full regeneration
    setPreviewState(null);

    // STEP 1: Create a temporary NodesContext for the preview.
    const ctx = new NodesContext();
    ctx.addNode(createEmptyStorykeep('tmp')); // Add root node

    // Get the template for the specified variant and apply the dynamic colours
    const template = getTemplateVisualBreakPane(variant);
    if (template) {
      if (template.bgColour) template.bgColour = bgColour;
      if (template.bgPane && template.bgPane.type === 'visual-break') {
        if (template.bgPane.breakDesktop) {
          template.bgPane.breakDesktop.svgFill = fillColour;
        }
        if (template.bgPane.breakTablet) {
          template.bgPane.breakTablet.svgFill = fillColour;
        }
        if (template.bgPane.breakMobile) {
          template.bgPane.breakMobile.svgFill = fillColour;
        }
      }
      ctx.addTemplatePane('tmp', template); // Add the template to the context
    }

    // Prepare a request for the PanesPreviewGenerator to get the HTML.
    setFragmentRequest([{ id: 'visual-break-preview', ctx }]);
  }, [variant, bgColour, fillColour]);

  // Handler for when the HTML fragment has been generated
  const handleFragmentComplete = (results: PaneFragmentResult[]) => {
    const result = results[0];
    if (result?.htmlString) {
      setPreviewState({ htmlFragment: result.htmlString });
    } else {
      setPreviewState({
        error: result?.error || 'Failed to generate HTML fragment.',
      });
    }
    setFragmentRequest([]); // Clear the request to prevent re-fetching
  };

  // Handler for when the image snapshot has been generated from the HTML.
  // The 'id' parameter is unused here as we only manage one snapshot at a time.
  const handleSnapshotComplete = (data: SnapshotData) => {
    setPreviewState((prev) => (prev ? { ...prev, snapshot: data } : null));
  };

  // Display a pulsing placeholder while the process is running
  if (!previewState) {
    return <div className="my-4 h-12 animate-pulse bg-gray-200" />;
  }

  // Display an error message if something went wrong
  if (previewState.error) {
    return (
      <div className="flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Preview could not be generated: {previewState.error}
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={!previewState.snapshot ? { height: `${height}px` } : undefined}
    >
      {/* STEP 2: Render the generator to fetch the HTML fragment. This component renders nothing itself. */}
      {fragmentRequest.length > 0 && (
        <PanesPreviewGenerator
          requests={fragmentRequest}
          onComplete={handleFragmentComplete}
          onError={(err) => setPreviewState({ error: err })}
        />
      )}

      {/* STEP 3: Once HTML is available, render the snapshot generator to create the image. This component also renders nothing. */}
      {previewState.htmlFragment && !previewState.snapshot && (
        <PaneSnapshotGenerator
          id="visual-break-snapshot"
          htmlString={previewState.htmlFragment}
          outputWidth={800} // Matches the original output width
          onComplete={(_id, data) => handleSnapshotComplete(data)}
          onError={(_id, err) =>
            setPreviewState((prev) =>
              prev ? { ...prev, error: err } : { error: err }
            )
          }
        />
      )}

      {/* STEP 4: Once the snapshot is complete, display the final image. */}
      {previewState.snapshot && (
        <div className="w-full">
          <img
            src={previewState.snapshot.imageData}
            alt={`Visual break ${variant}`}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};

export default VisualBreakPreview;
