import { useEffect, useState } from 'react';
import { transformLivePaneForPreview } from '@/utils/etl';
import type { NodesContext } from '@/stores/nodes';
import { TractStackAPI } from '@/utils/api';

export interface PanePreviewRequest {
  id: string;
  ctx: NodesContext;
}

export interface PaneFragmentResult {
  id: string;
  htmlString: string;
  error?: string;
}

export interface PanesPreviewGeneratorProps {
  requests: PanePreviewRequest[];
  onComplete: (results: PaneFragmentResult[]) => void;
  onError?: (error: string) => void;
}

export const PanesPreviewGenerator = ({
  requests,
  onComplete,
  onError,
}: PanesPreviewGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (requests.length === 0) return;
    if (isGenerating) return;

    const generateFragments = async () => {
      setIsGenerating(true);

      try {
        const previewPayloads = [];
        const requestMap = new Map<string, string>();

        for (const request of requests) {
          const rootNodeId = request.ctx.rootNodeId.get();

          let actualPaneId = rootNodeId;
          const rootNode = request.ctx.allNodes.get().get(rootNodeId);

          if (rootNode?.nodeType === 'StoryFragment') {
            const allNodes = Array.from(request.ctx.allNodes.get().values());
            const childPanes = allNodes.filter(
              (node) => node.nodeType === 'Pane' && node.parentId === rootNodeId
            );

            if (childPanes.length > 0) {
              actualPaneId = childPanes[0].id;
            } else {
              throw new Error(
                `No Pane found under StoryFragment ${rootNodeId}`
              );
            }
          }

          const previewPayload = transformLivePaneForPreview(
            request.ctx,
            actualPaneId
          );

          previewPayloads.push(previewPayload);
          requestMap.set(previewPayload.id, request.id);
        }

        const api = new TractStackAPI();
        const response = await api.post('/api/v1/fragments/preview', {
          panes: previewPayloads,
        });

        if (!response.success) {
          throw new Error(response.error || `Preview API failed`);
        }

        // TractStackAPI unwraps the response.data for us
        const { fragments, errors } = response.data;

        const results: PaneFragmentResult[] = [];

        for (const [paneId, requestId] of requestMap.entries()) {
          if (fragments && fragments[paneId]) {
            results.push({
              id: requestId,
              htmlString: fragments[paneId],
            });
          } else if (errors && errors[paneId]) {
            results.push({
              id: requestId,
              htmlString: '',
              error: errors[paneId],
            });
          } else {
            results.push({
              id: requestId,
              htmlString: '',
              error: 'No fragment returned',
            });
          }
        }

        onComplete(results);
      } catch (error) {
        console.error('Batch fragment generation failed:', error);
        onError?.(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsGenerating(false);
      }
    };

    generateFragments();
  }, [requests, isGenerating, onComplete, onError]);

  return null;
};
