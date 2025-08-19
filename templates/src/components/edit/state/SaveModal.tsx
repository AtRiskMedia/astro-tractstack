import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { getCtx } from '@/stores/nodes';
import { transformLivePaneForSave } from '@/utils/etl/index';

type SaveStage =
  | 'PREPARING'
  | 'SAVING_PENDING_FILES'
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
  onClose: () => void;
}

export default function SaveModal({ show, onClose }: SaveModalProps) {
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
        addDebugMessage('Starting V2 save process...');

        const dirtyPanes = allDirtyNodes.filter(
          (node) => node.nodeType === 'Pane'
        );
        const dirtyStoryFragments = allDirtyNodes.filter(
          (node) => node.nodeType === 'StoryFragment'
        );
        const nodesWithPendingFiles = allDirtyNodes.filter(
          (node) =>
            node.nodeType === 'TagElement' &&
            'fileId' in node &&
            node.fileId === 'pending' &&
            'base64Data' in node &&
            node.base64Data
        );

        const relevantNodeCount =
          dirtyPanes.length + dirtyStoryFragments.length;
        addDebugMessage(
          `Found ${relevantNodeCount} relevant dirty nodes to save (${dirtyPanes.length} Panes, ${dirtyStoryFragments.length} StoryFragments)`
        );

        if (relevantNodeCount === 0 && nodesWithPendingFiles.length === 0) {
          addDebugMessage('No changes to save');
          setStage('COMPLETED');
          setProgress(100);
          return;
        }

        const totalSteps =
          nodesWithPendingFiles.length +
          dirtyPanes.length +
          dirtyStoryFragments.length +
          1;

        addDebugMessage(
          `Save plan: ${nodesWithPendingFiles.length} files, ${dirtyPanes.length} panes, ${dirtyStoryFragments.length} story fragments, 1 styles = ${totalSteps} total steps`
        );

        let completedSteps = 1;

        if (nodesWithPendingFiles.length > 0) {
          setStage('SAVING_PENDING_FILES');
          setStageProgress({
            currentStep: 0,
            totalSteps: nodesWithPendingFiles.length,
          });
          for (let i = 0; i < nodesWithPendingFiles.length; i++) {
            const fileNode = nodesWithPendingFiles[i];
            addDebugMessage(
              `Processing file ${i + 1}/${nodesWithPendingFiles.length
              }: ${fileNode.id}`
            );
            console.log('[PAYLOAD] File create (NOT SENT):', fileNode);
            await new Promise((resolve) => setTimeout(resolve, 200));
            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        if (dirtyPanes.length > 0) {
          setStage('SAVING_PANES');
          setStageProgress({
            currentStep: 0,
            totalSteps: dirtyPanes.length,
          });
          for (let i = 0; i < dirtyPanes.length; i++) {
            const paneNode = dirtyPanes[i];
            addDebugMessage(
              `Processing pane ${i + 1}/${dirtyPanes.length}: ${paneNode.id}`
            );
            try {
              const payload = transformLivePaneForSave(ctx, paneNode.id);
              addDebugMessage(
                `[PAYLOAD] Would send to /api/v1/nodes/panes/${payload.id ? 'PUT' : 'POST'
                }:`
              );
              console.log('[PAYLOAD] Pane save (NOT SENT):', payload);
            } catch (etlError) {
              addDebugMessage(`ETL error for pane ${paneNode.id}: ${etlError}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        if (dirtyStoryFragments.length > 0) {
          setStage('SAVING_STORY_FRAGMENTS');
          setStageProgress({ currentStep: 0, totalSteps: dirtyStoryFragments.length });
          for (let i = 0; i < dirtyStoryFragments.length; i++) {
            const fragment = dirtyStoryFragments[i];
            addDebugMessage(`Processing story fragment ${i + 1}/${dirtyStoryFragments.length}: ${fragment.id}`);
            console.log('[PAYLOAD] StoryFragment save (NOT SENT):', fragment);
            await new Promise((resolve) => setTimeout(resolve, 200));
            setStageProgress((prev) => ({ ...prev, currentStep: i + 1 }));
            completedSteps++;
            setProgress((completedSteps / totalSteps) * 80);
          }
        }

        setStage('PROCESSING_STYLES');
        setStageProgress({ currentStep: 1, totalSteps: 1 });
        addDebugMessage('Starting V2 Tailwind pipeline...');
        const { dirtyPaneIds, classes: dirtyClasses } = ctx.getDirtyNodesClassData();
        try {
          addDebugMessage(`[PAYLOAD] Would send to /api/tailwind: ${dirtyClasses.length} classes for ${dirtyPaneIds.length} panes.`);
          await fetch('/api/tailwind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dirtyPaneIds, dirtyClasses }),
          });
        } catch (styleError) {
          addDebugMessage(`Style processing error: ${styleError}`);
        }

        addDebugMessage(`Cleaning ${allDirtyNodes.length} dirty nodes...`);
        // ctx.cleanDirtyNodes(allDirtyNodes);

        setProgress(100);
        setStage('COMPLETED');
        addDebugMessage('V2 save process completed successfully (simulation mode)');
      } catch (err) {
        setStage('ERROR');
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        addDebugMessage(`Save process failed: ${errorMessage}`);
      }
    };

    runSaveProcess();
  }, [show]);

  const getStageDescription = () => {
    const getProgressText = () =>
      stageProgress.totalSteps > 0
        ? ` (${stageProgress.currentStep}/${stageProgress.totalSteps})`
        : '';
    switch (stage) {
      case 'PREPARING': return 'Preparing changes...';
      case 'SAVING_PENDING_FILES': return `Saving pending files...${getProgressText()}`;
      case 'SAVING_PANES': return `Saving pane content...${getProgressText()}`;
      case 'SAVING_STORY_FRAGMENTS': return `Updating story fragments...${getProgressText()}`;
      case 'PROCESSING_STYLES': return 'Processing styles...';
      case 'COMPLETED': return 'Save completed successfully! (Simulation Mode)';
      case 'ERROR': return `Error: ${error}`;
      default: return '';
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
        <Dialog.Backdrop className="fixed inset-0 bg-black bg-opacity-75" style={{ zIndex: 9005 }} />
        <Dialog.Positioner className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9005 }}>
          <Dialog.Content
            className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl"
            style={{ maxHeight: '90vh' }}
          >
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  Saving Changes (V2 Pipeline)
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
                    className={`h-2 rounded-full transition-all duration-300 ${stage === 'COMPLETED'
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
                <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: '20rem' }}>
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
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${stage === 'COMPLETED'
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
