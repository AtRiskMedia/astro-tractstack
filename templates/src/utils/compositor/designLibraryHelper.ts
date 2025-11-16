import { ulid } from 'ulid';
import { getCtx, type NodesContext } from '@/stores/nodes';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
import type {
  PaneNode,
  FlatNode,
  MarkdownPaneFragmentNode,
  GridLayoutNode,
  StoragePane,
  StorageNode,
  StorageMarkdown,
  StorageGridLayoutNode,
  StorageBgPane,
  ArtpackImageNode,
  BgImageNode,
  VisualBreakNode,
  TemplatePane,
  TemplateNode,
  TemplateGridLayout,
  TemplateMarkdown,
  ParentClassesPayload,
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

export type ExtractedCopy = StorageNode[][];

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
    copy: copyMode === 'retain' ? node.copy : undefined,
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

export function extractPaneCopy(paneNode: PaneNode): ExtractedCopy {
  const ctx = getCtx();
  const childNodes = ctx
    .getChildNodeIDs(paneNode.id)
    .map((id) => ctx.allNodes.get().get(id));

  const gridLayoutNode = childNodes.find(
    (n) => n?.nodeType === 'GridLayoutNode'
  ) as GridLayoutNode | undefined;

  if (gridLayoutNode) {
    const columns = ctx
      .getChildNodeIDs(gridLayoutNode.id)
      .map((id) => ctx.allNodes.get().get(id) as MarkdownPaneFragmentNode);

    return columns.map((col) => {
      return (
        ctx
          .getChildNodeIDs(col.id)
          .map((childId) => {
            const childNode = ctx.allNodes.get().get(childId) as FlatNode;
            return convertLiveNodeToStorageNode(childNode, ctx, 'retain');
          })
          .filter((n): n is StorageNode => n !== null) || []
      );
    });
  }

  const markdownNode = childNodes.find((n) => n?.nodeType === 'Markdown') as
    | MarkdownPaneFragmentNode
    | undefined;

  if (!markdownNode) {
    return [];
  }

  const nodes =
    ctx
      .getChildNodeIDs(markdownNode.id)
      .map((childId) => {
        const childNode = ctx.allNodes.get().get(childId) as FlatNode;
        return convertLiveNodeToStorageNode(childNode, ctx, 'retain');
      })
      .filter((n): n is StorageNode => n !== null) || [];

  return [nodes];
}

export function mergeCopyIntoTemplate(
  template: StoragePane,
  copy: ExtractedCopy
): StoragePane {
  const newTemplate = JSON.parse(JSON.stringify(template)) as StoragePane;

  if (newTemplate.gridLayout && newTemplate.gridLayout.nodes) {
    newTemplate.gridLayout.nodes.forEach((column, index) => {
      if (copy[index] && copy[index].length > 0) {
        column.nodes = copy[index];
      }
    });
  } else if (newTemplate.markdowns && newTemplate.markdowns[0]) {
    const flatCopy = copy.flat();
    if (flatCopy.length > 0) {
      newTemplate.markdowns[0].nodes = flatCopy;
    }
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
  let liveMarkdown: TemplateMarkdown | undefined = undefined;
  let liveGridLayout: TemplateGridLayout | undefined = undefined;
  let liveBgPane: ArtpackImageNode | BgImageNode | VisualBreakNode | undefined =
    undefined;

  if (storagePane.gridLayout) {
    const gridId = ulid();
    const storageGrid = storagePane.gridLayout;

    liveGridLayout = {
      id: gridId,
      parentId: paneId,
      nodeType: 'GridLayoutNode',
      type: 'grid-layout',
      gridColumns: storageGrid.gridColumns,
      parentClasses: storageGrid.parentClasses as ParentClassesPayload,
      defaultClasses: storageGrid.defaultClasses,
      nodes:
        storageGrid.nodes?.map((storageColumn) => {
          const columnId = ulid();
          const columnNodes =
            storageColumn.nodes?.flatMap((storageNode) =>
              processStorageNode(storageNode, columnId)
            ) || [];
          return {
            id: columnId,
            parentId: gridId,
            nodeType: 'Markdown',
            type: 'markdown',
            markdownId: columnId,
            defaultClasses: storageColumn.defaultClasses,
            parentClasses: storageColumn.parentClasses,
            gridClasses: storageColumn.gridClasses,
            nodes: columnNodes,
          };
        }) || [],
    };
  } else if (storagePane.markdowns && storagePane.markdowns[0]) {
    const markdownId = ulid();
    const storageMarkdown = storagePane.markdowns[0];
    const flatNodeList =
      storageMarkdown.nodes?.flatMap((storageNode) =>
        processStorageNode(storageNode, markdownId)
      ) || [];

    liveMarkdown = {
      id: markdownId,
      parentId: paneId,
      nodeType: 'Markdown',
      type: 'markdown',
      markdownId: markdownId,
      defaultClasses: storageMarkdown.defaultClasses,
      parentClasses: storageMarkdown.parentClasses,
      nodes: flatNodeList,
    };
  }

  if (storagePane.bgPane) {
    const bgPaneId = ulid();
    liveBgPane = {
      ...storagePane.bgPane,
      id: bgPaneId,
      parentId: paneId,
    };
  }

  const { markdowns, gridLayout, bgPane, ...restOfStoragePane } = storagePane;

  const liveTemplatePane: TemplatePane = {
    ...restOfStoragePane,
    id: paneId,
    parentId: '',
    markdown: liveMarkdown,
    gridLayout: liveGridLayout,
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

  if (template.gridLayout) {
    // 1. Process parentClasses (layout)
    if (template.gridLayout.parentClasses) {
      shell.parentClasses = template.gridLayout.parentClasses.map((layer) => {
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
    if (template.gridLayout.defaultClasses) {
      for (const tag in template.gridLayout.defaultClasses) {
        const styles = template.gridLayout.defaultClasses[tag];
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

    // 3. Process columns
    if (template.gridLayout.nodes) {
      shell.columns = template.gridLayout.nodes.map((column) => {
        const newColumn: {
          gridClasses: { mobile?: string; tablet?: string; desktop?: string };
        } = {
          gridClasses: {},
        };

        if (column.gridClasses) {
          const styles = column.gridClasses;
          const newGridClasses: {
            mobile?: string;
            tablet?: string;
            desktop?: string;
          } = {};

          if (styles.mobile && Object.keys(styles.mobile).length > 0) {
            newGridClasses.mobile = classObjectToString(styles.mobile);
          }
          if (styles.tablet && Object.keys(styles.tablet).length > 0) {
            newGridClasses.tablet = classObjectToString(styles.tablet);
          }
          if (styles.desktop && Object.keys(styles.desktop).length > 0) {
            newGridClasses.desktop = classObjectToString(styles.desktop);
          }
          newColumn.gridClasses = newGridClasses;
        }
        return newColumn;
      });
    }
  } else if (template.markdown) {
    // 1. Process parentClasses (layout)
    if (template.markdown.parentClasses) {
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
    if (template.markdown.defaultClasses) {
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
  }

  return JSON.stringify(shell, null, 2);
}

function convertLivePaneToStoragePane(
  paneId: string,
  ctx: NodesContext,
  options: {
    title: string;
    copyMode: CopyMode;
  }
): StoragePane | null {
  const paneNode = ctx.allNodes.get().get(paneId) as PaneNode;
  if (!paneNode) {
    console.error('convertLivePaneToStoragePane: PaneNode not found.');
    return null;
  }

  const { title, copyMode } = options;
  const childNodes = ctx
    .getChildNodeIDs(paneId)
    .map((id) => ctx.allNodes.get().get(id));

  const markdownNode = childNodes.find((n) => n?.nodeType === 'Markdown') as
    | MarkdownPaneFragmentNode
    | undefined;

  const gridLayoutNode = childNodes.find(
    (n) => n?.nodeType === 'GridLayoutNode'
  ) as GridLayoutNode | undefined;

  const bgPaneNode = childNodes.find((n) => n?.nodeType === 'BgPane') as
    | ArtpackImageNode
    | BgImageNode
    | VisualBreakNode
    | undefined;

  let storageMarkdown: StorageMarkdown | undefined;
  let storageGridLayout: StorageGridLayoutNode | undefined;

  if (markdownNode) {
    storageMarkdown = {
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
    };
  } else if (gridLayoutNode) {
    const { id, parentId, isChanged, parentCss, gridCss, ...restOfGrid } =
      gridLayoutNode;
    storageGridLayout = {
      ...restOfGrid,
      nodes: ctx
        .getChildNodeIDs(gridLayoutNode.id)
        .map((columnId) => {
          const columnNode = ctx.allNodes
            .get()
            .get(columnId) as MarkdownPaneFragmentNode;
          if (!columnNode) return null;

          const {
            id,
            parentId,
            isChanged,
            markdownId,
            parentCss,
            gridCss,
            ...restOfColumn
          } = columnNode;

          const storageColumn: StorageMarkdown = {
            ...restOfColumn,
            nodeType: 'Markdown',
            type: 'markdown',
            nodes:
              copyMode !== 'blank'
                ? ctx
                    .getChildNodeIDs(columnNode.id)
                    .map((childId) => {
                      const childNode = ctx.allNodes
                        .get()
                        .get(childId) as FlatNode;
                      return convertLiveNodeToStorageNode(
                        childNode,
                        ctx,
                        copyMode
                      );
                    })
                    .filter((n): n is StorageNode => n !== null)
                : [],
          };
          return storageColumn;
        })
        .filter((n): n is StorageMarkdown => n !== null),
    };
  }

  const storageBgPane: StorageBgPane | undefined = bgPaneNode
    ? { ...bgPaneNode }
    : undefined;

  if (storageBgPane) {
    delete (storageBgPane as any).id;
    delete (storageBgPane as any).parentId;
  }

  const storagePane: StoragePane = {
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
    ...(storageMarkdown ? { markdowns: [storageMarkdown] } : {}),
    ...(storageGridLayout ? { gridLayout: storageGridLayout } : {}),
    ...(storageBgPane ? { bgPane: storageBgPane } : {}),
  };

  return storagePane;
}

export async function savePaneToLibrary(
  paneId: string,
  tenantId: string,
  config: BrandConfig,
  formData: {
    title: string;
    category: string;
    copyMode: CopyMode;
    locked?: boolean;
  }
): Promise<BrandConfigState | null> {
  const ctx = getCtx();
  const { title, category, copyMode, locked } = formData;

  const newStoragePane = convertLivePaneToStoragePane(paneId, ctx, {
    title,
    copyMode,
  });

  if (!newStoragePane) {
    console.error(
      'savePaneToLibrary: Failed to convert pane to storage format.'
    );
    return null;
  }

  let actualMarkdownCount = 0;
  if (newStoragePane.gridLayout && newStoragePane.gridLayout.nodes) {
    actualMarkdownCount = newStoragePane.gridLayout.nodes.length;
  } else if (newStoragePane.markdowns) {
    actualMarkdownCount = newStoragePane.markdowns.length;
  }

  const newLibraryEntry: DesignLibraryEntry = {
    category: category,
    title: title,
    markdownCount: actualMarkdownCount,
    template: newStoragePane,
    retain: copyMode === 'retain',
    locked: !!locked,
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
    return updatedState;
  } catch (error) {
    console.error('Failed to save design library:', error);
    return null;
  }
}

export async function copyPaneToClipboard(paneId: string): Promise<boolean> {
  const ctx = getCtx();
  const paneNode = ctx.allNodes.get().get(paneId) as PaneNode;

  const storagePane = convertLivePaneToStoragePane(paneId, ctx, {
    title: paneNode?.title || 'Pasted Pane',
    copyMode: 'retain',
  });

  if (!storagePane) {
    return false;
  }

  try {
    const jsonPayload = JSON.stringify(storagePane, null, 2);
    await navigator.clipboard.writeText(jsonPayload);
    return true;
  } catch (error) {
    console.error('Failed to copy pane to clipboard:', error);
    return false;
  }
}

function buildIdMap(node: any, map: Map<string, string>) {
  if (!node || typeof node !== 'object') return;

  if (node.id && !map.has(node.id)) {
    map.set(node.id, ulid());
  }
  // Markdown nodes have a second unique identifier
  if (node.markdownId && !map.has(node.markdownId)) {
    map.set(node.markdownId, ulid());
  }

  // Recursively traverse all possible child arrays/objects
  if (node.markdowns) {
    node.markdowns.forEach((n: any) => buildIdMap(n, map));
  }
  if (node.gridLayout) {
    buildIdMap(node.gridLayout, map);
  }
  if (node.nodes) {
    node.nodes.forEach((n: any) => buildIdMap(n, map));
  }
  if (node.bgPane) {
    buildIdMap(node.bgPane, map);
  }
}

function applyIdMap(node: any, map: Map<string, string>) {
  if (!node || typeof node !== 'object') return;

  if (node.id && map.has(node.id)) {
    node.id = map.get(node.id);
  }
  if (node.parentId && map.has(node.parentId)) {
    node.parentId = map.get(node.parentId);
  }
  if (node.markdownId && map.has(node.markdownId)) {
    node.markdownId = map.get(node.markdownId);
  }

  // Recursively traverse all possible child arrays/objects
  if (node.markdowns) {
    node.markdowns.forEach((n: any) => applyIdMap(n, map));
  }
  if (node.gridLayout) {
    applyIdMap(node.gridLayout, map);
  }
  if (node.nodes) {
    node.nodes.forEach((n: any) => applyIdMap(n, map));
  }
  if (node.bgPane) {
    applyIdMap(node.bgPane, map);
  }
}

export function remapPaneIds(pane: StoragePane): StoragePane {
  const idMap = new Map<string, string>();
  // The input object may have come from JSON.parse, so we treat it as 'any' internally
  const clone = JSON.parse(JSON.stringify(pane as any));

  // First pass: Traverse the entire structure to build a complete map of old IDs to new IDs.
  buildIdMap(clone, idMap);

  // Second pass: Traverse again to apply the new IDs, ensuring parent-child relationships are correct.
  applyIdMap(clone, idMap);

  return clone as StoragePane;
}
