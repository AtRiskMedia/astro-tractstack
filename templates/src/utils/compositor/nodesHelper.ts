import { ulid } from 'ulid';
import {
  TemplateBeliefNode,
  TemplateBunnyNode,
  TemplateDisclosureNode,
  TemplateEmailSignUpNode,
  TemplateH2Node,
  TemplateH3Node,
  TemplateH4Node,
  TemplateIdentifyAsNode,
  TemplateImgNode,
  TemplatePNode,
  TemplateToggleNode,
  TemplateYoutubeNode,
} from './TemplateNodes';
import { getCtx, NodesContext } from '@/stores/nodes';
import { settingsPanelStore } from '@/stores/storykeep';
import { PatchOp } from '@/stores/nodesHistory';
import { cloneDeep } from '@/utils/helpers';
import { isPaneNode } from './typeGuards';
import type {
  BaseNode,
  FlatNode,
  StoryFragmentNode,
  TemplateNode,
  ToolAddMode,
  MarkdownPaneFragmentNode,
  GridLayoutNode,
  PaneNode,
} from '@/types/compositorTypes';
import type { NodeTagProps } from '@/types/nodeProps';

export const getTemplateNode = (value: ToolAddMode): TemplateNode => {
  let templateNode: TemplateNode;
  switch (value) {
    case 'h2':
      templateNode = cloneDeep(TemplateH2Node);
      break;
    case 'h3':
      templateNode = cloneDeep(TemplateH3Node);
      break;
    case 'h4':
      templateNode = cloneDeep(TemplateH4Node);
      break;
    case 'img':
      templateNode = cloneDeep(TemplateImgNode);
      break;
    case 'toggle':
      templateNode = cloneDeep(TemplateToggleNode);
      break;
    case 'yt':
      templateNode = cloneDeep(TemplateYoutubeNode);
      break;
    case 'belief':
      templateNode = cloneDeep(TemplateBeliefNode);
      break;
    case 'bunny':
      templateNode = cloneDeep(TemplateBunnyNode);
      break;
    case 'signup':
      templateNode = cloneDeep(TemplateEmailSignUpNode);
      break;
    case 'identify':
      templateNode = cloneDeep(TemplateIdentifyAsNode);
      break;
    case 'interactiveDisclosure':
      templateNode = cloneDeep(TemplateDisclosureNode);
      break;
    case 'p':
    default:
      templateNode = cloneDeep(TemplatePNode);
      break;
  }
  return templateNode;
};

const forbiddenEditTags = new Set<string>(['em', 'strong', 'ol', 'ul']);

export const canEditText = (props: NodeTagProps): boolean => {
  const nodeId = props.nodeId;

  const self = getCtx(props).allNodes.get().get(nodeId) as FlatNode;
  if (self.tagName === 'a') return false;

  const parentIsButton = getCtx(props).getParentNodeByTagNames(nodeId, ['a']);
  if (parentIsButton?.length > 0) return false;

  if (forbiddenEditTags.has(props.tagName)) return false;
  return true;
};

export function parseMarkdownToNodes(
  html: string,
  parentId: string
): FlatNode[] {
  // Generate a base timestamp for unique IDs
  let uniqueCounter = Date.now();

  // Clean input text - handle special characters and markdown-like syntax
  html = html
    .replace(/&nbsp;|\u00A0/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/<br>/g, '');

  // Handle wiki-style [[link]] - add a unique placeholder href
  html = html.replace(/\[\[([^\]]+?)\]\]/g, (_, content) => {
    return `<a href="#placeholder-${uniqueCounter++}">${content}</a>`;
  });

  // Handle markdown-style [text](url) links
  html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_, text, url) => {
    return `<a href="${url}">${text}</a>`;
  });

  // Handle other markdown formatting - avoid processing inside existing tags
  html = html
    .replace(
      /(?<!<a[^>]*?>[^<]*)\*\*(.+?)\*\*(?![^<]*?<\/a>)/g,
      '<strong>$1</strong>'
    )
    .replace(/(?<!<a[^>]*?>[^<]*)\*(.+?)\*(?![^<]*?<\/a>)/g, '<em>$1</em>');

  // Use browser's DOM parser instead of character-by-character parsing
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

  // Process the DOM tree
  return extractNodesFromDOM(
    doc.body.firstElementChild as HTMLElement,
    parentId
  );
}

function extractNodesFromDOM(
  element: HTMLElement,
  parentId: string
): FlatNode[] {
  const result: FlatNode[] = [];

  // Process each child node
  Array.from(element.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      // Handle text nodes - preserve text content but strip zero-width spaces
      let text = child.textContent;

      // Only skip if null or undefined, but keep empty strings and whitespace
      if (text !== null && text !== undefined) {
        // Remove zero-width spaces
        text = text.replace(/\u200B/g, '');
        if (text.trim() === '') {
          return;
        }
        result.push({
          id: ulid(),
          parentId,
          nodeType: 'TagElement',
          tagName: 'text',
          copy: text,
        } as FlatNode);
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const elem = child as HTMLElement;
      const tagName = elem.tagName.toLowerCase();

      // Skip any remaining space marker spans
      if (
        tagName === 'span' &&
        (elem.classList.contains('space-marker') ||
          elem.getAttribute('style')?.includes('font-size: 0px'))
      ) {
        return;
      }

      // Create node for this element
      const nodeId = ulid();
      const node: FlatNode = {
        id: nodeId,
        parentId,
        nodeType: 'TagElement',
        tagName,
      };

      // Handle special attributes for different tags
      if (tagName === 'a') {
        // Process anchor tags
        node.href =
          (elem as HTMLAnchorElement).getAttribute('href') || undefined;

        // Save classes for the link
        const className = elem.getAttribute('class');
        if (className) {
          node.elementCss = className;
        }

        // Update attribute name for editable links
        if (
          elem.hasAttribute('data-space-protected') ||
          elem.hasAttribute('data-editable-link')
        ) {
          (node as any)['data-editable-link'] = 'true';
        }
      } else if (tagName === 'button') {
        // Process button tags - preserve all attributes
        const className = elem.getAttribute('class');
        if (className) {
          node.elementCss = className;
        }

        // Update attribute name for editable buttons
        if (
          elem.hasAttribute('data-space-protected') ||
          elem.hasAttribute('data-editable-button')
        ) {
          (node as any)['data-editable-button'] = 'true';
        }

        // Copy all data attributes
        Array.from(elem.attributes).forEach((attr) => {
          if (
            attr.name.startsWith('data-') &&
            attr.name !== 'data-space-protected' &&
            attr.name !== 'data-editable-button'
          ) {
            (node as any)[attr.name] = attr.value;
          }
        });
      } else if (tagName === 'img') {
        // Process image tags
        node.src = (elem as HTMLImageElement).getAttribute('src') || undefined;
        node.alt = (elem as HTMLImageElement).getAttribute('alt') || undefined;
      }

      // Add this node
      result.push(node);

      // Process children recursively with the new nodeId as parent
      const childNodes = extractNodesFromDOM(elem, nodeId);
      result.push(...childNodes);
    }
  });

  return result;
}

export function findLinkDestinationInHtml(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const linkElement = doc.querySelector('a');
  return linkElement ? linkElement.getAttribute('href') : null;
}

export function moveNodeAtLocationInContext(
  oldParentNodes: string[],
  originalIdx: number,
  newLocationNode: BaseNode,
  insertNodeId: string,
  nodeId: string,
  location: 'before' | 'after',
  node: BaseNode,
  ctx: NodesContext
) {
  if (oldParentNodes) {
    oldParentNodes.splice(originalIdx, 1);
  }

  const newLocationParentNodes = ctx.getChildNodeIDs(
    newLocationNode.parentId || ''
  );
  // now grab parent nodes, check if we have inner node
  if (
    insertNodeId &&
    newLocationParentNodes &&
    newLocationParentNodes?.indexOf(insertNodeId) !== -1
  ) {
    const spliceIdx = newLocationParentNodes.indexOf(nodeId);
    if (spliceIdx !== -1) {
      newLocationParentNodes.splice(newLocationParentNodes.indexOf(nodeId), 1);
    }
    if (location === 'before') {
      newLocationParentNodes.splice(
        newLocationParentNodes.indexOf(insertNodeId),
        0,
        nodeId
      );
    } else {
      newLocationParentNodes.splice(
        newLocationParentNodes.indexOf(insertNodeId) + 1,
        0,
        nodeId
      );
    }
  }

  if (node.nodeType === 'Pane') {
    const storyFragmentId = ctx.getClosestNodeTypeFromId(
      node.id,
      'StoryFragment'
    );
    const storyFragment = ctx.allNodes
      .get()
      .get(storyFragmentId) as StoryFragmentNode;
    if (storyFragment) {
      const spliceIdx = storyFragment.paneIds.indexOf(nodeId);
      if (spliceIdx !== -1) {
        storyFragment.paneIds.splice(spliceIdx, 1);
      }
      if (location === 'before') {
        storyFragment.paneIds.splice(
          storyFragment.paneIds.indexOf(insertNodeId),
          0,
          nodeId
        );
      } else {
        storyFragment.paneIds.splice(
          storyFragment.paneIds.indexOf(insertNodeId) + 1,
          0,
          nodeId
        );
      }
    }
  }
  node.parentId = newLocationNode.parentId;
}

export function createEmptyStorykeep(id: string) {
  return {
    id,
    nodeType: 'StoryFragment',
    tractStackId: 'temp',
    parentId: null,
    isChanged: false,
    paneIds: [],
    changed: undefined,
    slug: 'temp',
    title: 'temp',
    impressions: [],
    created: undefined,
    menuId: undefined,
    socialImagePath: undefined,
    tailwindBgColour: undefined,
  } as StoryFragmentNode;
}

/**
 * Processes HTML content into a flat node structure, preserving formatting and interactive elements.
 * @param html The raw HTML string to process
 * @param parentId The parent node's ID
 * @param originalNodes Optional array of original nodes to match interactive elements against
 * @param onInsertSignal Optional callback to signal insertion of new interactive elements
 * @returns Array of parsed FlatNode objects
 */
export function processRichTextToNodes(
  html: string,
  parentId: string,
  originalNodes: FlatNode[] = [],
  onInsertSignal?: (tagName: string, nodeId: string) => void
): FlatNode[] {
  const parsedNodes = parseMarkdownToNodes(html, parentId);

  if (parsedNodes.length === 0) return [];

  // Process each node to restore interactive element properties
  parsedNodes.forEach((node) => {
    if (['a', 'button', 'span'].includes(node.tagName)) {
      const matchingOriginalNode = findMatchingNode(node, originalNodes);
      if (matchingOriginalNode) {
        if (['a', 'button'].includes(node.tagName)) {
          if (matchingOriginalNode.href) {
            node.href = matchingOriginalNode.href;
          }
          node.buttonPayload = matchingOriginalNode.buttonPayload;
        } else if (node.tagName === 'span') {
          node.elementCss = matchingOriginalNode.elementCss;
          node.overrideClasses = matchingOriginalNode.overrideClasses;
          if (matchingOriginalNode.wordCarouselPayload) {
            node.wordCarouselPayload = matchingOriginalNode.wordCarouselPayload;
          }
        }
      } else if (onInsertSignal) {
        // New interactive element detected, trigger insert signal
        onInsertSignal(node.tagName, node.id);
      }
    }
  });

  return parsedNodes;
}

/**
 * Finds a matching node from a list of original nodes based on tag-specific criteria.
 * @param newNode The newly parsed node to match
 * @param originalNodes Array of original nodes to search through
 * @returns Matching FlatNode or undefined if no match found
 */
export function findMatchingNode(
  newNode: FlatNode,
  originalNodes: FlatNode[]
): FlatNode | undefined {
  switch (newNode.tagName) {
    case 'a': {
      if (!newNode.href) {
        break;
      }

      const hrefMatch = originalNodes.find(
        (node) => node.tagName === 'a' && node.href === newNode.href
      );
      if (hrefMatch) {
        return hrefMatch;
      }

      const partialMatch = originalNodes.find((node) => {
        if (node.tagName !== 'a' || !node.href || !newNode.href) {
          return false;
        }
        try {
          const origDomain = new URL(node.href).hostname;
          const newDomain = new URL(newNode.href).hostname;
          return origDomain === newDomain;
        } catch {
          return false;
        }
      });
      if (partialMatch) {
        return partialMatch;
      }

      break;
    }

    case 'button':
    case 'span': {
      const newText = getNodeText(newNode);
      const matches = originalNodes.filter(
        (node) => node.tagName === newNode.tagName
      );

      for (const match of matches) {
        const matchText = getNodeText(match);
        if (
          matchText.includes(newText) ||
          newText.includes(matchText) ||
          calculateSimilarity(matchText, newText) > 0.7
        ) {
          return match;
        }
      }

      if (
        matches.length === 1 &&
        originalNodes.filter((n) => n.tagName === newNode.tagName).length === 1
      ) {
        return matches[0];
      }

      break;
    }
  }

  return undefined;
}

/**
 * Retrieves the text content of a node, recursively including child nodes.
 * @param node The node to extract text from
 * @param ctx Optional NodesContext for accessing child nodes
 * @returns The combined text content
 */
export function getNodeText(node: FlatNode, ctx?: NodesContext): string {
  const context = ctx || getCtx();
  if (node.copy) return node.copy;

  const childIds = context.getChildNodeIDs(node.id);
  if (childIds.length === 0) return '';

  return childIds
    .map((id) => {
      const childNode = context.allNodes.get().get(id) as FlatNode;
      return childNode ? getNodeText(childNode, context) : '';
    })
    .join(' ')
    .trim();
}

/**
 * Calculates the similarity between two strings (0 to 1, where 1 is identical).
 * @param a First string
 * @param b Second string
 * @returns Similarity score
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const aChars = new Set(a.toLowerCase());
  const bChars = new Set(b.toLowerCase());
  const intersection = new Set([...aChars].filter((x) => bChars.has(x)));
  const union = new Set([...aChars, ...bChars]);

  return intersection.size / union.size;
}

export function extractClassesFromNodes(dirtyNodes: BaseNode[]): string[] {
  const uniqueClasses = new Set<string>();

  dirtyNodes.forEach((node) => {
    if ('parentCss' in node && Array.isArray(node.parentCss)) {
      node.parentCss.forEach((classString: string) => {
        classString.split(' ').forEach((className: string) => {
          if (className.trim()) uniqueClasses.add(className.trim());
        });
      });
    } else if ('parentCss' in node && typeof node.parentCss === `string`) {
      node.parentCss.split(' ').forEach((className: string) => {
        if (className.trim()) uniqueClasses.add(className.trim());
      });
    }

    // Extract from elementCss strings (like legacy getTailwindWhitelist)
    if ('elementCss' in node && typeof node.elementCss === 'string') {
      node.elementCss.split(' ').forEach((className: string) => {
        if (className.trim()) uniqueClasses.add(className.trim());
      });
    }

    // Extract from gridCss arrays
    if ('gridCss' in node && typeof node.gridCss === 'string') {
      node.gridCss.split(' ').forEach((className: string) => {
        if (className.trim()) uniqueClasses.add(className.trim());
      });
    }
  });

  return Array.from(uniqueClasses);
}

export function revertFromGrid(gridLayoutId: string) {
  const ctx = getCtx();
  const originalAllNodes = new Map(ctx.allNodes.get());
  const originalParentNodes = new Map(ctx.parentNodes.get());

  const gridLayoutNode = originalAllNodes.get(gridLayoutId) as GridLayoutNode;
  if (!gridLayoutNode || !gridLayoutNode.parentId) return;

  const paneNode = originalAllNodes.get(gridLayoutNode.parentId) as PaneNode;
  if (!paneNode || !isPaneNode(paneNode)) return;

  const childIds = originalParentNodes.get(gridLayoutId) || [];

  const redoLogic = () => {
    const newAllNodes = new Map(originalAllNodes);
    const newParentNodes = new Map(originalParentNodes);

    if (childIds.length === 0) {
      const paneChildren = [...(newParentNodes.get(paneNode.id) || [])];
      const gridIndex = paneChildren.indexOf(gridLayoutId);
      if (gridIndex > -1) {
        paneChildren.splice(gridIndex, 1);
      }
      newParentNodes.set(paneNode.id, paneChildren);
      newAllNodes.delete(gridLayoutId);
      newParentNodes.delete(gridLayoutId);
    } else {
      const markdownNodeToKeepId = childIds[0];
      const markdownNodeToKeep = cloneDeep(
        newAllNodes.get(markdownNodeToKeepId)
      ) as MarkdownPaneFragmentNode;

      markdownNodeToKeep.parentId = paneNode.id;
      markdownNodeToKeep.parentClasses = gridLayoutNode.parentClasses || [];
      markdownNodeToKeep.defaultClasses = gridLayoutNode.defaultClasses || {};
      markdownNodeToKeep.isChanged = true;
      newAllNodes.set(markdownNodeToKeepId, markdownNodeToKeep);

      const paneChildren = [...(newParentNodes.get(paneNode.id) || [])];
      const gridIndex = paneChildren.indexOf(gridLayoutId);
      if (gridIndex > -1) {
        paneChildren.splice(gridIndex, 1, markdownNodeToKeepId);
      }
      newParentNodes.set(paneNode.id, paneChildren);

      const nodesToDeleteIds = [gridLayoutId, ...childIds.slice(1)];
      nodesToDeleteIds.forEach((id) => {
        newAllNodes.delete(id);
        newParentNodes.delete(id);
      });
    }

    const updatedPaneNode = cloneDeep(paneNode);
    updatedPaneNode.isChanged = true;
    newAllNodes.set(paneNode.id, updatedPaneNode);

    ctx.allNodes.set(newAllNodes);
    ctx.parentNodes.set(newParentNodes);
    ctx.notifyNode('root');
    settingsPanelStore.set(null);
  };

  const undoLogic = () => {
    ctx.allNodes.set(originalAllNodes);
    ctx.parentNodes.set(originalParentNodes);
    ctx.notifyNode('root');
  };

  ctx.history.addPatch({
    op: PatchOp.REPLACE,
    undo: undoLogic,
    redo: redoLogic,
  });

  redoLogic();
}

export function convertToGrid(markdownNodeId: string) {
  const ctx = getCtx();

  const originalAllNodes = new Map(ctx.allNodes.get());
  const originalParentNodes = new Map(ctx.parentNodes.get());

  const markdownNode = originalAllNodes.get(
    markdownNodeId
  ) as MarkdownPaneFragmentNode;
  if (!markdownNode || !markdownNode.parentId) return;

  const paneNode = originalAllNodes.get(markdownNode.parentId) as PaneNode & {
    markdownId?: string;
    markdownBody?: string;
  };
  if (!paneNode || !isPaneNode(paneNode)) return;

  const gridLayoutId = ulid();

  const redoLogic = () => {
    const newAllNodes = new Map(originalAllNodes);
    const newParentNodes = new Map(originalParentNodes);

    const newGridLayoutNode: GridLayoutNode = {
      id: gridLayoutId,
      parentId: paneNode.id,
      nodeType: 'GridLayoutNode',
      type: 'grid-layout',
      parentClasses: markdownNode.parentClasses || [],
      defaultClasses: markdownNode.defaultClasses || {},
      gridColumns: { mobile: 1, tablet: 2, desktop: 2 },
      isChanged: true,
    };

    const updatedMarkdownNode = cloneDeep(markdownNode);
    updatedMarkdownNode.parentId = gridLayoutId;
    updatedMarkdownNode.parentClasses = [];
    updatedMarkdownNode.parentCss = [];
    updatedMarkdownNode.defaultClasses = {};
    updatedMarkdownNode.isChanged = true;

    // Create a new, truly empty MarkdownNode for the second column.
    const newColumnNodeId = ulid();
    const newColumnNode: MarkdownPaneFragmentNode = {
      id: newColumnNodeId,
      parentId: gridLayoutId,
      nodeType: 'Markdown',
      type: 'markdown',
      markdownId: ulid(),
      defaultClasses: {},
      parentClasses: [],
      isChanged: true,
    };

    newAllNodes.set(gridLayoutId, newGridLayoutNode);
    newAllNodes.set(markdownNodeId, updatedMarkdownNode);
    newAllNodes.set(paneNode.id, { ...cloneDeep(paneNode), isChanged: true });
    newAllNodes.set(newColumnNodeId, newColumnNode);

    const paneChildren = [...(newParentNodes.get(paneNode.id) || [])];
    const mdIndex = paneChildren.indexOf(markdownNodeId);
    if (mdIndex > -1) {
      paneChildren.splice(mdIndex, 1, gridLayoutId);
    }
    newParentNodes.set(paneNode.id, paneChildren);
    newParentNodes.set(gridLayoutId, [markdownNodeId, newColumnNodeId]);
    newParentNodes.set(newColumnNodeId, []); // Set children to an empty array

    ctx.allNodes.set(newAllNodes);
    ctx.parentNodes.set(newParentNodes);
    ctx.notifyNode('root');
    settingsPanelStore.set(null);
  };

  const undoLogic = () => {
    ctx.allNodes.set(originalAllNodes);
    ctx.parentNodes.set(originalParentNodes);
    ctx.notifyNode('root');
  };

  ctx.history.addPatch({
    op: PatchOp.REPLACE,
    undo: undoLogic,
    redo: redoLogic,
  });

  redoLogic();
}

export function addColumn(gridLayoutId: string) {
  const ctx = getCtx();
  const originalAllNodes = new Map(ctx.allNodes.get());
  const originalParentNodes = new Map(ctx.parentNodes.get());

  const gridLayoutNode = originalAllNodes.get(gridLayoutId);
  if (!gridLayoutNode) return;

  const newMarkdownNodeId = ulid();

  const redoLogic = () => {
    const newAllNodes = new Map(originalAllNodes);
    const newParentNodes = new Map(originalParentNodes);

    const newColumnNode: MarkdownPaneFragmentNode = {
      id: newMarkdownNodeId,
      parentId: gridLayoutId,
      nodeType: 'Markdown',
      type: 'markdown',
      markdownId: ulid(),
      defaultClasses: {},
      parentClasses: [],
      gridClasses: { mobile: {}, tablet: {}, desktop: {} },
      isChanged: true,
    };

    newAllNodes.set(newMarkdownNodeId, newColumnNode);

    const gridChildren = [...(newParentNodes.get(gridLayoutId) || [])];
    gridChildren.push(newMarkdownNodeId);
    newParentNodes.set(gridLayoutId, gridChildren);
    newParentNodes.set(newMarkdownNodeId, []); // Set children to an empty array

    const updatedGridLayoutNode = cloneDeep(gridLayoutNode);
    updatedGridLayoutNode.isChanged = true;
    newAllNodes.set(gridLayoutId, updatedGridLayoutNode);

    ctx.allNodes.set(newAllNodes);
    ctx.parentNodes.set(newParentNodes);
    ctx.notifyNode('root');
  };

  const undoLogic = () => {
    ctx.allNodes.set(originalAllNodes);
    ctx.parentNodes.set(originalParentNodes);
    ctx.notifyNode('root');
  };

  ctx.history.addPatch({
    op: PatchOp.ADD,
    undo: undoLogic,
    redo: redoLogic,
  });

  redoLogic();
}
