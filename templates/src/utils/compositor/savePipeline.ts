import {
  getPendingImageOperation,
  clearPendingImageOperation,
  pendingHomePageSlugStore,
} from '@/stores/storykeep';
import { cloneDeep } from '@/utils/helpers';
import {
  transformLivePaneForSave,
  transformStoryFragmentForSave,
} from '@/utils/etl/index';
import { processClassesForViewports } from '@/utils/compositor/reduceNodesClassNames';
import { scanAndReplaceBase64 } from '@/utils/compositor/htmlAst';
import type { NodesContext } from '@/stores/nodes';
import type {
  BaseNode,
  PaneNode,
  StoryFragmentNode,
  FlatNode,
  MarkdownPaneFragmentNode,
  GridLayoutNode,
} from '@/types/compositorTypes';

type PendingFileNode = BaseNode & {
  base64Data?: string;
  fileId?: string;
  src?: string;
  srcSet?: string;
};

export type SaveStage =
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

export interface SaveStageProgress {
  currentStep: number;
  totalSteps: number;
  currentFileName?: string;
  isUploading?: boolean;
}

export interface SavePipelineConfig {
  slug: string;
  isContext: boolean;
  isCreateMode: boolean;
  hydrate: boolean;
  tenantId: string;
  backendUrl: string;
  pendingHomePageSlug: string | null;
}

export interface SavePipelineCallbacks {
  setStage: (stage: SaveStage) => void;
  setProgress: (percentage: number) => void;
  setStageProgress: (
    update: SaveStageProgress | ((prev: SaveStageProgress) => SaveStageProgress)
  ) => void;
  logDebug: (message: string) => void;
  setIsIndeterminateStage: (isIndeterminate: boolean) => void;
}

const PROGRESS_PHASES = {
  PREPARATION: 5,
  UPLOADS: 60,
  PROCESSING: 25,
  FINALIZATION: 10,
};

export async function executeSavePipeline(
  ctx: NodesContext,
  config: SavePipelineConfig,
  callbacks: SavePipelineCallbacks
): Promise<void> {
  const {
    slug,
    isContext,
    isCreateMode,
    hydrate,
    tenantId,
    backendUrl,
    pendingHomePageSlug,
  } = config;
  const {
    setStage,
    setProgress,
    setStageProgress,
    logDebug,
    setIsIndeterminateStage,
  } = callbacks;

  const allDirtyNodes = ctx.getDirtyNodes();

  setStage('PREPARING');
  setProgress(PROGRESS_PHASES.PREPARATION);
  logDebug(
    `Starting save process... (${isContext ? 'Context' : 'StoryFragment'} mode, ${isCreateMode ? 'CREATE' : 'UPDATE'})`
  );
  logDebug(
    `Config: slug=${slug}, tenantId=${tenantId}, backendUrl=${backendUrl}`
  );

  let dirtyPanes = allDirtyNodes.filter(
    (node) => node.nodeType === 'Pane'
  ) as PaneNode[];
  let dirtyStoryFragments = allDirtyNodes.filter(
    (node) => node.nodeType === 'StoryFragment'
  ) as StoryFragmentNode[];

  if (isContext) {
    dirtyStoryFragments = [];
    logDebug('Context mode: Ignoring StoryFragment nodes');
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

  const relevantNodeCount = dirtyPanes.length + dirtyStoryFragments.length;
  logDebug(
    `Found ${relevantNodeCount} relevant dirty nodes to save (${dirtyPanes.length} Panes, ${dirtyStoryFragments.length} StoryFragments)`
  );
  logDebug(
    `Pending uploads: ${nodesWithPendingFiles.length} standard files, ${storyFragmentsWithPendingImages.length} OG images`
  );

  if (
    relevantNodeCount === 0 &&
    nodesWithPendingFiles.length === 0 &&
    storyFragmentsWithPendingImages.length === 0 &&
    !pendingHomePageSlug
  ) {
    logDebug('No changes to save');
    setStage('COMPLETED');
    setProgress(100);
    return;
  }

  const uploadedOGPaths: Record<string, string> = {};

  if (nodesWithPendingFiles.length > 0) {
    setStage('SAVING_PENDING_FILES');
    logDebug(
      `Starting processing of ${nodesWithPendingFiles.length} pending files...`
    );

    for (let i = 0; i < nodesWithPendingFiles.length; i++) {
      const fileNode = nodesWithPendingFiles[i];
      const fileBytes = fileNode.base64Data?.length || 0;
      const endpoint = `${backendUrl}/api/v1/nodes/files/create`;

      setStageProgress({
        currentStep: i + 1,
        totalSteps: nodesWithPendingFiles.length,
        currentFileName: `${fileNode.id}.jpg`,
        isUploading: true,
      });
      logDebug(
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
          body: JSON.stringify({ base64Data: fileNode.base64Data }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        const updatedNode = cloneDeep(fileNode) as PendingFileNode;
        delete updatedNode.base64Data;

        updatedNode.fileId = result.fileId;
        updatedNode.src = result.src;
        if (result.srcSet) updatedNode.srcSet = result.srcSet;
        updatedNode.isChanged = true;
        ctx.modifyNodes([updatedNode]);

        const localRef = fileNode as PendingFileNode;
        delete localRef.base64Data;
        localRef.fileId = result.fileId;
        localRef.src = result.src;
        if (result.srcSet) localRef.srcSet = result.srcSet;
        logDebug(
          `File ${fileNode.id} uploaded successfully - got fileId: ${result.fileId}`
        );
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        logDebug(`File ${fileNode.id} upload failed: ${errorMsg}`);
        throw new Error(`Failed to upload file ${fileNode.id}: ${errorMsg}`);
      }

      completedUploadBytes += fileBytes;
      const uploadProgress =
        totalUploadBytes > 0
          ? (completedUploadBytes / totalUploadBytes) * PROGRESS_PHASES.UPLOADS
          : 0;
      setProgress(PROGRESS_PHASES.PREPARATION + uploadProgress);
      setStageProgress((prev: SaveStageProgress) => ({
        ...prev,
        isUploading: false,
      }));
    }
  }

  const creativePanes = dirtyPanes.filter(
    (p) => p.htmlAst && p.htmlAst.editableElements
  );
  if (creativePanes.length > 0) {
    logDebug(
      `Scanning ${creativePanes.length} Creative Panes for embedded uploads...`
    );
    setIsIndeterminateStage(true);

    for (const pane of creativePanes) {
      if (!pane.htmlAst) continue;

      try {
        logDebug(`Scanning pane ${pane.id} for base64 assets...`);
        const cleanAst = await scanAndReplaceBase64(
          pane.htmlAst,
          async (base64Data) => {
            logDebug(
              `Uploading embedded asset for pane ${pane.id} (${base64Data.length} bytes)...`
            );
            const endpoint = `${backendUrl}/api/v1/nodes/files/create`;

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId,
              },
              credentials: 'include',
              body: JSON.stringify({ base64Data }),
            });

            if (!response.ok) {
              const txt = await response.text();
              throw new Error(
                `Creative upload failed: ${response.status} - ${txt}`
              );
            }
            const res = await response.json();
            logDebug(`Asset uploaded. New fileId: ${res.fileId}`);
            return res;
          }
        );

        ctx.modifyNodes([
          { ...pane, htmlAst: cleanAst, isChanged: true } as PaneNode,
        ]);
        logDebug(`Creative Pane ${pane.id} assets processed and node updated.`);
      } catch (err) {
        console.error('Creative Pane Asset Upload Error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        logDebug(
          `Failed to process assets for Creative Pane ${pane.id}: ${errMsg}`
        );
      }
    }
    setIsIndeterminateStage(false);
  }

  if (storyFragmentsWithPendingImages.length > 0) {
    setStage('PROCESSING_OG_IMAGES');
    logDebug(
      `Processing ${storyFragmentsWithPendingImages.length} OG images...`
    );

    for (let i = 0; i < storyFragmentsWithPendingImages.length; i++) {
      const fragment = storyFragmentsWithPendingImages[i];
      const pendingOp = getPendingImageOperation(fragment.id);
      const imageBytes = pendingOp?.data?.length || 0;

      if (pendingOp && pendingOp.type === 'upload' && pendingOp.data) {
        const ogUploadEndpoint = `${backendUrl}/api/v1/nodes/images/og`;
        logDebug(
          `Processing OG image ${i + 1}/${storyFragmentsWithPendingImages.length}: ${fragment.id} -> POST ${ogUploadEndpoint}`
        );

        setStageProgress({
          currentStep: i + 1,
          totalSteps: storyFragmentsWithPendingImages.length,
          currentFileName: pendingOp?.filename || `${fragment.id}-og.png`,
          isUploading: true,
        });

        const uploadPayload = {
          data: pendingOp.data,
          filename: pendingOp.filename || `${fragment.id}-${Date.now()}.png`,
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
          logDebug(`OG image uploaded successfully: ${result.path}`);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          logDebug(`OG image upload failed for ${fragment.id}: ${errorMsg}`);
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
        setStageProgress((prev: SaveStageProgress) => ({
          ...prev,
          isUploading: false,
        }));
      }
    }
  }

  if (totalUploadBytes > 0) {
    setProgress(PROGRESS_PHASES.PREPARATION + PROGRESS_PHASES.UPLOADS);
  }

  const totalProcessingSteps = dirtyPanes.length + dirtyStoryFragments.length;
  let completedProcessingSteps = 0;

  if (allDirtyNodes.length > 0) {
    setStage('COOKING_NODES');
    setIsIndeterminateStage(true);
    logDebug(
      `Cooking ${allDirtyNodes.length} nodes for whitelist extraction...`
    );

    const cookingUpdates: BaseNode[] = [];

    allDirtyNodes.forEach((liveNode) => {
      try {
        let updatedNode: BaseNode | null = null;

        if (liveNode.nodeType === 'TagElement') {
          const flatNode = liveNode as FlatNode;
          const computedCSS = ctx.getNodeClasses(flatNode.id, 'auto', 0);
          if (flatNode.elementCss !== computedCSS) {
            updatedNode = {
              ...liveNode,
              elementCss: computedCSS,
            } as FlatNode;
          }
        } else if (liveNode.nodeType === 'Markdown') {
          const markdownNode = liveNode as MarkdownPaneFragmentNode;
          let needsUpdate = false;
          const nextNode = { ...markdownNode };

          if (markdownNode.parentClasses) {
            const computedParentCss = markdownNode.parentClasses.map(
              (_: any, index: number) =>
                ctx.getNodeClasses(liveNode.id, 'auto', index)
            );
            if (
              JSON.stringify(markdownNode.parentCss) !==
              JSON.stringify(computedParentCss)
            ) {
              nextNode.parentCss = computedParentCss;
              needsUpdate = true;
            }
          }

          if (markdownNode.gridClasses) {
            const [allClasses] = processClassesForViewports(
              markdownNode.gridClasses,
              {},
              1
            );
            if (allClasses && allClasses.length > 0) {
              const computedGridCss = allClasses[0];
              if (markdownNode.gridCss !== computedGridCss) {
                nextNode.gridCss = computedGridCss;
                needsUpdate = true;
              }
            }
          }

          if (needsUpdate) updatedNode = nextNode;
        } else if (liveNode.nodeType === 'GridLayoutNode') {
          const gridNode = liveNode as GridLayoutNode;
          let needsUpdate = false;
          const nextNode = { ...gridNode };

          if (gridNode.parentClasses) {
            const computedParentCss = gridNode.parentClasses.map(
              (_: any, index: number) =>
                ctx.getNodeClasses(liveNode.id, 'auto', index)
            );
            if (
              JSON.stringify(gridNode.parentCss) !==
              JSON.stringify(computedParentCss)
            ) {
              nextNode.parentCss = computedParentCss.join(` `);
              needsUpdate = true;
            }
          }

          if (gridNode.gridColumns) {
            const { mobile, tablet, desktop } = gridNode.gridColumns;
            let computedGridCss = `grid grid-cols-${mobile}`;
            if (tablet !== mobile) computedGridCss += ` md:grid-cols-${tablet}`;
            if (desktop !== tablet)
              computedGridCss += ` xl:grid-cols-${desktop}`;

            if (gridNode.gridCss !== computedGridCss) {
              nextNode.gridCss = computedGridCss;
              needsUpdate = true;
            }
          }

          if (needsUpdate) updatedNode = nextNode;
        }

        if (updatedNode) {
          cookingUpdates.push(updatedNode);
        }
      } catch (e) {
        console.warn(`Failed to cook node ${liveNode.id}`, e);
        logDebug(`Failed to cook node ${liveNode.id}: ${e}`);
      }
    });

    if (cookingUpdates.length > 0) {
      ctx.modifyNodes(cookingUpdates, {
        notify: false,
        recordHistory: false,
      });
      logDebug(`Cooked ${cookingUpdates.length} nodes successfully.`);
    } else {
      logDebug('No nodes needed cooking.');
    }
    setIsIndeterminateStage(false);
  }

  setStage('PROCESSING_STYLES');
  setIsIndeterminateStage(true);
  const baseFinalizationProgress =
    PROGRESS_PHASES.PREPARATION +
    PROGRESS_PHASES.UPLOADS +
    PROGRESS_PHASES.PROCESSING;
  setProgress(baseFinalizationProgress + PROGRESS_PHASES.FINALIZATION / 2);
  logDebug(`Processing styles... gathering dirty classes.`);

  try {
    const { dirtyPaneIds, classes: dirtyClasses } =
      ctx.getDirtyNodesClassData();
    logDebug(
      `Found ${dirtyClasses.length} distinct classes across ${dirtyPaneIds.length} panes.`
    );

    const astroEndpoint = `/api/tailwind`;
    const astroPayload = { dirtyPaneIds, dirtyClasses };
    logDebug(
      `POST ${astroEndpoint} - payload size: ${JSON.stringify(astroPayload).length}`
    );

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
      throw new Error(`CSS generation failed! status: ${astroResponse.status}`);
    }

    const astroResult = await astroResponse.json();

    if (!astroResult.success || !astroResult.generatedCss) {
      throw new Error('CSS generation failed: no CSS returned');
    }

    logDebug(`CSS generated: ${astroResult.generatedCss.length} bytes.`);

    const goEndpoint = `${backendUrl}/api/v1/tailwind/update`;
    const goPayload = { frontendCss: astroResult.generatedCss };
    logDebug(`POST ${goEndpoint} - saving frontend CSS`);

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
    logDebug(`CSS saved successfully: stylesVer ${goResult.stylesVer}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logDebug(`Styles processing failed: ${errorMsg}`);
    throw new Error(`Failed to process styles: ${errorMsg}`);
  } finally {
    setIsIndeterminateStage(false);
  }

  if (dirtyPanes.length > 0) {
    setStage('SAVING_PANES');
    setIsIndeterminateStage(true);
    setStageProgress({
      currentStep: 0,
      totalSteps: dirtyPanes.length,
    });
    logDebug(`Preparing to save ${dirtyPanes.length} panes...`);

    const bulkPayload = dirtyPanes.map((paneNode) =>
      transformLivePaneForSave(ctx, paneNode.id, isContext)
    );
    logDebug(`Bulk payload constructed. Count: ${bulkPayload.length}`);

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
            (updatedNode as FlatNode).elementCss = transformedNode.elementCss;
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
            currentParentCss.some((css, index) => css !== newParentCss[index]);

          if (isDifferent) {
            (updatedNode as MarkdownPaneFragmentNode).parentCss = newParentCss;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          ctx.allNodes.get().set(transformedNode.id, updatedNode);
        }
      });
    });

    const endpoint = `${backendUrl}/api/v1/nodes/panes/bulk`;
    logDebug(`Processing ${dirtyPanes.length} panes via -> POST ${endpoint}`);

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
      logDebug(
        `${dirtyPanes.length} panes saved successfully via bulk endpoint.`
      );
    } catch (bulkError) {
      const errorMsg =
        bulkError instanceof Error
          ? bulkError.message
          : 'Unknown bulk save error';
      logDebug(`Bulk pane save failed: ${errorMsg}`);
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
      PROGRESS_PHASES.PREPARATION + PROGRESS_PHASES.UPLOADS + processingProgress
    );
  }

  if (!isContext && dirtyStoryFragments.length > 0) {
    setStage('SAVING_STORY_FRAGMENTS');
    setStageProgress({
      currentStep: 0,
      totalSteps: dirtyStoryFragments.length,
    });
    logDebug(`Saving ${dirtyStoryFragments.length} story fragments...`);

    for (let i = 0; i < dirtyStoryFragments.length; i++) {
      const fragment = dirtyStoryFragments[i];

      try {
        const payload = await transformStoryFragmentForSave(
          ctx,
          fragment.id,
          tenantId
        );

        if (uploadedOGPaths[fragment.id]) {
          payload.socialImagePath = uploadedOGPaths[fragment.id];
        }

        const endpoint = isCreateMode
          ? `${backendUrl}/api/v1/nodes/storyfragments/create`
          : `${backendUrl}/api/v1/nodes/storyfragments/${payload.id}/complete`;
        const method = isCreateMode ? 'POST' : 'PUT';

        logDebug(
          `Processing story fragment ${i + 1}/${dirtyStoryFragments.length}: ${fragment.id} -> ${method} ${endpoint}`
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
        logDebug(`StoryFragment ${fragment.id} saved successfully`);

        if (uploadedOGPaths[fragment.id]) {
          clearPendingImageOperation(fragment.id);
          logDebug(`Cleared pending image operation for ${fragment.id}`);
        }
      } catch (etlError) {
        const errorMsg =
          etlError instanceof Error ? etlError.message : 'Unknown error';
        logDebug(`StoryFragment ${fragment.id} ETL failed: ${errorMsg}`);
        throw new Error(
          `Failed to save story fragment ${fragment.id}: ${errorMsg}`
        );
      }

      setStageProgress((prev: SaveStageProgress) => ({
        ...prev,
        currentStep: i + 1,
      }));
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

  if (dirtyPanes.length > 0) {
    setStage('LINKING_FILES');
    setIsIndeterminateStage(true);
    setProgress(baseFinalizationProgress);
    logDebug('Starting file-pane relationship linking...');

    const relationships = [];
    for (const paneNode of dirtyPanes) {
      const fileIds = ctx.getPaneImageFileIds(paneNode.id);
      if (fileIds.length > 0) {
        logDebug(`Pane ${paneNode.id} has files: ${fileIds.join(', ')}`);
      }
      relationships.push({
        paneId: paneNode.id,
        fileIds: fileIds,
      });
    }

    if (relationships.some((rel) => rel.fileIds.length > 0)) {
      try {
        const bulkEndpoint = `${backendUrl}/api/v1/nodes/panes/files/bulk`;
        const activeRels = relationships.filter((r) => r.fileIds.length > 0);
        logDebug(`Linking relationships: ${JSON.stringify(activeRels)}`);

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
          const txt = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${txt}`);
        }

        const result = await response.json();
        logDebug(
          `File-pane relationships linked successfully: ${result.message}`
        );
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        logDebug(`Failed to link file-pane relationships: ${errorMsg}`);
        throw new Error(`Failed to link file-pane relationships: ${errorMsg}`);
      }
    } else {
      logDebug('No file relationships to link');
    }
    setIsIndeterminateStage(false);
  }

  if (pendingHomePageSlug) {
    setStage('UPDATING_HOME_PAGE');
    setIsIndeterminateStage(true);
    setProgress(baseFinalizationProgress + (PROGRESS_PHASES.FINALIZATION - 2));
    logDebug(`Updating home page to: ${pendingHomePageSlug}`);

    try {
      const response = await fetch(`${backendUrl}/api/v1/config/brand`, {
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

      const updateResponse = await fetch(`${backendUrl}/api/v1/config/brand`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        credentials: 'include',
        body: JSON.stringify(updatedBrandConfig),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update home page: ${updateResponse.status}`);
      }

      pendingHomePageSlugStore.set(null);
      logDebug('Home page updated successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logDebug(`Home page update failed: ${errorMsg}`);
      throw new Error(`Failed to update home page: ${errorMsg}`);
    } finally {
      setIsIndeterminateStage(false);
    }
  }

  if (hydrate) {
    logDebug('Finalizing setup (Kill Switch)...');
    try {
      const response = await fetch(`${backendUrl}/api/v1/setup/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Kill Switch failed: ${response.status}`);
      }
      logDebug('Hydration token cleared.');
    } catch (e) {
      console.error('Kill switch error:', e);
      logDebug('Warning: Failed to clear hydration token.');
    }
  }

  setStage('COMPLETED');
  setProgress(100);
  logDebug('Save process completed successfully!');
}
