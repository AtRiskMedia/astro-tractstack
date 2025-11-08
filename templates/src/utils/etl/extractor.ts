import type { NodesContext } from '@/stores/nodes';
import type { PaneNode, BaseNode } from '@/types/compositorTypes';

const VERBOSE = false;

export interface PaneSubtree {
  paneNode: PaneNode;
  allChildNodes: BaseNode[];
  relationships: Map<string, string[]>;
}

export function extractPaneSubtree(
  ctx: NodesContext,
  paneId: string
): PaneSubtree {
  if (VERBOSE) console.log('🔍 EXTRACTOR START - paneId:', paneId);

  let actualPaneId = paneId;
  const startNode = ctx.allNodes.get().get(paneId);

  // If we got a StoryFragment, find the first child Pane
  if (startNode?.nodeType === 'StoryFragment') {
    const allNodes = Array.from(ctx.allNodes.get().values());
    const childPanes = allNodes.filter(
      (node) => node.nodeType === 'Pane' && node.parentId === paneId
    );

    if (childPanes.length > 0) {
      actualPaneId = childPanes[0].id;
      if (VERBOSE)
        console.log(
          '📌 EXTRACTOR - Converting StoryFragment to actual pane:',
          actualPaneId
        );
    } else {
      throw new Error(`No Pane found under StoryFragment ${paneId}`);
    }
  }

  const paneNode = ctx.allNodes.get().get(actualPaneId) as PaneNode;
  if (!paneNode || paneNode.nodeType !== 'Pane') {
    console.error('❌ EXTRACTOR ERROR - Pane node not found:', actualPaneId);
    throw new Error(`Pane node not found: ${actualPaneId}`);
  }

  if (VERBOSE)
    console.log('✅ EXTRACTOR - Found pane node:', {
      id: paneNode.id,
      nodeType: paneNode.nodeType,
      title: paneNode.title,
      isDecorative: paneNode.isDecorative,
      bgColour: paneNode.bgColour,
    });

  const allDescendantNodes: BaseNode[] = [];
  const queue: string[] = [...ctx.getChildNodeIDs(paneNode.id)];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;

    const currentNode = ctx.allNodes.get().get(currentId);
    if (currentNode) {
      allDescendantNodes.push(currentNode);
      // Add this node's children to the end of the queue to continue the traversal
      const childrenIds = ctx.getChildNodeIDs(currentId);
      queue.push(...childrenIds);
    }
  }

  if (VERBOSE)
    console.log(
      '📋 EXTRACTOR - All nodes from new traversal:',
      allDescendantNodes.map((n) => ({ id: n.id, nodeType: n.nodeType }))
    );

  // Filter out Pane and StoryFragment nodes - only include actual content nodes
  const allChildNodes = allDescendantNodes.filter(
    (node) => node.nodeType !== 'Pane' && node.nodeType !== 'StoryFragment'
  );

  if (VERBOSE)
    console.log(
      '🎯 EXTRACTOR - Filtered child nodes (NO Pane/StoryFragment):',
      allChildNodes.map((n) => ({
        id: n.id,
        nodeType: n.nodeType,
        tagName: (n as any).tagName,
        copy: (n as any).copy,
      }))
    );

  // Extract relationships using existing parentNodes structure
  const relationships = new Map<string, string[]>();
  const parentNodes = ctx.parentNodes.get();
  parentNodes.forEach((children, parentId) => {
    relationships.set(parentId, [...children]);
  });

  if (VERBOSE)
    console.log(
      '🔗 EXTRACTOR - Relationships:',
      Object.fromEntries(relationships)
    );

  const result = { paneNode, allChildNodes, relationships };
  if (VERBOSE)
    console.log('✅ EXTRACTOR COMPLETE - Result:', {
      paneNodeId: result.paneNode.id,
      childNodeCount: result.allChildNodes.length,
      relationshipCount: result.relationships.size,
    });

  return result;
}
