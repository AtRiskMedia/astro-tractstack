import type { NodesContext } from '@/stores/nodes';
import type {
  FlatNode,
  MarkdownPaneFragmentNode,
  VisualBreakNode,
  ArtpackImageNode,
  BgImageNode,
} from '@/types/compositorTypes';
import type { PaneSubtree } from './extractor';
import type { OptionsPayload } from './index';
import {
  isBreakNode,
  isArtpackImageNode,
  isBgImageNode,
} from '@/utils/compositor/typeGuards';

export function transformToOptionsPayload(
  ctx: NodesContext,
  subtree: PaneSubtree
): OptionsPayload {
  // 1. Generate flattened nodes array with computed CSS
  const flattenedNodes = subtree.allChildNodes
    .map((node) => {
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

        return {
          ...baseNode,
          tagName: flatNode.tagName,
          copy: flatNode.copy,
          elementCss: computedCSS,
          isChanged: flatNode.isChanged,
          isPlaceholder: flatNode.isPlaceholder,
          src: flatNode.src,
          href: flatNode.href,
          alt: flatNode.alt,
          fileId: flatNode.fileId,
          codeHookParams: flatNode.codeHookParams,
          buttonPayload: flatNode.buttonPayload,
          overrideClasses: flatNode.overrideClasses,
        };
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

        return {
          ...baseNode,
          type: markdownNode.type,
          markdownId: markdownNode.markdownId,
          defaultClasses: markdownNode.defaultClasses,
          parentCss: parentCss,
          hiddenViewportMobile: markdownNode.hiddenViewportMobile,
          hiddenViewportTablet: markdownNode.hiddenViewportTablet,
          hiddenViewportDesktop: markdownNode.hiddenViewportDesktop,
        };
      }

      if (node.nodeType === 'BgPane') {
        // Handle different BgPane types
        if (isBreakNode(node as FlatNode)) {
          const breakNode = node as VisualBreakNode;
          return {
            ...baseNode,
            type: 'visual-break',
            breakDesktop: breakNode.breakDesktop,
            breakTablet: breakNode.breakTablet,
            breakMobile: breakNode.breakMobile,
          };
        }

        if (isArtpackImageNode(node)) {
          const artpackNode = node as ArtpackImageNode;
          return {
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
            hiddenViewportMobile: artpackNode.hiddenViewportMobile,
            hiddenViewportTablet: artpackNode.hiddenViewportTablet,
            hiddenViewportDesktop: artpackNode.hiddenViewportDesktop,
          };
        }

        if (isBgImageNode(node)) {
          const bgImageNode = node as BgImageNode;
          return {
            ...baseNode,
            type: bgImageNode.type,
            fileId: bgImageNode.fileId,
            src: bgImageNode.src,
            srcSet: bgImageNode.srcSet,
            alt: bgImageNode.alt,
            objectFit: bgImageNode.objectFit,
            position: bgImageNode.position,
            size: bgImageNode.size,
            hiddenViewportMobile: bgImageNode.hiddenViewportMobile,
            hiddenViewportTablet: bgImageNode.hiddenViewportTablet,
            hiddenViewportDesktop: bgImageNode.hiddenViewportDesktop,
          };
        }
      }

      return baseNode;
    })
    .filter((node) => node !== null);

  // 2. Build complete OptionsPayload structure
  return {
    nodes: flattenedNodes,
    isDecorative: subtree.paneNode.isDecorative,
    bgColour: subtree.paneNode.bgColour,
    heldBeliefs: subtree.paneNode.heldBeliefs,
    withheldBeliefs: subtree.paneNode.withheldBeliefs,
    codeHookTarget: subtree.paneNode.codeHookTarget,
    codeHookPayload: subtree.paneNode.codeHookPayload,
  };
}
