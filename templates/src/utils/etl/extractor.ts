import type { NodesContext } from '@/stores/nodes';
import type { PaneNode, BaseNode } from '@/types/compositorTypes';

export interface PaneSubtree {
  paneNode: PaneNode;
  allChildNodes: BaseNode[];
  relationships: Map<string, string[]>;
}

export function extractPaneSubtree(
  ctx: NodesContext,
  paneId: string
): PaneSubtree {
  const paneNode = ctx.allNodes.get().get(paneId) as PaneNode;
  if (!paneNode) {
    throw new Error(`Pane node not found: ${paneId}`);
  }

  // Use existing NodesContext method to get all child nodes
  const allNodes = ctx.getNodesRecursively(paneNode);
  const allChildNodes = allNodes.slice(1); // Exclude pane itself

  // Extract relationships using existing parentNodes structure
  const relationships = new Map<string, string[]>();
  const parentNodes = ctx.parentNodes.get();
  parentNodes.forEach((children, parentId) => {
    relationships.set(parentId, [...children]);
  });

  return { paneNode, allChildNodes, relationships };
}
