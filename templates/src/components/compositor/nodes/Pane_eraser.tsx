import { type CSSProperties, useEffect, useState } from 'react';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import { viewportKeyStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { RenderChildren } from './RenderChildren';
import { CodeHookContainer } from './Pane';
import { CreativePane } from './CreativePane';
import type { NodeProps } from '@/types/nodeProps';
import type {
  BgImageNode,
  ArtpackImageNode,
  PaneNode,
} from '@/types/compositorTypes';

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
    default:
      return 'w-1/2';
  }
}

export const PaneEraser = (props: NodeProps) => {
  const ctx = getCtx(props);
  const paneNode = getCtx(props).allNodes.get().get(props.nodeId);
  const isHtmlAstPane = !!(paneNode as PaneNode).htmlAst;
  const [currentViewport, setCurrentViewport] = useState(
    viewportKeyStore.get().value
  );

  useEffect(() => {
    const unsubscribeViewport = viewportKeyStore.subscribe((newViewport) => {
      setCurrentViewport(newViewport.value);
    });
    return () => unsubscribeViewport();
  }, []);

  const wrapperClasses = `grid ${ctx.getNodeClasses(props.nodeId, currentViewport)}`;
  const contentClasses = 'relative w-full h-auto justify-self-start';
  const contentStyles: CSSProperties = {
    ...ctx.getNodeCSSPropertiesStyles(props.nodeId),
    gridArea: '1/1/1/1',
    position: 'relative',
    zIndex: 1,
  };
  const codeHookPayload = ctx.getNodeCodeHookPayload(props.nodeId);
  const [children, setChildren] = useState<string[]>([
    ...ctx.getChildNodeIDs(props.nodeId),
  ]);
  const [renderCount, setRenderCount] = useState(0);

  const getPaneId = (): string => `pane-${props.nodeId}`;

  useEffect(() => {
    const unsubscribe = ctx.notifications.subscribe(props.nodeId, () => {
      setChildren([...ctx.getChildNodeIDs(props.nodeId)]);
      setRenderCount((prev) => prev + 1);
    });
    return unsubscribe;
  }, [props.nodeId, ctx.notifications]);

  const DeleteButton = () => (
    <button
      title="Delete Pane"
      onClick={(e) => {
        ctx.setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
      className="absolute right-2 top-2 z-10 rounded-full bg-red-700 p-1.5 hover:bg-black"
    >
      <TrashIcon className="h-10 w-10 text-white" />
    </button>
  );

  const allNodes = ctx.allNodes.get();
  const bgNode = children
    .map((id) => allNodes.get(id))
    .find(
      (node) =>
        node?.nodeType === 'BgPane' &&
        'type' in node &&
        (node.type === 'background-image' || node.type === 'artpack-image')
    ) as (BgImageNode | ArtpackImageNode) | undefined;

  const useFlexLayout =
    bgNode &&
    (bgNode.position === 'leftBleed' || bgNode.position === 'rightBleed');
  const deferFlexLayout =
    bgNode && (bgNode.position === 'left' || bgNode.position === 'right');

  const flexDirection =
    currentViewport === 'mobile'
      ? 'flex-col'
      : bgNode?.position === 'rightBleed'
        ? 'flex-row-reverse'
        : 'flex-row';

  return (
    <div id={getPaneId()} className="pane min-h-16">
      <div
        id={ctx.getNodeSlug(props.nodeId)}
        className={useFlexLayout ? '' : wrapperClasses}
      >
        {isHtmlAstPane ? (
          <div className="relative">
            <DeleteButton />
            <CreativePane
              nodeId={props.nodeId}
              htmlAst={(paneNode as PaneNode).htmlAst!}
              isProtected={true}
            />
          </div>
        ) : codeHookPayload ? (
          <div className={contentClasses} style={contentStyles}>
            <DeleteButton />
            <CodeHookContainer payload={codeHookPayload} />
          </div>
        ) : useFlexLayout ? (
          <div
            className={`flex flex-nowrap ${flexDirection} ${ctx.getNodeClasses(props.nodeId, currentViewport)}`}
          >
            <div
              className={`relative overflow-hidden ${getSizeClasses(bgNode.size || 'equal', 'image', currentViewport)}`}
            >
              <RenderChildren
                children={children.filter((id) => {
                  const node = allNodes.get(id);
                  return node?.nodeType === 'BgPane';
                })}
                nodeProps={props}
                key={`bg-children-${props.nodeId}-${renderCount}`}
              />
            </div>
            <div
              className={`${contentClasses} ${getSizeClasses(bgNode.size || 'equal', 'content', currentViewport)}`}
              style={ctx.getNodeCSSPropertiesStyles(props.nodeId)}
              onClick={(e) => {
                ctx.setClickedNodeId(props.nodeId);
                e.stopPropagation();
              }}
            >
              <DeleteButton />
              <RenderChildren
                children={children.filter((id) => {
                  const node = allNodes.get(id);
                  return node?.nodeType !== 'BgPane';
                })}
                nodeProps={props}
                key={`content-children-${props.nodeId}-${renderCount}`}
              />
            </div>
          </div>
        ) : deferFlexLayout ? (
          <div
            className={contentClasses}
            style={contentStyles}
            onClick={(e) => {
              ctx.setClickedNodeId(props.nodeId);
              e.stopPropagation();
            }}
          >
            <DeleteButton />
            <RenderChildren
              children={children.filter((id) => {
                const node = allNodes.get(id);
                return node?.nodeType !== 'BgPane';
              })}
              nodeProps={props}
              key={`content-children-${props.nodeId}-${renderCount}`}
            />
          </div>
        ) : (
          <div
            className={contentClasses}
            style={contentStyles}
            onClick={(e) => {
              ctx.setClickedNodeId(props.nodeId);
              e.stopPropagation();
            }}
          >
            <DeleteButton />
            <RenderChildren
              children={children}
              nodeProps={props}
              key={`render-children-${props.nodeId}-${renderCount}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};
