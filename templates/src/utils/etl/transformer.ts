import { extractPaneSubtree, type PaneSubtree } from './extractor';
import { formatForSave, formatForPreview } from './loader';
import { storyFragmentTopicsStore } from '@/stores/storykeep';
import { brandConfigStore } from '@/stores/brand';
import { fullContentMapStore } from '@/stores/storykeep';
import type { NodesContext } from '@/stores/nodes';
import type {
  FlatNode,
  MarkdownPaneFragmentNode,
  VisualBreakNode,
  ArtpackImageNode,
  BgImageNode,
  StoryFragmentNode,
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
} from '@/utils/compositor/typeGuards';

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

  // 1. Generate flattened nodes array with computed CSS
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

      // Add type-specific fields based on node type
      if (node.nodeType === 'TagElement') {
        const flatNode = node as FlatNode;

        // Compute CSS using existing NodesContext methods
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

      if (node.nodeType === 'Markdown') {
        const markdownNode = node as MarkdownPaneFragmentNode;

        // Compute parentCss if parentClasses exist
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
        };

        if (VERBOSE)
          console.log('✅ TRANSFORMER - Markdown result:', transformedNode);
        return transformedNode;
      }

      if (node.nodeType === 'BgPane') {
        // Handle different BgPane types
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

        // Fallback for unknown BgPane types
        if (VERBOSE)
          console.warn('⚠️ TRANSFORMER - Unknown BgPane type:', node);
        return baseNode;
      }

      // Unknown node type - return base node
      if (VERBOSE) console.warn('⚠️ TRANSFORMER - Unknown node type:', node);
      return baseNode;
    })
    .filter((node) => node !== null);

  // 2. Build final OptionsPayload
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

export function transformStoryFragmentForSave(
  ctx: NodesContext,
  fragmentId: string
): any {
  const node = ctx.allNodes.get().get(fragmentId) as StoryFragmentNode;
  const seoData = storyFragmentTopicsStore.get()[fragmentId];

  // Get brand config from store to find default tractstack
  const brandConfig = brandConfigStore.get();
  const defaultTractStackSlug =
    brandConfig?.TRACTSTACK_HOME_SLUG || 'tractstack';
  // Find the default tractstack ID from content map
  const contentMap = fullContentMapStore.get();
  const defaultTractStack = contentMap.find(
    (item) => item.type === 'TractStack' && item.slug === defaultTractStackSlug
  );
  const finalTractStackId =
    (node as any)?.tractStackId || defaultTractStack?.id || '';

  const payload = {
    ...node,
    // Add deferred SEO data if available
    ...(seoData && {
      topics: seoData.topics?.map((t) => t.title) || [],
      description: seoData.description || '',
    }),
    // Ensure tractStackId is set for new StoryFragments
    tractStackId: finalTractStackId,
  };

  return payload;
}

export function transformLivePaneForSave(
  ctx: NodesContext,
  paneId: string,
  isContext?: boolean
): BackendSavePayload {
  // 1. Extract distributed state
  const subtree = extractPaneSubtree(ctx, paneId);

  // 2. Transform to flattened OptionsPayload using existing NodesContext methods
  const optionsPayload = transformToOptionsPayload(ctx, subtree);

  // 3. Format for save endpoint
  return formatForSave(subtree.paneNode, optionsPayload, isContext);
}

export function transformLivePaneForPreview(
  ctx: NodesContext,
  paneId: string
): BackendPreviewPayload {
  // 1. Extract distributed state
  const subtree = extractPaneSubtree(ctx, paneId);

  // 2. Transform to flattened OptionsPayload using existing NodesContext methods
  const optionsPayload = transformToOptionsPayload(ctx, subtree);

  // 3. Format for preview endpoint
  return formatForPreview(subtree.paneNode, optionsPayload);
}
