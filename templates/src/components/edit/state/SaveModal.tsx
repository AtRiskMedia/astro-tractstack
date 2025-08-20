import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { getCtx } from '@/stores/nodes';
import {
  transformLivePaneForSave,
  transformStoryFragmentForSave,
} from '@/utils/etl/index';

type SaveStage =
  | 'PREPARING'
  | 'SAVING_PENDING_FILES'
  | 'PROCESSING_OG_IMAGES'
  | 'SAVING_PANES'
  | 'SAVING_STORY_FRAGMENTS'
  | 'PROCESSING_STYLES'
  | 'COMPLETED'
  | 'ERROR';

interface SaveStageProgress {
  currentStep: number;
  totalSteps: number;
}

interface SaveModalProps {
  show: boolean;
  slug: string;
  isContext: boolean;
  onClose: () => void;
}

export default function SaveModal({
  show,
  slug,
  isContext,
  onClose,
}: SaveModalProps) {
  const [stage, setStage] = useState<SaveStage>('PREPARING');
  const [progress, setProgress] = useState(0);
  const [stageProgress, setStageProgress] = useState<SaveStageProgress>({
    currentStep: 0,
    totalSteps: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const isSaving = useRef(false);

  // Determine if we're in create mode
  const isCreateMode = slug === 'create';

  // Get backend URL
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugMessages((prev) => [...prev, `${timestamp}: ${message}`]);
    console.log(`[SaveModal] ${message}`);
  };

  // Main save process
  useEffect(() => {
    // Reset state when modal is hidden or if save is already running
    if (!show) {
      setStage('PREPARING');
      setProgress(0);
      setDebugMessages([]);
      setShowDebug(false);
      isSaving.current = false;
      return;
    }

    if (isSaving.current) return;

    const runSaveProcess = async () => {
      isSaving.current = true;
      const ctx = getCtx();
      const allDirtyNodes = ctx.getDirtyNodes();

      try {
        setStage('PREPARING');
        setProgress(5);
        addDebugMessage(
          `Starting V2 save process... (${isContext ? 'Context' : 'StoryFragment'} mode, ${isCreateMode ? 'CREATE' : 'UPDATE'})`
        );

        // Filter nodes based on context mode
        let dirtyPanes = allDirtyNodes.filter(
          (node) => node.nodeType === 'Pane'
        );
        let dirtyStoryFragments = allDirtyNodes.filter(
          (node) => node.nodeType === 'StoryFragment'
        );

        // In context mode, we only care about panes, not story fragments
        if (isContext) {
          dirtyStoryFragments = [];
          addDebugMessage('Context mode: Ignoring StoryFragment nodes');
        }

        const nodesWithPendingFiles = allDirtyNodes.filter(
          (node) =>
            node.nodeType === 'TagElement' &&
            'fileId' in node &&
            node.fileId === 'pending' &&
            'base64Data' in node &&
            node.base64Data
        );

        // Check for story fragments with pending OG image operations
        const storyFragmentsWithPendingImages = dirtyStoryFragments.filter(
          (fragment) => {
            const payload = transformStoryFragmentForSave(ctx, fragment.id);
            return payload.pendingImageOperation;
          }
        );

        const relevantNodeCount =
          dirtyPanes.length + dirtyStoryFragments.length;
        addDebugMessage(
          `Found ${relevantNodeCount} relevant dirty nodes to save (${dirtyPanes.length} Panes, ${dirtyStoryFragments.length} StoryFragments)`
        );
        addDebugMessage(
          `Found ${storyFragmentsWithPendingImages.length} story fragments with pending OG image operations`
        );

        if (
          relevantNodeCount === 0 &&
          nodesWithPendingFiles.length === 0 &&
          storyFragmentsWithPendingImages.length === 0
        ) {
          addDebugMessage('No changes to save');
          setStage('COMPLETED');
          setProgress(100);
          return;
        }

        const totalSteps =
          nodesWithPendingFiles.length +
          storyFragmentsWithPendingImages.length +
          dirtyPanes.length +
          dirtyStoryFragments.length +
          1;

        addDebugMessage(
          `Save plan: ${nodesWithPendingFiles.length} files, ${storyFragmentsWithPendingImages.length} og images, ${dirtyPanes.length} panes, ${dirtyStoryFragments.length} story fragments, 1 styles = ${totalSteps} total steps`
        );

        let completedSteps = 1;

        // Handle pending files
        if (nodesWithPendingFiles.length > 0) {
          setStage('SAVING_PENDING_FILES');
          setStageProgress({
            currentStep: 0,
            totalSteps: nodesWithPendingFiles.length,
          });
          for (let i = 0; i < nodesWithPendingFiles.length; i++) {
            const fileNode = nodesWithPendingFiles[i];
            const endpoint = `${goBackend}/api/v1/nodes/files/create`;
            addDebugMessage(
              `Processing file ${i + 1}/${nodesWithPendingFiles.length}: ${fileNode.id} -> POST ${endpoint}`
            );
            console.log(
              `[PAYLOAD] File create (NOT SENT) POST ${endpoint}:`,
              fileNode
            );
            await new Promise((resolve) => setTimeout(resolve, 200));

            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        // Handle OG image operations for story fragments
        if (storyFragmentsWithPendingImages.length > 0) {
          setStage('PROCESSING_OG_IMAGES');
          setStageProgress({
            currentStep: 0,
            totalSteps: storyFragmentsWithPendingImages.length,
          });
          for (let i = 0; i < storyFragmentsWithPendingImages.length; i++) {
            const fragment = storyFragmentsWithPendingImages[i];
            const payload = transformStoryFragmentForSave(ctx, fragment.id);
            const pendingImageOp = payload.pendingImageOperation;

            addDebugMessage(
              `Processing OG image ${i + 1}/${storyFragmentsWithPendingImages.length}: ${fragment.id} -> ${pendingImageOp.type}`
            );

            if (pendingImageOp.type === 'upload' && pendingImageOp.data) {
              addDebugMessage(
                `OG image upload: ${pendingImageOp.filename} -> POST [OG_UPLOAD_ENDPOINT]`
              );
              console.log(`[PAYLOAD] OG image upload (NOT SENT):`, {
                path: pendingImageOp.path,
                filename: pendingImageOp.filename,
                data:
                  pendingImageOp.data.substring(0, 100) +
                  '...[base64 data truncated]',
                fullDataLength: pendingImageOp.data.length,
              });
            } else if (pendingImageOp.type === 'remove') {
              addDebugMessage(
                `OG image removal: ${payload.socialImagePath} -> DELETE [OG_DELETE_ENDPOINT]`
              );
              console.log(`[PAYLOAD] OG image delete (NOT SENT):`, {
                path: payload.socialImagePath,
              });
            }

            await new Promise((resolve) => setTimeout(resolve, 200));
            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        // Handle panes
        if (dirtyPanes.length > 0) {
          setStage('SAVING_PANES');
          setStageProgress({
            currentStep: 0,
            totalSteps: dirtyPanes.length,
          });
          for (let i = 0; i < dirtyPanes.length; i++) {
            const paneNode = dirtyPanes[i];

            try {
              const payload = transformLivePaneForSave(ctx, paneNode.id);

              // Determine endpoint based on create mode
              const isCreatePaneMode = isCreateMode;
              const endpoint = isCreatePaneMode
                ? `${goBackend}/api/v1/nodes/panes/create`
                : `${goBackend}/api/v1/nodes/panes/${payload.id}`;
              const method = isCreatePaneMode ? 'POST' : 'PUT';

              addDebugMessage(
                `Processing pane ${i + 1}/${dirtyPanes.length}: ${paneNode.id} -> ${method} ${endpoint}`
              );
              console.log(
                `[PAYLOAD] Pane save (NOT SENT) ${method} ${endpoint}:`,
                payload
              );

              // Simulate API call
              await new Promise((resolve) => setTimeout(resolve, 200));
              addDebugMessage(`Pane ${paneNode.id} save simulated`);
            } catch (etlError) {
              addDebugMessage(
                `ETL error for pane ${paneNode.id}: ${etlError instanceof Error ? etlError.message : String(etlError)}`
              );
            }

            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        // Handle story fragments (only in non-context mode)
        if (!isContext && dirtyStoryFragments.length > 0) {
          setStage('SAVING_STORY_FRAGMENTS');
          setStageProgress({
            currentStep: 0,
            totalSteps: dirtyStoryFragments.length,
          });
          for (let i = 0; i < dirtyStoryFragments.length; i++) {
            const fragment = dirtyStoryFragments[i];

            try {
              const payload = transformStoryFragmentForSave(ctx, fragment.id);

              // Determine endpoint based on create mode
              const endpoint = isCreateMode
                ? `${goBackend}/api/v1/nodes/storyfragments/create`
                : `${goBackend}/api/v1/nodes/storyfragments/${payload.id}/complete`;
              const method = isCreateMode ? 'POST' : 'PUT';

              addDebugMessage(
                `Processing story fragment ${i + 1}/${dirtyStoryFragments.length}: ${fragment.id} -> ${method} ${endpoint}`
              );
              console.log(
                `[PAYLOAD] StoryFragment save (NOT SENT) ${method} ${endpoint}:`,
                payload
              );

              // Simulate API call
              await new Promise((resolve) => setTimeout(resolve, 200));
              addDebugMessage(`StoryFragment ${fragment.id} save simulated`);
            } catch (etlError) {
              addDebugMessage(
                `ETL error for story fragment ${fragment.id}: ${etlError instanceof Error ? etlError.message : String(etlError)}`
              );
            }

            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        // Handle styles
        setStage('PROCESSING_STYLES');
        setStageProgress({ currentStep: 1, totalSteps: 1 });
        addDebugMessage('Starting V2 Tailwind pipeline...');

        const { dirtyPaneIds, classes: dirtyClasses } =
          ctx.getDirtyNodesClassData();
        const tailwindEndpoint = `${goBackend}/api/v1/tailwind/update`;

        try {
          addDebugMessage(
            `Processing styles: ${dirtyClasses.length} classes for ${dirtyPaneIds.length} panes -> POST ${tailwindEndpoint}`
          );
          console.log(
            `[PAYLOAD] Tailwind update (NOT SENT) POST ${tailwindEndpoint}:`,
            { dirtyPaneIds, dirtyClasses }
          );
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (styleError) {
          addDebugMessage(
            `Style processing error: ${styleError instanceof Error ? styleError.message : String(styleError)}`
          );
        }

        // Clean dirty nodes (commented out for simulation)
        addDebugMessage(`Cleaning ${allDirtyNodes.length} dirty nodes...`);
        // ctx.cleanDirtyNodes(allDirtyNodes);

        setProgress(100);
        setStage('COMPLETED');
        addDebugMessage(
          'V2 save process completed successfully (simulation mode)'
        );

        // If we're in create mode, we might want to redirect to the edit URL
        if (isCreateMode) {
          addDebugMessage(
            'Create mode completed - consider redirecting to edit URL'
          );
        }
      } catch (err) {
        setStage('ERROR');
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        addDebugMessage(`Save process failed: ${errorMessage}`);
      }
    };

    runSaveProcess();
  }, [show, slug, isContext, isCreateMode, goBackend, tenantId]);

  const getStageDescription = () => {
    const getProgressText = () =>
      stageProgress.totalSteps > 0
        ? ` (${stageProgress.currentStep}/${stageProgress.totalSteps})`
        : '';

    const modeText = isContext ? 'Context Pane' : 'Story Fragment';
    const actionText = isCreateMode ? 'Creating' : 'Updating';

    switch (stage) {
      case 'PREPARING':
        return `Preparing ${actionText.toLowerCase()} ${modeText.toLowerCase()}...`;
      case 'SAVING_PENDING_FILES':
        return `Saving pending files...${getProgressText()}`;
      case 'PROCESSING_OG_IMAGES':
        return `Processing OG images...${getProgressText()}`;
      case 'SAVING_PANES':
        return `${actionText} pane content...${getProgressText()}`;
      case 'SAVING_STORY_FRAGMENTS':
        return `${actionText} story fragments...${getProgressText()}`;
      case 'PROCESSING_STYLES':
        return 'Processing styles...';
      case 'COMPLETED':
        return `${actionText} ${modeText.toLowerCase()} completed successfully! (Simulation Mode)`;
      case 'ERROR':
        return `Error: ${error}`;
      default:
        return '';
    }
  };

  const handleOpenChange = (details: { open: boolean }) => {
    if (!details.open && (stage === 'COMPLETED' || stage === 'ERROR')) {
      onClose();
    }
  };

  return (
    <Dialog.Root
      open={show}
      onOpenChange={handleOpenChange}
      modal={true}
      preventScroll={true}
    >
      <Portal>
        <Dialog.Backdrop
          className="fixed inset-0 bg-black bg-opacity-75"
          style={{ zIndex: 9005 }}
        />
        <Dialog.Positioner
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9005 }}
        >
          <Dialog.Content
            className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl"
            style={{ maxHeight: '90vh' }}
          >
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  {isCreateMode ? 'Creating' : 'Saving'}{' '}
                  {isContext ? 'Context Pane' : 'Story Fragment'}
                </Dialog.Title>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="rounded bg-gray-100 px-2 py-1 text-sm transition-colors hover:bg-gray-200"
                >
                  {showDebug ? 'Hide Debug' : 'Show Debug'}
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <div className="mb-1 flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stage === 'COMPLETED'
                        ? 'bg-green-500'
                        : stage === 'ERROR'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div className="text-center">
                <Dialog.Description className="text-lg font-medium text-gray-900">
                  {getStageDescription()}
                </Dialog.Description>
              </div>
            </div>

            {showDebug && (
              <div className="border-t border-gray-200 bg-gray-50">
                <div
                  className="overflow-y-auto px-6 py-4"
                  style={{ maxHeight: '20rem' }}
                >
                  <h3 className="mb-2 text-sm font-bold text-gray-900">
                    Debug Log
                  </h3>
                  <div className="space-y-1 rounded border bg-white p-3 font-mono text-xs">
                    {debugMessages.length === 0 ? (
                      <div className="text-gray-500">No log entries yet...</div>
                    ) : (
                      debugMessages.map((msg, idx) => (
                        <div key={idx} className="text-gray-800">
                          {msg}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {(stage === 'COMPLETED' || stage === 'ERROR') && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex justify-end space-x-3">
                  {stage === 'ERROR' && (
                    <button
                      onClick={() => window.location.reload()}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                    >
                      Reload Page
                    </button>
                  )}
                  <Dialog.CloseTrigger asChild>
                    <button
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        stage === 'COMPLETED'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {stage === 'COMPLETED' ? 'Close' : 'Cancel'}
                    </button>
                  </Dialog.CloseTrigger>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
