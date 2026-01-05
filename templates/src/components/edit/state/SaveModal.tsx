import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { navigate } from 'astro:transitions/client';
import { getCtx } from '@/stores/nodes';
import { pendingHomePageSlugStore } from '@/stores/storykeep';
import { startLoadingAnimation } from '@/utils/helpers';
import { executeSavePipeline } from '@/utils/compositor/savePipeline';
import type { PaneNode, StoryFragmentNode } from '@/types/compositorTypes';

type SaveStage =
  | 'PREPARING'
  | 'SAVING_PENDING_FILES'
  | 'PROCESSING_OG_IMAGES'
  | 'COOKING_NODES'
  | 'PROCESSING_STYLES'
  | 'SAVING_PANES'
  | 'SAVING_STORY_FRAGMENTS'
  | 'LINKING_FILES'
  | 'UPDATING_HOME_PAGE'
  | 'COMPLETED'
  | 'ERROR';

interface SaveStageProgress {
  currentStep: number;
  totalSteps: number;
  currentFileName?: string;
  isUploading?: boolean;
}

interface SaveModalProps {
  show: boolean;
  slug: string;
  isContext: boolean;
  onClose: () => void;
  isSandboxMode?: boolean;
  hydrate?: boolean;
}

const INDETERMINATE_STAGES: SaveStage[] = [
  'COOKING_NODES',
  'SAVING_PANES',
  'LINKING_FILES',
  'PROCESSING_STYLES',
  'UPDATING_HOME_PAGE',
];

const SandboxUpgradeNotice = ({ onClose }: { onClose: () => void }) => (
  <Dialog.Root open={true} onOpenChange={() => onClose()} modal={true}>
    <Portal>
      <Dialog.Backdrop
        className="fixed inset-0 bg-black bg-opacity-75"
        style={{ zIndex: 9005 }}
      />
      <Dialog.Positioner
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 9005 }}
      >
        <Dialog.Content className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
          <div className="p-6 text-center">
            <Dialog.Title className="text-xl font-bold text-gray-900">
              Save Your Work
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-gray-600">
              To save your changes and get a shareable link, please sign up for
              a full account.
            </Dialog.Description>
            <div className="mt-6 flex justify-center gap-3">
              <a
                href="/sandbox/register"
                className="rounded-md bg-myblue px-4 py-2 font-bold text-white hover:bg-myorange"
              >
                Sign Up Now
              </a>
              <button
                onClick={onClose}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
);

export default function SaveModal({
  show,
  slug,
  isContext,
  onClose,
  isSandboxMode = false,
  hydrate = false,
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [isIndeterminateStage, setIsIndeterminateStage] = useState(false);
  const [ellipsis, setEllipsis] = useState('...');
  const isCreateMode = slug === 'create';
  const pendingHomePageSlug = pendingHomePageSlugStore.get();
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const tenantId =
    window.TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugMessages((prev) => [...prev, `${timestamp}: ${message}`]);
  };

  useEffect(() => {
    if (isIndeterminateStage) {
      const interval = setInterval(() => {
        setEllipsis((prev) => (prev.length < 3 ? prev + '.' : '.'));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isIndeterminateStage]);

  useEffect(() => {
    if (!show) {
      setStage('PREPARING');
      setProgress(0);
      setDebugMessages([]);
      setShowDebug(false);
      isSaving.current = false;
      setIsIndeterminateStage(false);
      return;
    }

    if (isSaving.current) return;

    const runSaveProcess = async () => {
      isSaving.current = true;
      const ctx = getCtx();

      try {
        await executeSavePipeline(
          ctx,
          {
            slug,
            isContext,
            isCreateMode,
            hydrate,
            tenantId,
            backendUrl: goBackend,
            pendingHomePageSlug,
          },
          {
            setStage,
            setProgress,
            setStageProgress,
            logDebug: addDebugMessage,
            setIsIndeterminateStage,
          }
        );
      } catch (err) {
        setStage('ERROR');
        const errorMessage =
          err instanceof Error && err.message
            ? err.message
            : 'Unknown error occurred';
        setError(errorMessage);
        addDebugMessage(`Save process failed: ${errorMessage}`);
        setIsIndeterminateStage(false);
      } finally {
        isSaving.current = false;
      }
    };

    runSaveProcess();
  }, [show, slug, isContext, isCreateMode, goBackend, tenantId]);

  const getStageDescription = () => {
    const { currentStep, totalSteps, currentFileName, isUploading } =
      stageProgress;

    const getProgressText = () => {
      if (currentFileName && isUploading) {
        return ` - Uploading ${currentFileName}...`;
      }
      if (currentFileName && !isUploading) {
        return ` - Completed ${currentFileName}`;
      }
      return totalSteps > 0 ? ` (${currentStep}/${totalSteps})` : '';
    };

    const modeText = isContext ? 'Context Pane' : 'Story Fragment';
    const actionText = isCreateMode ? 'Creating' : 'Updating';

    let description = '';
    switch (stage) {
      case 'PREPARING':
        description = `Preparing ${actionText.toLowerCase()} ${modeText.toLowerCase()}...`;
        break;
      case 'SAVING_PENDING_FILES':
        description = `Uploading files${getProgressText()}`;
        break;
      case 'PROCESSING_OG_IMAGES':
        description = `Processing social images${getProgressText()}`;
        break;
      case 'COOKING_NODES':
        description = 'Preparing content styles...';
        break;
      case 'SAVING_PANES':
        description = `${actionText} pane content...`;
        break;
      case 'SAVING_STORY_FRAGMENTS':
        description = `${actionText} story fragments...${getProgressText()}`;
        break;
      case 'LINKING_FILES':
        description = 'Linking file relationships...';
        break;
      case 'PROCESSING_STYLES':
        description = 'Processing styles...';
        break;
      case 'UPDATING_HOME_PAGE':
        description = 'Updating home page...';
        break;
      case 'COMPLETED':
        description = `${actionText} ${modeText.toLowerCase()} completed successfully!`;
        break;
      case 'ERROR':
        description = `Error: ${error}`;
        break;
      default:
        description = '';
    }

    if (isIndeterminateStage && INDETERMINATE_STAGES.includes(stage)) {
      return description.replace(/\.\.\.$/, '') + ellipsis;
    }

    return description;
  };

  const handleOpenChange = (details: { open: boolean }) => {
    if (!details.open && (stage === 'COMPLETED' || stage === 'ERROR')) {
      onClose();
    }
  };

  const handleSuccessClose = async () => {
    if (stage === 'COMPLETED') {
      startLoadingAnimation();
      setIsNavigating(true);

      if (isCreateMode) {
        let actualSlug: string;
        const ctx = getCtx();
        const allDirtyNodes = ctx.getDirtyNodes();

        if (isContext) {
          const dirtyPanes = allDirtyNodes.filter(
            (node): node is PaneNode => node.nodeType === 'Pane'
          );
          actualSlug = dirtyPanes[0].slug;
        } else {
          const dirtyStoryFragments = allDirtyNodes.filter(
            (node): node is StoryFragmentNode =>
              node.nodeType === 'StoryFragment'
          );
          actualSlug = dirtyStoryFragments[0].slug;
        }

        const editUrl = isContext
          ? `/context/${actualSlug}/edit`
          : `/${actualSlug}/edit`;
        await navigate(editUrl);
      } else {
        const currentUrl = isContext
          ? `/context/${slug}/edit`
          : `/${slug}/edit`;
        await navigate(currentUrl);
      }
    }
  };

  const visitPageUrl = (() => {
    startLoadingAnimation();
    const ctx = getCtx();
    const allDirtyNodes = ctx.getDirtyNodes();

    if (isContext) {
      const dirtyPanes = allDirtyNodes.filter(
        (node): node is PaneNode => node.nodeType === 'Pane'
      );
      const currentSlug = dirtyPanes[0]?.slug || slug;
      return `/context/${currentSlug}`;
    } else {
      const dirtyStoryFragments = allDirtyNodes.filter(
        (node): node is StoryFragmentNode => node.nodeType === 'StoryFragment'
      );
      const currentSlug = dirtyStoryFragments[0]?.slug || slug;
      return `/${currentSlug}`;
    }
  })();

  if (isSandboxMode) {
    return show ? <SandboxUpgradeNotice onClose={onClose} /> : null;
  }

  return (
    <Dialog.Root
      open={show}
      onOpenChange={handleOpenChange}
      modal={true}
      preventScroll={true}
    >
      <Portal>
        <style>
          {`
            @keyframes stripes-move {
              from { background-position: 40px 0; }
              to { background-position: 0 0; }
            }
            .animate-stripes {
              background-image: linear-gradient(
                45deg,
                rgba(255, 255, 255, 0.15) 25%,
                transparent 25%,
                transparent 50%,
                rgba(255, 255, 255, 0.15) 50%,
                rgba(255, 255, 255, 0.15) 75%,
                transparent 75%,
                transparent
              );
              background-size: 40px 40px;
              animation: stripes-move 2s linear infinite;
            }
          `}
        </style>
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
                  <span
                    className={`text-sm text-gray-700 ${
                      stageProgress.isUploading ? 'animate-pulse' : ''
                    }`}
                  >
                    {getStageDescription()}
                  </span>
                  {stage !== 'ERROR' && (
                    <span className="text-sm text-gray-500">
                      {Math.round(progress)}%
                    </span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  {' '}
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stage === 'ERROR' ? 'bg-red-500' : 'bg-green-500'
                    } ${isIndeterminateStage ? 'animate-stripes' : ''}`}
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
                </div>
              )}

              {stage === 'ERROR' && (
                <div className="mb-4 rounded bg-red-50 p-3 text-red-800">
                  <div className="font-bold">Save failed</div>
                  <div className="mt-1 text-sm">{error}</div>
                </div>
              )}

              {(stage === 'COMPLETED' || stage === 'ERROR') && (
                <div className="flex justify-end gap-2">
                  {hydrate && stage === 'COMPLETED' && (
                    <button
                      onClick={() =>
                        (window.location.href = '/storykeep/branding')
                      }
                      className={`rounded bg-cyan-600 px-4 py-2 text-white transition-colors hover:bg-cyan-700`}
                    >
                      Continue
                    </button>
                  )}
                  {!hydrate && stage === 'COMPLETED' && (
                    <>
                      <a
                        href={visitPageUrl}
                        className={`rounded bg-cyan-600 px-4 py-2 text-white transition-colors hover:bg-cyan-700`}
                      >
                        Visit Page
                      </a>
                      <button
                        onClick={handleSuccessClose}
                        disabled={isNavigating}
                        className={`rounded px-4 py-2 text-white transition-colors ${
                          isNavigating
                            ? 'cursor-not-allowed bg-gray-400'
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        Keep Editing
                      </button>
                      <a
                        href="/storykeep/content"
                        className={`rounded bg-black px-4 py-2 text-white transition-colors hover:bg-white hover:text-black`}
                      >
                        Dashboard
                      </a>
                    </>
                  )}
                  {stage === 'ERROR' && (
                    <button
                      onClick={onClose}
                      className="rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                    >
                      Close
                    </button>
                  )}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
