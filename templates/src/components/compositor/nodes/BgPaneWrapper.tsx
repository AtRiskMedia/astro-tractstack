import { getCtx } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import {
  isBgImageNode,
  isArtpackImageNode,
} from '@/utils/compositor/typeGuards';
import BgVisualBreak from '@/components/compositor/elements/BgVisualBreak';
import BgImage from '@/components/compositor/elements/BgImage';
import type { NodeProps } from '@/types/nodeProps';
import type { BgImageNode, VisualBreakNode } from '@/types/compositorTypes';

export const BgPaneWrapper = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId);
  if (!node) return null;

  const viewport = viewportKeyStore.get().value;

  const handleClick = (e: React.MouseEvent) => {
    getCtx(props).setClickedNodeId(props.nodeId, true);
    e.stopPropagation();
  };

  if (isBgImageNode(node) || isArtpackImageNode(node)) {
    return <BgImage payload={node as BgImageNode} viewportKey={viewport} />;
  } else {
    return (
      <div onClick={handleClick}>
        <BgVisualBreak
          payload={node as VisualBreakNode}
          viewportKey={viewport}
        />
      </div>
    );
  }
};
