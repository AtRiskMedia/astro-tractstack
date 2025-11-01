import { ulid } from 'ulid';
import { getCtx, type NodesContext } from '@/stores/nodes';
import {
  type PaneNode,
  type FlatNode,
  type MarkdownPaneFragmentNode,
  type StoragePane,
  type StorageNode,
  type StorageMarkdown,
  type StorageBgPane,
  type ArtpackImageNode,
  type BgImageNode,
  type VisualBreakNode,
  type TemplatePane,
  type TemplateNode,
  type BaseNode,
  type TemplateMarkdown,
} from '@/types/compositorTypes';
import type {
  BrandConfig,
  BrandConfigState,
  DesignLibraryConfig,
  DesignLibraryEntry,
} from '@/types/tractstack';
import { saveBrandConfig } from '@/utils/api/brandConfig';
import {
  convertToLocalState,
  convertToBackendFormat,
} from '@/utils/api/brandHelpers';

type CopyMode = 'retain' | 'lorem' | 'blank';

export type ExtractedCopy = StorageNode[];

const LOREM_SHORT = 'Lorem ipsum dolor sit amet.';
const LOREM_LONG =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

function convertLiveNodeToStorageNode(
  node: FlatNode,
  ctx: NodesContext,
  copyMode: CopyMode
): StorageNode | null {
  if (copyMode === 'lorem') {
    if (!node.tagName || !['h2', 'h3', 'h4', 'p'].includes(node.tagName)) {
      return null;
    }
  }

  const storageNode: StorageNode = {
    nodeType: node.nodeType,
    tagName: node.tagName,
    tagNameCustom: node.tagNameCustom,
    overrideClasses: copyMode === 'retain' ? node.overrideClasses : undefined,
    href: copyMode === 'retain' ? node.href : undefined,
    src: copyMode === 'retain' ? node.src : undefined,
    alt: copyMode === 'retain' ? node.alt : undefined,
    fileId: copyMode === 'retain' ? node.fileId : undefined,
    buttonPayload: copyMode === 'retain' ? node.buttonPayload : undefined,
    codeHookParams: copyMode === 'retain' ? node.codeHookParams : undefined,
    elementCss: copyMode === 'retain' ? node.elementCss : undefined,
  };

  const childIds = ctx.getChildNodeIDs(node.id);

  if (childIds.length > 0) {
    const childNodes = childIds
      .map((id) => {
        const childNode = ctx.allNodes.get().get(id) as FlatNode;
        if (!childNode) return null;

        if (childNode.tagName === 'text' && childNode.copy) {
          if (copyMode === 'lorem') {
            const isHeadingParent =
              node.tagName && node.tagName.startsWith('h');
            return {
              nodeType: 'TagElement',
              tagName: 'text',
              copy: isHeadingParent ? LOREM_SHORT : LOREM_LONG,
            };
          }
          if (copyMode === 'retain') {
            return {
              nodeType: 'TagElement',
              tagName: 'text',
              copy: childNode.copy,
            };
          }
        }

        return convertLiveNodeToStorageNode(childNode, ctx, copyMode);
      })
      .filter((n): n is StorageNode => n !== null);

    if (childNodes.length > 0) {
      storageNode.nodes = childNodes;
    }
  }

  return storageNode;
}

export async function savePaneToLibrary(
  paneId: string,
  tenantId: string,
  config: BrandConfig,
  formData: {
    title: string;
    category: string;
    copyMode: CopyMode;
  }
): Promise<boolean> {
  const ctx = getCtx();
  const { title, category, copyMode } = formData;
  const paneNode = ctx.allNodes.get().get(paneId) as PaneNode;

  if (!paneNode) {
    console.error('savePaneToLibrary: PaneNode not found.');
    return false;
  }

  const childNodes = ctx
    .getChildNodeIDs(paneId)
    .map((id) => ctx.allNodes.get().get(id));

  const markdownNode = childNodes.find((n) => n?.nodeType === 'Markdown') as
    | MarkdownPaneFragmentNode
    | undefined;

  const bgPaneNode = childNodes.find((n) => n?.nodeType === 'BgPane') as
    | ArtpackImageNode
    | BgImageNode
    | VisualBreakNode
    | undefined;

  const newStorageMarkdown: StorageMarkdown | undefined = markdownNode
    ? {
        nodeType: 'Markdown',
        type: 'markdown',
        defaultClasses: markdownNode.defaultClasses || {},
        parentClasses: markdownNode.parentClasses || [],
        nodes:
          copyMode !== 'blank'
            ? ctx
                .getChildNodeIDs(markdownNode.id)
                .map((childId) => {
                  const childNode = ctx.allNodes.get().get(childId) as FlatNode;
                  return convertLiveNodeToStorageNode(childNode, ctx, copyMode);
                })
                .filter((n): n is StorageNode => n !== null)
            : [],
      }
    : undefined;

  const newStorageBgPane: StorageBgPane | undefined = bgPaneNode
    ? { ...bgPaneNode }
    : undefined;

  if (newStorageBgPane) {
    delete (newStorageBgPane as any).id;
    delete (newStorageBgPane as any).parentId;
  }

  const newStoragePane: StoragePane = {
    nodeType: 'Pane',
    title: title,
    slug: '',
    bgColour: paneNode.bgColour,
    isDecorative: paneNode.isDecorative,
    heightOffsetDesktop: paneNode.heightOffsetDesktop,
    heightOffsetMobile: paneNode.heightOffsetMobile,
    heightOffsetTablet: paneNode.heightOffsetTablet,
    heightRatioDesktop: paneNode.heightRatioDesktop,
    heightRatioMobile: paneNode.heightRatioMobile,
    heightRatioTablet: paneNode.heightRatioTablet,
    markdown: newStorageMarkdown,
    bgPane: newStorageBgPane,
  };

  const newLibraryEntry: DesignLibraryEntry = {
    category: category,
    title: title,
    template: newStoragePane,
  };

  const currentState: BrandConfigState = convertToLocalState(config);
  const currentLibrary =
    (currentState.designLibrary as DesignLibraryConfig) || [];

  const existingEntryIndex = currentLibrary.findIndex(
    (entry) => entry.title === title && entry.category === category
  );

  let newLibrary: DesignLibraryConfig;
  if (existingEntryIndex !== -1) {
    newLibrary = [...currentLibrary];
    newLibrary[existingEntryIndex] = newLibraryEntry;
  } else {
    newLibrary = [...currentLibrary, newLibraryEntry];
  }

  const updatedState: BrandConfigState = {
    ...currentState,
    designLibrary: newLibrary,
  };

  const backendDTO: BrandConfig = convertToBackendFormat(updatedState);

  try {
    await saveBrandConfig(tenantId, backendDTO);
    return true;
  } catch (error) {
    console.error('Failed to save design library:', error);
    return false;
  }
}

export function extractPaneCopy(paneNode: PaneNode): ExtractedCopy {
  const ctx = getCtx();
  const childNodes = ctx
    .getChildNodeIDs(paneNode.id)
    .map((id) => ctx.allNodes.get().get(id));

  const markdownNode = childNodes.find((n) => n?.nodeType === 'Markdown') as
    | MarkdownPaneFragmentNode
    | undefined;

  if (!markdownNode) {
    return [];
  }

  return (
    ctx
      .getChildNodeIDs(markdownNode.id)
      .map((childId) => {
        const childNode = ctx.allNodes.get().get(childId) as FlatNode;
        return convertLiveNodeToStorageNode(childNode, ctx, 'retain');
      })
      .filter((n): n is StorageNode => n !== null) || []
  );
}

export function mergeCopyIntoTemplate(
  template: StoragePane,
  copy: ExtractedCopy
): StoragePane {
  const newTemplate = { ...template };
  if (newTemplate.markdown) {
    newTemplate.markdown.nodes = copy;
  } else if (copy.length > 0) {
    newTemplate.markdown = {
      nodeType: 'Markdown',
      type: 'markdown',
      defaultClasses: {},
      parentClasses: [],
      nodes: copy,
    };
  }
  return newTemplate;
}

function processStorageNode(
  node: StorageNode,
  parentId: string
): TemplateNode[] {
  const newId = ulid();
  const { nodes, ...rest } = node;
  const liveNode: TemplateNode = {
    ...rest,
    id: newId,
    parentId: parentId,
  };

  const flatList: TemplateNode[] = [liveNode];

  if (nodes) {
    for (const child of nodes) {
      const processedChildren = processStorageNode(child, newId);
      flatList.push(...processedChildren);
    }
  }

  return flatList;
}

export function convertStorageToLiveTemplate(
  storagePane: StoragePane
): TemplatePane {
  const paneId = ulid();
  const markdownId = ulid();
  const flatNodeList: TemplateNode[] = [];

  if (storagePane.markdown && storagePane.markdown.nodes) {
    for (const storageNode of storagePane.markdown.nodes) {
      const processedNodes = processStorageNode(storageNode, markdownId);
      flatNodeList.push(...processedNodes);
    }
  }

  let liveBgPane: ArtpackImageNode | BgImageNode | VisualBreakNode | undefined =
    undefined;
  if (storagePane.bgPane) {
    const bgPaneId = ulid();
    liveBgPane = {
      ...storagePane.bgPane,
      id: bgPaneId,
      parentId: paneId,
    };
  }

  const liveTemplatePane: TemplatePane = {
    ...storagePane,
    id: paneId,
    parentId: '',
    markdown: {
      ...(storagePane.markdown || {
        nodeType: 'Markdown',
        type: 'markdown',
        defaultClasses: {},
        parentClasses: [],
      }),
      id: markdownId,
      markdownId: markdownId,
      parentId: paneId,
      nodes: flatNodeList,
    },
    bgPane: liveBgPane,
  };

  return liveTemplatePane;
}
