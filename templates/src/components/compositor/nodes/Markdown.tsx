import { useState, useEffect } from 'react';
import { getCtx } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import { RenderChildren } from './RenderChildren';
import { GhostInsertBlock } from './GhostInsertBlock';
import { PaneOverlay } from '@/components/compositor/tools/PaneOverlay';
import { processClassesForViewports } from '@/utils/compositor/reduceNodesClassNames';
import { isGridLayoutNode } from '@/utils/compositor/typeGuards';
import type { NodeProps } from '@/types/nodeProps';
import type {
  MarkdownPaneFragmentNode,
  ParentClassesPayload,
  BgImageNode,
  ArtpackImageNode,
} from '@/types/compositorTypes';

export const Markdown = (props: NodeProps) => {
  const id = props.nodeId;
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(id) as MarkdownPaneFragmentNode;
  const isPreview = ctx.rootNodeId.get() === `tmp`;
  const children = ctx.getChildNodeIDs(id);
  const isEmpty = children.length === 0;
  const lastChildId =
    children.length > 0 ? children[children.length - 1] : null;

  const [currentViewport, setCurrentViewport] = useState(
    viewportKeyStore.get().value
  );

  useEffect(() => {
    const unsubscribeViewport = viewportKeyStore.subscribe((newViewport) => {
      setCurrentViewport(newViewport.value);
    });
    return () => unsubscribeViewport();
  }, []);

  if (!node) return null;

  // Context Check: Are we inside a Grid?
  const allNodes = ctx.allNodes.get();
  const parentNode = node.parentId ? allNodes.get(node.parentId) : null;
  const isGridChild = parentNode ? isGridLayoutNode(parentNode) : false;

  let isHidden = false;
  switch (currentViewport) {
    case 'mobile':
      isHidden = !!node.hiddenViewportMobile;
      break;
    case 'tablet':
      isHidden = !!node.hiddenViewportTablet;
      break;
    case 'desktop':
      isHidden = !!node.hiddenViewportDesktop;
      break;
  }

  if (isHidden) {
    return (
      <div
        onClick={(e) => {
          ctx.setClickedNodeId(props.nodeId, true);
          e.stopPropagation();
        }}
        className="group my-4 w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-400 bg-gray-100 p-6 transition-colors hover:bg-gray-200"
        style={{ position: 'relative', zIndex: 10 }}
      >
        <div className="text-center font-bold text-gray-800">
          Hidden on this Viewport
        </div>
      </div>
    );
  }

  const parentPaneId = ctx.getClosestNodeTypeFromId(id, 'Pane');
  const bgNode = parentPaneId
    ? (() => {
        const childNodeIds = ctx.getChildNodeIDs(parentPaneId);
        return childNodeIds
          .map((childId) => allNodes.get(childId))
          .find(
            (n) =>
              n?.nodeType === 'BgPane' &&
              'type' in n &&
              (n.type === 'background-image' || n.type === 'artpack-image') &&
              'position' in n &&
              (n.position === 'left' || n.position === 'right')
          ) as (BgImageNode | ArtpackImageNode) | undefined;
      })()
    : undefined;

  function getSizeClasses(
    size: string,
    side: 'image' | 'content',
    viewport: string
  ): string {
    if (viewport === 'mobile') {
      return 'w-full';
    }
    switch (size) {
      case 'narrow':
        return side === 'image' ? 'w-1/3' : 'w-2/3';
      case 'wide':
        return side === 'image' ? 'w-2/3' : 'w-1/3';
      default: // "equal"
        return 'w-1/2';
    }
  }

  const useFlexLayout =
    bgNode && (bgNode.position === 'left' || bgNode.position === 'right');

  const flexDirection =
    currentViewport === 'mobile'
      ? 'flex-col'
      : bgNode?.position === 'right'
        ? 'flex-row-reverse'
        : 'flex-row';

  const [all, mobile, tablet, desktop] = processClassesForViewports(
    node.gridClasses || { mobile: {}, tablet: {}, desktop: {} },
    {},
    1
  );

  let gridClassName = '';
  if (isPreview) gridClassName = desktop[0];
  else {
    switch (currentViewport) {
      case 'desktop':
        gridClassName = desktop[0];
        break;
      case 'tablet':
        gridClassName = tablet[0];
        break;
      case 'mobile':
        gridClassName = mobile[0];
        break;
      default:
        gridClassName = all[0];
    }
  }

  let nodesToRender = (
    <>
      {useFlexLayout ? (
        <div
          className={`flex flex-nowrap items-center justify-center gap-6 md:gap-10 xl:gap-12 ${flexDirection}`}
        >
          <div
            className={`relative overflow-hidden ${getSizeClasses(
              bgNode.size || 'equal',
              'image',
              currentViewport
            )}`}
          >
            <RenderChildren children={[bgNode.id]} nodeProps={props} />
          </div>

          <div
            className={getSizeClasses(
              bgNode.size || 'equal',
              'content',
              currentViewport
            )}
          >
            <RenderChildren children={children} nodeProps={props} />
            {!isPreview && (
              <GhostInsertBlock
                nodeId={props.nodeId}
                ctx={props.ctx}
                isEmpty={isEmpty}
                lastChildId={lastChildId}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <RenderChildren children={children} nodeProps={props} />
          {!isPreview && (
            <GhostInsertBlock
              nodeId={props.nodeId}
              ctx={props.ctx}
              isEmpty={isEmpty}
              lastChildId={lastChildId}
            />
          )}
        </>
      )}
    </>
  );

  // Conditional Layer Rendering:
  // If we are NOT in a grid (standard Pane mode), we render the parentClasses loop.
  // If we ARE in a grid, we skip this (the grid handles the outer layers, we handle the column style).
  if (
    !isGridChild &&
    'parentClasses' in node &&
    (node.parentClasses as ParentClassesPayload)?.length > 0
  ) {
    const parentClassesLength = (node.parentClasses as ParentClassesPayload)
      .length;
    for (let i = parentClassesLength; i > 0; --i) {
      nodesToRender = (
        <div
          onClick={(e) => {
            if (e.target !== e.currentTarget) {
              return;
            }
            ctx.setClickedParentLayer(i);
            ctx.setClickedNodeId(props.nodeId);
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            if (e.target !== e.currentTarget) {
              return;
            }
            ctx.setClickedParentLayer(i);
            ctx.setClickedNodeId(props.nodeId, true);
            e.stopPropagation();
          }}
          className={`${ctx.getNodeClasses(id, currentViewport, i - 1)} group relative`}
          style={
            i === parentClassesLength
              ? { position: 'relative', zIndex: 10 }
              : undefined
          }
        >
          <PaneOverlay {...props} layer={i} />
          {nodesToRender}
        </div>
      );
    }
  }

  return (
    <div
      className={`${gridClassName} group relative`}
      style={{ position: 'relative', zIndex: 10 }}
    >
      <PaneOverlay {...props} isColumn={isGridChild} />
      {nodesToRender}
    </div>
  );
};
