import { useEffect, useRef, type RefObject, type MouseEvent } from 'react';
import { useStore } from '@nanostores/react';
import { getCtx } from '@/stores/nodes';
import { viewportKeyStore, settingsPanelStore } from '@/stores/storykeep';
import { RenderChildren } from '../RenderChildren';
import type { FlatNode } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';

export const NodeAnchorComponent = (props: NodeProps, tagName: string) => {
  const nodeId = props.nodeId;
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(nodeId) as FlatNode;
  const childNodeIDs = ctx.getChildNodeIDs(node?.parentId ?? '');
  const linkRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);

  // Reactivity for outlines
  const settingsPanel = useStore(settingsPanelStore);
  const toolMode = useStore(ctx.toolModeValStore).value;

  // Get current position and next sibling for spacing logic
  const currentIndex = childNodeIDs.indexOf(nodeId);

  // Determine if a leading zero-width space is needed when this is the first child.
  const needsLeadingSpace = currentIndex === 0;

  const nextNode =
    currentIndex < childNodeIDs.length - 1
      ? (ctx.allNodes.get().get(childNodeIDs[currentIndex + 1]) as FlatNode)
      : null;

  // Add space after links/buttons unless followed by punctuation
  const needsTrailingSpace =
    nextNode &&
    nextNode.tagName === 'text' &&
    !(
      nextNode.copy?.startsWith('.') ||
      nextNode.copy?.startsWith(',') ||
      nextNode.copy?.startsWith(';') ||
      nextNode.copy?.startsWith(':')
    );

  useEffect(() => {
    // Only apply in editable mode
    if (
      !linkRef.current ||
      !['text'].includes(ctx.toolModeValStore.get().value)
    ) {
      return;
    }

    const el = linkRef.current;

    // Add zero-width spaces to beginning and end of text nodes to assist with cursor positioning
    const processTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        // Only add if not already present
        if (!node.textContent.startsWith('\u200B')) {
          node.textContent = '\u200B' + node.textContent;
        }
        if (!node.textContent.endsWith('\u200B')) {
          node.textContent = node.textContent + '\u200B';
        }
      } else if (node.childNodes && node.childNodes.length > 0) {
        Array.from(node.childNodes).forEach(processTextNodes);
      }
    };

    // Process all text nodes in the link/button when entering edit mode
    processTextNodes(el);

    // Fix arrow key navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys and specific conditions
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const isCollapsed = range.collapsed;
      if (!isCollapsed) return; // Don't interfere with text selection

      // Check if selection is at edge of the link
      if (e.key === 'ArrowLeft') {
        // Get the first text node in the link
        let firstTextNode: Node | null = null;
        const findFirstTextNode = (node: Node): Node | null => {
          if (node.nodeType === Node.TEXT_NODE) return node;
          if (!node.firstChild) return null;

          let result: Node | null = null;
          let child = node.firstChild;
          while (child && !result) {
            result = findFirstTextNode(child);
            child = child.nextSibling as ChildNode;
          }
          return result;
        };

        firstTextNode = findFirstTextNode(el);
        if (!firstTextNode) return;

        // Check if cursor is at start of first text node (after zero-width space)
        if (range.startContainer === firstTextNode && range.startOffset <= 1) {
          // Cursor at beginning of link - place outside before link
          e.preventDefault();
          const newRange = document.createRange();
          newRange.setStartBefore(el);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else if (e.key === 'ArrowRight') {
        // Get the last text node in the link
        let lastTextNode: Node | null = null;
        const findLastTextNode = (node: Node): Node | null => {
          if (node.nodeType === Node.TEXT_NODE) return node;
          if (!node.lastChild) return null;

          let result: Node | null = null;
          let child = node.lastChild;
          while (child && !result) {
            result = findLastTextNode(child);
            child = child.previousSibling as ChildNode;
          }
          return result;
        };

        lastTextNode = findLastTextNode(el);
        if (!lastTextNode) return;

        // Check if cursor is at end of last text node (before zero-width space)
        const contentLength = lastTextNode.textContent?.length || 0;
        if (
          range.startContainer === lastTextNode &&
          range.startOffset >= contentLength - 1
        ) {
          // Cursor at end of link - place outside after link
          e.preventDefault();
          const newRange = document.createRange();
          newRange.setStartAfter(el);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    };

    // Get parent contentEditable element
    let parent = el.parentElement;
    while (parent && !parent.hasAttribute('contenteditable')) {
      parent = parent.parentElement;
    }

    if (parent) {
      parent.addEventListener('keydown', handleKeyDown);

      return () => {
        parent.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [ctx.toolModeValStore.get().value]);

  const handleClick = (e: MouseEvent) => {
    // Check if in edit mode
    const isEditMode = [`text`].includes(ctx.toolModeValStore.get().value);

    if (isEditMode) {
      // Allow normal cursor positioning in edit mode
    } else {
      // In non-edit mode, prevent navigation until we handle the click
      e.preventDefault();
    }

    e.stopPropagation();

    // Set clicked node with slight delay to avoid race conditions
    setTimeout(() => {
      ctx.setClickedNodeId(nodeId);
    }, 10);
  };

  const handleDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Handle double click with slight delay
    setTimeout(() => {
      ctx.setClickedNodeId(nodeId, true);
    }, 10);
  };

  const isEditMode = [`text`].includes(ctx.toolModeValStore.get().value);

  // Create appropriate element based on tagName
  let baseClasses = ctx.getNodeClasses(nodeId, viewportKeyStore.get().value);

  if (toolMode === 'styles' && settingsPanel?.nodeId != nodeId) {
    baseClasses += ' outline outline-1 outline-dotted outline-black';
  } else if (settingsPanel?.nodeId === nodeId) {
    baseClasses +=
      ' outline-4 outline-dotted outline-orange-400 outline-offset-2';
  }

  if (tagName === 'a') {
    return (
      <>
        {needsLeadingSpace && '\u200B'}
        <a
          ref={linkRef as RefObject<HTMLAnchorElement>}
          className={baseClasses}
          href={node.href}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          data-editable-link="true"
          // Preserve display mode
          style={{
            display: 'inline',
            cursor: isEditMode ? 'text' : 'pointer',
          }}
        >
          <RenderChildren
            children={ctx.getChildNodeIDs(nodeId)}
            nodeProps={props}
          />
        </a>
        {needsTrailingSpace && ' '}
      </>
    );
  } else {
    return (
      <>
        {needsLeadingSpace && '\u200B'}
        <button
          ref={linkRef as RefObject<HTMLButtonElement>}
          className={baseClasses}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          data-editable-button="true"
          // Preserve display mode
          style={{
            display: 'inline',
            cursor: isEditMode ? 'text' : 'crosshair',
          }}
        >
          <RenderChildren
            children={ctx.getChildNodeIDs(nodeId)}
            nodeProps={props}
          />
        </button>
        {needsTrailingSpace && ' '}
      </>
    );
  }
};
