import { getCtx } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import type { FlatNode } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';

export const NodeImg = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;

  return (
    <img
      src={node.base64Data || node.src}
      {...(node.srcSet ? { srcSet: node.srcSet } : {})}
      className={getCtx(props).getNodeClasses(
        props.nodeId,
        viewportKeyStore.get().value
      )}
      alt={node.alt}
      data-node-id={props.nodeId}
      data-tag="img"
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId, true);
        e.stopPropagation();
      }}
    />
  );
};
