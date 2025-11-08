import { getCtx } from '@/stores/nodes';
import { Markdown } from './Markdown';
import { isGridLayoutNode } from '@/utils/compositor/typeGuards';
import { revertFromGrid } from '@/utils/compositor/nodesHelper';
import type { NodeProps } from '@/types/nodeProps';
import type { MouseEvent } from 'react';

export function MarkdownEraser(props: NodeProps) {
  const ctx = getCtx(props);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const node = ctx.allNodes.get().get(props.nodeId);
    if (!node || !node.parentId) return;

    const parentNode = ctx.allNodes.get().get(node.parentId);
    if (!parentNode || !isGridLayoutNode(parentNode)) {
      ctx.deleteNode(props.nodeId);
      return;
    }

    const children = ctx.getChildNodeIDs(parentNode.id);
    const columnCount = children.length;

    if (columnCount === 1) {
      if (
        window.confirm(
          'This is the last column. Do you want to delete it and revert to a standard pane layout?'
        )
      ) {
        revertFromGrid(parentNode.id);
      }
    } else {
      if (
        window.confirm(
          `Are you sure you want to delete this column? ${
            columnCount - 1
          } columns will remain.`
        )
      ) {
        ctx.deleteNode(props.nodeId);
      }
    }
  };

  return (
    <div
      className="outline-dashed outline-2 outline-red-500 hover:bg-red-500/10"
      onClick={handleClick}
    >
      <Markdown {...props} />
    </div>
  );
}
