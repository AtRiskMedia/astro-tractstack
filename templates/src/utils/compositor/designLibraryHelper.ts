import { ulid } from 'ulid';
import { getCtx, type NodesContext } from '@/stores/nodes';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
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
    ...(newStorageMarkdown ? { markdowns: [newStorageMarkdown] } : {}),
    ...(newStorageBgPane ? { bgPane: newStorageBgPane } : {}),
  };

  const newLibraryEntry: DesignLibraryEntry = {
    category: category,
    title: title,
    markdownCount: 1,
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
  if (newTemplate.markdowns) {
    newTemplate.markdowns[0].nodes = copy;
  } else if (copy.length > 0) {
    if (!newTemplate.markdowns) newTemplate.markdowns = [];
    newTemplate.markdowns[0] = {
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

  if (storagePane.markdowns && storagePane.markdowns[0].nodes) {
    for (const storageNode of storagePane.markdowns[0].nodes) {
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

  const { gridLayout, ...restOfStoragePane } = storagePane;
  const liveTemplatePane: TemplatePane = {
    ...restOfStoragePane,
    id: paneId,
    parentId: '',
    markdown: {
      ...((storagePane.markdowns && storagePane.markdowns[0]) || {
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

// Helper to convert a style object { "px": "4", "fontBOLD": "bold" } to "px-4 font-bold"
function classObjectToString(
  classObj: Record<string, string> | undefined
): string {
  if (!classObj) return '';

  return Object.entries(classObj)
    .map(([key, value]) => {
      const definition = tailwindClasses[key];
      if (!definition) return ''; // Ignore keys not in our definitions

      if (definition.useKeyAsClass) {
        return value; // e.g., for 'fontBOLD', value is 'font-bold'
      }

      // Handle negative values
      if (typeof value === 'string' && value.startsWith('-')) {
        return `-${definition.prefix}${value.substring(1)}`;
      }

      return `${definition.prefix}${value}`;
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Translates a TemplatePane from the design library into an AI-compatible JSON shell
 * for the hybrid AI copy generation path.
 * @param template The TemplatePane object selected by the user.
 * @returns A JSON string compatible with the AI's second-stage prompt.
 */
export function convertTemplateToAIShell(template: TemplatePane): string {
  const shell: any = {
    bgColour: template.bgColour || '#ffffff',
    parentClasses: [],
    defaultClasses: {},
  };

  // 1. Process parentClasses (layout)
  if (template.markdown?.parentClasses) {
    shell.parentClasses = template.markdown.parentClasses.map((layer) => {
      const newLayer: { mobile?: string; tablet?: string; desktop?: string } =
        {};
      if (layer.mobile && Object.keys(layer.mobile).length > 0) {
        newLayer.mobile = classObjectToString(layer.mobile);
      }
      if (layer.tablet && Object.keys(layer.tablet).length > 0) {
        newLayer.tablet = classObjectToString(layer.tablet);
      }
      if (layer.desktop && Object.keys(layer.desktop).length > 0) {
        newLayer.desktop = classObjectToString(layer.desktop);
      }
      return newLayer;
    });
  }

  // 2. Process defaultClasses (typography, etc.)
  if (template.markdown?.defaultClasses) {
    for (const tag in template.markdown.defaultClasses) {
      const styles = template.markdown.defaultClasses[tag];
      const newTagStyles: {
        mobile?: string;
        tablet?: string;
        desktop?: string;
      } = {};

      if (styles.mobile && Object.keys(styles.mobile).length > 0) {
        newTagStyles.mobile = classObjectToString(styles.mobile);
      }
      if (styles.tablet && Object.keys(styles.tablet).length > 0) {
        newTagStyles.tablet = classObjectToString(styles.tablet);
      }
      if (styles.desktop && Object.keys(styles.desktop).length > 0) {
        newTagStyles.desktop = classObjectToString(styles.desktop);
      }

      if (Object.keys(newTagStyles).length > 0) {
        shell.defaultClasses[tag] = newTagStyles;
      }
    }
  }

  return JSON.stringify(shell, null, 2);
}
