import { useEffect, useState, memo, type CSSProperties } from 'react';
import { getCtx } from '@/stores/nodes';
import { viewportKeyStore, showAnalytics } from '@/stores/storykeep';
import { RenderChildren } from './RenderChildren';
import FeaturedContentSetup from '@/components/codehooks/FeaturedContentSetup';
import ListContentSetup from '@/components/codehooks/ListContentSetup';
import BunnyVideoSetup from '@/components/codehooks/BunnyVideoSetup';
import type { BgImageNode, ArtpackImageNode } from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';

const CodeHookContainer = ({
  payload,
}: {
  payload: { target: string; params?: Record<string, string> };
}) => (
  <div className="my-4 w-full bg-gray-50 p-6">
    <div className="mb-4 rounded-lg border-2 border-dashed border-gray-300 bg-slate-50 p-6">
      <h3 className="text-lg text-gray-700">
        Code Hook:{' '}
        <span className="font-action font-bold">
          {payload.target || 'CodeHook not found!'}
        </span>
      </h3>
    </div>
    {payload.params && (
      <div className="space-y-2">
        {Object.entries(payload.params).map(
          ([key, value]) =>
            value && (
              <div key={key} className="flex items-start">
                <span className="min-w-24 font-bold text-gray-600">{key}:</span>
                <span className="ml-2 text-gray-800">
                  {JSON.stringify(value)}
                </span>
              </div>
            )
        )}
      </div>
    )}
  </div>
);

// Helper function for size classes - NO MODIFIERS needed since React rerenders on viewport change
function getSizeClasses(
  size: string,
  side: 'image' | 'content',
  viewport: string
): string {
  // Mobile always gets full width (stacked layout)
  if (viewport === 'mobile') {
    return 'w-full';
  }

  // Desktop/tablet get fractional widths
  switch (size) {
    case 'narrow':
      return side === 'image' ? 'w-1/3' : 'w-2/3';
    case 'wide':
      return side === 'image' ? 'w-2/3' : 'w-1/3';
    default: // "equal"
      return 'w-1/2';
  }
}

const Pane = memo(
  (props: NodeProps) => {
    const $showAnalytics = showAnalytics.get();

    // Track the viewport value in state so we can react to changes
    const [currentViewport, setCurrentViewport] = useState(
      viewportKeyStore.get().value
    );

    // Update component state when viewport changes
    useEffect(() => {
      const unsubscribeViewport = viewportKeyStore.subscribe((newViewport) => {
        setCurrentViewport(newViewport.value);
      });

      return () => unsubscribeViewport();
    }, []);

    const wrapperClasses = `grid ${getCtx(props).getNodeClasses(props.nodeId, currentViewport)}`;

    const contentClasses = 'relative w-full h-auto justify-self-start';
    const contentStyles: CSSProperties = {
      ...getCtx(props).getNodeCSSPropertiesStyles(props.nodeId),
      gridArea: '1/1/1/1',
      position: 'relative',
      zIndex: 1,
    };
    const codeHookPayload = getCtx(props).getNodeCodeHookPayload(props.nodeId);
    const codeHookTarget = codeHookPayload?.target;
    const codeHookParams =
      codeHookPayload?.params?.options &&
      typeof codeHookPayload.params.options === 'string'
        ? JSON.parse(codeHookPayload.params.options)
        : null;

    const [children, setChildren] = useState<string[]>([
      ...getCtx(props).getChildNodeIDs(props.nodeId),
    ]);
    const [renderCount, setRenderCount] = useState(0); // Force rerender with counter

    // Get background node if it exists
    const allNodes = getCtx(props).allNodes.get();
    const bgNode = children
      .map((id) => allNodes.get(id))
      .find(
        (node) =>
          node?.nodeType === 'BgPane' &&
          'type' in node &&
          (node.type === 'background-image' || node.type === 'artpack-image')
      ) as (BgImageNode | ArtpackImageNode) | undefined;

    // Check if we should use flexbox layout
    const useFlexLayout =
      bgNode &&
      (bgNode.position === 'leftBleed' || bgNode.position === 'rightBleed');
    const deferFlexLayout =
      bgNode && (bgNode.position === 'left' || bgNode.position === 'right');

    // Set flex direction based on currentViewport
    const flexDirection =
      currentViewport === 'mobile'
        ? 'flex-col'
        : bgNode?.position === 'rightBleed'
          ? 'flex-row-reverse'
          : 'flex-row';

    const getPaneId = () => `pane-${props.nodeId}`;

    const handleNotification = () => {
      const newChildren = [...getCtx(props).getChildNodeIDs(props.nodeId)];
      setChildren(newChildren); // Fresh copy
      setRenderCount((prev) => prev + 1); // Increment to force rerender
    };

    useEffect(() => {
      const unsubscribe = getCtx(props).notifications.subscribe(
        props.nodeId,
        handleNotification
      );
      return unsubscribe;
    }, [props.nodeId]);

    return (
      <div id={getPaneId()} className="pane">
        <div
          id={getCtx(props).getNodeSlug(props.nodeId)}
          className={useFlexLayout ? '' : wrapperClasses}
        >
          {codeHookPayload && codeHookTarget === 'featured-content' ? (
            <FeaturedContentSetup
              nodeId={props.nodeId}
              params={codeHookParams}
            />
          ) : codeHookPayload && codeHookTarget === 'list-content' ? (
            <ListContentSetup nodeId={props.nodeId} params={codeHookParams} />
          ) : codeHookPayload && codeHookTarget === 'bunny-video' ? (
            <BunnyVideoSetup nodeId={props.nodeId} params={codeHookParams} />
          ) : codeHookPayload && codeHookTarget ? (
            <CodeHookContainer
              payload={{ target: codeHookTarget, params: codeHookParams }}
            />
          ) : useFlexLayout ? (
            // Flexbox Layout for left/right positioned images
            <div
              className={`flex flex-nowrap ${flexDirection} ${getCtx(props).getNodeClasses(props.nodeId, currentViewport)}`}
            >
              {/* Image Side */}
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

              {/* Content Side */}
              <div
                className={`${contentClasses} ${getSizeClasses(bgNode.size || 'equal', 'content', currentViewport)}`}
                style={getCtx(props).getNodeCSSPropertiesStyles(props.nodeId)}
                onClick={(e) => {
                  getCtx(props).setClickedNodeId(props.nodeId, true);
                  e.stopPropagation();
                }}
              >
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
            // Current Grid Layout (default)
            <div
              className={contentClasses}
              style={contentStyles}
              onClick={(e) => {
                if (
                  !(
                    codeHookPayload &&
                    typeof codeHookTarget === 'string' &&
                    [
                      'list-content',
                      'featured-content',
                      'bunny-video',
                    ].includes(codeHookTarget)
                  )
                )
                  getCtx(props).setClickedNodeId(props.nodeId, true);
                e.stopPropagation();
              }}
            >
              <RenderChildren
                children={children.filter((id) => {
                  const node = allNodes.get(id);
                  return node?.nodeType !== 'BgPane';
                })}
                nodeProps={props}
                key={`content-children-${props.nodeId}-${renderCount}`}
              />

              {$showAnalytics ? <div>show analytics here</div> : null}
            </div>
          ) : (
            // Current Grid Layout (default)
            <div
              className={contentClasses}
              style={contentStyles}
              onClick={(e) => {
                if (
                  !(
                    codeHookPayload &&
                    typeof codeHookTarget === 'string' &&
                    [
                      'list-content',
                      'featured-content',
                      'bunny-video',
                    ].includes(codeHookTarget)
                  )
                )
                  getCtx(props).setClickedNodeId(props.nodeId, true);
                e.stopPropagation();
              }}
            >
              <RenderChildren
                children={children}
                nodeProps={props}
                key={`render-children-${props.nodeId}-${renderCount}`}
              />
              {$showAnalytics ? <div>show analytics here</div> : null}
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps: NodeProps, nextProps: NodeProps) => {
    const isEqual =
      prevProps.nodeId === nextProps.nodeId && prevProps.ctx === nextProps.ctx;
    if (!isEqual) {
      console.log(
        ` !! Pane rerender triggered by props change: ${prevProps.nodeId} -> ${nextProps.nodeId}`
      );
    }
    return isEqual;
  }
);

Pane.displayName = 'Pane';
export { Pane, CodeHookContainer };
