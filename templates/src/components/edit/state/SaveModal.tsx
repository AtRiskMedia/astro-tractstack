import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { navigate } from 'astro:transitions/client';
import { getCtx } from '@/stores/nodes';
import {
  transformLivePaneForSave,
  transformStoryFragmentForSave,
} from '@/utils/etl/index';
import {
  getPendingImageOperation,
  clearPendingImageOperation,
} from '@/stores/storykeep';

const VERBOSE = true;

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
          `Starting save process... (${isContext ? 'Context' : 'StoryFragment'} mode, ${isCreateMode ? 'CREATE' : 'UPDATE'})`
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
            const pendingOp = getPendingImageOperation(fragment.id);
            return pendingOp && pendingOp.type === 'upload';
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

        // PHASE 1: Upload all pending files and OG images first
        const uploadedOGPaths: Record<string, string> = {};

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

            try {
              // CONSOLE LOG MODE - DON'T ACTUALLY FIRE THE REQUEST
              console.log(
                `[SaveModal] WOULD POST to ${endpoint}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                  },
                  credentials: 'include',
                  body: JSON.stringify(fileNode),
                },
                fileNode
              );

              if (VERBOSE)
                console.log('[SaveModal] File create result: SIMULATED');
              addDebugMessage(
                `File ${fileNode.id} saved successfully (SIMULATED)`
              );
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : 'Unknown error';
              addDebugMessage(`File ${fileNode.id} save failed: ${errorMsg}`);
              throw new Error(
                `Failed to save file ${fileNode.id}: ${errorMsg}`
              );
            }

            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        // Handle OG image uploads (Phase 1 - Upload only)
        if (storyFragmentsWithPendingImages.length > 0) {
          setStage('PROCESSING_OG_IMAGES');
          setStageProgress({
            currentStep: 0,
            totalSteps: storyFragmentsWithPendingImages.length,
          });
          for (let i = 0; i < storyFragmentsWithPendingImages.length; i++) {
            const fragment = storyFragmentsWithPendingImages[i];
            const pendingOp = getPendingImageOperation(fragment.id);

            if (pendingOp && pendingOp.type === 'upload' && pendingOp.data) {
              const ogUploadEndpoint = `${goBackend}/api/v1/nodes/images/og`;
              addDebugMessage(
                `Processing OG image ${i + 1}/${storyFragmentsWithPendingImages.length}: ${fragment.id} -> POST ${ogUploadEndpoint}`
              );

              const uploadPayload = {
                data: pendingOp.data,
                filename:
                  pendingOp.filename || `${fragment.id}-${Date.now()}.png`,
              };

              try {
                // CONSOLE LOG MODE - DON'T ACTUALLY FIRE THE REQUEST
                console.log(
                  `[SaveModal] WOULD POST to ${ogUploadEndpoint}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Tenant-ID': tenantId,
                    },
                    credentials: 'include',
                    body: JSON.stringify(uploadPayload),
                  },
                  uploadPayload
                );

                // Simulate successful response
                const result = {
                  success: true,
                  path: `/images/og/${fragment.id}-${Date.now()}.png`,
                };
                if (VERBOSE)
                  console.log(
                    '[SaveModal] OG image upload result: SIMULATED',
                    result
                  );

                uploadedOGPaths[fragment.id] = result.path;
                addDebugMessage(
                  `OG image uploaded successfully: ${result.path} (SIMULATED)`
                );
              } catch (error) {
                const errorMsg =
                  error instanceof Error ? error.message : 'Unknown error';
                addDebugMessage(
                  `OG image upload failed for ${fragment.id}: ${errorMsg}`
                );
                throw new Error(
                  `Failed to upload OG image for ${fragment.id}: ${errorMsg}`
                );
              }
            }

            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        // PHASE 2: Save all nodes with updated paths

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

              // CONSOLE LOG MODE - DON'T ACTUALLY FIRE THE REQUEST
              console.log(
                `[SaveModal] WOULD ${method} to ${endpoint}`,
                {
                  method,
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                  },
                  credentials: 'include',
                  body: JSON.stringify(payload),
                },
                payload
              );

              if (VERBOSE)
                console.log('[SaveModal] Pane save result: SIMULATED');
              addDebugMessage(
                `Pane ${paneNode.id} saved successfully (SIMULATED)`
              );
            } catch (etlError) {
              const errorMsg =
                etlError instanceof Error ? etlError.message : 'Unknown error';
              addDebugMessage(`Pane ${paneNode.id} ETL failed: ${errorMsg}`);
              throw new Error(
                `Failed to save pane ${paneNode.id}: ${errorMsg}`
              );
            }

            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        // Handle story fragments
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

              // If we uploaded an OG image for this fragment, use that path
              if (uploadedOGPaths[fragment.id]) {
                payload.socialImagePath = uploadedOGPaths[fragment.id];
              }

              const endpoint = isCreateMode
                ? `${goBackend}/api/v1/nodes/storyfragments/create`
                : `${goBackend}/api/v1/nodes/storyfragments/${payload.id}/complete`;
              const method = isCreateMode ? 'POST' : 'PUT';

              addDebugMessage(
                `Processing story fragment ${i + 1}/${dirtyStoryFragments.length}: ${fragment.id} -> ${method} ${endpoint}`
              );

              // CONSOLE LOG MODE - DON'T ACTUALLY FIRE THE REQUEST
              console.log(
                `[SaveModal] WOULD ${method} to ${endpoint}`,
                {
                  method,
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                  },
                  credentials: 'include',
                  body: JSON.stringify(payload),
                },
                payload
              );

              if (VERBOSE)
                console.log('[SaveModal] StoryFragment save result: SIMULATED');
              addDebugMessage(
                `StoryFragment ${fragment.id} saved successfully (SIMULATED)`
              );

              // Clear pending image operation after successful save
              if (uploadedOGPaths[fragment.id]) {
                clearPendingImageOperation(fragment.id);
                addDebugMessage(
                  `Cleared pending image operation for ${fragment.id} (SIMULATED)`
                );
              }
            } catch (etlError) {
              const errorMsg =
                etlError instanceof Error ? etlError.message : 'Unknown error';
              addDebugMessage(
                `StoryFragment ${fragment.id} ETL failed: ${errorMsg}`
              );
              throw new Error(
                `Failed to save story fragment ${fragment.id}: ${errorMsg}`
              );
            }

            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        // PHASE 3: Styles processing (POST /api/v1/tailwind/update)
        setStage('PROCESSING_STYLES');
        setProgress(90);
        addDebugMessage(`Processing styles...`);

        try {
          const { dirtyPaneIds, classes: dirtyClasses } =
            ctx.getDirtyNodesClassData();
          const tailwindEndpoint = `${goBackend}/api/v1/tailwind/update`;
          const tailwindPayload = { dirtyPaneIds, dirtyClasses };

          // CONSOLE LOG MODE - DON'T ACTUALLY FIRE THE REQUEST
          console.log(
            `[SaveModal] WOULD POST to ${tailwindEndpoint}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId,
              },
              credentials: 'include',
              body: JSON.stringify(tailwindPayload),
            },
            tailwindPayload
          );

          if (VERBOSE)
            console.log('[SaveModal] Tailwind update result: SIMULATED');
          addDebugMessage(
            `Tailwind styles would be processed: ${dirtyClasses.length} classes for ${dirtyPaneIds.length} panes (SIMULATED)`
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          addDebugMessage(`Styles processing failed: ${errorMsg}`);
          throw new Error(`Failed to process styles: ${errorMsg}`);
        }

        // Success!
        setStage('COMPLETED');
        setProgress(100);
        addDebugMessage('Save process completed successfully! (SIMULATED)');
      } catch (err) {
        setStage('ERROR');
        const errorMessage =
          err instanceof Error && err.message
            ? err.message
            : 'Unknown error occurred';
        setError(errorMessage);
        addDebugMessage(`Save process failed: ${errorMessage}`);
      } finally {
        isSaving.current = false;
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
        return `${actionText} ${modeText.toLowerCase()} completed successfully! (SIMULATED)`;
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

  const handleSuccessClose = () => {
    if (stage === 'COMPLETED') {
      if (isCreateMode) {
        // Navigate to edit URL after successful creation
        const editUrl = isContext ? `/context/${slug}/edit` : `/${slug}/edit`;
        console.log(
          '[SaveModal] Would navigate to:',
          editUrl,
          '(SIMULATED - but actually navigating)'
        );
        navigate(editUrl);
      } else {
        onClose();
      }
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
                  {isContext ? 'Context Pane' : 'Story Fragment'} (SIMULATED)
                </Dialog.Title>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {showDebug ? 'Hide' : 'Show'} Debug
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span>{getStageDescription()}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-cyan-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {showDebug && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">
                    Debug Log
                  </h3>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs">
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
              )}

              {stage === 'ERROR' && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                {stage === 'COMPLETED' ? (
                  <button
                    onClick={handleSuccessClose}
                    className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                  >
                    {isCreateMode ? 'Continue' : 'Close'}
                  </button>
                ) : stage === 'ERROR' ? (
                  <button
                    onClick={onClose}
                    className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                  >
                    Close
                  </button>
                ) : (
                  <div className="text-sm text-gray-500">
                    Saving... please wait
                  </div>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
