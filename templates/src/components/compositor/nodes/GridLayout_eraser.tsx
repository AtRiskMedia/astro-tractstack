import { getCtx } from '@/stores/nodes';
import type { NodeProps } from '@/types/nodeProps';
import { GridLayout } from './GridLayout';
import type { MouseEvent } from 'react';

export function GridLayoutEraser(props: NodeProps) {
  const ctx = getCtx(props);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const node = ctx.allNodes.get().get(props.nodeId);
    if (!node) return;

    if (
      window.confirm(
        'Are you sure you want to delete this grid layout and all its columns?'
      )
    ) {
      ctx.deleteNode(props.nodeId);
    }
  };

  return (
    <div
      className="outline-dashed outline-2 outline-red-500 hover:bg-red-500/10"
      onClick={handleClick}
    >
      <GridLayout {...props} />
    </div>
  );
}
