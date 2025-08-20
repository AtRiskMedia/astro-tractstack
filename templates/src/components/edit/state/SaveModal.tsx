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
import type { BaseNode } from '@/types/compositorTypes';

const VERBOSE = true;

type SaveStage =
  | 'PREPARING'
  | 'SAVING_PENDING_FILES'
  | 'PROCESSING_OG_IMAGES'
  | 'SAVING_PANES'
  | 'SAVING_STORY_FRAGMENTS'
  | 'LINKING_FILES'
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

// Helper function to extract fileIds from pane tree
function extractFileIdsFromPaneTree(ctx: any, paneId: string): string[] {
  const fileIds: string[] = [];
  const allNodes = ctx.allNodes.get();

  // Get all child nodes of the pane
  const childNodeIds = ctx.getChildNodeIDs(paneId);

  for (const nodeId of childNodeIds) {
    const node = allNodes.get(nodeId);
    if (node && 'fileId' in node && node.fileId) {
      fileIds.push(node.fileId);
    }
  }

  return fileIds;
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
      console.log(allDirtyNodes);

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
          (node): node is BaseNode & { base64Data?: string } =>
            'base64Data' in node && !!node.base64Data
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
        addDebugMessage(
          `Found ${nodesWithPendingFiles.length} nodes with pending file uploads`
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
          2; // +1 for file linking, +1 for styles

        addDebugMessage(
          `Save plan: ${nodesWithPendingFiles.length} files, ${storyFragmentsWithPendingImages.length} og images, ${dirtyPanes.length} panes, ${dirtyStoryFragments.length} story fragments, 1 file linking, 1 styles = ${totalSteps} total steps`
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
              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Tenant-ID': tenantId,
                },
                credentials: 'include',
                body: JSON.stringify({ base64Data: fileNode.base64Data }), // FIXED: only send base64Data
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const result = await response.json();

              // Update tree with response data - handle different node types properly
              const updatedNode = { ...fileNode, isChanged: true };

              // Remove base64Data and add file properties
              if ('base64Data' in updatedNode) {
                delete updatedNode.base64Data;
              }

              // Add file properties - these properties already exist in FlatNode and BgImageNode types
              if ('fileId' in updatedNode) {
                updatedNode.fileId = result.fileId;
              }
              if ('src' in updatedNode) {
                updatedNode.src = result.src;
              }
              if ('srcSet' in updatedNode && result.srcSet) {
                updatedNode.srcSet = result.srcSet;
              }

              ctx.modifyNodes([updatedNode]);

              if (VERBOSE)
                console.log('[SaveModal] File upload result:', result);
              addDebugMessage(
                `File ${fileNode.id} uploaded successfully - got fileId: ${result.fileId}`
              );
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : 'Unknown error';
              addDebugMessage(`File ${fileNode.id} upload failed: ${errorMsg}`);
              throw new Error(
                `Failed to upload file ${fileNode.id}: ${errorMsg}`
              );
            }

            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        // Handle OG image uploads
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
                console.log(
                  `[SaveModal] REAL POST to ${ogUploadEndpoint}`,
                  uploadPayload
                );

                const response = await fetch(ogUploadEndpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                  },
                  credentials: 'include',
                  body: JSON.stringify(uploadPayload),
                });

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                console.log('[SaveModal] OG image upload result:', result);

                uploadedOGPaths[fragment.id] = result.path;
                addDebugMessage(
                  `OG image uploaded successfully: ${result.path}`
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

              console.log(`[SaveModal] REAL ${method} to ${endpoint}`, payload);

              const response = await fetch(endpoint, {
                method,
                headers: {
                  'Content-Type': 'application/json',
                  'X-Tenant-ID': tenantId,
                },
                credentials: 'include',
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const result = await response.json();
              console.log('[SaveModal] Pane save result:', result);
              addDebugMessage(`Pane ${paneNode.id} saved successfully`);
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

              console.log(`[SaveModal] REAL ${method} to ${endpoint}`, payload);

              const response = await fetch(endpoint, {
                method,
                headers: {
                  'Content-Type': 'application/json',
                  'X-Tenant-ID': tenantId,
                },
                credentials: 'include',
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const result = await response.json();
              console.log('[SaveModal] StoryFragment save result:', result);
              addDebugMessage(
                `StoryFragment ${fragment.id} saved successfully`
              );

              // Clear pending image operation after successful save
              if (uploadedOGPaths[fragment.id]) {
                clearPendingImageOperation(fragment.id);
                addDebugMessage(
                  `Cleared pending image operation for ${fragment.id}`
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

        // PHASE 3: Link file-pane relationships
        if (dirtyPanes.length > 0) {
          setStage('LINKING_FILES');
          addDebugMessage('Starting file-pane relationship linking...');

          // Extract pane<>file relationships from saved panes
          const relationships = [];
          for (const paneNode of dirtyPanes) {
            const fileIds = extractFileIdsFromPaneTree(ctx, paneNode.id);
            relationships.push({
              paneId: paneNode.id,
              fileIds: fileIds,
            });
          }

          if (relationships.some((rel) => rel.fileIds.length > 0)) {
            try {
              const bulkEndpoint = `${goBackend}/api/v1/nodes/panes/files/bulk`;
              addDebugMessage(
                `Linking relationships: ${JSON.stringify(relationships)}`
              );

              const response = await fetch(bulkEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Tenant-ID': tenantId,
                },
                credentials: 'include',
                body: JSON.stringify({ relationships }),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const result = await response.json();
              addDebugMessage(
                `File-pane relationships linked successfully: ${result.message}`
              );
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : 'Unknown error';
              addDebugMessage(
                `Failed to link file-pane relationships: ${errorMsg}`
              );
              throw new Error(
                `Failed to link file-pane relationships: ${errorMsg}`
              );
            }
          } else {
            addDebugMessage('No file relationships to link');
          }

          completedSteps++;
          setProgress((completedSteps / totalSteps) * 90);
        }

        // PHASE 4: Styles processing
        setStage('PROCESSING_STYLES');
        setProgress(95);
        addDebugMessage(`Processing styles...`);

        try {
          const { dirtyPaneIds, classes: dirtyClasses } =
            ctx.getDirtyNodesClassData();

          if (dirtyClasses.length === 0) {
            addDebugMessage(
              'No dirty classes to process, skipping Tailwind update'
            );
          } else {
            const tailwindEndpoint = `${goBackend}/api/v1/tailwind/update`;
            const tailwindPayload = { dirtyPaneIds, dirtyClasses };

            console.log(
              `[SaveModal] REAL POST to ${tailwindEndpoint}`,
              tailwindPayload
            );

            const response = await fetch(tailwindEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId,
              },
              credentials: 'include',
              body: JSON.stringify(tailwindPayload),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('[SaveModal] Tailwind update result:', result);
            addDebugMessage(
              `Tailwind styles processed: ${dirtyClasses.length} classes for ${dirtyPaneIds.length} panes`
            );
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          addDebugMessage(`Styles processing failed: ${errorMsg}`);
          throw new Error(`Failed to process styles: ${errorMsg}`);
        }

        // Success!
        setStage('COMPLETED');
        setProgress(100);
        addDebugMessage('Save process completed successfully!');
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
        return `Uploading files...${getProgressText()}`;
      case 'PROCESSING_OG_IMAGES':
        return `Processing OG images...${getProgressText()}`;
      case 'SAVING_PANES':
        return `${actionText} pane content...${getProgressText()}`;
      case 'SAVING_STORY_FRAGMENTS':
        return `${actionText} story fragments...${getProgressText()}`;
      case 'LINKING_FILES':
        return 'Linking file relationships...';
      case 'PROCESSING_STYLES':
        return 'Processing styles...';
      case 'COMPLETED':
        return `${actionText} ${modeText.toLowerCase()} completed successfully!`;
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
                  {isContext ? 'Context Pane' : 'Story Fragment'}
                </Dialog.Title>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {showDebug ? 'Hide Debug' : 'Show Debug'}
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {getStageDescription()}
                  </span>
                  {stage !== 'ERROR' && (
                    <span className="text-sm text-gray-500">
                      {Math.round(progress)}%
                    </span>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stage === 'ERROR' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {showDebug && (
                <div className="mb-4 max-h-40 overflow-y-auto rounded border bg-gray-50 p-3">
                  <div className="text-xs text-gray-600">
                    {debugMessages.map((message, index) => (
                      <div key={index} className="mb-1">
                        {message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stage === 'COMPLETED' && (
                <div className="mb-4 rounded bg-green-50 p-3 text-green-800">
                  Save completed successfully!
                  {isCreateMode && (
                    <div className="mt-2">
                      <button
                        onClick={handleSuccessClose}
                        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                      >
                        Continue to Edit Mode
                      </button>
                    </div>
                  )}
                </div>
              )}

              {stage === 'ERROR' && (
                <div className="mb-4 rounded bg-red-50 p-3 text-red-800">
                  <div className="font-medium">Save failed</div>
                  <div className="mt-1 text-sm">{error}</div>
                </div>
              )}

              {(stage === 'COMPLETED' || stage === 'ERROR') && (
                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
