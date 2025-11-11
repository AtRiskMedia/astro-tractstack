import { memo, type ReactElement } from 'react';
import { getCtx, type NodesContext } from '@/stores/nodes';
import { getType } from '@/utils/compositor/typeGuards';
import type { BaseNode, FlatNode } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';
import ArrowDownTrayIcon from '@heroicons/react/24/outline/ArrowDownTrayIcon';

const getNodeTree = (nodeId: string, ctx: NodesContext): BaseNode | null => {
  const allNodesMap = ctx.allNodes.get();
  const node = allNodesMap.get(nodeId);

  if (!node) {
    return null;
  }

  // Use JSON stringify/parse to get a deep clone, breaking any proxies/reactivity
  const clonedNode = JSON.parse(JSON.stringify(node));

  const childIds = ctx.getChildNodeIDs(nodeId);

  if (childIds.length > 0) {
    clonedNode.children = childIds
      .map((childId) => getNodeTree(childId, ctx))
      .filter((child): child is BaseNode => child !== null);
  }

  return clonedNode;
};

export type RenderableNodes = NodeProps & { element: ReactElement };

export const NodeWithGuid = memo((props: RenderableNodes) => {
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(props.nodeId) as FlatNode;

  const handleDumpTree = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nodeTree = getNodeTree(props.nodeId, ctx);
    console.log(
      `%c--- Dumping Node Tree for ${getType(node)}: ${props.nodeId} ---`,
      'color: #0891b2; font-weight: bold;'
    );
    console.log(nodeTree);
  };

  return (
    <div className="relative">
      <div
        className="outline-dotted outline-2 outline-cyan-600"
        data-node-id={props.nodeId}
        data-node-type={getType(node)}
      >
        <div className="flex items-center justify-between border-b border-dotted border-cyan-600 p-1 font-mono text-xs text-cyan-600">
          <span className="truncate pr-2">
            {getType(node)}: {props.nodeId}
          </span>
          <button
            onClick={handleDumpTree}
            title={`Log tree for ${props.nodeId}`}
            className="flex-shrink-0 rounded p-0.5 hover:bg-cyan-100"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-cyan-700" />
          </button>
        </div>
        <div className="p-0.5">{props.element}</div>
      </div>
    </div>
  );
});
