import { memo, type ReactElement } from 'react';
import { getCtx } from '@/stores/nodes';
import { getType } from '@/utils/compositor/typeGuards';
import type { FlatNode } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';

export type RenderableNodes = NodeProps & { element: ReactElement };

export const NodeWithGuid = memo((props: RenderableNodes) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  return (
    <div className="relative">
      <div
        className="outline-dotted outline-2 outline-cyan-600"
        data-node-id={props.nodeId}
        data-node-type={getType(node)}
      >
        <div className="border-b border-dotted border-cyan-600 p-1 font-mono text-xs text-cyan-600">
          {getType(node)}: {props.nodeId}
        </div>
        <div className="p-0.5">{props.element}</div>
      </div>
    </div>
  );
});
