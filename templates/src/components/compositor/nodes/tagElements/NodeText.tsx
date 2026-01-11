import { getCtx } from '@/stores/nodes';
import type { FlatNode } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';
import { useStore } from '@nanostores/react';
import { selectionStore } from '@/stores/selection';
import type { MouseEvent } from 'react';

export const NodeText = (props: NodeProps) => {
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(props.nodeId) as FlatNode;
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const toolAddMode = useStore(ctx.toolAddModeStore).value;
  const selection = useStore(selectionStore);

  if (!node) return <>ERROR MISSING NODE</>;

  const text = node.copy || '';

  if (
    toolModeVal === 'insert' &&
    toolAddMode === `span` &&
    props.isSelectableText
  ) {
    let charOffset = 0;
    const wordSpans = text.split(/(\s+)/).map((segment, index) => {
      const startOffset = charOffset;
      const endOffset = charOffset + segment.length;
      charOffset = endOffset;

      const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (props.onDragStart) {
          props.onDragStart(
            {
              blockNodeId: node.parentId!,
              lcaNodeId: node.parentId!,
              startNodeId: props.nodeId,
              startCharOffset: startOffset,
              endNodeId: props.nodeId,
              endCharOffset: startOffset,
            },
            e
          );
        }
      };

      if (segment.trim() === '') {
        return (
          <span
            key={index}
            onMouseDown={handleMouseDown}
            data-parent-text-node-id={props.nodeId}
            data-start-char-offset={startOffset}
            data-end-char-offset={endOffset}
          >
            {segment}
          </span>
        );
      }

      let isInSelection = false;
      const currentNodeId = props.nodeId;

      // Show outline if EITHER dragging OR selection is finalized and active
      // AND the selection is within this current text node.
      if (
        (selection.isDragging || selection.isActive) &&
        selection.startNodeId &&
        selection.endNodeId &&
        selection.startNodeId === currentNodeId && // Selection must start in this node
        selection.endNodeId === currentNodeId // Selection must end in this node
      ) {
        const { startCharOffset, endCharOffset } = selection;

        let selStartChar = startCharOffset;
        let selEndChar = endCharOffset;

        // Handle backward selection within this single node
        if (startCharOffset > endCharOffset) {
          selStartChar = endCharOffset;
          selEndChar = startCharOffset;
        }

        // Check if current span falls within the character range
        if (endOffset > selStartChar && startOffset < selEndChar) {
          isInSelection = true;
        }
      }

      return (
        <span
          key={index}
          className={
            isInSelection ? 'outline-dotted outline-2 outline-blue-600' : ''
          }
          onMouseDown={handleMouseDown} // <--- ADDED THIS
          data-parent-text-node-id={props.nodeId}
          data-start-char-offset={startOffset}
          data-end-char-offset={endOffset}
        >
          {segment}
        </span>
      );
    });

    return <>{wordSpans}</>;
  }

  if (text.trim() === '') {
    return <>{'\u00A0'}</>;
  }
  return <>{text}</>;
};
