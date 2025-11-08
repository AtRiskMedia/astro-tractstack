import { extractPaneSubtree, type PaneSubtree } from './extractor';
import { formatForSave, formatForPreview } from './loader';
import { storyFragmentTopicsStore } from '@/stores/storykeep';
import { getBrandConfig } from '@/utils/api/brandConfig';
import { fullContentMapStore } from '@/stores/storykeep';
import type { NodesContext } from '@/stores/nodes';
import type {
  FlatNode,
  MarkdownPaneFragmentNode,
  VisualBreakNode,
  ArtpackImageNode,
  BgImageNode,
  StoryFragmentNode,
  GridLayoutNode,
} from '@/types/compositorTypes';
import type {
  OptionsPayload,
  BackendPreviewPayload,
  BackendSavePayload,
} from './index';
import {
  isBreakNode,
  isArtpackImageNode,
  isBgImageNode,
  isGridLayoutNode,
} from '@/utils/compositor/typeGuards';
import { processClassesForViewports } from '@/utils/compositor/reduceNodesClassNames';

const VERBOSE = false;

export function transformToOptionsPayload(
  ctx: NodesContext,
  subtree: PaneSubtree
): OptionsPayload {
  if (VERBOSE)
    console.log('🔄 TRANSFORMER START - subtree:', {
      paneNodeId: subtree.paneNode.id,
      childNodeCount: subtree.allChildNodes.length,
      allChildNodes: subtree.allChildNodes.map((n) => ({
        id: n.id,
        nodeType: n.nodeType,
        parentId: n.parentId,
        tagName: (n as any).tagName,
        copy: (n as any).copy,
      })),
    });

  const flattenedNodes = subtree.allChildNodes
    .map((node) => {
      if (VERBOSE)
        console.log('🔧 TRANSFORMER - Processing node:', {
          id: node.id,
          nodeType: node.nodeType,
          parentId: node.parentId,
        });

      const baseNode = {
        id: node.id,
        nodeType: node.nodeType,
        parentId: node.parentId,
      };

      if (node.nodeType === 'TagElement') {
        const flatNode = node as FlatNode;
        let computedCSS: string | undefined;
        try {
          computedCSS = ctx.getNodeClasses(node.id, 'auto', 0);
        } catch (error) {
          console.warn(`Failed to compute CSS for node ${node.id}:`, error);
        }

        const transformedNode = {
          ...baseNode,
          tagName: flatNode.tagName,
          copy: flatNode.copy,
          elementCss: computedCSS,
          isPlaceholder: flatNode.isPlaceholder,
          src: flatNode.src,
          base64Data: flatNode.base64Data,
          href: flatNode.href,
          alt: flatNode.alt,
          fileId: flatNode.fileId,
          codeHookParams: flatNode.codeHookParams,
          buttonPayload: flatNode.buttonPayload,
          overrideClasses: flatNode.overrideClasses,
        };

        if (VERBOSE)
          console.log('✅ TRANSFORMER - TagElement result:', transformedNode);
        return transformedNode;
      }

      if (isGridLayoutNode(node)) {
        const gridLayoutNode = node as GridLayoutNode;
        let gridCss = '';
        if (gridLayoutNode.gridColumns) {
          const { mobile, tablet, desktop } = gridLayoutNode.gridColumns;
          gridCss = `grid grid-cols-${mobile}`;
          if (tablet !== mobile) {
            gridCss += ` md:grid-cols-${tablet}`;
          }
          if (desktop !== tablet) {
            gridCss += ` xl:grid-cols-${desktop}`;
          }
        }

        let parentCss: string[] | undefined;
        if (gridLayoutNode.parentClasses) {
          try {
            parentCss = gridLayoutNode.parentClasses.map((_, index) =>
              ctx.getNodeClasses(node.id, 'auto', index)
            );
          } catch (error) {
            console.warn(
              `Failed to compute parent CSS for grid node ${node.id}:`,
              error
            );
          }
        }

        const transformedNode = {
          ...baseNode,
          type: gridLayoutNode.type,
          gridCss: gridCss,
          gridColumns: gridLayoutNode.gridColumns,
          parentClasses: gridLayoutNode.parentClasses,
          parentCss: parentCss,
          defaultClasses: gridLayoutNode.defaultClasses,
          hiddenViewportMobile: gridLayoutNode.hiddenViewportMobile,
          hiddenViewportTablet: gridLayoutNode.hiddenViewportTablet,
          hiddenViewportDesktop: gridLayoutNode.hiddenViewportDesktop,
        };

        if (VERBOSE)
          console.log('✅ TRANSFORMER - GridLayout result:', transformedNode);
        return transformedNode;
      }

      if (node.nodeType === 'Markdown') {
        const markdownNode = node as MarkdownPaneFragmentNode;

        let parentCss: string[] | undefined;
        if (markdownNode.parentClasses) {
          try {
            parentCss = markdownNode.parentClasses.map((_, index) =>
              ctx.getNodeClasses(node.id, 'auto', index)
            );
          } catch (error) {
            console.warn(
              `Failed to compute parent CSS for markdown node ${node.id}:`,
              error
            );
          }
        }

        let gridCss: string | undefined;
        if (markdownNode.gridClasses) {
          try {
            const [allClasses] = processClassesForViewports(
              markdownNode.gridClasses,
              {},
              1
            );
            if (allClasses && allClasses.length > 0) {
              gridCss = allClasses[0];
            }
          } catch (error) {
            console.warn(
              `Failed to compute grid CSS for markdown node ${node.id}:`,
              error
            );
          }
        }

        const transformedNode = {
          ...baseNode,
          type: markdownNode.type,
          markdownId: markdownNode.markdownId,
          defaultClasses: markdownNode.defaultClasses,
          parentClasses: markdownNode.parentClasses,
          parentCss: parentCss,
          hiddenViewportMobile: markdownNode.hiddenViewportMobile,
          hiddenViewportTablet: markdownNode.hiddenViewportTablet,
          hiddenViewportDesktop: markdownNode.hiddenViewportDesktop,
          gridClasses: markdownNode.gridClasses,
          ...(gridCss && { gridCss: gridCss }),
        };

        if (VERBOSE)
          console.log('✅ TRANSFORMER - Markdown result:', transformedNode);
        return transformedNode;
      }

      if (node.nodeType === 'BgPane') {
        if (isBreakNode(node as FlatNode)) {
          const breakNode = node as VisualBreakNode;
          const transformedNode = {
            ...baseNode,
            type: 'visual-break',
            breakDesktop: breakNode.breakDesktop,
            breakTablet: breakNode.breakTablet,
            breakMobile: breakNode.breakMobile,
          };
          if (VERBOSE)
            console.log(
              '✅ TRANSFORMER - BgPane (visual-break) result:',
              transformedNode
            );
          return transformedNode;
        }

        if (isArtpackImageNode(node)) {
          const artpackNode = node as ArtpackImageNode;
          const transformedNode = {
            ...baseNode,
            type: artpackNode.type,
            collection: artpackNode.collection,
            image: artpackNode.image,
            src: artpackNode.src,
            srcSet: artpackNode.srcSet,
            alt: artpackNode.alt,
            objectFit: artpackNode.objectFit,
            position: artpackNode.position,
            size: artpackNode.size,
          };
          if (VERBOSE)
            console.log(
              '✅ TRANSFORMER - BgPane (artpack-image) result:',
              transformedNode
            );
          return transformedNode;
        }

        if (isBgImageNode(node)) {
          const bgImageNode = node as BgImageNode;
          const transformedNode = {
            ...baseNode,
            type: bgImageNode.type,
            fileId: bgImageNode.fileId,
            src: bgImageNode.src,
            srcSet: bgImageNode.srcSet,
            alt: bgImageNode.alt,
            base64Data: bgImageNode.base64Data,
            objectFit: bgImageNode.objectFit,
            position: bgImageNode.position,
            size: bgImageNode.size,
          };
          if (VERBOSE)
            console.log(
              '✅ TRANSFORMER - BgPane (background-image) result:',
              transformedNode
            );
          return transformedNode;
        }
        if (VERBOSE)
          console.warn('⚠️ TRANSFORMER - Unknown BgPane type:', node);
        return baseNode;
      }
      if (VERBOSE) console.warn('⚠️ TRANSFORMER - Unknown node type:', node);
      return baseNode;
    })
    .filter((node) => node !== null);

  const optionsPayload: OptionsPayload = {
    bgColour: subtree.paneNode.bgColour,
    isDecorative: subtree.paneNode.isDecorative,
    codeHookTarget: subtree.paneNode.codeHookTarget,
    heldBeliefs: subtree.paneNode.heldBeliefs ?? {},
    withheldBeliefs: subtree.paneNode.withheldBeliefs ?? {},
    codeHookPayload: subtree.paneNode.codeHookPayload,
    nodes: flattenedNodes,
  };

  if (VERBOSE)
    console.log('✅ TRANSFORMER COMPLETE - Final payload:', {
      nodeCount: optionsPayload.nodes.length,
      bgColour: optionsPayload.bgColour,
      isDecorative: optionsPayload.isDecorative,
    });

  return optionsPayload;
}

export async function transformStoryFragmentForSave(
  ctx: NodesContext,
  fragmentId: string,
  tenantId: string
): Promise<any> {
  const node = ctx.allNodes.get().get(fragmentId) as StoryFragmentNode;
  const seoData = storyFragmentTopicsStore.get()[fragmentId];

  const brandConfig = await getBrandConfig(tenantId);
  const defaultTractStackSlug =
    brandConfig?.TRACTSTACK_HOME_SLUG || 'tractstack';
  const contentMap = fullContentMapStore.get();
  const defaultTractStack = contentMap.find(
    (item) => item.type === 'TractStack' && item.slug === defaultTractStackSlug
  );
  const finalTractStackId =
    (node as any)?.tractStackId || defaultTractStack?.id || '';

  const payload = {
    ...node,
    ...(seoData && {
      topics: seoData.topics?.map((t) => t.title) || [],
      description: seoData.description || '',
    }),
    tractStackId: finalTractStackId,
  };

  return payload;
}

export function transformLivePaneForSave(
  ctx: NodesContext,
  paneId: string,
  isContext?: boolean
): BackendSavePayload {
  const subtree = extractPaneSubtree(ctx, paneId);
  const optionsPayload = transformToOptionsPayload(ctx, subtree);
  return formatForSave(subtree.paneNode, optionsPayload, isContext);
}

export function transformLivePaneForPreview(
  ctx: NodesContext,
  paneId: string
): BackendPreviewPayload {
  const subtree = extractPaneSubtree(ctx, paneId);
  const optionsPayload = transformToOptionsPayload(ctx, subtree);
  return formatForPreview(subtree.paneNode, optionsPayload);
}
