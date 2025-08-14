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
            hiddenViewportMobile: artpackNode.hiddenViewportMobile,
            hiddenViewportTablet: artpackNode.hiddenViewportTablet,
            hiddenViewportDesktop: artpackNode.hiddenViewportDesktop,
          };
          if (VERBOSE)
            console.log(
              '✅ TRANSFORMER - BgPane (artpack) result:',
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
            objectFit: bgImageNode.objectFit,
            position: bgImageNode.position,
            size: bgImageNode.size,
            hiddenViewportMobile: bgImageNode.hiddenViewportMobile,
            hiddenViewportTablet: bgImageNode.hiddenViewportTablet,
            hiddenViewportDesktop: bgImageNode.hiddenViewportDesktop,
          };
          if (VERBOSE)
            console.log(
              '✅ TRANSFORMER - BgPane (bgImage) result:',
              transformedNode
            );
          return transformedNode;
        }
      }

      if (VERBOSE)
        console.log(
          '⚠️ TRANSFORMER - Unknown node type, returning baseNode:',
          baseNode
        );
      return baseNode;
    })
    .filter((node) => node !== null);

  if (VERBOSE)
    console.log('📦 TRANSFORMER - Final flattened nodes:', flattenedNodes);

  // 2. Build complete OptionsPayload structure with SAFE defaults
  const optionsPayload = {
    nodes: flattenedNodes,
    isDecorative: subtree.paneNode.isDecorative ?? false,
    bgColour: subtree.paneNode.bgColour || undefined,
    heldBeliefs: subtree.paneNode.heldBeliefs,
    withheldBeliefs: subtree.paneNode.withheldBeliefs,
    codeHookTarget: subtree.paneNode.codeHookTarget,
    codeHookPayload: subtree.paneNode.codeHookPayload,
  };

  if (VERBOSE)
    console.log('✅ TRANSFORMER COMPLETE - optionsPayload:', optionsPayload);
  return optionsPayload;
}
