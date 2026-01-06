import {
  type JSX,
  type FocusEvent,
  type MouseEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  useEffect,
  useRef,
  useState,
  createElement,
} from 'react';
import { useStore } from '@nanostores/react';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import PaintBrushIcon from '@heroicons/react/24/outline/PaintBrushIcon';
import ChatBubbleBottomCenterTextIcon from '@heroicons/react/24/outline/ChatBubbleBottomCenterTextIcon';
import { getCtx } from '@/stores/nodes';
import {
  viewportKeyStore,
  isEditingStore,
  settingsPanelStore,
} from '@/stores/storykeep';
import TabIndicator from './TabIndicator';
import { RenderChildren } from '../RenderChildren';
import {
  processRichTextToNodes,
  getTemplateNode,
  isAddressableNode,
  canEditText,
  getNodeDisplayMode,
} from '@/utils/compositor/nodesHelper';
import { cloneDeep, classNames } from '@/utils/helpers';
import { PatchOp } from '@/stores/nodesHistory';
import type { FlatNode, PaneNode } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';

export type NodeTagProps = NodeProps & {
  tagName: keyof JSX.IntrinsicElements;
  style?: any;
};

type EditState = 'viewing' | 'editing';
const VERBOSE = false;

export const NodeBasicTag = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const ctx = getCtx(props);
  const settingsPanel = useStore(settingsPanelStore);
  const Tag = ['em', 'strong', 'a', 'button', 'img'].includes(props.tagName)
    ? props.tagName
    : 'div';

  if (props.tagName === 'span') {
    const node = ctx.allNodes.get().get(props.nodeId);
    const children = ctx.parentNodes.get().get(props.nodeId);

    if (VERBOSE)
      console.log(
        '%c[NodeBasicTag] RENDERING SPAN',
        'color: purple; font-weight: bold;',
        {
          nodeId: props.nodeId,
          node: node ? cloneDeep(node) : 'NODE NOT FOUND',
          childrenIds: children ? cloneDeep(children) : 'CHILDREN NOT FOUND',
        }
      );
  }

  const [editState, setEditState] = useState<EditState>('viewing');
  const [showTabIndicator, setShowTabIndicator] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const originalContentRef = useRef<string>('');
  const cursorPositionRef = useRef<{ node: Node; offset: number } | null>(null);

  const { value: toolModeVal } = useStore(ctx.toolModeValStore);

  // Get node data
  const node = ctx.allNodes.get().get(nodeId) as FlatNode;
  const children = ctx.getChildNodeIDs(nodeId);
  const isEditableMode = ctx.toolModeValStore.get().value === 'text';
  const supportsEditing = canEditText(node, ctx);
  const isPlaceholder = node?.isPlaceholder === true;
  const isEmpty = elementRef.current?.textContent?.trim() === '';
  const displayMode = getNodeDisplayMode(
    node,
    viewportKeyStore.get().value,
    ctx
  );

  // Auto-enter edit mode for new placeholder nodes
  useEffect(() => {
    if (
      isPlaceholder &&
      isEditableMode &&
      supportsEditing &&
      editState === 'viewing'
    ) {
      if (VERBOSE)
        console.log(
          `[NodeBasicTag] Auto-entering edit mode for placeholder nodeId: ${nodeId}`
        );
      setEditState('editing');
      if (elementRef.current) {
        elementRef.current.focus();
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          const textNode =
            findFirstTextNode(elementRef.current) || elementRef.current;
          range.setStart(textNode, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          if (VERBOSE)
            console.log(
              `[NodeBasicTag] Set cursor for nodeId: ${nodeId}, contentEditable: ${elementRef.current.contentEditable}, activeElement: ${document.activeElement === elementRef.current}`
            );
        } else {
          console.warn(
            `[NodeBasicTag] No selection available for nodeId: ${nodeId}`
          );
        }
      } else {
        console.warn(
          `[NodeBasicTag] elementRef not ready for nodeId: ${nodeId}`
        );
      }
    }
  }, [isPlaceholder, isEditableMode, supportsEditing, nodeId]);

  // Sync edit state with global store
  useEffect(() => {
    isEditingStore.set(editState === 'editing');
    return () => {
      if (editState === 'editing') {
        isEditingStore.set(false);
      }
    };
  }, [editState]);

  // Set edit lock when editing
  useEffect(() => {
    if (editState === 'editing') {
      ctx.setEditLock(nodeId);
      setShowTabIndicator(true);
    } else {
      if (ctx.isEditLocked(nodeId)) {
        ctx.clearEditLock();
      }
      setShowTabIndicator(false);
    }
  }, [editState, nodeId]);

  // Auto-delete empty placeholder on blur
  useEffect(() => {
    if (
      editState === 'viewing' &&
      isPlaceholder &&
      isEmpty &&
      !ctx.isEditLocked(nodeId)
    ) {
      const timer = setTimeout(() => {
        if (
          elementRef.current?.textContent?.trim() === '' &&
          !ctx.isEditLocked(nodeId)
        ) {
          if (VERBOSE)
            console.log(
              `[NodeBasicTag] Deleting empty placeholder nodeId: ${nodeId}`
            );
          const nodeToDelete = ctx.allNodes.get().get(nodeId);
          if (nodeToDelete) {
            ctx.deleteNode(nodeId);

            // Add history for auto-deletion
            ctx.history.addPatch({
              op: PatchOp.REMOVE,
              undo: (ctx) => ctx.addNode(nodeToDelete),
              redo: (ctx) => ctx.deleteNode(nodeId),
            });
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editState, isPlaceholder, isEmpty, nodeId]);

  // Helper functions for text nodes
  const findFirstTextNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return node;
    for (let i = 0; i < node.childNodes.length; i++) {
      const found = findFirstTextNode(node.childNodes[i]);
      if (found) return found;
    }
    return null;
  };

  const findLastTextNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return node;
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const found = findLastTextNode(node.childNodes[i]);
      if (found) return found;
    }
    return null;
  };

  // Restore cursor position
  const restoreCursorPosition = () => {
    if (!cursorPositionRef.current || !elementRef.current) return;

    const selection = window.getSelection();
    if (!selection) {
      console.warn(
        `[NodeBasicTag] No selection available for cursor restoration in nodeId: ${nodeId}`
      );
      return;
    }

    try {
      const range = document.createRange();
      const { node, offset } = cursorPositionRef.current;

      if (elementRef.current.contains(node)) {
        if (node.nodeType === Node.TEXT_NODE) {
          const maxOffset = node.textContent?.length || 0;
          range.setStart(node, Math.min(offset, maxOffset));
        } else {
          const maxOffset = node.childNodes.length;
          range.setStart(node, Math.min(offset, maxOffset));
        }
      } else {
        const textNode = findFirstTextNode(elementRef.current);
        if (textNode) {
          range.setStart(textNode, 0);
        } else {
          range.setStart(elementRef.current, 0);
        }
      }

      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      if (VERBOSE)
        console.log(`[NodeBasicTag] Cursor restored for nodeId: ${nodeId}`);
    } catch (e) {
      console.warn(
        `[NodeBasicTag] Cursor restoration failed for nodeId: ${nodeId}:`,
        e
      );
      if (elementRef.current) {
        elementRef.current.focus();
      }
    }

    cursorPositionRef.current = null;
  };

  // Apply cursor position when entering edit mode
  useEffect(() => {
    if (
      editState === 'editing' &&
      elementRef.current &&
      cursorPositionRef.current
    ) {
      requestAnimationFrame(() => {
        restoreCursorPosition();
      });
    }
  }, [editState]);

  // For formatting nodes <em> and <strong> and <span>
  if (['em', 'strong', 'span'].includes(props.tagName)) {
    const isEditorActive = toolModeVal === 'text';
    const isEditorEnabled = toolModeVal === 'text';
    const handleStyleClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      settingsPanelStore.set({
        action: 'style-element',
        nodeId: nodeId,
        expanded: true,
      });
    };
    const handleUnwrapClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      ctx.unwrapNode(nodeId);
    };
    const handleWordCarouselClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      settingsPanelStore.set({
        action: 'style-word-carousel',
        nodeId: nodeId,
        expanded: true,
      });
    };

    let baseClasses = ctx.getNodeClasses(nodeId, viewportKeyStore.get().value);
    baseClasses += ' outline outline-1 outline-dotted outline-black';

    return createElement(
      Tag,
      {
        className: baseClasses,
        onClick: (e: MouseEvent) => {
          if (isEditableMode) {
            ctx.setClickedNodeId(nodeId);
          } else {
            ctx.setClickedNodeId(nodeId);
            e.stopPropagation();
          }
        },
        'data-node-id': nodeId,
        'data-tag': props.tagName,
        tabIndex: isEditableMode ? -1 : undefined,
        style: {
          position: isEditorActive ? 'relative' : undefined,
          outlineOffset: '1px',
          display: displayMode,
        },
      },
      [
        <RenderChildren key="children" children={children} nodeProps={props} />,
        isEditorEnabled && (
          <span
            key={`toolbar-${nodeId}`}
            className="absolute z-10 flex select-none gap-x-1"
            data-attr="exclude"
            style={{ top: '-0.9rem', left: '0' }}
          >
            {props.tagName === 'span' && (
              <button
                type="button"
                onClick={handleStyleClick}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 bg-opacity-90 text-blue-700 shadow-sm hover:bg-blue-300 focus:outline-none"
                aria-label="Style selection"
                data-attr="exclude"
              >
                <PaintBrushIcon className="h-3 w-3" data-attr="exclude" />
              </button>
            )}
            <button
              type="button"
              onClick={handleWordCarouselClick}
              className={classNames(
                'flex h-4 w-4 items-center justify-center rounded-full bg-opacity-50 shadow-sm focus:outline-none',
                node.wordCarouselPayload
                  ? 'bg-green-100 text-green-700 hover:bg-green-300'
                  : 'bg-gray-100 bg-opacity-90 text-gray-700 hover:bg-gray-300'
              )}
              aria-label="Edit Carousel"
              data-attr="exclude"
            >
              <ChatBubbleBottomCenterTextIcon
                className="h-3 w-3"
                data-attr="exclude"
              />
            </button>
            <button
              type="button"
              onClick={handleUnwrapClick}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 bg-opacity-90 text-gray-700 shadow-sm hover:bg-gray-300 focus:outline-none"
              aria-label="Remove formatting"
              data-attr="exclude"
            >
              <XMarkIcon className="h-3.5 w-3.5" data-attr="exclude" />
            </button>
          </span>
        ),
      ]
    );
  }

  // For interactive elements like <a> and <button>
  if (['a', 'button'].includes(props.tagName)) {
    return createElement(
      Tag,
      {
        className: ctx.getNodeClasses(nodeId, viewportKeyStore.get().value),
        onClick: (e: MouseEvent) => {
          if (isEditableMode) {
            ctx.setClickedNodeId(nodeId);
          } else {
            ctx.setClickedNodeId(nodeId);
            e.stopPropagation();
          }
        },
        'data-node-id': nodeId,
        'data-tag': props.tagName,
        tabIndex: isEditableMode ? -1 : undefined,
      },
      <RenderChildren children={children} nodeProps={props} />
    );
  }

  const startEditing = () => {
    if (
      !isEditableMode ||
      !supportsEditing ||
      editState === 'editing' ||
      !canEditText(node, ctx)
    )
      return;

    originalContentRef.current = elementRef.current?.innerHTML || '';
    setEditState('editing');
    if (VERBOSE)
      console.log(`[NodeBasicTag] Started editing nodeId: ${nodeId}`);
  };

  const handleInsertSignal = (tagName: string, nodeId: string) => {
    setTimeout(() => {
      ctx.handleInsertSignal(tagName, nodeId);
    }, 50);
  };

  const saveAndExit = () => {
    console.log(`[DEBUG] saveAndExit triggered for nodeId: ${nodeId}`, {
      editState,
      toolMode: toolModeVal,
      hasSettingsPanel: !!settingsPanel,
      activeSignal: settingsPanel?.action,
    });
    if (editState !== 'editing') return;
    const tempDiv = document.createElement('div');
    console.log(`[DEBUG] Raw HTML before sanitization:`, tempDiv.innerHTML);
    tempDiv.innerHTML = elementRef.current?.innerHTML || '';
    const chromeElements = tempDiv.querySelectorAll(
      '.compositor-chrome, [data-attr="exclude"]'
    );
    chromeElements.forEach((el) => el.remove());
    const wrappers = tempDiv.querySelectorAll(
      '.compositor-wrapper, [data-node-overlay]'
    );
    wrappers.forEach((el) => {
      while (el.firstChild) {
        el.parentNode?.insertBefore(el.firstChild, el);
      }
      el.remove();
    });

    const currentContent = tempDiv.innerHTML;
    console.log(`[DEBUG] Sanitized HTML sent to Parser:`, currentContent);

    if (currentContent !== originalContentRef.current) {
      try {
        const originalNodes = ctx
          .getNodesRecursively(node)
          .filter(
            (childNode): childNode is FlatNode =>
              'tagName' in childNode &&
              ['a', 'button', 'span'].includes(childNode.tagName as string)
          ) as FlatNode[];
        if (VERBOSE) console.log('originalNodes to save:', originalNodes);

        const parsedNodes = processRichTextToNodes(
          currentContent,
          nodeId,
          originalNodes,
          handleInsertSignal
        );

        if (parsedNodes.length > 0) {
          const originalChildren = ctx.deleteChildren(nodeId);
          ctx.addNodes(parsedNodes);

          // Add history for this operation
          ctx.history.addPatch({
            op: PatchOp.REPLACE,
            undo: (ctx) => {
              ctx.deleteChildren(nodeId);
              ctx.addNodes(originalChildren);
            },
            redo: (ctx) => {
              ctx.deleteChildren(nodeId);
              ctx.addNodes(parsedNodes);
            },
          });

          // Add history for this operation
          ctx.history.addPatch({
            op: PatchOp.REPLACE,
            undo: (ctx) => {
              ctx.deleteChildren(nodeId);
              ctx.addNodes(originalChildren);
            },
            redo: (ctx) => {
              ctx.deleteChildren(nodeId);
              ctx.addNodes(parsedNodes);
            },
          });

          if (isPlaceholder) {
            const updatedNode = {
              ...cloneDeep(node),
              isPlaceholder: false,
              isChanged: true,
            };
            ctx.modifyNodes([updatedNode]);
          }

          const paneNodeId = ctx.getClosestNodeTypeFromId(nodeId, 'Pane');
          if (paneNodeId) {
            const paneNode = cloneDeep(
              ctx.allNodes.get().get(paneNodeId)
            ) as PaneNode;
            ctx.modifyNodes([{ ...paneNode, isChanged: true }]);
          }
        }
      } catch (error) {
        console.error(
          `[NodeBasicTag] Error saving content for nodeId: ${nodeId}:`,
          error
        );
      }
    }

    setEditState('viewing');
    if (VERBOSE)
      console.log(`[NodeBasicTag] Exited editing for nodeId: ${nodeId}`);

    // Check if content is empty and delete the node if it is
    if (elementRef.current?.textContent?.trim() === '') {
      if (VERBOSE)
        console.log(`[NodeBasicTag] Deleting empty nodeId: ${nodeId}`);
      const nodeToDelete = ctx.allNodes.get().get(nodeId);
      if (nodeToDelete) {
        ctx.deleteNode(nodeId);

        // Add history for deletion
        ctx.history.addPatch({
          op: PatchOp.REMOVE,
          undo: (ctx) => ctx.addNode(nodeToDelete),
          redo: (ctx) => ctx.deleteNode(nodeId),
        });
      }
    }
  };

  const createNextParagraph = () => {
    if (VERBOSE)
      console.log(
        `[NodeBasicTag] Creating next paragraph after nodeId: ${nodeId}`
      );

    const currentContent = elementRef.current?.innerHTML || '';

    if (currentContent !== originalContentRef.current) {
      try {
        const originalNodes = ctx
          .getNodesRecursively(node)
          .filter(
            (childNode): childNode is FlatNode =>
              'tagName' in childNode &&
              ['a', 'button'].includes(childNode.tagName as string)
          ) as FlatNode[];

        const parsedNodes = processRichTextToNodes(
          currentContent,
          nodeId,
          originalNodes,
          handleInsertSignal
        );

        if (parsedNodes.length > 0) {
          ctx.deleteChildren(nodeId);
          ctx.addNodes(parsedNodes);

          if (isPlaceholder) {
            const updatedNode = {
              ...cloneDeep(node),
              isPlaceholder: false,
              isChanged: true,
            };
            ctx.modifyNodes([updatedNode]);
          }
        }
      } catch (error) {
        console.error(
          `[NodeBasicTag] Error saving content for nodeId: ${nodeId}:`,
          error
        );
      }
    }

    const paneNodeId = ctx.getClosestNodeTypeFromId(nodeId, 'Pane');
    if (paneNodeId) {
      const paneNode = cloneDeep(
        ctx.allNodes.get().get(paneNodeId)
      ) as PaneNode;
      ctx.modifyNodes([{ ...paneNode, isChanged: true }]);
    }

    ctx.clearEditLock();
    setEditState('viewing');

    const templateNode = getTemplateNode('p');
    const newNode = {
      ...templateNode,
      isPlaceholder: true,
    };
    if (newNode?.nodes?.length) {
      const firstNode = newNode.nodes.at(0);
      if (firstNode && typeof firstNode.copy === 'string') {
        firstNode.copy = '';
      }
    }

    const newNodeId = ctx.addTemplateNode(nodeId, newNode, nodeId, 'after');
    if (VERBOSE)
      console.log(`[NodeBasicTag] New paragraph created with id: ${newNodeId}`);

    if (newNodeId) {
      ctx.setEditLock(newNodeId);
      const attemptFocus = (attempts = 5, delay = 50) => {
        const newElement = document.querySelector(
          `[data-node-id="${newNodeId}"]`
        ) as HTMLElement;
        if (newElement) {
          if (newElement.contentEditable === 'true') {
            newElement.focus();
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              const textNode = findFirstTextNode(newElement) || newElement;
              range.setStart(textNode, 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
            if (document.activeElement === newElement) {
              if (VERBOSE)
                console.log(
                  `[NodeBasicTag] Successfully focused nodeId: ${newNodeId}`
                );
            } else {
              console.warn(
                `[NodeBasicTag] Focus failed for nodeId: ${newNodeId}, contentEditable: ${newElement.contentEditable}, activeElement: ${document.activeElement?.getAttribute('data-node-id')}`
              );
            }
          } else if (attempts > 0) {
            if (VERBOSE)
              console.log(
                `[NodeBasicTag] Element ${newNodeId} not yet editable, retrying. Attempts left: ${attempts}`
              );
            setTimeout(() => attemptFocus(attempts - 1, delay), delay);
          } else {
            console.error(
              `[NodeBasicTag] Failed to focus nodeId: ${newNodeId}, not editable after retries`
            );
          }
        } else if (attempts > 0) {
          if (VERBOSE)
            console.log(
              `[NodeBasicTag] Element ${newNodeId} not found, retrying. Attempts left: ${attempts}`
            );
          setTimeout(() => attemptFocus(attempts - 1, delay), delay);
        } else {
          console.error(
            `[NodeBasicTag] Failed to find element for nodeId: ${newNodeId} after retries`
          );
        }
      };
      requestAnimationFrame(() => attemptFocus());
    }
  };

  // Event Handlers
  const handleFocus = () => {
    if (!supportsEditing) return;
    startEditing();
  };

  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (VERBOSE)
      console.log(`[NodeBasicTag] Blur event, relatedTarget:`, e.relatedTarget);

    // Check if the focus moved to the Settings Panel or Toolbar
    const isSettingsControl = relatedTarget?.closest('#settingsControls');

    if (
      relatedTarget?.hasAttribute('data-tab-indicator') ||
      (relatedTarget && elementRef.current?.contains(relatedTarget)) ||
      isSettingsControl
    ) {
      return;
    }
    saveAndExit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (editState !== 'editing') return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveAndExit();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      createNextParagraph();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (elementRef.current && originalContentRef.current) {
        elementRef.current.innerHTML = originalContentRef.current;
      }
      setEditState('viewing');
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLElement>) => {
    if (editState !== 'editing') return;

    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: MouseEvent) => {
    if (!canEditText(node, ctx)) {
      return;
    }
    if (
      isEditableMode &&
      (e.target instanceof HTMLAnchorElement ||
        e.target instanceof HTMLButtonElement)
    ) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    // Delay single-click behavior to see if double-click follows
    clickTimeoutRef.current = setTimeout(() => {
      if (!isAddressableNode(node, ctx)) return;
      if (isEditableMode && supportsEditing && editState === 'viewing') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (elementRef.current?.contains(range.commonAncestorContainer)) {
            cursorPositionRef.current = {
              node: range.startContainer,
              offset: range.startOffset,
            };
          } else if (elementRef.current) {
            const textNode =
              findLastTextNode(elementRef.current) ||
              findFirstTextNode(elementRef.current);
            if (textNode) {
              cursorPositionRef.current = {
                node: textNode,
                offset: textNode.textContent?.length || 0,
              };
            }
          }
        }
        startEditing();
        if (elementRef.current) {
          elementRef.current.contentEditable = 'true';
          elementRef.current.focus();
          requestAnimationFrame(() => {
            restoreCursorPosition();
            if (
              elementRef.current &&
              document.activeElement !== elementRef.current
            ) {
              console.warn(
                `[NodeBasicTag] Focus lost after click for nodeId: ${nodeId}, retrying`
              );
              elementRef.current.focus();
            }
          });
          setTimeout(() => {
            if (
              elementRef.current &&
              document.activeElement !== elementRef.current
            ) {
              elementRef.current.focus();
            }
          }, 0);
        }
      }
      ctx.setClickedNodeId(nodeId);
    }, 300); // Same as DOUBLE_CLICK_DELAY

    if (
      !(
        e.target instanceof HTMLAnchorElement ||
        e.target instanceof HTMLButtonElement
      )
    ) {
      e.stopPropagation();
    }
  };

  const handleDoubleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Cancel the pending single-click behavior
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    // Trigger double-click behavior (style panels)
    ctx.setClickedNodeId(nodeId, true);
  };

  const baseClasses = ctx.getNodeClasses(nodeId, viewportKeyStore.get().value);
  let outlineClasses = '';
  if (settingsPanel?.nodeId === nodeId) {
    outlineClasses +=
      ' outline-4 outline-dotted outline-orange-400 outline-offset-2';
  }
  const editingClasses =
    editState === 'editing'
      ? 'outline-2 outline-cyan-500 outline-offset-2'
      : '';
  const className = `${baseClasses} ${outlineClasses} ${editingClasses}`.trim();

  return (
    <>
      {createElement(
        Tag,
        {
          ref: elementRef,
          className,
          contentEditable: editState === 'editing',
          suppressContentEditableWarning: true,
          onFocus: handleFocus,
          onBlur: handleBlur,
          onKeyDown: handleKeyDown,
          onPaste: handlePaste,
          onClick: handleClick,
          onDoubleClick: handleDoubleClick,
          style: {
            cursor: isEditableMode && supportsEditing ? 'text' : 'default',
            minHeight: isPlaceholder ? '1.5em' : undefined,
            display: displayMode,
          },
          'data-node-id': nodeId,
          'data-placeholder': isPlaceholder,
          'data-tag': props.tagName,
        },
        <RenderChildren
          children={children}
          nodeProps={{
            ...props,
            nodeId: nodeId,
            isSelectableText: props.isSelectableText,
          }}
        />
      )}
      {showTabIndicator && editState === 'editing' && (
        <TabIndicator onTab={createNextParagraph} parentNodeId={nodeId} />
      )}
    </>
  );
};
