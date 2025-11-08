import { useState, useEffect } from 'react';
import { getCtx } from '@/stores/nodes';
import { RenderChildren } from './RenderChildren';
import { isGridLayoutNode } from '@/utils/compositor/typeGuards';
import type { NodeProps } from '@/types/nodeProps';
import type { ParentClassesPayload } from '@/types/compositorTypes';
import { viewportKeyStore } from '@/stores/storykeep';

export const GridLayout = (props: NodeProps) => {
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(props.nodeId);

  const [currentViewport, setCurrentViewport] = useState(
    viewportKeyStore.get().value
  );

  useEffect(() => {
    const unsubscribeViewport = viewportKeyStore.subscribe((newViewport) => {
      setCurrentViewport(newViewport.value);
    });
    return () => unsubscribeViewport();
  }, []);

  if (!node || !isGridLayoutNode(node)) {
    return <></>;
  }

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

  let gridCols = node.gridColumns.mobile;
  switch (currentViewport) {
    case 'tablet':
      gridCols = node.gridColumns.tablet;
      break;
    case 'desktop':
      gridCols = node.gridColumns.desktop;
      break;
  }
  const gridClassName = `grid grid-cols-${gridCols}`;

  const children = ctx.getChildNodeIDs(props.nodeId);

  let nodesToRender: JSX.Element = (
    <div className={gridClassName} style={{ position: 'relative', zIndex: 10 }}>
      <RenderChildren children={children} nodeProps={props} />
    </div>
  );

  if (
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
            getCtx(props).setClickedParentLayer(i);
            getCtx(props).setClickedNodeId(props.nodeId);
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            if (e.target !== e.currentTarget) {
              return;
            }
            getCtx(props).setClickedParentLayer(i);
            getCtx(props).setClickedNodeId(props.nodeId, true);
            e.stopPropagation();
          }}
          className={getCtx(props).getNodeClasses(
            props.nodeId,
            currentViewport,
            i - 1
          )}
          style={
            i === parentClassesLength
              ? { position: 'relative', zIndex: 10 }
              : undefined
          }
        >
          {nodesToRender}
        </div>
      );
    }
  } else {
    nodesToRender = (
      <div style={{ position: 'relative', zIndex: 10 }}>{nodesToRender}</div>
    );
  }

  return nodesToRender;
};
