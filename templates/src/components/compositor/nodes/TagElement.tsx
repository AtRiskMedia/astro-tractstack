import { getCtx } from '@/stores/nodes';
import { RenderChildren } from './RenderChildren';
import type { NodeProps } from '@/types/nodeProps';

export const TagElement = (props: NodeProps) => {
  return (
    <>
      <RenderChildren
        children={getCtx(props).getChildNodeIDs(props.nodeId)}
        nodeProps={props}
      />
    </>
  );
};
