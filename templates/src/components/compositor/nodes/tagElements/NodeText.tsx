import { getCtx } from '@/stores/nodes';
import type { FlatNode } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';
import { useStore } from '@nanostores/react';
import { selectionStore } from '@/stores/selection';

export const NodeText = (props: NodeProps) => {
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(props.nodeId) as FlatNode;
  const parentNode = node.parentId
    ? (ctx.allNodes.get().get(node.parentId) as FlatNode)
    : null;
  const isLink = parentNode && [`a`, `button`].includes(parentNode.tagName);

  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const selection = useStore(selectionStore);

  if (!node) return <>ERROR MISSING NODE</>;

  const text = node.copy || '';

  if (toolModeVal === 'styles') {
    const parentChildren =
      selection.isDragging && selection.lcaNodeId
        ? ctx.parentNodes.get().get(selection.lcaNodeId)
        : null;
    let selectionRange = null;

    if (
      parentChildren &&
      selection.startNodeId &&
      selection.endNodeId
    ) {
      const idx1 = parentChildren.indexOf(selection.startNodeId);
      const idx2 = parentChildren.indexOf(selection.endNodeId);

      if (idx1 !== -1 && idx2 !== -1) {
        if (
          idx1 < idx2 ||
          (idx1 === idx2 && selection.startCharOffset <= selection.endCharOffset)
        ) {
          selectionRange = {
            startNodeIndex: idx1,
            startChar: selection.startCharOffset,
            endNodeIndex: idx2,
            endChar: selection.endCharOffset,
          };
        } else {
          selectionRange = {
            startNodeIndex: idx2,
            startChar: selection.endCharOffset,
            endNodeIndex: idx1,
            endChar: selection.startCharOffset,
          };
        }
      }
    }

    let charOffset = 0;
    const wordSpans = text.split(/(\s+)/).map((segment, index) => {
      const startOffset = charOffset;
      const endOffset = charOffset + segment.length;
      charOffset = endOffset;

      if (segment.trim() === '') {
        return (
          <span
            key={index}
            data-parent-text-node-id={props.nodeId}
            data-start-char-offset={startOffset}
            data-end-char-offset={endOffset}
          >
            {segment}
          </span>
        );
      }

      let isInSelection = false;
      const currentNodeIndex = parentChildren
        ? parentChildren.indexOf(props.nodeId)
        : -1;

      if (
        selection.isDragging &&
        selectionRange &&
        currentNodeIndex !== -1
      ) {
        const { startNodeIndex, startChar, endNodeIndex, endChar } =
          selectionRange;

        if (
          startNodeIndex === endNodeIndex &&
          currentNodeIndex === startNodeIndex
        ) {
          if (endOffset > startChar && startOffset < endChar) {
            isInSelection = true;
          }
        } else if (currentNodeIndex === startNodeIndex) {
          if (endOffset > startChar) {
            isInSelection = true;
          }
        } else if (currentNodeIndex === endNodeIndex) {
          if (startOffset < endChar) {
            isInSelection = true;
          }
        } else if (
          currentNodeIndex > startNodeIndex &&
          currentNodeIndex < endNodeIndex
        ) {
          isInSelection = true;
        }
      }

      return (
        <span
          key={index}
          className={
            isInSelection ? 'outline-dotted outline-2 outline-blue-600' : ''
          }
          data-parent-text-node-id={props.nodeId}
          data-start-char-offset={startOffset}
          data-end-char-offset={endOffset}
          style={{ userSelect: 'none' }}
        >
          {segment}
        </span>
      );
    });

    return <>{wordSpans}</>;
  }

  return <>{text === '' ? '\u00A0' : text}</>;
};
