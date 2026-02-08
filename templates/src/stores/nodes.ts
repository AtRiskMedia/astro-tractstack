import { atom, map } from 'nanostores';
import { ulid } from 'ulid';
import { processClassesForViewports } from '@/utils/compositor/reduceNodesClassNames';
import { NotificationSystem } from '@/stores/notificationSystem';
import { cloneDeep, isDeepEqual } from '@/utils/helpers';
import { extractClassesFromNodes } from '@/utils/compositor/nodesHelper';
import { handleClickEventDefault } from '@/utils/compositor/handleClickEvent';
import allowInsert from '@/utils/compositor/allowInsert';
import { reservedSlugs } from '@/constants';
import {
  NodesHistory,
  PatchOp,
  VERBOSE as VERBOSE_HISTORY,
} from '@/stores/nodesHistory';
import { moveNodeAtLocationInContext } from '@/utils/compositor/nodesHelper';
import {
  rehydrateChildrenFromHtml,
  regenerateCreativePane,
  extractFileIdsFromAst,
} from '@/utils/compositor/htmlAst';
import { MarkdownGenerator } from '@/utils/compositor/nodesMarkdownGenerator';
import {
  hasButtonPayload,
  hasTagName,
  isDefined,
  isValidTag,
  isGridLayoutNode,
  toTag,
} from '@/utils/compositor/typeGuards';
import { startLoadingAnimation } from '@/utils/helpers';
import { lispLexer } from '@/utils/actions/lispLexer';
import { preParseAction } from '@/utils/actions/preParse_Action';
import { settingsPanelStore } from '@/stores/storykeep';
import {
  PaneAddMode,
  StoryFragmentMode,
  ContextPaneMode,
} from '@/types/compositorTypes';
import type {
  EditableElementMetadata,
  PanelState,
  BaseNode,
  FlatNode,
  ImpressionNode,
  GridLayoutNode,
  MarkdownPaneFragmentNode,
  MenuNode,
  NodeType,
  PaneFragmentNode,
  BgImageNode,
  PaneNode,
  StoryFragmentNode,
  Tag,
  TemplateGridLayout,
  TemplateMarkdown,
  TemplateNode,
  TemplatePane,
  ToolModeVal,
  ToolAddMode,
  TractStackNode,
  ViewportKey,
  OgImageParams,
  VisualBreakNode,
  BeliefDatum,
  LoadData,
  ArtpackImageNode,
} from '@/types/compositorTypes';
import type { NodeProps, WidgetProps } from '@/types/nodeProps';
import type { CSSProperties } from 'react';
import type { SelectionRange, SelectionStoreState } from '@/stores/selection';
import type { CompositorProps } from '@/components/compositor/Compositor';

const blockedClickNodes = new Set<string>(['em', 'strong', 'span']);
export const ROOT_NODE_NAME = 'root';
export const UNDO_REDO_HISTORY_CAPACITY = 500;
const VERBOSE = false;

function strippedStyles(obj: Record<string, string[]>) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, value[0]])
  );
}
function addHoverPrefix(str: string): string {
  return str
    .split(' ')
    .map((word) => `hover:${word}`)
    .join(' ');
}

export class NodesContext {
  constructor() {}

  notifications = new NotificationSystem<BaseNode>();
  allNodes = atom<Map<string, BaseNode>>(new Map<string, BaseNode>());
  impressionNodes = atom<Set<ImpressionNode>>(new Set<ImpressionNode>());
  parentNodes = atom<Map<string, string[]>>(new Map<string, string[]>());
  hasTitle = atom<boolean>(false);
  hasPanes = atom<boolean>(false);
  isTemplate = atom<boolean>(false);
  rootNodeId = atom<string>('');
  clickedNodeId = atom<string>('');
  ghostTextActiveId = atom<string>('');
  clickedParentLayer = atom<number | null>(null);
  activePaneMode = atom<PanelState>({
    paneId: '',
    mode: '',
    panel: '',
  });
  editingNodeId = atom<string | null>(null);
  history = new NodesHistory(this, UNDO_REDO_HISTORY_CAPACITY);

  toolModeValStore = map<{ value: ToolModeVal }>({
    value: 'text',
  });
  toolAddModeStore = map<{ value: ToolAddMode }>({
    value: 'p',
  });

  /**
   * Sets an edit lock on a specific node to prevent re-renders during editing
   * @param nodeId - The node ID to lock, or null to clear the lock
   */
  setEditLock(nodeId: string | null): void {
    this.editingNodeId.set(nodeId);
  }

  /**
   * Checks if a specific node is currently edit-locked
   * @param nodeId - The node ID to check
   * @returns true if the node is locked for editing
   */
  isEditLocked(nodeId: string): boolean {
    return this.editingNodeId.get() === nodeId;
  }

  /**
   * Clears the current edit lock
   */
  clearEditLock(): void {
    this.editingNodeId.set(null);
  }

  /**
   * Cleanup method to handle orphaned edit locks
   */
  cleanupEditState(): void {
    const editingId = this.editingNodeId.get();
    if (editingId) {
      // Check if the node still exists
      const node = this.allNodes.get().get(editingId);
      if (!node) {
        this.clearEditLock();
      }
    }
  }

  notifyNode(nodeId: string, payload?: BaseNode) {
    // Skip notification if this node is edit-locked
    if (this.isEditLocked(nodeId)) {
      // Still notify parent nodes as they may need updates
      const node = this.allNodes.get().get(nodeId);
      if (node && node.parentId) {
        const parentNodeToNotify = this.nodeToNotify(nodeId, node.nodeType);
        if (parentNodeToNotify && parentNodeToNotify !== nodeId) {
          this.notifyNode(parentNodeToNotify, payload);
        }
      }
      return;
    }
    // Original notifyNode implementation
    let notifyNodeId = nodeId;
    if (notifyNodeId === this.rootNodeId.get()) {
      notifyNodeId = ROOT_NODE_NAME;
    }
    if (nodeId === `root`) startLoadingAnimation();
    this.updateHasPanesStatus();
    this.notifications.notify(notifyNodeId, payload);
  }

  getPanelMode(nodeId: string, panel: string): string {
    const activeMode = this.activePaneMode.get();
    if (activeMode.panel === panel && activeMode.paneId === nodeId) {
      return activeMode.mode;
    }
    return '';
  }

  setPanelMode(nodeId: string, panel: string, mode: string) {
    this.closeAllPanelsExcept(nodeId, panel);
    this.activePaneMode.set({
      paneId: nodeId,
      panel: panel,
      mode: mode,
    });
  }

  getPaneAddMode(nodeId: string): PaneAddMode {
    const mode = this.getPanelMode(nodeId, 'add');
    return mode ? (mode as PaneAddMode) : PaneAddMode.DEFAULT;
  }

  setPaneAddMode(nodeId: string, mode: PaneAddMode) {
    this.setPanelMode(nodeId, 'add', mode);
  }

  getContextPaneMode(nodeId: string): ContextPaneMode {
    const mode = this.getPanelMode(nodeId, 'context');
    return mode ? (mode as ContextPaneMode) : ContextPaneMode.DEFAULT;
  }

  setContextPaneMode(nodeId: string, mode: ContextPaneMode) {
    this.setPanelMode(nodeId, 'context', mode);
  }

  getStoryFragmentMode(nodeId: string): StoryFragmentMode {
    const mode = this.getPanelMode(nodeId, 'storyfragment');
    return mode ? (mode as StoryFragmentMode) : StoryFragmentMode.DEFAULT;
  }

  setStoryFragmentMode(nodeId: string, mode: StoryFragmentMode) {
    this.setPanelMode(nodeId, 'storyfragment', mode);
  }

  closeAllPanels() {
    this.activePaneMode.set({
      paneId: '',
      panel: '',
      mode: '',
    });
  }

  closeAllPanelsExcept(nodeId: string, panel: string) {
    if (panel === 'styles-memory') {
      return;
    }
    const currentPanel = this.activePaneMode.get();
    if (currentPanel.paneId !== nodeId || currentPanel.panel !== panel) {
      settingsPanelStore.set(null);
    }
  }

  ogImageParamsStore = map<Record<string, OgImageParams>>({});

  getOgImageParams(nodeId: string): OgImageParams {
    const params = this.ogImageParamsStore.get()[nodeId];
    return (
      params || {
        textColor: '#fcfcfc',
        bgColor: '#10120d',
        fontSize: undefined,
      }
    );
  }

  setOgImageParams(nodeId: string, params: Partial<OgImageParams>): void {
    const currentParams = this.getOgImageParams(nodeId);
    this.ogImageParamsStore.setKey(nodeId, {
      ...currentParams,
      ...params,
    });
  }

  updateHasPanesStatus() {
    const allNodes = this.allNodes.get();
    const storyFragments = Array.from(allNodes.values()).filter(
      (node) => node.nodeType === 'StoryFragment'
    );
    const hasPanes = storyFragments.some(
      (node) => 'paneIds' in node && (node.paneIds as string[]).length > 0
    );
    this.hasPanes.set(hasPanes);
  }

  cleanNode(nodeId: string) {
    const node = this.allNodes.get().get(nodeId);
    if (!node) return;
    const newNodes = new Map(this.allNodes.get());
    const cleanedNode = cloneDeep(node);
    if (cleanedNode.isChanged) delete cleanedNode.isChanged;
    newNodes.set(nodeId, cleanedNode);
    this.allNodes.set(newNodes);
  }

  getDirtyNodes(): BaseNode[] {
    const allNodes = Array.from(this.allNodes.get().values());
    return allNodes.filter(
      (node): node is BaseNode => 'isChanged' in node && node.isChanged === true
    );
  }

  clearUndoHistory() {
    this.history.clearHistory();
  }

  getChildNodeIDs(parentNodeId: string): string[] {
    const returnVal = this.parentNodes.get()?.get(parentNodeId) || [];
    return returnVal;
  }

  setClickedParentLayer(layer: number | null) {
    this.clickedParentLayer.set(layer);
  }

  handleEraseEvent(nodeId: string) {
    const node = this.allNodes.get().get(nodeId) as FlatNode;
    if (!node) return;
    switch (node.nodeType) {
      case `Pane`: {
        const storyfragmentNodeId = this.getClosestNodeTypeFromId(
          nodeId,
          'StoryFragment'
        );
        const storyfragmentNode = cloneDeep(
          this.allNodes.get().get(storyfragmentNodeId)
        ) as StoryFragmentNode;
        this.modifyNodes([{ ...storyfragmentNode }]);
        break;
      }
      case `TagElement`: {
        const paneNodeId = this.getClosestNodeTypeFromId(nodeId, 'Pane');
        const paneNode = cloneDeep(
          this.allNodes.get().get(paneNodeId)
        ) as PaneNode;
        this.modifyNodes([{ ...paneNode }]);
        break;
      }
      default:
    }
  }

  handleClickEvent(dblClick: boolean = false) {
    const toolModeVal = this.toolModeValStore.get().value;
    const node = this.allNodes.get().get(this.clickedNodeId.get()) as FlatNode;
    if (!node) return;

    // click handler based on toolModeVal
    switch (toolModeVal) {
      case `text`:
        if (
          dblClick &&
          node.nodeType === 'TagElement' &&
          'tagName' in node &&
          (node.tagName === 'a' || node.tagName === 'button')
        ) {
          handleClickEventDefault(
            node,
            dblClick,
            this.clickedParentLayer.get()
          );
        }
        if (dblClick && ![`Markdown`].includes(node.nodeType)) {
          handleClickEventDefault(
            node,
            dblClick,
            this.clickedParentLayer.get()
          );
        }
        break;
      default:
    }
    // reset on parentLayer
    this.setClickedParentLayer(null);
  }

  public async wrapRangeInAnchor(
    range: SelectionStoreState
  ): Promise<string | null> {
    if (
      !range.startNodeId ||
      !range.endNodeId ||
      !range.lcaNodeId ||
      !range.blockNodeId
    ) {
      return Promise.resolve(null);
    }

    const originalAllNodes = new Map(this.allNodes.get());
    const originalParentNodes = new Map(this.parentNodes.get());
    const paneNodeId = this.getClosestNodeTypeFromId(range.blockNodeId, 'Pane');
    const originalPaneNode = this.allNodes.get().get(paneNodeId)
      ? (cloneDeep(this.allNodes.get().get(paneNodeId)) as PaneNode)
      : null;
    const wrapperNodeId = `a-${ulid()}`;

    const redoLogic = (): string | null => {
      if (!range.startNodeId || !range.endNodeId || !range.lcaNodeId)
        return null;

      let startNodeToFind: string | null = null;
      let endNodeToFind: string | null = null;

      if (range.startNodeId === range.endNodeId) {
        const { left: nodeSplitAtEnd } = this._splitTextNode(
          range.endNodeId,
          range.endCharOffset
        );

        const { right: middleNode } = this._splitTextNode(
          nodeSplitAtEnd.id,
          range.startCharOffset
        );

        if (!middleNode) {
          console.error(
            'wrapRangeInAnchor: Single-node split failed to create a middle node.'
          );
          return null;
        }
        startNodeToFind = middleNode.id;
        endNodeToFind = middleNode.id;
      } else {
        const { left: endNodeAfterSplit } = this._splitTextNode(
          range.endNodeId,
          range.endCharOffset
        );
        endNodeToFind = endNodeAfterSplit.id;

        const { right: startNodeAfterSplit } = this._splitTextNode(
          range.startNodeId,
          range.startCharOffset
        );

        if (!startNodeAfterSplit) {
          console.error(
            'wrapRangeInAnchor: Multi-node split failed to create a start node.'
          );
          return null;
        }
        startNodeToFind = startNodeAfterSplit.id;
      }

      const newAllNodes = new Map(this.allNodes.get());
      const newParentNodes = new Map(this.parentNodes.get());
      const parentChildren = newParentNodes.get(range.lcaNodeId!);

      if (!parentChildren) {
        console.error('wrapRangeInAnchor: Could not find parent children');
        return null;
      }

      const startIndex = parentChildren.indexOf(startNodeToFind!);
      const endIndex = parentChildren.indexOf(endNodeToFind!);

      if (startIndex === -1 || endIndex === -1) {
        console.error(
          'wrapRangeInAnchor: Could not find split nodes in parent',
          {
            startIndex,
            endIndex,
            startNodeToFind,
            endNodeToFind,
          }
        );
        return null;
      }

      const actualStartIndex = Math.min(startIndex, endIndex);
      const actualEndIndex = Math.max(startIndex, endIndex);

      const newParentChildren = [...parentChildren];
      const nodesToWrapIds = newParentChildren.slice(
        actualStartIndex,
        actualEndIndex + 1
      );

      if (nodesToWrapIds.length === 0) {
        console.error('wrapRangeInAnchor: No nodes to wrap.');
        return null;
      }

      const nodesToWrap = nodesToWrapIds
        .map((id) => newAllNodes.get(id))
        .filter((n): n is BaseNode => !!n);

      const wrapperNode: FlatNode = {
        id: wrapperNodeId,
        nodeType: 'TagElement',
        parentId: range.lcaNodeId,
        tagName: 'a',
        href: '#',
        overrideClasses: {},
      };
      newAllNodes.set(wrapperNode.id, wrapperNode);
      newParentNodes.set(wrapperNode.id, []);

      for (const node of nodesToWrap) {
        const nodeToUpdate = newAllNodes.get(node.id);
        if (nodeToUpdate) {
          nodeToUpdate.parentId = wrapperNode.id;
        }
        newParentNodes.get(wrapperNode.id)!.push(node.id);
      }

      newParentChildren.splice(
        actualStartIndex,
        nodesToWrapIds.length,
        wrapperNode.id
      );
      newParentNodes.set(range.lcaNodeId!, newParentChildren);

      this.allNodes.set(newAllNodes);
      this.parentNodes.set(newParentNodes);

      if (originalPaneNode) {
        this.modifyNodes([{ ...originalPaneNode }], {
          notify: false,
          recordHistory: false,
        });
      }

      this.notifyNode(range.blockNodeId!);
      return wrapperNode.id;
    };

    const undoLogic = () => {
      this.allNodes.set(originalAllNodes);
      this.parentNodes.set(originalParentNodes);

      if (originalPaneNode) {
        this.modifyNodes([originalPaneNode], {
          notify: false,
          recordHistory: false,
        });
      }
      this.notifyNode(range.blockNodeId!);
    };

    const newAnchorId = redoLogic();

    if (!this.isTemplate.get()) {
      if (VERBOSE_HISTORY)
        console.log('[Nodes] Action: wrapRangeInAnchor', { range });
      this.history.addPatch({
        op: PatchOp.REPLACE,
        undo: undoLogic,
        redo: redoLogic,
      });
    }

    return new Promise((resolve) =>
      setTimeout(() => resolve(newAnchorId), 310)
    );
  }

  applyShellToPane(paneId: string, template: TemplatePane) {
    const allNodesMap = this.allNodes.get();
    const originalPane = allNodesMap.get(paneId);
    if (!originalPane) return;

    const nodesToUpdate: BaseNode[] = [];

    const paneNode = cloneDeep(originalPane) as PaneNode;
    if (template.bgColour) {
      paneNode.bgColour = template.bgColour;
    }
    if (template.htmlAst) {
      paneNode.htmlAst = template.htmlAst;
    }
    nodesToUpdate.push(paneNode);

    const childrenIds = this.getChildNodeIDs(paneId);

    const gridNodeRaw = childrenIds
      .map((id) => allNodesMap.get(id))
      .find((n) => n?.nodeType === 'GridLayoutNode');

    if (gridNodeRaw && template.gridLayout) {
      const gridLayoutNode = cloneDeep(gridNodeRaw) as GridLayoutNode;

      if (template.gridLayout.parentClasses) {
        gridLayoutNode.parentClasses = template.gridLayout.parentClasses;
      }
      if (template.gridLayout.defaultClasses) {
        gridLayoutNode.defaultClasses = template.gridLayout.defaultClasses;
      }
      nodesToUpdate.push(gridLayoutNode);

      if (
        template.gridLayout.nodes &&
        Array.isArray(template.gridLayout.nodes)
      ) {
        const columnIds = this.getChildNodeIDs(gridLayoutNode.id);

        columnIds.forEach((colId, index) => {
          const templateCol = template.gridLayout!.nodes![index];
          const colNodeRaw = allNodesMap.get(colId);
          if (templateCol && colNodeRaw) {
            const liveColNode = cloneDeep(
              colNodeRaw
            ) as MarkdownPaneFragmentNode;
            liveColNode.gridClasses = templateCol.gridClasses;
            nodesToUpdate.push(liveColNode);
          }
        });
      }
    } else {
      const markdownNodes = childrenIds
        .map((id) => allNodesMap.get(id))
        .filter(
          (n) => n?.nodeType === 'Markdown'
        ) as MarkdownPaneFragmentNode[];

      if (markdownNodes.length > 0 && template.markdown) {
        const primaryMarkdown = cloneDeep(markdownNodes[0]);

        if (template.markdown.parentClasses) {
          primaryMarkdown.parentClasses = template.markdown.parentClasses;
        }
        if (template.markdown.defaultClasses) {
          primaryMarkdown.defaultClasses = template.markdown.defaultClasses;
        }
        nodesToUpdate.push(primaryMarkdown);
      }
    }

    // Force a fresh history entry for this operation
    this.modifyNodes(nodesToUpdate, { merge: false });
  }

  async updateCreativeAsset(
    paneId: string,
    astId: string,
    updates: Partial<EditableElementMetadata>
  ) {
    const allNodes = new Map(this.allNodes.get());
    const originalPane = allNodes.get(paneId);

    if (!originalPane || originalPane.nodeType !== 'Pane') return;

    const paneNode = cloneDeep(originalPane) as PaneNode;
    if (!paneNode.htmlAst) return;

    if (updates.tagName === 'a' && updates.buttonPayload?.callbackPayload) {
      try {
        const config = (window as any).TRACTSTACK_CONFIG || {};
        const lexed = lispLexer(updates.buttonPayload.callbackPayload);

        const resolvedHref = preParseAction(
          lexed,
          paneNode.slug,
          !!paneNode.isContextPane,
          config
        );

        if (resolvedHref) {
          updates.href = resolvedHref;
        }
      } catch (e) {
        console.warn('[Nodes] Failed to resolve href from ActionLisp:', e);
      }
    }

    let newHtmlAst = await regenerateCreativePane(
      paneNode.htmlAst,
      astId,
      updates
    );

    if (newHtmlAst.editableElements[astId]) {
      newHtmlAst.editableElements[astId] = {
        ...newHtmlAst.editableElements[astId],
        ...updates,
      };
    }

    paneNode.htmlAst = newHtmlAst;

    this.modifyNodes([paneNode]);
  }

  updateCreativePane(paneId: string, containerId: string, htmlContent: string) {
    const originalPane = this.allNodes.get().get(paneId);
    if (!originalPane || originalPane.nodeType !== 'Pane') return;

    const paneNode = cloneDeep(originalPane) as PaneNode;
    if (!('htmlAst' in paneNode) || !paneNode.htmlAst) return;

    const newChildren = rehydrateChildrenFromHtml(htmlContent);

    const patchNode = (nodes: any[]): boolean => {
      for (const node of nodes) {
        if (node.id === containerId) {
          node.children = newChildren;
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (patchNode(node.children)) return true;
        }
      }
      return false;
    };

    if (patchNode(paneNode.htmlAst.tree)) {
      this.modifyNodes([paneNode], { merge: false });
    }
  }

  /**
   * Splits a text node at a given character offset.
   * This is a robust function that correctly handles splits at offset 0
   * by creating an empty left node, and splits at the end by returning
   * the original node as 'left' and null as 'right'.
   *
   * @param nodeId - The ID of the 'text' node to split.
   * @param offset - The character offset at which to split.
   * @returns An object containing the left and (optional) right node.
   */
  private _splitTextNode(
    nodeId: string,
    offset: number
  ): { left: FlatNode; right: FlatNode | null } {
    if (VERBOSE)
      console.log(`%c[_splitTextNode] CALLED`, 'color: #f59e0b;', {
        nodeId,
        offset,
      });

    const allNodes = new Map(this.allNodes.get());
    const parentNodes = new Map(this.parentNodes.get());
    const originalNode = allNodes.get(nodeId) as FlatNode;

    if (
      !originalNode ||
      originalNode.tagName !== 'text' ||
      typeof originalNode.copy !== 'string' // Check for copy existence
    ) {
      console.warn('_splitTextNode: Invalid node or type.', {
        nodeId,
        offset,
        originalNode,
      });
      return { left: originalNode, right: null };
    }

    const text = originalNode.copy;

    // Handle split at the end of the string (no-op)
    if (offset >= text.length) {
      console.warn(
        `%c[_splitTextNode] OFFSET >= LENGTH DETECTED. Returning right: null`,
        'color: #f59e0b;',
        { nodeId, text, offset }
      );
      return { left: originalNode, right: null };
    }

    // Handle split at the beginning of the string
    if (offset === 0) {
      if (VERBOSE)
        console.log(
          `%c[_splitTextNode] OFFSET 0 DETECTED. Creating empty left node.`,
          'color: #f59e0b; font-weight: bold;',
          { nodeId, text }
        );

      // Create a new empty node for the "left" half
      const leftNode: FlatNode = {
        id: ulid(),
        nodeType: 'TagElement',
        parentId: originalNode.parentId,
        tagName: 'text',
        copy: '', // Empty text
      };
      allNodes.set(leftNode.id, leftNode);

      // The original node becomes the "right" half
      const rightNode = originalNode;

      // Insert the new empty node *before* the original node
      const parentChildren = parentNodes.get(leftNode.parentId!)!;
      if (!parentChildren) {
        console.error(
          '_splitTextNode (offset 0): Could not find parent children list for',
          {
            parentId: leftNode.parentId,
          }
        );
        // We still return the nodes so the operation MIGHT succeed
        return { left: leftNode, right: rightNode };
      }

      const nodeIndex = parentChildren.indexOf(rightNode.id);
      const newParentChildren = [...parentChildren];

      if (nodeIndex > -1) {
        newParentChildren.splice(nodeIndex, 0, leftNode.id);
      } else {
        console.warn(
          '_splitTextNode (offset 0): Could not find node in parent, prepending.',
          {
            nodeId: rightNode.id,
            parentId: leftNode.parentId,
          }
        );
        newParentChildren.unshift(leftNode.id);
      }

      parentNodes.set(leftNode.parentId!, newParentChildren);
      this.allNodes.set(allNodes);
      this.parentNodes.set(parentNodes);

      // Return the new empty node as 'left' and the original node as 'right'
      // This allows wrapRangeInSpan to find the original node as 'middleNode'
      return { left: leftNode, right: rightNode };
    }

    // Standard split (offset > 0 and < text.length)
    if (VERBOSE)
      console.log(
        `%c[_splitTextNode] Performing standard split...`,
        'color: green;',
        { text, offset }
      );

    const leftText = text.substring(0, offset);
    const rightText = text.substring(offset);

    // Modify the original node to become the 'left' node
    const leftNode = cloneDeep(originalNode);
    leftNode.copy = leftText;
    allNodes.set(leftNode.id, leftNode);

    // Create a new node for the 'right' half
    const rightNode: FlatNode = {
      id: ulid(),
      nodeType: 'TagElement',
      parentId: leftNode.parentId,
      tagName: 'text',
      copy: rightText,
    };
    allNodes.set(rightNode.id, rightNode);

    const parentChildren = parentNodes.get(leftNode.parentId!)!;
    if (!parentChildren) {
      console.error(
        '_splitTextNode (standard): Could not find parent children list for',
        {
          parentId: leftNode.parentId,
        }
      );
      return { left: leftNode, right: null };
    }

    const nodeIndex = parentChildren.indexOf(leftNode.id);
    const newParentChildren = [...parentChildren];

    if (nodeIndex > -1) {
      // Insert the new 'right' node immediately after the 'left' node
      newParentChildren.splice(nodeIndex + 1, 0, rightNode.id);
    } else {
      console.warn(
        '_splitTextNode (standard): Could not find node in parent, appending.',
        {
          nodeId: leftNode.id,
          parentId: leftNode.parentId,
        }
      );
      newParentChildren.push(rightNode.id);
    }

    parentNodes.set(leftNode.parentId!, newParentChildren);

    this.allNodes.set(allNodes);
    this.parentNodes.set(parentNodes);

    return { left: leftNode, right: rightNode };
  }

  /**
   * Wraps a range of nodes (typically text nodes) inside a new formatting
   * element, like a <span>. This is an atomic operation with history support.
   *
   * @param range - The selection range state.
   * @param tagName - The tag name for the wrapper element (e.g., 'span').
   * @returns A Promise that resolves with the new wrapper node's ID, or null.
   */
  public async wrapRangeInSpan(
    range: SelectionRange,
    tagName: 'span'
  ): Promise<string | null> {
    if (
      !range.startNodeId ||
      !range.endNodeId ||
      !range.lcaNodeId ||
      !range.blockNodeId
    ) {
      return Promise.resolve(null);
    }

    const originalAllNodes = new Map(this.allNodes.get());
    const originalParentNodes = new Map(this.parentNodes.get());
    const paneNodeId = this.getClosestNodeTypeFromId(range.blockNodeId, 'Pane');
    const originalPaneNode = this.allNodes.get().get(paneNodeId)
      ? (cloneDeep(this.allNodes.get().get(paneNodeId)) as PaneNode)
      : null;
    const wrapperNodeId = ulid();

    const redoLogic = (): string | null => {
      if (VERBOSE)
        console.log(
          '%c[wrapRangeInSpan] START',
          'color: blue; font-weight: bold;',
          {
            range: cloneDeep(range),
            lcaChildren_BEFORE: cloneDeep(
              this.parentNodes.get().get(range.lcaNodeId!)
            ),
          }
        );
      if (!range.startNodeId || !range.endNodeId || !range.lcaNodeId)
        return null;

      let startNodeToFind: string | null = null;
      let endNodeToFind: string | null = null;

      if (range.startNodeId === range.endNodeId) {
        // SINGLE-NODE SELECTION
        const { left: nodeSplitAtEnd } = this._splitTextNode(
          range.endNodeId,
          range.endCharOffset
        );

        const { right: middleNode } = this._splitTextNode(
          nodeSplitAtEnd.id,
          range.startCharOffset
        );

        if (!middleNode) {
          console.error(
            'wrapRangeInSpan: Single-node split failed to create a middle node.'
          );
          return null;
        }
        startNodeToFind = middleNode.id;
        endNodeToFind = middleNode.id;
      } else {
        // MULTI-NODE SELECTION
        const { left: endNodeAfterSplit } = this._splitTextNode(
          range.endNodeId,
          range.endCharOffset
        );
        endNodeToFind = endNodeAfterSplit.id;

        const { right: startNodeAfterSplit } = this._splitTextNode(
          range.startNodeId,
          range.startCharOffset
        );

        if (!startNodeAfterSplit) {
          console.error(
            'wrapRangeInSpan: Multi-node split failed to create a start node.'
          );
          return null;
        }
        startNodeToFind = startNodeAfterSplit.id;
      }
      if (VERBOSE)
        console.log('%c[wrapRangeInSpan] SPLIT COMPLETE', 'color: blue;', {
          startNodeToFind,
          endNodeToFind,
          lcaChildren_AFTER_SPLIT: cloneDeep(
            this.parentNodes.get().get(range.lcaNodeId!)
          ),
        });

      const newAllNodes = new Map(this.allNodes.get());
      const newParentNodes = new Map(this.parentNodes.get());
      const parentChildren = newParentNodes.get(range.lcaNodeId!);

      if (!parentChildren) {
        console.error('wrapRangeInSpan: Could not find parent children');
        return null;
      }

      const startIndex = parentChildren.indexOf(startNodeToFind!);
      const endIndex = parentChildren.indexOf(endNodeToFind!);

      if (startIndex === -1 || endIndex === -1) {
        console.error('wrapRangeInSpan: Could not find split nodes in parent', {
          startIndex,
          endIndex,
          startNodeToFind,
          endNodeToFind,
        });
        return null;
      }

      const actualStartIndex = Math.min(startIndex, endIndex);
      const actualEndIndex = Math.max(startIndex, endIndex);

      const newParentChildren = [...parentChildren];
      const nodesToWrapIds = newParentChildren.slice(
        actualStartIndex,
        actualEndIndex + 1
      );
      if (VERBOSE)
        console.log('%c[wrapRangeInSpan] INDEXES', 'color: blue;', {
          startIndex,
          endIndex,
          actualStartIndex,
          actualEndIndex,
        });

      if (nodesToWrapIds.length === 0) {
        console.error('wrapRangeInSpan: No nodes to wrap.');
        return null;
      }
      if (VERBOSE)
        console.log('%c[wrapRangeInSpan] NODES TO WRAP', 'color: orange;', {
          nodesToWrapIds: cloneDeep(nodesToWrapIds),
        });

      const nodesToWrap = nodesToWrapIds
        .map((id) => newAllNodes.get(id))
        .filter((n): n is BaseNode => !!n);

      const wrapperNode: FlatNode = {
        id: wrapperNodeId,
        nodeType: 'TagElement',
        parentId: range.lcaNodeId,
        tagName: tagName,
      };
      newAllNodes.set(wrapperNode.id, wrapperNode);
      newParentNodes.set(wrapperNode.id, []);

      for (const node of nodesToWrap) {
        node.parentId = wrapperNode.id;
        newParentNodes.get(wrapperNode.id)!.push(node.id);
      }

      newParentChildren.splice(
        actualStartIndex,
        nodesToWrapIds.length,
        wrapperNode.id
      );
      newParentNodes.set(range.lcaNodeId!, newParentChildren);

      this.allNodes.set(newAllNodes);
      this.parentNodes.set(newParentNodes);

      if (originalPaneNode) {
        this.modifyNodes([{ ...originalPaneNode }], {
          notify: false,
          recordHistory: false,
        });
      }
      const lcaChildrenIds = newParentNodes.get(range.lcaNodeId!);
      const finalLCAChildrenNodes = lcaChildrenIds
        ? lcaChildrenIds.map((id) => newAllNodes.get(id))
        : [];

      const wrapperChildrenIds = newParentNodes.get(wrapperNodeId);
      const finalWrapperChildrenNodes = wrapperChildrenIds
        ? wrapperChildrenIds.map((id) => newAllNodes.get(id))
        : [];

      if (VERBOSE)
        console.log(
          '%c[wrapRangeInSpan] END (FINAL PAYLOAD)',
          'color: green; font-weight: bold;',
          {
            wrapperNodeId,
            lcaChildren_FINAL: finalLCAChildrenNodes,
            wrapperChildren_FINAL: finalWrapperChildrenNodes,
          }
        );
      this.notifyNode(range.blockNodeId!);
      return wrapperNode.id;
    };

    const undoLogic = () => {
      this.allNodes.set(originalAllNodes);
      this.parentNodes.set(originalParentNodes);

      if (originalPaneNode) {
        this.modifyNodes([originalPaneNode], {
          notify: false,
          recordHistory: false,
        });
      }
      this.notifyNode(range.blockNodeId!);
    };

    const newSpanId = redoLogic();

    if (!this.isTemplate.get()) {
      if (VERBOSE_HISTORY)
        console.log('[Nodes] Action: wrapRangeInSpan', { range, tagName });
      this.history.addPatch({
        op: PatchOp.REPLACE,
        undo: undoLogic,
        redo: redoLogic,
      });
    }

    return new Promise((resolve) => setTimeout(() => resolve(newSpanId), 310));
  }

  private clickTimer: number | null = null;
  private DOUBLE_CLICK_DELAY = 300;
  private isProcessingDoubleClick = false;
  private lastProcessedTime = 0;

  setClickedNodeId(nodeId: string, dblClick: boolean = false) {
    //settingsPanelStore.set(null);
    const now = Date.now();
    // Prevent processing if we're too close to the last event
    if (now - this.lastProcessedTime < 50 || this.isProcessingDoubleClick)
      return;
    let node = this.allNodes.get().get(nodeId) as FlatNode;
    if (node && 'tagName' in node) {
      while (node.parentId !== null && blockedClickNodes.has(node.tagName)) {
        node = this.allNodes.get().get(node.parentId) as FlatNode;
      }
      if (!node) return;
    }

    // Handle double click
    if (dblClick) {
      if (this.clickTimer) {
        window.clearTimeout(this.clickTimer);
        this.clickTimer = null;
      }
      this.isProcessingDoubleClick = true;
      this.clickedNodeId.set(node.id);
      this.lastProcessedTime = now;
      window.setTimeout(() => {
        this.isProcessingDoubleClick = false;
      }, 100);
      this.handleClickEvent(true);
      return;
    }

    // Handle single click with delay for potential double click
    if (this.clickTimer) {
      window.clearTimeout(this.clickTimer);
    }
    this.clickTimer = window.setTimeout(() => {
      if (!this.isProcessingDoubleClick) {
        this.clickTimer = null;
        this.clickedNodeId.set(node.id);
        this.lastProcessedTime = Date.now();
        this.handleClickEvent(false);
      }
    }, this.DOUBLE_CLICK_DELAY);
  }

  clearAll() {
    this.allNodes.get().clear();
    this.parentNodes.get().clear();
    this.impressionNodes.get().clear();
    this.rootNodeId.set('');
    this.notifications.clear();
  }

  buildNodesTreeFromRowDataMadeNodes(nodes: LoadData | null) {
    if (nodes !== null) {
      this.clearAll();
      //if (nodes?.fileNodes) this.addNodes(nodes.fileNodes);
      if (nodes?.menuNodes) this.addNodes(nodes.menuNodes);
      //if (nodes?.resourceNodes) this.addNodes(nodes.resourceNodes);
      if (nodes?.tractstackNodes) this.addNodes(nodes.tractstackNodes);
      // IMPORTANT!
      // pane nodes have to be added BEFORE StoryFragment nodes so they can register in this.allNodes
      if (nodes?.paneNodes) this.addNodes(nodes.paneNodes);
      // add childNodes after panes
      if (nodes?.childNodes) this.addNodes(nodes.childNodes);
      // then storyfragment nodes will link pane nodes from above
      // then add storyfragmentNodes
      if (nodes?.storyfragmentNodes) this.addNodes(nodes.storyfragmentNodes);

      this.updateHasPanesStatus();
    }
  }

  linkChildToParent(
    nodeId: string,
    parentId: string,
    specificIndex: number = -1
  ) {
    const parentNode = this.parentNodes.get();
    if (parentNode.has(parentId)) {
      if (specificIndex === -1) {
        parentNode.get(parentId)?.push(nodeId);
      } else {
        parentNode.get(parentId)?.splice(Math.max(0, specificIndex), 0, nodeId);
      }
      this.parentNodes.set(new Map<string, string[]>(parentNode));
    } else {
      parentNode.set(parentId, [nodeId]);
    }
  }

  addNode(data: BaseNode) {
    this.allNodes.get().set(data.id, data);

    // root node
    if (data.parentId === null && this.rootNodeId.get().length === 0) {
      this.rootNodeId.set(data.id);
      return;
    }
    const parentNode = this.parentNodes.get();
    if (!parentNode) return;

    if (data.parentId !== null) {
      // if storyfragment then iterate over its paneIDs
      if (data.nodeType === 'StoryFragment') {
        const storyFragment = data as StoryFragmentNode;
        this.linkChildToParent(data.id, data.parentId);

        storyFragment.paneIds.forEach((paneId: string) => {
          // pane should already exist by now, tell it where it belongs to
          const pane = this.allNodes.get().get(paneId);
          if (pane) {
            pane.parentId = data.id;
          }
          this.linkChildToParent(paneId, data.id);
        });
        // skip panes, they get linked along with story fragment
      } else if (data.nodeType !== 'Pane') {
        this.linkChildToParent(data.id, data.parentId);

        if (data.nodeType === 'Impression') {
          this.impressionNodes.get().add(data as ImpressionNode);
        }
      }
    }
    this.updateHasPanesStatus();
  }

  addNodes(nodes: BaseNode[]) {
    for (const node of nodes) {
      this.addNode(node);
    }
  }

  allowInsert(
    nodeId: string,
    tagNameStr: string
  ): {
    allowInsertBefore: boolean;
    allowInsertAfter: boolean;
  } {
    const node = this.allNodes.get().get(nodeId);
    if (!isDefined(node) || !hasTagName(node)) {
      return { allowInsertBefore: false, allowInsertAfter: false };
    }
    const markdownId = this.getClosestNodeTypeFromId(nodeId, 'Markdown');
    const tagNameIds = this.getChildNodeIDs(markdownId);
    const tagNames = tagNameIds
      .map((id) => {
        const name = this.getNodeTagName(id);
        return toTag(name);
      })
      .filter((name): name is Tag => name !== null);

    const offset = tagNameIds.indexOf(nodeId);
    const tagName = toTag(tagNameStr);

    if (!tagName || !isValidTag(node.tagName)) {
      return { allowInsertBefore: false, allowInsertAfter: false };
    }

    const allowInsertBefore =
      offset > -1
        ? allowInsert(
            node,
            node.tagName as Tag,
            tagName,
            offset ? tagNames[offset - 1] : undefined
          )
        : allowInsert(node, node.tagName as Tag, tagName);

    const allowInsertAfter =
      tagNames.length > offset
        ? allowInsert(node, node.tagName as Tag, tagName, tagNames[offset + 1])
        : allowInsert(node, node.tagName as Tag, tagName);
    return { allowInsertBefore, allowInsertAfter };
  }

  allowInsertLi(
    nodeId: string,
    tagNameStr: string
  ): {
    allowInsertBefore: boolean;
    allowInsertAfter: boolean;
  } {
    const node = this.allNodes.get().get(nodeId);
    if (!isDefined(node) || !hasTagName(node) || !node.parentId) {
      return { allowInsertBefore: false, allowInsertAfter: false };
    }

    const tagNameIds = this.getChildNodeIDs(node.parentId);
    const tagNames = tagNameIds
      .map((id) => {
        const name = this.getNodeTagName(id);
        return toTag(name);
      })
      .filter((name): name is Tag => name !== null);

    const offset = tagNameIds.indexOf(nodeId);
    const tagName = toTag(tagNameStr);

    if (!tagName || !isValidTag(node.tagName)) {
      return { allowInsertBefore: false, allowInsertAfter: false };
    }

    const allowInsertBefore =
      offset > 0
        ? allowInsert(node, node.tagName as Tag, tagName, tagNames[offset - 1])
        : allowInsert(node, node.tagName as Tag, tagName);

    const allowInsertAfter =
      tagNames.length < offset
        ? allowInsert(node, node.tagName as Tag, tagName, tagNames[offset + 1])
        : allowInsert(node, node.tagName as Tag, tagName);

    return { allowInsertBefore, allowInsertAfter };
  }

  getClosestNodeTypeFromId(startNodeId: string, nodeType: NodeType): string {
    const node = this.allNodes.get().get(startNodeId);
    if (!node || node.nodeType === 'Root') return '';

    const parentId = node.parentId || '';
    const parentNode = this.allNodes.get().get(parentId);
    if (parentNode && parentNode.nodeType === nodeType) {
      return parentId;
    } else {
      return this.getClosestNodeTypeFromId(parentId, nodeType);
    }
  }

  getChildNodeByTagNames(startNodeId: string, tagNames: string[]): string {
    const node = this.allNodes.get().get(startNodeId);
    if (!node || node.nodeType === 'Root') return '';

    let firstChildId = '';
    if ('tagName' in node && tagNames.includes(node.tagName as string)) {
      firstChildId = node.id;
      return firstChildId;
    }
    this.getChildNodeIDs(node.id).forEach((childId) => {
      const foundId = this.getChildNodeByTagNames(childId, tagNames);
      if (foundId.length > 0 && firstChildId.length === 0) {
        firstChildId = foundId;
      }
    });
    return firstChildId;
  }

  getParentNodeByTagNames(startNodeId: string, tagNames: string[]): string {
    const node = this.allNodes.get().get(startNodeId);
    if (!node || node.nodeType === 'Root') return '';

    const parentId = node.parentId || '';
    const parentNode = this.allNodes.get().get(parentId);
    if (
      parentNode &&
      'tagName' in parentNode &&
      tagNames.includes(parentNode.tagName as string)
    ) {
      return parentId;
    } else {
      return this.getParentNodeByTagNames(parentId, tagNames);
    }
  }

  getNodeSlug(nodeId: string): string {
    const node = this.allNodes.get().get(nodeId);
    if (!node || !(`slug` in node) || typeof node.slug !== `string`) return '';
    return node.slug;
  }

  getNodeTagName(nodeId: string): string {
    const node = this.allNodes.get().get(nodeId);
    if (!node || !(`tagName` in node) || typeof node.tagName !== `string`)
      return '';
    return node.tagName;
  }

  getIsContextPane(nodeId: string): boolean {
    const node = this.allNodes.get().get(nodeId);
    if (!node || !(`isContextPane` in node)) return false;
    return !!node.isContextPane;
  }

  getMenuNodeById(id: string): MenuNode | null {
    const node = this.allNodes.get().get(id);
    return node?.nodeType === 'Menu' ? (node as MenuNode) : null;
  }

  getTractStackNodeById(id: string): TractStackNode | null {
    const node = this.allNodes.get().get(id);
    return node?.nodeType === 'TractStack' ? (node as TractStackNode) : null;
  }

  getStoryFragmentNodeBySlug(slug: string): StoryFragmentNode | null {
    const nodes = Array.from(this.allNodes.get().values());
    return (
      nodes.find(
        (node): node is StoryFragmentNode =>
          node.nodeType === 'StoryFragment' &&
          'slug' in node &&
          node.slug === slug
      ) || null
    );
  }

  getContextPaneNodeBySlug(slug: string): PaneNode | null {
    const nodes = Array.from(this.allNodes.get().values());
    return (
      nodes.find(
        (node): node is PaneNode =>
          node.nodeType === 'Pane' &&
          'slug' in node &&
          node.slug === slug &&
          'isContextPane' in node &&
          node.isContextPane === true
      ) || null
    );
  }

  getImpressionNodesForPanes(paneIds: string[]): ImpressionNode[] {
    const nodes = Array.from(this.impressionNodes.get().values());
    return nodes.filter(
      (node): node is ImpressionNode =>
        node.nodeType === 'Impression' &&
        typeof node.parentId === `string` &&
        paneIds.includes(node.parentId)
    );
  }

  getPaneSlug(nodeId: string): string | null {
    const node = this.allNodes.get().get(nodeId);
    if (!node || node.nodeType !== 'Pane') {
      return null;
    }
    if (!('slug' in node) || typeof node.slug !== 'string') {
      return null;
    }
    return node.slug;
  }

  getNodeCodeHookPayload(
    nodeId: string
  ): { target: string; params?: Record<string, string> } | null {
    const node = this.allNodes.get().get(nodeId);
    const target =
      node && 'codeHookTarget' in node
        ? (node.codeHookTarget as string)
        : undefined;
    const payload =
      node && 'codeHookPayload' in node
        ? (node.codeHookPayload as Record<string, string>)
        : undefined;

    if (target) {
      return {
        target: target,
        ...(payload && { params: payload }),
      };
    }
    return null;
  }

  getPaneIsDecorative(nodeId: string): boolean {
    const paneNode = this.allNodes.get().get(nodeId) as PaneNode;
    if (paneNode.nodeType !== 'Pane') {
      return false;
    }
    if (paneNode.isDecorative) return true;
    return false;
  }

  getPaneBeliefs(
    nodeId: string
  ): { heldBeliefs: BeliefDatum; withheldBeliefs: BeliefDatum } | null {
    const paneNode = this.allNodes.get().get(nodeId) as PaneNode;
    if (paneNode.nodeType !== 'Pane') {
      return null;
    }

    const beliefs: { heldBeliefs: BeliefDatum; withheldBeliefs: BeliefDatum } =
      {
        heldBeliefs: {},
        withheldBeliefs: {},
      };
    let anyBeliefs = false;
    if ('heldBeliefs' in paneNode) {
      beliefs.heldBeliefs = paneNode.heldBeliefs as BeliefDatum;
      anyBeliefs = true;
    }
    if ('withheldBeliefs' in paneNode) {
      beliefs.withheldBeliefs = paneNode.withheldBeliefs as BeliefDatum;
      anyBeliefs = true;
    }

    return anyBeliefs ? beliefs : null;
  }

  getNodeClasses(
    nodeId: string,
    viewport: ViewportKey,
    depth: number = 0
  ): string {
    const isPreview = this.rootNodeId.get() === `tmp`;
    const node = this.allNodes.get().get(nodeId);
    if (!node) return '';

    switch (node.nodeType) {
      case 'GridLayoutNode': {
        const gridNode = node as GridLayoutNode;
        if (gridNode.parentClasses) {
          const [all, mobile, tablet, desktop] = processClassesForViewports(
            gridNode.parentClasses[depth],
            {}, // No override classes for GridLayout parent case
            1
          );

          if (isPreview) return desktop[0];
          switch (viewport) {
            case 'desktop':
              return desktop[0];
            case 'tablet':
              return tablet[0];
            case 'mobile':
              return mobile[0];
            default:
              return all[0];
          }
        }
        break;
      }

      case 'Markdown':
        {
          const markdownFragment = node as MarkdownPaneFragmentNode;
          if (markdownFragment.parentClasses) {
            const [all, mobile, tablet, desktop] = processClassesForViewports(
              markdownFragment.parentClasses[depth],
              {}, // No override classes for Markdown parent case
              1
            );

            if (isPreview) return desktop[0];
            switch (viewport) {
              case 'desktop':
                return desktop[0];
              case 'tablet':
                return tablet[0];
              case 'mobile':
                return mobile[0];
              default:
                return all[0];
            }
          }
          // Fallback to existing parentCss if needed
          if ('parentCss' in markdownFragment) {
            return (<string[]>markdownFragment.parentCss)[depth];
          }
        }
        break;

      case 'TagElement': {
        const getButtonClasses = (node: FlatNode) => {
          return {
            mobile: strippedStyles(node.buttonPayload?.buttonClasses || {}),
            tablet: {},
            desktop: {},
          };
        };

        const getHoverClasses = (node: FlatNode) => {
          return {
            mobile: strippedStyles(
              node.buttonPayload?.buttonHoverClasses || {}
            ),
            tablet: {},
            desktop: {},
          };
        };

        if (hasButtonPayload(node)) {
          const [classesPayload] = processClassesForViewports(
            getButtonClasses(node),
            {},
            1
          );
          const [classesHoverPayload] = processClassesForViewports(
            getHoverClasses(node),
            {},
            1
          );
          return `${classesPayload?.length ? classesPayload[0] : ``} ${
            classesHoverPayload?.length
              ? addHoverPrefix(classesHoverPayload[0])
              : ``
          }`;
        }

        if ('tagName' in node && node.tagName === 'span') {
          const spanNode = node as FlatNode;
          const [all, mobile, tablet, desktop] = processClassesForViewports(
            { mobile: {}, tablet: {}, desktop: {} },
            spanNode.overrideClasses || {},
            1
          );
          const getClassString = (classes: string[]): string =>
            classes && classes.length > 0 ? classes[0] : '';

          if (isPreview) return getClassString(desktop);
          switch (viewport) {
            case 'desktop':
              return getClassString(desktop);
            case 'tablet':
              return getClassString(tablet);
            case 'mobile':
              return getClassString(mobile);
            default:
              return getClassString(all);
          }
        }

        // Begin Default Class Lookup Logic
        const markdownParentId = this.getClosestNodeTypeFromId(
          nodeId,
          'Markdown'
        );
        if (!markdownParentId) break;

        const markdownParentNode = this.allNodes
          .get()
          .get(markdownParentId) as MarkdownPaneFragmentNode;
        if (!markdownParentNode) break;

        const tagNameStr = (node as FlatNode).tagName as string;

        // By default, assume the markdown node is the source of styles.
        let styleSourceNode: MarkdownPaneFragmentNode | GridLayoutNode =
          markdownParentNode;
        let styles = styleSourceNode.defaultClasses?.[tagNameStr];

        // If the markdown node has no styles for this tag, check for a GridLayout grandparent.
        // This handles the case where the MarkdownNode is a column.
        if (!styles || Object.keys(styles.mobile).length === 0) {
          const grandparent = markdownParentNode.parentId
            ? this.allNodes.get().get(markdownParentNode.parentId)
            : null;

          if (grandparent && isGridLayoutNode(grandparent)) {
            styleSourceNode = grandparent;
            styles = styleSourceNode.defaultClasses?.[tagNameStr];
          }
        }

        const baseStyles =
          styles && styles.mobile
            ? styles
            : { mobile: {}, tablet: {}, desktop: {} };

        const [all, mobile, tablet, desktop] = processClassesForViewports(
          baseStyles,
          (node as FlatNode)?.overrideClasses || {},
          1
        );

        if (isPreview) return desktop[0];
        switch (viewport) {
          case 'desktop':
            return desktop[0];
          case 'tablet':
            return tablet[0];
          case 'mobile':
            return mobile[0];
          default:
            return all[0];
        }
      }

      case 'StoryFragment': {
        const storyFragment = node as StoryFragmentNode;
        return typeof storyFragment?.tailwindBgColour === `string`
          ? `bg-${storyFragment?.tailwindBgColour}`
          : ``;
      }
    }
    return '';
  }

  nodeToNotify(nodeId: string, nodeType: string) {
    switch (nodeType) {
      case `StoryFragment`:
        return `root`;
      case `Pane`:
        if (this.getIsContextPane(nodeId)) return `root`;
        return this.getClosestNodeTypeFromId(nodeId, 'StoryFragment');
      case `TagElement`:
      case `BgPane`:
      case `Markdown`:
      case `Impression`:
        return this.getClosestNodeTypeFromId(nodeId, 'Pane');
      case `Menu`:
        // do nothing
        break;
      default:
        console.warn(`nodeToNotify missed on`, nodeType);
    }
  }

  modifyNodes(
    newData: BaseNode[],
    options?: {
      notify?: boolean;
      recordHistory?: boolean;
      merge?: boolean;
    }
  ) {
    const undoList: ((ctx: NodesContext) => void)[] = [];
    const redoList: ((ctx: NodesContext) => void)[] = [];
    const shouldNotify = options?.notify ?? true;
    const shouldRecordHistory =
      (options?.recordHistory ?? true) && !this.isTemplate.get();

    for (const incomingNode of newData) {
      // Centralized persistence flag: Always mark modified nodes as changed
      const node = { ...incomingNode, isChanged: true };

      const currentNodeData = this.allNodes.get().get(node.id) as BaseNode;
      if (!currentNodeData) continue;

      if (isDeepEqual(currentNodeData, node)) continue;

      if (VERBOSE_HISTORY) {
        console.log(`[Nodes] Modifying ${node.nodeType} (${node.id})`, node);
      }

      const newNodes = new Map(this.allNodes.get());
      newNodes.set(node.id, node);
      this.allNodes.set(newNodes);

      // Check if we need to dirty parents (bubbling changes up)
      switch (node.nodeType) {
        case 'GridLayoutNode':
        case 'TagElement':
        case 'BgPane':
        case 'Markdown': {
          const nodesToDirty: BaseNode[] = [];
          const paneNodeId = this.getClosestNodeTypeFromId(node.id, 'Pane');

          if (paneNodeId) {
            const paneNode = this.allNodes.get().get(paneNodeId);
            if (paneNode && !paneNode.isChanged) {
              nodesToDirty.push({ ...paneNode });
            }
          }

          if (node.parentId) {
            const parentNode = this.allNodes.get().get(node.parentId);
            if (
              parentNode &&
              parentNode.nodeType === 'GridLayoutNode' &&
              !parentNode.isChanged
            ) {
              if (!nodesToDirty.some((n) => n.id === parentNode.id)) {
                nodesToDirty.push({ ...parentNode });
              }
            }
          }

          if (nodesToDirty.length > 0) {
            this.modifyNodes(nodesToDirty, {
              notify: false,
              recordHistory: false,
            });
          }
          break;
        }
      }

      undoList.push((ctx: NodesContext) => {
        const newNodes = new Map(ctx.allNodes.get());
        newNodes.set(node.id, currentNodeData);
        ctx.allNodes.set(newNodes);
        if (shouldNotify) {
          ctx.notifyNode(node.id);
        }
      });
      redoList.push((ctx: NodesContext) => {
        const newNodes = new Map(ctx.allNodes.get());
        newNodes.set(node.id, node);
        ctx.allNodes.set(newNodes);
        if (shouldNotify) {
          ctx.notifyNode(node.id);
        }
      });

      if (shouldNotify) {
        this.notifyNode(node.id);
        const parentNodeToNotify = this.nodeToNotify(node.id, node.nodeType);
        if (parentNodeToNotify && parentNodeToNotify !== node.id) {
          this.notifyNode(parentNodeToNotify);
        } else this.notifyNode('root');
      }
    }

    if (undoList.length > 0 && shouldRecordHistory) {
      this.history.addPatch(
        {
          op: PatchOp.REPLACE,
          undo: (ctx) => {
            undoList.forEach((fn) => fn(ctx));
          },
          redo: (ctx) => {
            redoList.forEach((fn) => fn(ctx));
          },
        },
        { merge: options?.merge }
      );
    }
  }

  getNodeStringStyles(nodeId: string): string {
    const node = this.allNodes.get().get(nodeId);
    return this.getStringBgColorStyle(node);
  }

  getNodeCSSPropertiesStyles(nodeId: string): CSSProperties {
    const node = this.allNodes.get().get(nodeId);
    return this.getPaneBgColorStyle(node);
  }

  getPaneBgColorStyle(node: BaseNode | undefined): CSSProperties {
    if (!node) return {};

    switch (node?.nodeType) {
      case 'Pane': {
        const pane = node as PaneFragmentNode;
        if ('bgColour' in pane) {
          return { backgroundColor: <string>pane.bgColour };
        }
      }
    }
    return {};
  }

  getStringBgColorStyle(node: BaseNode | undefined): string {
    if (!node) return '';
    switch (node?.nodeType) {
      case 'Pane': {
        const pane = node as PaneFragmentNode;
        if ('bgColour' in pane) {
          return `background-color: ${<string>pane.bgColour}`;
        }
      }
    }
    return '';
  }

  addContextTemplatePane(ownerId: string, pane: TemplatePane) {
    const ownerNode = this.allNodes.get().get(ownerId);
    if (ownerNode?.nodeType === 'Pane') {
      const pane = ownerNode as PaneNode;
      if (!pane.isContextPane) {
        return;
      }
    }
    const duplicatedPane = cloneDeep(pane) as TemplatePane;
    duplicatedPane.id = ownerId;
    if (
      ownerNode &&
      'title' in ownerNode &&
      typeof ownerNode.title === `string`
    )
      duplicatedPane.title = ownerNode.title;
    if (ownerNode && 'slug' in ownerNode && typeof ownerNode.slug === `string`)
      duplicatedPane.slug = ownerNode.slug;

    // Track all nodes that need to be added
    // Call the new helper to process markdown, gridLayout, and bgPane
    const allNodes: BaseNode[] = this._processPaneTemplate(
      duplicatedPane,
      ownerId
    );

    if (duplicatedPane.bgPane) {
      delete duplicatedPane.bgPane;
    }
    if (duplicatedPane.markdown) {
      delete duplicatedPane.markdown;
    }
    if (duplicatedPane.gridLayout) {
      delete duplicatedPane.gridLayout;
    }

    duplicatedPane.isChanged = true;
    this.addNode(duplicatedPane as PaneNode);
    this.addNodes(allNodes);
    this.notifyNode(ownerId);

    return ownerId;
  }

  addTemplatePane(
    ownerId: string,
    pane: TemplatePane,
    insertPaneId?: string,
    location?: 'before' | 'after'
  ) {
    const ownerNode = this.allNodes.get().get(ownerId);
    if (
      ownerNode?.nodeType !== 'StoryFragment' &&
      ownerNode?.nodeType !== 'Root' &&
      ownerNode?.nodeType !== 'File' &&
      ownerNode?.nodeType !== 'TractStack'
    ) {
      return;
    }
    const duplicatedPane = cloneDeep(pane) as TemplatePane;
    const duplicatedPaneId = pane?.id || ulid();
    duplicatedPane.id = duplicatedPaneId;
    duplicatedPane.parentId = ownerNode.id;

    if (this.rootNodeId.get() !== 'tmp') {
      if (
        ownerNode.nodeType === 'StoryFragment' &&
        'slug' in ownerNode &&
        'title' in ownerNode &&
        typeof ownerNode.title === `string` &&
        duplicatedPane.slug === '' &&
        duplicatedPane.title === ''
      ) {
        duplicatedPane.slug = `${ownerNode.slug}-${duplicatedPaneId.slice(-4)}`;
        duplicatedPane.title = `${ownerNode.title.slice(0, 20)}-${duplicatedPaneId.slice(-4)}`;
      }
    }

    // Call the new helper to process markdown, gridLayout, and bgPane
    const allNodes: BaseNode[] = this._processPaneTemplate(
      duplicatedPane,
      duplicatedPaneId
    );

    if (duplicatedPane.bgPane) {
      delete duplicatedPane.bgPane;
    }
    if (duplicatedPane.markdown) {
      delete duplicatedPane.markdown;
    }
    if (duplicatedPane.gridLayout) {
      delete duplicatedPane.gridLayout;
    }

    const storyFragmentNode = ownerNode as StoryFragmentNode;
    let specificIdx = -1;
    let elIdx = -1;

    if (
      insertPaneId &&
      location &&
      storyFragmentNode?.nodeType === 'StoryFragment'
    ) {
      specificIdx = storyFragmentNode.paneIds.indexOf(insertPaneId);
      elIdx = specificIdx;
      if (elIdx === -1) {
        storyFragmentNode.paneIds.push(duplicatedPane.id);
      } else {
        if (location === 'before') {
          storyFragmentNode.paneIds.splice(elIdx, 0, duplicatedPane.id);
          specificIdx = Math.max(0, specificIdx - 1);
        } else {
          storyFragmentNode.paneIds.splice(elIdx + 1, 0, duplicatedPane.id);
          specificIdx = Math.min(
            specificIdx + 1,
            storyFragmentNode.paneIds.length
          );
        }
      }
      storyFragmentNode.isChanged = true;
    }

    duplicatedPane.isChanged = true;
    this.addNode(duplicatedPane as PaneNode);
    this.linkChildToParent(
      duplicatedPane.id,
      duplicatedPane.parentId,
      specificIdx
    );
    this.addNodes(allNodes);
    this.notifyNode(ownerId);

    // Combine the pane and all its child nodes for the history patch
    const nodesToHistory = [duplicatedPane as BaseNode, ...allNodes];

    if (!this.isTemplate.get()) {
      if (VERBOSE_HISTORY)
        console.log('[Nodes] Action: addTemplatePane', {
          id: duplicatedPane.id,
          slug: duplicatedPane.slug,
        });
      this.history.addPatch({
        op: PatchOp.ADD,
        undo: (ctx) => {
          // Delete all nodes created (pane + children)
          ctx.deleteNodes(nodesToHistory);

          if (
            storyFragmentNode &&
            storyFragmentNode.nodeType === 'StoryFragment' &&
            Array.isArray(storyFragmentNode.paneIds)
          ) {
            storyFragmentNode.paneIds = storyFragmentNode.paneIds.filter(
              (id: string) => id !== duplicatedPane.id
            );
          }
        },
        redo: (ctx) => {
          if (storyFragmentNode?.nodeType === 'StoryFragment') {
            if (elIdx === -1) {
              storyFragmentNode.paneIds.push(duplicatedPane.id);
            } else {
              if (location === 'before') {
                storyFragmentNode.paneIds.splice(elIdx, 0, duplicatedPane.id);
              } else {
                storyFragmentNode.paneIds.splice(
                  elIdx + 1,
                  0,
                  duplicatedPane.id
                );
              }
            }
          }

          // Add all nodes back (pane + children)
          ctx.addNodes(nodesToHistory);
          ctx.linkChildToParent(
            duplicatedPane.id,
            duplicatedPane.parentId,
            specificIdx
          );
        },
      });
    }

    return duplicatedPaneId;
  }

  handleInsertSignal(tagName: string, nodeId: string) {
    switch (tagName) {
      case `a`:
        settingsPanelStore.set({
          action: `style-link`,
          nodeId: nodeId,
          expanded: true,
        });
        break;
      case `img`:
        settingsPanelStore.set({
          action: `style-image`,
          nodeId: nodeId,
          expanded: true,
        });
        break;
      case `code`:
        settingsPanelStore.set({
          action: `style-widget`,
          nodeId: nodeId,
          expanded: true,
        });
        break;
    }
    this.toolModeValStore.set({ value: 'text' });
    this.notifyNode('root');
  }

  addTemplateImpressionNode(targetId: string, node: ImpressionNode) {
    const targetNode = this.allNodes.get().get(targetId) as BaseNode;
    if (!targetNode || targetNode.nodeType !== 'Pane') {
      return;
    }
    const duplicatedNodes = cloneDeep(node) as TemplateNode;
    const flattenedNodes = this.setupTemplateNodeRecursively(
      duplicatedNodes,
      targetId
    );
    this.addNodes(flattenedNodes);
    if (!this.isTemplate.get()) {
      if (VERBOSE_HISTORY)
        console.log('[Nodes] Action: addTemplateImpressionNode', {
          targetId,
          nodeCount: flattenedNodes.length,
        });
      this.history.addPatch({
        op: PatchOp.ADD,
        undo: (ctx) => ctx.deleteNodes(flattenedNodes),
        redo: (ctx) => ctx.addNodes(flattenedNodes),
      });
    }
  }

  addTemplateNode(
    targetId: string,
    node: TemplateNode,
    insertNodeId?: string,
    location?: 'before' | 'after'
  ): string | null {
    let targetNode = this.allNodes.get().get(targetId) as BaseNode;

    // 1. VALIDATE TARGET NODE
    // Allow Pane, Markdown, or TagElement as valid targets.
    if (
      !targetNode ||
      (targetNode.nodeType !== 'Pane' &&
        targetNode.nodeType !== 'Markdown' &&
        targetNode.nodeType !== 'TagElement')
    ) {
      console.error('addTemplateNode received an invalid targetId.');
      return null;
    }

    // 2. PREPARE PARENT AND STATE VARIABLES
    let parentId =
      targetNode.nodeType === 'Markdown' || targetNode.nodeType === 'Pane'
        ? targetId
        : this.getClosestNodeTypeFromId(targetId, 'Markdown');
    const paneNodeId = this.getClosestNodeTypeFromId(targetId, 'Pane');
    const originalPaneNode = this.allNodes.get().get(paneNodeId)
      ? cloneDeep(this.allNodes.get().get(paneNodeId) as PaneNode)
      : null;

    let autoCreatedMarkdownNode: MarkdownPaneFragmentNode | null = null;

    if (targetNode.nodeType === 'Pane') {
      // Create a minimal markdown node to act as the container
      const newMarkdownNode: MarkdownPaneFragmentNode = {
        id: ulid(),
        nodeType: 'Markdown',
        parentId: targetId,
        type: 'markdown',
        markdownId: ulid(),
        defaultClasses: {},
      };

      autoCreatedMarkdownNode = newMarkdownNode;

      // Add the new markdown node to the state
      this.addNode(newMarkdownNode);

      // Update the parentId to be this new markdown node for the next step
      parentId = newMarkdownNode.id;
    }

    // 4. PREPARE THE NEW ELEMENT NODES
    const duplicatedNodes = cloneDeep(node) as TemplateNode;
    let flattenedNodes: TemplateNode[] = [];

    if (['img', 'code'].includes(duplicatedNodes.tagName)) {
      let closestListNode = '';
      if (
        'tagName' in targetNode &&
        ['ol', 'ul'].includes(targetNode.tagName as string)
      ) {
        closestListNode = targetId;
      } else {
        closestListNode = this.getParentNodeByTagNames(targetId, ['ol', 'ul']);
      }

      if (!closestListNode) {
        const ulNode: TemplateNode = {
          id: ulid(),
          nodeType: 'TagElement',
          tagName: 'ul',
          parentId: parentId,
        };
        const liNode: TemplateNode = {
          id: ulid(),
          nodeType: 'TagElement',
          tagName: 'li',
          tagNameCustom: duplicatedNodes.tagName,
          parentId: ulNode.id,
        };
        duplicatedNodes.parentId = liNode.id;
        flattenedNodes = [
          ulNode,
          liNode,
          ...this.setupTemplateNodeRecursively(duplicatedNodes, liNode.id),
        ];
      } else {
        const liNode: TemplateNode = {
          id: ulid(),
          nodeType: 'TagElement',
          tagName: 'li',
          tagNameCustom: duplicatedNodes.tagName,
          parentId: closestListNode,
        };
        duplicatedNodes.parentId = liNode.id;
        flattenedNodes = [
          liNode,
          ...this.setupTemplateNodeRecursively(duplicatedNodes, liNode.id),
        ];
      }
    } else {
      flattenedNodes = this.setupTemplateNodeRecursively(
        duplicatedNodes,
        parentId
      );
    }

    // 5. PERFORM REMAINING STATE MUTATIONS
    if (originalPaneNode) {
      this.modifyNodes([{ ...originalPaneNode }], {
        notify: false,
        recordHistory: false,
      });
    }

    this.addNodes(flattenedNodes);

    const newTopLevelNodes = flattenedNodes.filter(
      (n) => n.parentId === parentId
    );
    const newTopLevelIds = newTopLevelNodes.map((n) => n.id);

    const parentNodesMap = this.parentNodes.get();
    const parentChildren = parentNodesMap.get(parentId);

    if (insertNodeId && location && parentChildren) {
      const insertIndex = parentChildren.indexOf(insertNodeId);
      if (insertIndex !== -1) {
        const currentChildren = parentChildren.filter(
          (id) => !newTopLevelIds.includes(id)
        );
        if (location === 'before') {
          currentChildren.splice(insertIndex, 0, ...newTopLevelIds);
        } else {
          currentChildren.splice(insertIndex + 1, 0, ...newTopLevelIds);
        }
        parentNodesMap.set(parentId, currentChildren);
      }
    }

    // 6. RECORD THE ENTIRE ATOMIC OPERATION in a single history patch.
    if (!this.isTemplate.get()) {
      if (VERBOSE_HISTORY)
        console.log('[Nodes] Action: addTemplateNode', {
          targetId,
          nodeCount: flattenedNodes.length,
        });
      this.history.addPatch({
        op: PatchOp.ADD,
        undo: (ctx) => {
          // Undo all changes: delete the element and the auto-created markdown node (if it exists)
          ctx.deleteNodes(flattenedNodes);
          if (autoCreatedMarkdownNode) {
            ctx.deleteNodes([autoCreatedMarkdownNode]);
          }
          if (originalPaneNode) {
            const newNodes = new Map(ctx.allNodes.get());
            newNodes.set(originalPaneNode.id, originalPaneNode);
            ctx.allNodes.set(newNodes);
          }
          if (paneNodeId) ctx.notifyNode(paneNodeId);
        },
        redo: (ctx) => {
          // Redo all changes in the correct order
          if (originalPaneNode) {
            ctx.modifyNodes([{ ...originalPaneNode }], {
              notify: false,
              recordHistory: false,
            });
          }
          if (autoCreatedMarkdownNode) {
            ctx.addNode(autoCreatedMarkdownNode);
          }
          ctx.addNodes(flattenedNodes);

          // Re-apply insertion logic
          const parentNodesMap = ctx.parentNodes.get();
          const parentChildren = parentNodesMap.get(parentId);
          if (insertNodeId && location && parentChildren) {
            const insertIndex = parentChildren.indexOf(insertNodeId);
            if (insertIndex !== -1) {
              const currentChildren = parentChildren.filter(
                (id) => !newTopLevelIds.includes(id)
              );
              if (location === 'before') {
                currentChildren.splice(insertIndex, 0, ...newTopLevelIds);
              } else {
                currentChildren.splice(insertIndex + 1, 0, ...newTopLevelIds);
              }
              parentNodesMap.set(parentId, currentChildren);
            }
          }
          if (paneNodeId) ctx.notifyNode(paneNodeId);
        },
      });
    }

    // 7. SEND A SINGLE NOTIFICATION to update the UI.
    if (paneNodeId) {
      this.notifyNode(paneNodeId);
    }

    return flattenedNodes.length > 0 ? flattenedNodes[0].id : null;
  }

  setupTemplateNodeRecursively(node: TemplateNode, parentId: string) {
    let result: TemplateNode[] = [];
    if (!node) return result;

    node.id = ulid();
    node.parentId = parentId;
    const thisNode = cloneDeep(node);
    delete thisNode.nodes;
    result.push(thisNode);
    if ('nodes' in node && node.nodes) {
      for (let i = 0; i < node.nodes.length; ++i) {
        result = result.concat(
          this.setupTemplateNodeRecursively(node.nodes[i], node.id)
        );
      }
    }
    return result;
  }

  deleteChildren(nodeId: string): BaseNode[] {
    const node = this.allNodes.get().get(nodeId);
    if (!node) return [];

    const children = this.getNodesRecursively(node).reverse();
    children.shift();
    const deletedNodes = this.deleteNodes(children);
    this.notifyNode(node.id || '');
    return deletedNodes;
  }

  deleteNode(nodeId: string) {
    // Get the original node
    const originalNode = this.allNodes.get().get(nodeId) as FlatNode;
    if (!originalNode) {
      return;
    }

    // Track if we're redirecting deletion
    let targetNodeId = nodeId;
    let targetNode = originalNode;

    // Case 1: Node is an LI - check if it's the last one in a list
    if (
      originalNode.nodeType === 'TagElement' &&
      'tagName' in originalNode &&
      originalNode.tagName === 'li' &&
      originalNode.parentId
    ) {
      const listNode = this.allNodes
        .get()
        .get(originalNode.parentId) as FlatNode;

      if (
        listNode &&
        'tagName' in listNode &&
        (listNode.tagName === 'ul' || listNode.tagName === 'ol')
      ) {
        // Check if this LI is the last/only one
        const listChildren = this.getChildNodeIDs(listNode.id);
        const isLastLi =
          listChildren.length === 1 && listChildren[0] === nodeId;

        if (isLastLi) {
          // Redirect deletion to the list
          targetNodeId = listNode.id;
          targetNode = listNode;
        }
      }
    }

    // Case 2: Node is an image or code inside an LI
    else if (
      originalNode.nodeType === 'TagElement' &&
      'tagName' in originalNode &&
      (originalNode.tagName === 'img' || originalNode.tagName === 'code')
    ) {
      // Find parent LI
      const liParentId = this.getParentNodeByTagNames(nodeId, ['li']);

      if (liParentId) {
        const liNode = this.allNodes.get().get(liParentId) as FlatNode;

        // Check if this is the only child of the LI
        const liChildren = this.getChildNodeIDs(liParentId);

        // Calculate if content is the only significant child
        // (there might be text nodes with whitespace)
        const significantChildrenCount = liChildren.filter((childId) => {
          const child = this.allNodes.get().get(childId) as FlatNode;
          if (!child) return false;

          // Skip text nodes with only whitespace
          if (
            child.tagName === 'text' &&
            (!child.copy || child.copy.trim() === '')
          ) {
            return false;
          }
          return true;
        }).length;

        const isOnlySignificantChild = significantChildrenCount === 1;

        if (isOnlySignificantChild && liNode?.parentId) {
          // Find list container (UL/OL)
          const listNode = this.allNodes.get().get(liNode.parentId) as FlatNode;

          if (
            listNode &&
            'tagName' in listNode &&
            (listNode.tagName === 'ul' || listNode.tagName === 'ol')
          ) {
            // Check if this LI is the last/only one
            const listChildren = this.getChildNodeIDs(listNode.id);
            const isLastLi =
              listChildren.length === 1 && listChildren[0] === liParentId;

            if (isLastLi) {
              // Redirect deletion to the list
              targetNodeId = listNode.id;
              targetNode = listNode;
            } else {
              // Redirect to the LI instead
              targetNodeId = liParentId;
              targetNode = liNode;
            }
          }
        }
      }
    }

    // Continue with normal deletion logic using the target node
    const parentId = targetNode.parentId;
    const toDelete = this.getNodesRecursively(targetNode).reverse();
    const closestMarkdownId = this.getClosestNodeTypeFromId(
      targetNode.id,
      'Markdown'
    );

    this.deleteNodes(toDelete);
    let paneIdx: number = -1;

    // Process based on node type
    if (parentId !== null) {
      if (targetNode.nodeType === 'Pane') {
        const storyFragment = this.allNodes
          .get()
          .get(parentId) as StoryFragmentNode;
        if (storyFragment) {
          // Use modifyNodes to ensure StoryFragment is marked dirty (isChanged: true)
          // We disable history recording here because we create a specific REMOVE patch below
          const updatedFragment = cloneDeep(storyFragment);
          paneIdx = updatedFragment.paneIds.indexOf(targetNodeId);
          if (paneIdx !== -1) {
            updatedFragment.paneIds.splice(paneIdx, 1);
            this.modifyNodes([updatedFragment], { recordHistory: false });
          }
        }
      } else if (targetNode.nodeType === 'TagElement') {
        // mark pane as changed
        const paneNodeId = this.getClosestNodeTypeFromId(
          closestMarkdownId,
          'Pane'
        );
        if (paneNodeId) {
          const paneNode = cloneDeep(
            this.allNodes.get().get(paneNodeId)
          ) as PaneNode;
          if (paneNode) {
            this.modifyNodes([{ ...paneNode }]);
          }
        }
      }
    } else {
      if (targetNodeId === this.rootNodeId.get()) {
        this.rootNodeId.set('');
      }
    }

    this.notifyNode(ROOT_NODE_NAME);

    if (!this.isTemplate.get()) {
      if (VERBOSE_HISTORY)
        console.log('[Nodes] Action: deleteNode', {
          targetNodeId,
          deletedCount: toDelete.length,
        });
      this.history.addPatch({
        op: PatchOp.REMOVE,
        undo: (ctx) => {
          ctx.addNodes(toDelete);
          if (targetNode.nodeType === 'Pane' && parentId !== null) {
            const storyFragment = ctx.allNodes
              .get()
              .get(parentId) as StoryFragmentNode;
            if (storyFragment) {
              // Use modifyNodes in Undo to correctly restore state and links
              const updatedFragment = cloneDeep(storyFragment);
              updatedFragment.paneIds.splice(paneIdx, 0, targetNodeId);
              ctx.modifyNodes([updatedFragment], { recordHistory: false });
              ctx.linkChildToParent(targetNodeId, parentId, paneIdx);
            }
          }
        },
        redo: (ctx) => {
          ctx.deleteNodes(toDelete);
          // Ensure Redo also updates the parent StoryFragment correctly
          if (targetNode.nodeType === 'Pane' && parentId !== null) {
            const storyFragment = ctx.allNodes
              .get()
              .get(parentId) as StoryFragmentNode;
            if (storyFragment) {
              const updatedFragment = cloneDeep(storyFragment);
              const idx = updatedFragment.paneIds.indexOf(targetNodeId);
              if (idx !== -1) {
                updatedFragment.paneIds.splice(idx, 1);
                ctx.modifyNodes([updatedFragment], { recordHistory: false });
              }
            }
          }
        },
      });
    }
  }

  getNodesRecursively(node: BaseNode | undefined): BaseNode[] {
    let nodes: BaseNode[] = [];
    if (!node) return nodes;

    this.getChildNodeIDs(node.id).forEach((id) => {
      const collectedNodes = this.getNodesRecursively(
        this.allNodes.get().get(id)
      );
      nodes = collectedNodes.concat(nodes);
    });

    nodes.push(node);
    return nodes;
  }

  moveNode(nodeId: string, location: 'before' | 'after') {
    const node = this.allNodes.get().get(nodeId);
    if (!node || node.nodeType === 'Root') return;

    if (node.parentId) {
      const children = this.getChildNodeIDs(node.parentId);
      const idx = children.indexOf(nodeId);
      if (idx !== -1) {
        const newPosNodeId = children.at(
          location === 'before'
            ? Math.max(idx - 1, 0)
            : Math.min(idx + 1, children.length - 1)
        );
        if (newPosNodeId) {
          this.moveNodeTo(nodeId, newPosNodeId, location);
        }
      }
    }
  }

  moveNodeTo(
    nodeId: string,
    insertNodeId: string,
    location: 'before' | 'after'
  ) {
    const node = this.allNodes.get().get(nodeId);
    if (!node || node.nodeType === 'Root') return;

    const newLocationNode = this.allNodes.get().get(insertNodeId);
    if (!newLocationNode) return;

    if (nodeId === insertNodeId) return;

    if (node.nodeType !== newLocationNode.nodeType) {
      console.warn(
        `Trying to move nodes ${nodeId} and ${insertNodeId} but they're belong to different types`
      );
      return;
    }

    const oldParentId = node.parentId || '';
    const oldParentNodes = this.getChildNodeIDs(oldParentId);
    const originalIdx = oldParentNodes.indexOf(nodeId);

    // Capture original state for history
    let originalPaneIds: string[] | null = null;
    if (node.nodeType === 'Pane') {
      const storyFragmentId = this.getClosestNodeTypeFromId(
        node.id,
        'StoryFragment'
      );
      const storyFragment = this.allNodes
        .get()
        .get(storyFragmentId) as StoryFragmentNode;
      if (storyFragment) {
        originalPaneIds = [...storyFragment.paneIds];
      }
    }

    moveNodeAtLocationInContext(
      oldParentNodes,
      originalIdx,
      newLocationNode,
      insertNodeId,
      nodeId,
      location,
      node,
      this
    );

    if (node.nodeType === 'Pane') {
      const storyFragmentId = this.getClosestNodeTypeFromId(
        node.id,
        'StoryFragment'
      );
      const storyFragment = cloneDeep(
        this.allNodes.get().get(storyFragmentId)
      ) as StoryFragmentNode;
      if (storyFragment) {
        this.modifyNodes([{ ...storyFragment }]);
      }
    } else {
      const parentNode = this.nodeToNotify(
        newLocationNode?.parentId || '',
        newLocationNode.nodeType
      );
      this.notifyNode(parentNode || '');
    }

    if (!this.isTemplate.get()) {
      if (VERBOSE_HISTORY)
        console.log('[Nodes] Action: moveNodeTo', {
          nodeId,
          insertNodeId,
          location,
        });
      this.history.addPatch({
        op: PatchOp.REPLACE,
        undo: (ctx) => {
          const oldParentNodes = ctx.getChildNodeIDs(node.parentId || '');
          const newParentNodes = ctx.getChildNodeIDs(
            newLocationNode.parentId || ''
          );
          if (newParentNodes) {
            newParentNodes.splice(newParentNodes.indexOf(nodeId), 1);
          }
          if (oldParentNodes) {
            oldParentNodes.splice(originalIdx, 0, nodeId);
          }
          node.parentId = oldParentId;

          if (node.nodeType === 'Pane' && originalPaneIds) {
            const storyFragmentId = ctx.getClosestNodeTypeFromId(
              node.id,
              'StoryFragment'
            );
            const storyFragment = cloneDeep(
              ctx.allNodes.get().get(storyFragmentId)
            ) as StoryFragmentNode;
            if (storyFragment) {
              storyFragment.paneIds = [...originalPaneIds];
              this.modifyNodes([{ ...storyFragment }]);
            }
          }

          //const parentNode = ctx.nodeToNotify(node?.parentId || "", node.nodeType);
          ctx.notifyNode(node.id || '');
        },
        redo: (ctx) => {
          moveNodeAtLocationInContext(
            oldParentNodes,
            originalIdx,
            newLocationNode,
            insertNodeId,
            nodeId,
            location,
            node,
            ctx
          );

          if (node.nodeType === 'Pane') {
            const storyFragmentId = ctx.getClosestNodeTypeFromId(
              node.id,
              'StoryFragment'
            );
            const storyFragment = cloneDeep(
              ctx.allNodes.get().get(storyFragmentId)
            ) as StoryFragmentNode;
            if (storyFragment) {
              this.modifyNodes([{ ...storyFragment }]);
            }
          }
        },
      });
    }
  }

  getPaneImageFileIds(paneId: string): string[] {
    const paneNode = this.allNodes.get().get(paneId);
    if (!paneNode || paneNode.nodeType !== 'Pane') return [];
    const pane = paneNode as PaneNode;

    // 1. Extract from Creative AST (if present)
    let creativeFileIds: string[] = [];
    if (pane.htmlAst) {
      creativeFileIds = extractFileIdsFromAst(pane.htmlAst);
    }

    // 2. Extract from Standard Nodes (TagElement, BgPane)
    const allNodes = this.getNodesRecursively(paneNode);

    const embeddedFileIds = allNodes
      .filter(
        (node): node is FlatNode =>
          node.nodeType === 'TagElement' &&
          'tagName' in node &&
          node.tagName === 'img' &&
          'fileId' in node &&
          typeof node.fileId === 'string'
      )
      .map((node) => node.fileId)
      .filter((id): id is string => id !== undefined);

    const bgFileIds = allNodes
      .filter(
        (node): node is any =>
          node.nodeType === 'BgPane' &&
          'type' in node &&
          node.type === 'background-image' &&
          'fileId' in node &&
          typeof node.fileId === 'string'
      )
      .map((node) => node.fileId)
      .filter((id): id is string => id !== undefined);

    // 3. Merge unique IDs
    return Array.from(
      new Set([...embeddedFileIds, ...bgFileIds, ...creativeFileIds])
    );
  }

  getPaneImagesMap(): Record<string, string[]> {
    const paneNodes = Array.from(this.allNodes.get().values()).filter(
      (node): node is PaneNode => node.nodeType === 'Pane'
    );
    const result: Record<string, string[]> = {};
    paneNodes.forEach((pane) => {
      const fileIds = this.getPaneImageFileIds(pane.id);
      if (fileIds.length > 0) {
        result[pane.id] = fileIds;
      }
    });
    return result;
  }

  insertPaneId(
    storyfragmentId: string,
    paneId: string,
    insertId?: string,
    location?: 'before' | 'after'
  ) {
    const storyfragment = this.allNodes
      .get()
      .get(storyfragmentId) as StoryFragmentNode;
    if (!storyfragment || storyfragment.nodeType !== 'StoryFragment') {
      console.warn('Invalid storyfragment ID in insertPaneId');
      return;
    }

    const newPaneIds = [...storyfragment.paneIds];

    if (!insertId) {
      newPaneIds.push(paneId);
    } else {
      const insertIdx = newPaneIds.indexOf(insertId);
      if (insertIdx === -1) {
        console.warn('Insert reference pane not found, adding to end.');
        newPaneIds.push(paneId);
      } else {
        const targetIdx = location === 'before' ? insertIdx : insertIdx + 1;
        newPaneIds.splice(targetIdx, 0, paneId);
      }
    }

    // Create the updated node object with a clear type
    const updatedStoryFragment: StoryFragmentNode = {
      ...storyfragment,
      paneIds: newPaneIds,
    };

    // Pass the correctly typed object to modifyNodes
    this.modifyNodes([updatedStoryFragment]);
  }

  isSlugValid(
    slug: string,
    currentNodeId?: string
  ): { isValid: boolean; error?: string } {
    // Early validation for empty slugs
    if (!slug || slug.length < 3) {
      return { isValid: false, error: 'Slug must be at least 3 characters' };
    }
    // Check against reserved slugs
    if (reservedSlugs.includes(slug)) {
      return {
        isValid: false,
        error: 'This URL is reserved and cannot be used',
      };
    }
    // Check if slug contains only valid characters (alphanumeric, hyphens)
    const validSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!validSlugPattern.test(slug)) {
      return {
        isValid: false,
        error: 'Slug can only contain lowercase letters, numbers, and hyphens',
      };
    }
    // Check for duplicate slugs
    const nodes = Array.from(this.allNodes.get().values());
    const duplicateNode = nodes.find(
      (node) =>
        (node.nodeType === 'StoryFragment' || node.nodeType === 'Pane') &&
        'slug' in node &&
        node.slug === slug &&
        node.id !== currentNodeId
    );
    if (duplicateNode) {
      return {
        isValid: false,
        error: `This URL is already in use by ${duplicateNode.nodeType === 'Pane' ? 'pane' : 'page'}: ${(duplicateNode as PaneNode).title}`,
      };
    }
    return { isValid: true };
  }

  generateValidSlug(title: string, currentNodeId?: string): string {
    // Convert title to lowercase and replace spaces/special chars with hyphens
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    // If the base slug is already valid and unique, use it
    if (this.isSlugValid(slug, currentNodeId)) {
      return slug;
    }
    // Otherwise, append numbers until we find a unique slug
    let counter = 1;
    let newSlug = slug;
    while (!this.isSlugValid(newSlug, currentNodeId)) {
      newSlug = `${slug}-${counter}`;
      counter++;
    }
    return newSlug;
  }

  isBunnyVideoNode(node: BaseNode): boolean {
    if (node.nodeType === 'Pane' && 'codeHookTarget' in node) {
      return (node as PaneNode).codeHookTarget === 'bunny-video';
    }
    if (node.nodeType === 'TagElement' && 'tagName' in node) {
      const flatNode = node as FlatNode;
      return (
        flatNode.tagName === 'code' &&
        'codeHookParams' in flatNode &&
        Array.isArray(flatNode.codeHookParams) &&
        typeof flatNode.copy === 'string' &&
        flatNode.copy.includes('bunny(')
      );
    }
    return false;
  }

  getBunnyVideoUrl(nodeId: string): string | string[] | null {
    const node = this.allNodes.get().get(nodeId);
    if (!node) return null;

    if (node.nodeType === 'Pane' && 'codeHookPayload' in node) {
      const paneNode = node as PaneNode;
      try {
        if (
          paneNode.codeHookPayload &&
          typeof paneNode.codeHookPayload.options === 'string'
        ) {
          const options = JSON.parse(paneNode.codeHookPayload.options);
          return options.videoUrl || null;
        }
      } catch (error) {
        console.error('Error parsing Bunny video options:', error);
      }
    }

    if (node.nodeType === 'TagElement' && 'codeHookParams' in node) {
      const flatNode = node as FlatNode;
      if (
        Array.isArray(flatNode.codeHookParams) &&
        flatNode.codeHookParams.length > 0
      ) {
        return flatNode.codeHookParams[0];
      }
    }

    return null;
  }

  getAllBunnyVideoInfo(): { url: string; title: string; videoId: string }[] {
    const results: { url: string; title: string; videoId: string }[] = [];
    const processedVideoIds = new Set<string>();
    const allNodes = Array.from(this.allNodes.get().values());
    const BUNNY_EMBED_BASE_URL = 'https://iframe.mediadelivery.net/embed/';

    // Process pane-level bunny videos (which use full URLs)
    const paneNodes = allNodes.filter(
      (node) =>
        node.nodeType === 'Pane' &&
        'codeHookTarget' in node &&
        node.codeHookTarget === 'bunny-video'
    ) as PaneNode[];

    for (const paneNode of paneNodes) {
      try {
        if (
          paneNode.codeHookPayload &&
          typeof paneNode.codeHookPayload.options === 'string'
        ) {
          const options = JSON.parse(paneNode.codeHookPayload.options);
          const url = options.videoUrl || '';
          const title = options.title || 'Untitled Video';

          if (url && typeof url === 'string') {
            let videoId = '';
            try {
              const urlObj = new URL(url);
              if (
                urlObj.hostname === 'iframe.mediadelivery.net' &&
                urlObj.pathname.startsWith('/embed/')
              ) {
                const pathParts = urlObj.pathname.split('/');
                if (pathParts.length >= 4) {
                  videoId = `${pathParts[2]}/${pathParts[3]}`;
                }
              }
            } catch (error) {
              console.error('Error extracting video ID from URL:', error);
            }

            if (videoId && !processedVideoIds.has(videoId)) {
              results.push({
                url: url,
                title: typeof title === 'string' ? title : 'Untitled Video',
                videoId,
              });
              processedVideoIds.add(videoId);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing Bunny video options:', error);
      }
    }

    // Process inline bunny widgets (which use ID/GUID fragments)
    const codeNodes = allNodes.filter(
      (node) =>
        node.nodeType === 'TagElement' &&
        'tagName' in node &&
        node.tagName === 'code' &&
        'codeHookParams' in node &&
        'copy' in node &&
        typeof node.copy === 'string' &&
        node.copy.includes('bunny(')
    ) as FlatNode[];

    for (const codeNode of codeNodes) {
      if (
        Array.isArray(codeNode.codeHookParams) &&
        codeNode.codeHookParams.length > 0
      ) {
        const videoId = String(codeNode.codeHookParams[0] || '');
        const title = String(codeNode.codeHookParams[1] || 'Untitled Video');

        if (videoId && /^\d+\/[a-f0-9\-]{36}$/.test(videoId)) {
          if (!processedVideoIds.has(videoId)) {
            results.push({
              url: `${BUNNY_EMBED_BASE_URL}${videoId}`,
              title,
              videoId,
            });
            processedVideoIds.add(videoId);
          }
        }
      }
    }
    return results;
  }

  mapNodeHierarchy(nodes: TemplateNode[]) {
    const nodeMap: Record<string, any> = {};

    // First pass - create entries for all nodes
    nodes.forEach((node) => {
      nodeMap[node.id] = {
        id: node.id,
        nodeType: node.nodeType,
        tagName: node.tagName || 'N/A',
        parentId: node.parentId,
        children: [],
      };
    });

    // Second pass - build the hierarchy
    nodes.forEach((node) => {
      if (node.parentId && nodeMap[node.parentId]) {
        nodeMap[node.parentId].children.push(nodeMap[node.id]);
      }
    });

    // Return only the root nodes (those whose parents aren't in our node set)
    return nodes
      .filter((node) => !node.parentId || !nodeMap[node.parentId])
      .map((node) => nodeMap[node.id]);
  }

  getDirtyNodesClassData(): { dirtyPaneIds: string[]; classes: string[] } {
    const dirtyNodes = this.getDirtyNodes();
    const dirtyPaneIds = dirtyNodes
      .filter((node) => node.nodeType === 'Pane')
      .map((node) => node.id);

    // Collect all nodes that need class extraction
    const allNodesToExtract: BaseNode[] = [];

    // Find root dirty nodes (dirty nodes whose parents are NOT dirty)
    const dirtyNodeIds = new Set(dirtyNodes.map((n) => n.id));
    const rootDirtyNodes = dirtyNodes.filter(
      (node) => !node.parentId || !dirtyNodeIds.has(node.parentId)
    );

    // For each root dirty node, traverse all descendants
    rootDirtyNodes.forEach((rootNode) => {
      // Add the root node itself
      allNodesToExtract.push(rootNode);

      // Traverse all descendants using breadth-first
      const queue = [...this.getChildNodeIDs(rootNode.id)];
      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId) continue;

        const currentNode = this.allNodes.get().get(currentId);
        if (currentNode) {
          allNodesToExtract.push(currentNode);
          const childrenIds = this.getChildNodeIDs(currentId);
          queue.push(...childrenIds);
        }
      }
    });

    const classes = extractClassesFromNodes(allNodesToExtract);

    return { dirtyPaneIds, classes };
  }

  /**
   * "Unwraps" a formatting node (like <strong> or <em>), merging its text
   * content with any adjacent text nodes.
   * @param nodeId - The ID of the formatting node (e.g., the <strong> tag) to unwrap.
   */
  unwrapNode(nodeId: string) {
    const formatNode = this.allNodes.get().get(nodeId) as FlatNode;
    if (!formatNode || !formatNode.parentId) {
      console.warn('unwrapNode: Node or parentId not found.');
      return;
    }

    const parentId = formatNode.parentId;
    const parentNode = this.allNodes.get().get(parentId) as FlatNode;
    if (!parentNode) {
      console.warn('unwrapNode: Parent node not found.');
      return;
    }

    // --- 1. Gather all node information for the operation ---

    // Get the children of the formatting node (these are the nodes we want to keep)
    const childrenToKeepIds = this.getChildNodeIDs(nodeId);
    const childrenToKeepNodes = childrenToKeepIds
      .map((id) => this.allNodes.get().get(id))
      .filter((n): n is BaseNode => n !== undefined);

    // Get the siblings of the formatting node
    const parentChildrenIds = this.getChildNodeIDs(parentId);
    const formatNodeIndex = parentChildrenIds.indexOf(nodeId);
    if (formatNodeIndex === -1) {
      console.warn('unwrapNode: Node not found in parent children list.');
      return;
    }

    // Find adjacent siblings
    const prevSiblingId =
      formatNodeIndex > 0 ? parentChildrenIds[formatNodeIndex - 1] : null;
    const nextSiblingId =
      formatNodeIndex < parentChildrenIds.length - 1
        ? parentChildrenIds[formatNodeIndex + 1]
        : null;

    const prevSibling = prevSiblingId
      ? (this.allNodes.get().get(prevSiblingId) as FlatNode)
      : null;
    const nextSibling = nextSiblingId
      ? (this.allNodes.get().get(nextSiblingId) as FlatNode)
      : null;

    // Check if siblings are 'text' nodes
    const isPrevText =
      prevSibling &&
      prevSibling.nodeType === 'TagElement' &&
      prevSibling.tagName === 'text';
    const isNextText =
      nextSibling &&
      nextSibling.nodeType === 'TagElement' &&
      nextSibling.tagName === 'text';

    // Get the combined text content from the formatting node's children
    const unwrappedText = childrenToKeepNodes
      .map((n) => (n as FlatNode).copy || '')
      .join('');

    // --- 2. Prepare state snapshots for history ---
    const originalAllNodes = new Map(this.allNodes.get());
    const originalParentNodes = new Map(this.parentNodes.get());
    const originalPaneNode = cloneDeep(
      this.allNodes
        .get()
        .get(this.getClosestNodeTypeFromId(nodeId, 'Pane')) as PaneNode
    );

    // --- 3. Define the atomic "redo" (forward) operation ---
    const applyUnwrap = () => {
      const newAllNodes = new Map(this.allNodes.get());
      const newParentNodes = new Map(this.parentNodes.get());
      const newParentChildren = [...(newParentNodes.get(parentId) || [])];

      const nodesToDelete = [formatNode, ...childrenToKeepNodes];
      const nodesToModify: BaseNode[] = [];
      const nodesToAdd: BaseNode[] = [];

      let mergedText = unwrappedText;
      let targetNode: FlatNode | null = null;

      if (isPrevText && prevSibling) {
        // --- Merge with PREVIOUS sibling ---
        mergedText = (prevSibling.copy || '') + mergedText;
        targetNode = cloneDeep(prevSibling);

        if (isNextText && nextSibling) {
          // --- Also merge with NEXT sibling (3-way merge) ---
          mergedText += nextSibling.copy || '';
          nodesToDelete.push(nextSibling);
          // Remove nextSibling from parent's children list
          const nextSiblingIndex = newParentChildren.indexOf(nextSiblingId!);
          if (nextSiblingIndex > -1) {
            newParentChildren.splice(nextSiblingIndex, 1);
          }
        }

        targetNode.copy = mergedText;
        nodesToModify.push(targetNode);
      } else if (isNextText && nextSibling) {
        // --- Merge with NEXT sibling only ---
        mergedText = mergedText + (nextSibling.copy || '');
        targetNode = cloneDeep(nextSibling);
        targetNode.copy = mergedText;
        nodesToModify.push(targetNode);
      } else {
        // --- No merge. Just insert unwrapped text as new node(s) ---
        // For simplicity, we merge all children into a single new text node
        const newTextNode: FlatNode = {
          id: ulid(),
          nodeType: 'TagElement',
          parentId: parentId,
          tagName: 'text',
          copy: unwrappedText,
        };
        nodesToAdd.push(newTextNode);
        // Add new text node to parent's children list
        newParentChildren.splice(formatNodeIndex, 0, newTextNode.id);
      }

      // Apply deletions
      for (const node of nodesToDelete) {
        newAllNodes.delete(node.id);
        const childIndex = newParentChildren.indexOf(node.id);
        if (childIndex > -1) {
          newParentChildren.splice(childIndex, 1);
        }
        // Remove from parentNodes map if it's a parent itself (unlikely for text)
        newParentNodes.delete(node.id);
      }

      // Apply modifications
      for (const node of nodesToModify) {
        newAllNodes.set(node.id, node);
      }

      // Apply additions
      for (const node of nodesToAdd) {
        newAllNodes.set(node.id, node);
      }

      // Update the parent's children array in the map
      newParentNodes.set(parentId, newParentChildren);

      // Set the new state
      this.allNodes.set(newAllNodes);
      this.parentNodes.set(newParentNodes);

      // Mark pane as dirty
      this.modifyNodes([{ ...originalPaneNode }], {
        notify: false,
        recordHistory: false,
      });

      this.notifyNode(`root`);
    };

    // --- 4. Define the atomic "undo" (backward) operation ---
    const applyRewrap = () => {
      // Just restore the original maps
      this.allNodes.set(originalAllNodes);
      this.parentNodes.set(originalParentNodes);

      // Restore original pane state
      this.modifyNodes([originalPaneNode], {
        notify: false,
        recordHistory: false,
      });

      this.notifyNode(`root`);
    };

    // --- 5. Execute the operation and add to history ---
    applyUnwrap();

    if (!this.isTemplate.get()) {
      if (VERBOSE_HISTORY)
        console.log('[Nodes] Action: unwrapNode', { nodeId });
      this.history.addPatch({
        op: PatchOp.REPLACE, // Using REPLACE as it's a complex operation
        undo: () => applyRewrap(),
        redo: () => applyUnwrap(),
      });
    }
  }

  private deleteNodes(nodesList: BaseNode[]): BaseNode[] {
    const deletedNodes: BaseNode[] = [];

    nodesList.forEach((node) => {
      if (!node) return;

      // Remove node
      const allNodes = this.allNodes.get();
      if (allNodes.delete(node.id)) {
        deletedNodes.push(node);
      }

      // Remove parent link
      if (node?.parentId !== null) {
        const parentNodes = this.parentNodes.get();
        const parentNode = parentNodes.get(node.parentId);
        if (parentNode) {
          parentNode.splice(parentNode.indexOf(node.id), 1);
          this.parentNodes.set(new Map<string, string[]>(parentNodes));
        }
      }
    });

    return deletedNodes;
  }

  /**
   * Processes a TemplatePane's content (markdown, grid, or bgPane) and
   * returns a flat list of all nodes to be added to the store.
   * This is a de-duplicated helper used by addTemplatePane and addContextTemplatePane.
   * @param paneTemplate - The TemplatePane object to process.
   * @param newPaneId - The ID of the parent Pane node.
   * @returns An array of BaseNode objects to be added to allNodes.
   */
  private _processPaneTemplate(
    paneTemplate: TemplatePane,
    newPaneId: string
  ): BaseNode[] {
    if (paneTemplate.htmlAst) {
      // No nodes when in htmlAst mode
      return [];
    }

    let allNodes: BaseNode[] = [];

    // 1. Process Markdown Content
    if (paneTemplate.markdown) {
      const duplicatedMarkdown = cloneDeep(
        paneTemplate.markdown
      ) as TemplateMarkdown;
      duplicatedMarkdown.id = paneTemplate.markdown.id || ulid();
      duplicatedMarkdown.markdownId =
        paneTemplate.markdown.markdownId || ulid();
      duplicatedMarkdown.parentId = newPaneId;

      let markdownNodes: TemplateNode[] = [];
      if (duplicatedMarkdown.markdownBody) {
        const markdownGen = new MarkdownGenerator(this);
        markdownNodes = markdownGen.markdownToFlatNodes(
          duplicatedMarkdown.markdownBody,
          duplicatedMarkdown.id
        ) as TemplateNode[];
        allNodes = [...allNodes, duplicatedMarkdown, ...markdownNodes];
      } else if (
        typeof duplicatedMarkdown !== `undefined` &&
        typeof duplicatedMarkdown.id === `string`
      ) {
        // Create a map to track the original node ID to its duplicated node ID
        const oldToNewIdMap = new Map<string, string>();
        // First pass: Clone nodes and generate new IDs
        const nodesClone =
          duplicatedMarkdown.nodes?.map((originalNode) => {
            const newNode = cloneDeep(originalNode);
            newNode.id = ulid();
            oldToNewIdMap.set(originalNode.id, newNode.id);
            return newNode;
          }) || [];
        // Second pass: Update parent IDs using the mapping
        nodesClone.forEach((node) => {
          // Special case for direct children of markdown
          if (node.parentId === paneTemplate.markdown?.id) {
            node.parentId = duplicatedMarkdown.id;
          } else {
            // For all other nodes, use the mapping to find the new parent ID
            const newParentId = oldToNewIdMap.get(node.parentId || '');
            if (newParentId) {
              node.parentId = newParentId;
            }
          }
          markdownNodes.push(node);
        });
        allNodes = [...allNodes, duplicatedMarkdown, ...markdownNodes];
      }

      // 2. Process GridLayout Content
    } else if (paneTemplate.gridLayout) {
      const duplicatedGrid = cloneDeep(
        paneTemplate.gridLayout
      ) as TemplateGridLayout;
      duplicatedGrid.id = paneTemplate.gridLayout.id || ulid();
      duplicatedGrid.parentId = newPaneId;
      allNodes.push(duplicatedGrid as GridLayoutNode);

      // Map for all nodes within the grid
      const oldToNewIdMap = new Map<string, string>();

      // First pass: Collect all column nodes and their descendant nodes
      const allOriginalNodes: TemplateNode[] = [];
      const columnNodes: TemplateMarkdown[] = [];

      // Instantiate generator for column markdown parsing
      const markdownGen = new MarkdownGenerator(this);

      duplicatedGrid.nodes?.forEach((originalColumn) => {
        const newColumn = cloneDeep(originalColumn);
        newColumn.id = ulid();
        newColumn.markdownId = ulid();
        oldToNewIdMap.set(originalColumn.id, newColumn.id);
        columnNodes.push(newColumn);

        if (originalColumn.markdownBody) {
          const columnContentNodes = markdownGen.markdownToFlatNodes(
            originalColumn.markdownBody,
            newColumn.id
          ) as TemplateNode[];
          // Add generated nodes directly to allNodes
          allNodes.push(...columnContentNodes);
        } else {
          // Standard flow: collect existing nodes for remapping
          originalColumn.nodes?.forEach((colNode) => {
            allOriginalNodes.push(colNode);
          });
        }
      });

      // Second pass: Clone all descendant nodes (only those from the standard flow)
      const allClonedDescendants = allOriginalNodes.map((originalNode) => {
        const newNode = cloneDeep(originalNode);
        newNode.id = ulid();
        oldToNewIdMap.set(originalNode.id, newNode.id);
        return newNode;
      });

      // Third pass: Re-map parent IDs for columns
      columnNodes.forEach((col) => {
        col.parentId = duplicatedGrid.id;
        allNodes.push(col as MarkdownPaneFragmentNode);
      });

      // Fourth pass: Re-map parent IDs for all descendants
      allClonedDescendants.forEach((node) => {
        const newParentId = oldToNewIdMap.get(node.parentId || '');
        if (newParentId) {
          node.parentId = newParentId;
        }
        allNodes.push(node);
      });
    }

    // 3. Process Background Pane
    if (paneTemplate.bgPane) {
      const bgPaneId = ulid();

      if (paneTemplate.bgPane.type === 'visual-break') {
        const visualBreakPane = paneTemplate.bgPane as VisualBreakNode;
        const bgPaneNode: VisualBreakNode = {
          id: bgPaneId,
          nodeType: 'BgPane',
          parentId: newPaneId,
          type: 'visual-break',
          breakDesktop: visualBreakPane.breakDesktop,
          breakTablet: visualBreakPane.breakTablet,
          breakMobile: visualBreakPane.breakMobile,
        };
        allNodes.push(bgPaneNode);
      } else if (paneTemplate.bgPane.type === 'background-image') {
        const bgImagePane = paneTemplate.bgPane as BgImageNode;
        const bgPaneNode: BgImageNode = {
          ...bgImagePane,
          id: bgPaneId,
          nodeType: 'BgPane',
          parentId: newPaneId,
        };
        allNodes.push(bgPaneNode);
      } else if (paneTemplate.bgPane.type === 'artpack-image') {
        const artpackBgPane = paneTemplate.bgPane as ArtpackImageNode;
        const bgPaneNode: ArtpackImageNode = {
          id: bgPaneId,
          nodeType: 'BgPane',
          parentId: newPaneId,
          type: 'artpack-image',
          collection: artpackBgPane.collection,
          image: artpackBgPane.image,
          src: artpackBgPane.src,
          srcSet: artpackBgPane.srcSet,
          alt: artpackBgPane.alt || `Artpack image`,
          objectFit: artpackBgPane.objectFit || 'cover',
        };
        allNodes.push(bgPaneNode);
      }
    }

    return allNodes;
  }
}

export const globalCtx: NodesContext = new NodesContext();

export const getCtx = (
  props?: NodeProps | CompositorProps | WidgetProps
): NodesContext => {
  return props?.ctx || globalCtx;
};
