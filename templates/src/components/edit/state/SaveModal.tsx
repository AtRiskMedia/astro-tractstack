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
  pendingHomePageSlugStore,
} from '@/stores/storykeep';
import { startLoadingAnimation } from '@/utils/helpers';
import type {
  FlatNode,
  BaseNode,
  PaneNode,
  StoryFragmentNode,
  MarkdownPaneFragmentNode,
} from '@/types/compositorTypes';

type SaveStage =
  | 'PREPARING'
  | 'SAVING_PENDING_FILES'
  | 'PROCESSING_OG_IMAGES'
  | 'SAVING_PANES'
  | 'SAVING_STORY_FRAGMENTS'
  | 'LINKING_FILES'
  | 'PROCESSING_STYLES'
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
}

const PROGRESS_PHASES = {
  PREPARATION: 5,
  UPLOADS: 60,
  PROCESSING: 25,
  FINALIZATION: 10,
};

const INDETERMINATE_STAGES: SaveStage[] = [
  'SAVING_PANES',
  'LINKING_FILES',
  'PROCESSING_STYLES',
  'UPDATING_HOME_PAGE',
];

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
  const [isNavigating, setIsNavigating] = useState(false);
  const [isIndeterminateStage, setIsIndeterminateStage] = useState(false);
  const [ellipsis, setEllipsis] = useState('...');
  const isCreateMode = slug === 'create';
  const pendingHomePageSlug = pendingHomePageSlugStore.get();
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
  const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

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
      const allDirtyNodes = ctx.getDirtyNodes();

      try {
        setStage('PREPARING');
        setProgress(PROGRESS_PHASES.PREPARATION);
        addDebugMessage(
          `Starting save process... (${isContext ? 'Context' : 'StoryFragment'
          } mode, ${isCreateMode ? 'CREATE' : 'UPDATE'})`
        );

        let dirtyPanes = allDirtyNodes.filter(
          (node) => node.nodeType === 'Pane'
        );
        let dirtyStoryFragments = allDirtyNodes.filter(
          (node) => node.nodeType === 'StoryFragment'
        );

        if (isContext) {
          dirtyStoryFragments = [];
          addDebugMessage('Context mode: Ignoring StoryFragment nodes');
        }

        const nodesWithPendingFiles = allDirtyNodes.filter(
          (node): node is BaseNode & { base64Data?: string } =>
            'base64Data' in node && !!node.base64Data
        );
        const storyFragmentsWithPendingImages = dirtyStoryFragments.filter(
          (fragment) => {
            const pendingOp = getPendingImageOperation(fragment.id);
            return pendingOp && pendingOp.type === 'upload';
          }
        );

        const totalFileBytes = nodesWithPendingFiles.reduce(
          (sum, node) => sum + (node.base64Data?.length || 0),
          0
        );
        const totalOgBytes = storyFragmentsWithPendingImages.reduce(
          (sum, fragment) => {
            const pendingOp = getPendingImageOperation(fragment.id);
            return sum + (pendingOp?.data?.length || 0);
          },
          0
        );
        const totalUploadBytes = totalFileBytes + totalOgBytes;
        let completedUploadBytes = 0;

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
          storyFragmentsWithPendingImages.length === 0 &&
          !pendingHomePageSlug
        ) {
          addDebugMessage('No changes to save');
          setStage('COMPLETED');
          setProgress(100);
          return;
        }

        const uploadedOGPaths: Record<string, string> = {};

        if (nodesWithPendingFiles.length > 0) {
          setStage('SAVING_PENDING_FILES');
          for (let i = 0; i < nodesWithPendingFiles.length; i++) {
            const fileNode = nodesWithPendingFiles[i];
            const fileBytes = fileNode.base64Data?.length || 0;
            const endpoint = `${goBackend}/api/v1/nodes/files/create`;

            setStageProgress({
              currentStep: i + 1,
              totalSteps: nodesWithPendingFiles.length,
              currentFileName: `${fileNode.id}.jpg`,
              isUploading: true,
            });
            addDebugMessage(
              `Processing file ${i + 1}/${nodesWithPendingFiles.length}: ${fileNode.id
              } -> POST ${endpoint}`
            );

            try {
              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Tenant-ID': tenantId,
                },
                credentials: 'include',
                body: JSON.stringify({ base64Data: fileNode.base64Data }),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const result = await response.json();
              const updatedNode = { ...fileNode, isChanged: true };

              if ('base64Data' in updatedNode) {
                delete updatedNode.base64Data;
              }

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

            completedUploadBytes += fileBytes;
            const uploadProgress =
              totalUploadBytes > 0
                ? (completedUploadBytes / totalUploadBytes) *
                PROGRESS_PHASES.UPLOADS
                : 0;
            setProgress(PROGRESS_PHASES.PREPARATION + uploadProgress);
            setStageProgress((prev) => ({ ...prev, isUploading: false }));
          }
        }

        if (storyFragmentsWithPendingImages.length > 0) {
          setStage('PROCESSING_OG_IMAGES');
          for (let i = 0; i < storyFragmentsWithPendingImages.length; i++) {
            const fragment = storyFragmentsWithPendingImages[i];
            const pendingOp = getPendingImageOperation(fragment.id);
            const imageBytes = pendingOp?.data?.length || 0;

            if (pendingOp && pendingOp.type === 'upload' && pendingOp.data) {
              const ogUploadEndpoint = `${goBackend}/api/v1/nodes/images/og`;
              addDebugMessage(
                `Processing OG image ${i + 1}/${storyFragmentsWithPendingImages.length
                }: ${fragment.id} -> POST ${ogUploadEndpoint}`
              );

              setStageProgress({
                currentStep: i + 1,
                totalSteps: storyFragmentsWithPendingImages.length,
                currentFileName: pendingOp?.filename || `${fragment.id}-og.png`,
                isUploading: true,
              });

              const uploadPayload = {
                data: pendingOp.data,
                filename:
                  pendingOp.filename || `${fragment.id}-${Date.now()}.png`,
              };

              try {
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
              completedUploadBytes += imageBytes;
              const uploadProgress =
                totalUploadBytes > 0
                  ? (completedUploadBytes / totalUploadBytes) *
                  PROGRESS_PHASES.UPLOADS
                  : 0;
              setProgress(PROGRESS_PHASES.PREPARATION + uploadProgress);
              setStageProgress((prev) => ({ ...prev, isUploading: false }));
            }
          }
        }

        if (totalUploadBytes > 0) {
          setProgress(PROGRESS_PHASES.PREPARATION + PROGRESS_PHASES.UPLOADS);
        }

        const totalProcessingSteps =
          dirtyPanes.length + dirtyStoryFragments.length;
        let completedProcessingSteps = 0;

        if (dirtyPanes.length > 0) {
          setStage('SAVING_PANES');
          setIsIndeterminateStage(true);
          setStageProgress({
            currentStep: 0,
            totalSteps: dirtyPanes.length,
          });

          const bulkPayload = dirtyPanes.map((paneNode) =>
            transformLivePaneForSave(ctx, paneNode.id, isContext)
          );

          bulkPayload.forEach((payload) => {
            payload.optionsPayload.nodes.forEach((transformedNode) => {
              const liveNode = ctx.allNodes.get().get(transformedNode.id);
              if (!liveNode) return;

              let needsUpdate = false;
              let updatedNode: BaseNode = { ...liveNode };

              if (
                transformedNode.nodeType === 'TagElement' &&
                transformedNode.elementCss
              ) {
                const flatNode = liveNode as FlatNode;
                if (flatNode.elementCss !== transformedNode.elementCss) {
                  (updatedNode as FlatNode).elementCss =
                    transformedNode.elementCss;
                  needsUpdate = true;
                }
              }

              if (
                transformedNode.nodeType === 'Markdown' &&
                transformedNode.parentCss
              ) {
                const markdownNode = liveNode as MarkdownPaneFragmentNode;
                const currentParentCss = markdownNode.parentCss;
                const newParentCss = transformedNode.parentCss as string[];

                const isDifferent =
                  !currentParentCss ||
                  currentParentCss.length !== newParentCss.length ||
                  currentParentCss.some(
                    (css, index) => css !== newParentCss[index]
                  );

                if (isDifferent) {
                  (updatedNode as MarkdownPaneFragmentNode).parentCss =
                    newParentCss;
                  needsUpdate = true;
                }
              }

              if (needsUpdate) {
                ctx.allNodes.get().set(transformedNode.id, updatedNode);
              }
            });
          });

          const endpoint = `${goBackend}/api/v1/nodes/panes/bulk`;
          addDebugMessage(
            `Processing ${dirtyPanes.length} panes via -> POST ${endpoint}`
          );

          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId,
              },
              credentials: 'include',
              body: JSON.stringify({ panes: bulkPayload }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(
                `HTTP error! status: ${response.status} - ${errorText}`
              );
            }

            await response.json();
            addDebugMessage(
              `${dirtyPanes.length} panes saved successfully via bulk endpoint.`
            );
          } catch (bulkError) {
            const errorMsg =
              bulkError instanceof Error
                ? bulkError.message
                : 'Unknown bulk save error';
            addDebugMessage(`Bulk pane save failed: ${errorMsg}`);
            throw new Error(`Failed to save panes in bulk: ${errorMsg}`);
          } finally {
            setIsIndeterminateStage(false);
          }

          setStageProgress({
            currentStep: dirtyPanes.length,
            totalSteps: dirtyPanes.length,
          });
          completedProcessingSteps += dirtyPanes.length;
          const processingProgress =
            (completedProcessingSteps / totalProcessingSteps) *
            PROGRESS_PHASES.PROCESSING;
          setProgress(
            PROGRESS_PHASES.PREPARATION +
            PROGRESS_PHASES.UPLOADS +
            processingProgress
          );
        }

        if (!isContext && dirtyStoryFragments.length > 0) {
          setStage('SAVING_STORY_FRAGMENTS');
          setStageProgress({
            currentStep: 0,
            totalSteps: dirtyStoryFragments.length,
          });
          for (let i = 0; i < dirtyStoryFragments.length; i++) {
            const fragment = dirtyStoryFragments[i];

            try {
              const payload = await transformStoryFragmentForSave(
                ctx,
                fragment.id,
                window.TRACTSTACK_CONFIG?.tenantId || 'default'
              );

              if (uploadedOGPaths[fragment.id]) {
                payload.socialImagePath = uploadedOGPaths[fragment.id];
              }

              const endpoint = isCreateMode
                ? `${goBackend}/api/v1/nodes/storyfragments/create`
                : `${goBackend}/api/v1/nodes/storyfragments/${payload.id}/complete`;
              const method = isCreateMode ? 'POST' : 'PUT';

              addDebugMessage(
                `Processing story fragment ${i + 1}/${dirtyStoryFragments.length
                }: ${fragment.id} -> ${method} ${endpoint}`
              );

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

              await response.json();
              addDebugMessage(
                `StoryFragment ${fragment.id} saved successfully`
              );

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
            completedProcessingSteps++;
            const processingProgress =
              (completedProcessingSteps / totalProcessingSteps) *
              PROGRESS_PHASES.PROCESSING;
            setProgress(
              PROGRESS_PHASES.PREPARATION +
              PROGRESS_PHASES.UPLOADS +
              processingProgress
            );
          }
        }

        const baseFinalizationProgress =
          PROGRESS_PHASES.PREPARATION +
          PROGRESS_PHASES.UPLOADS +
          PROGRESS_PHASES.PROCESSING;

        if (dirtyPanes.length > 0) {
          setStage('LINKING_FILES');
          setIsIndeterminateStage(true);
          setProgress(baseFinalizationProgress);
          addDebugMessage('Starting file-pane relationship linking...');

          const relationships = [];
          for (const paneNode of dirtyPanes) {
            const fileIds = ctx.getPaneImageFileIds(paneNode.id);
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
          setIsIndeterminateStage(false);
        }

        setStage('PROCESSING_STYLES');
        setIsIndeterminateStage(true);
        setProgress(
          baseFinalizationProgress + PROGRESS_PHASES.FINALIZATION / 2
        );
        addDebugMessage(`Processing styles...`);

        try {
          const { dirtyPaneIds, classes: dirtyClasses } =
            ctx.getDirtyNodesClassData();

          const astroEndpoint = `/api/tailwind`;
          const astroPayload = { dirtyPaneIds, dirtyClasses };
          const astroResponse = await fetch(astroEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': tenantId,
            },
            credentials: 'include',
            body: JSON.stringify(astroPayload),
          });

          if (!astroResponse.ok) {
            throw new Error(
              `CSS generation failed! status: ${astroResponse.status}`
            );
          }

          const astroResult = await astroResponse.json();

          if (!astroResult.success || !astroResult.generatedCss) {
            throw new Error('CSS generation failed: no CSS returned');
          }

          addDebugMessage(
            `CSS generated: ${astroResult.generatedCss.length} bytes for ${dirtyClasses.length} classes`
          );

          const goEndpoint = `${goBackend}/api/v1/tailwind/update`;
          const goPayload = { frontendCss: astroResult.generatedCss };
          const goResponse = await fetch(goEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': tenantId,
            },
            credentials: 'include',
            body: JSON.stringify(goPayload),
          });

          if (!goResponse.ok) {
            throw new Error(`CSS save failed! status: ${goResponse.status}`);
          }

          const goResult = await goResponse.json();
          addDebugMessage(
            `CSS saved successfully: stylesVer ${goResult.stylesVer}`
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          addDebugMessage(`Styles processing failed: ${errorMsg}`);
          throw new Error(`Failed to process styles: ${errorMsg}`);
        } finally {
          setIsIndeterminateStage(false);
        }

        if (pendingHomePageSlug) {
          setStage('UPDATING_HOME_PAGE');
          setIsIndeterminateStage(true);
          setProgress(
            baseFinalizationProgress + (PROGRESS_PHASES.FINALIZATION - 2)
          );
          addDebugMessage(`Updating home page to: ${pendingHomePageSlug}`);

          try {
            const response = await fetch(`${goBackend}/api/v1/config/brand`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId,
              },
              credentials: 'include',
            });

            if (!response.ok) {
              throw new Error(
                `Failed to get current brand config: ${response.status}`
              );
            }

            const currentBrandConfig = await response.json();

            const updatedBrandConfig = {
              ...currentBrandConfig,
              HOME_SLUG: pendingHomePageSlug,
            };

            const updateResponse = await fetch(
              `${goBackend}/api/v1/config/brand`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Tenant-ID': tenantId,
                },
                credentials: 'include',
                body: JSON.stringify(updatedBrandConfig),
              }
            );

            if (!updateResponse.ok) {
              throw new Error(
                `Failed to update home page: ${updateResponse.status}`
              );
            }

            pendingHomePageSlugStore.set(null);
            addDebugMessage('Home page updated successfully');
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : 'Unknown error';
            addDebugMessage(`Home page update failed: ${errorMsg}`);
            throw new Error(`Failed to update home page: ${errorMsg}`);
          } finally {
            setIsIndeterminateStage(false);
          }
        }

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

    // MODIFIED: Append animated ellipsis for indeterminate stages
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
                    className={`text-sm text-gray-700 ${stageProgress.isUploading ? 'animate-pulse' : ''
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
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200"> {/* MODIFIED: Added overflow-hidden */}
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${ // MODIFIED: Added conditional class
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
                  {stage === 'COMPLETED' && (
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
                        className={`rounded px-4 py-2 text-white transition-colors ${isNavigating
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
