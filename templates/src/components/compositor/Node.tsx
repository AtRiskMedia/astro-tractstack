import { memo, useEffect, type JSX, type ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { getCtx } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import {
  isAddressableNode,
  getNodeDisplayMode,
  isTopLevelBlockNode,
  parseCodeHook,
} from '@/utils/compositor/nodesHelper';
import { isPaneNode, isGridLayoutNode } from '@/utils/compositor/typeGuards';
import { PaneAddMode } from '@/types/compositorTypes';
import { NodeOverlay } from './tools/NodeOverlay';
import PanelVisibilityWrapper from '@/components/compositor/PanelVisibilityWrapper';
import { Pane } from './nodes/Pane';
import { CreativePane } from './nodes/CreativePane';
import { Markdown } from './nodes/Markdown';
import { StoryFragment } from './nodes/StoryFragment';
import { GridLayout } from './nodes/GridLayout';
import { Widget } from './nodes/Widget';
import { NodeBasicTag } from './nodes/tagElements/NodeBasicTag';
import { NodeImg } from './nodes/tagElements/NodeImg';
import { NodeA } from './nodes/tagElements/NodeA';
import { NodeButton } from './nodes/tagElements/NodeButton';
import { NodeText } from './nodes/tagElements/NodeText';
import { BgPaneWrapper } from './nodes/BgPaneWrapper';
import AddPanePanel from '@/components/edit/pane/AddPanePanel';
import ConfigPanePanel from '@/components/edit/pane/ConfigPanePanel';
import StoryFragmentConfigPanel from '@/components/edit/storyfragment/StoryFragmentConfigPanel';
import StoryFragmentTitlePanel from '@/components/edit/storyfragment/StoryFragmentPanel_title';
import ContextPanePanel from '@/components/edit/context/ContextPaneConfig';
import ContextPaneTitlePanel from '@/components/edit/context/ContextPaneConfig_title';

import type { NodeProps } from '@/types/nodeProps';
import type {
  FlatNode,
  PaneNode,
  StoryFragmentNode,
} from '@/types/compositorTypes';

const EmptyPageHandler = (props: NodeProps) => {
  const ctx = getCtx(props);
  useEffect(() => {
    ctx.setPaneAddMode(props.nodeId, PaneAddMode.NEW);
  }, []);

  return (
    <AddPanePanel
      nodeId={props.nodeId}
      first={true}
      ctx={ctx}
      isStoryFragment={true}
      isSandboxMode={props.isSandboxMode}
    />
  );
};

export const Node = memo((props: NodeProps) => {
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(props.nodeId);
  const viewport = useStore(viewportKeyStore).value;
  const isPreview = ctx.rootNodeId.get() === `tmp`;
  const hasPanes = useStore(ctx.hasPanes);

  if (!node) return null;

  let element: ReactNode = null;

  // 1. Root Types (StoryFragment & Pane) - handled with specific early returns or complex wrapping
  if (node.nodeType === 'StoryFragment') {
    const sf = node as StoryFragmentNode;
    if (!isPreview) ctx.hasTitle.set(!(!sf.slug || !sf.title));

    if (!(sf.slug && sf.title)) {
      return (
        <div
          className="fixed inset-0 overflow-y-auto bg-black bg-opacity-75"
          style={{ zIndex: 9005 }}
        >
          <div className="flex min-h-screen items-center justify-center p-1.5">
            <div
              className="fixed inset-0 bg-black opacity-65"
              onClick={() => (window.location.href = '/storykeep')}
            />
            <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
              <div className="p-6">
                <StoryFragmentTitlePanel nodeId={props.nodeId} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!hasPanes && !isPreview) {
      return <EmptyPageHandler {...props} />;
    }

    return (
      <>
        <StoryFragmentConfigPanel
          nodeId={props.nodeId}
          isSandboxMode={props.isSandboxMode || false}
        />
        <StoryFragment {...props} />
      </>
    );
  } else if (isPaneNode(node)) {
    const paneNode = node as PaneNode;
    const isHtmlAstPane = !!paneNode.htmlAst;
    const paneNodes = ctx.getChildNodeIDs(node.id);

    if (paneNode.isContextPane) {
      if (!isPreview) ctx.hasTitle.set(!(!paneNode.slug || !paneNode.title));

      if (!isPreview && !(paneNode.slug && paneNode.title)) {
        return (
          <div
            className="fixed inset-0 overflow-y-auto bg-black bg-opacity-75"
            style={{ zIndex: 9005 }}
          >
            <div className="flex min-h-screen items-center justify-center p-1.5">
              <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
                <div className="p-6">
                  <ContextPaneTitlePanel nodeId={props.nodeId} />
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (!isPreview && !paneNodes.length) {
        // Context Pane Empty State
        return (
          <>
            <ContextPanePanel nodeId={node.id} />
            <PanelVisibilityWrapper nodeId={node.id} panelType="add" ctx={ctx}>
              <Pane {...props} />
            </PanelVisibilityWrapper>
            <AddPanePanel
              nodeId={node.id}
              first={true}
              ctx={ctx}
              isContextPane={true}
            />
          </>
        );
      }
    }

    // Resolve Content
    const content = isHtmlAstPane ? (
      <CreativePane nodeId={props.nodeId} htmlAst={paneNode.htmlAst!} />
    ) : (
      <Pane {...props} />
    );

    element = (
      <>
        <div className="py-0.5">
          <ConfigPanePanel
            nodeId={props.nodeId}
            isHtmlAstPane={isHtmlAstPane}
            isSandboxMode={props.isSandboxMode || false}
          />
          <PanelVisibilityWrapper
            nodeId={props.nodeId}
            panelType="settings"
            ctx={ctx}
          >
            {content}
          </PanelVisibilityWrapper>
        </div>
        <AddPanePanel nodeId={props.nodeId} first={false} ctx={ctx} />
      </>
    );
  }
  // 2. Content Types
  else if (node.nodeType === 'BgPane') {
    element = <BgPaneWrapper {...props} />;
  } else if (node.nodeType === 'Markdown') {
    element = <Markdown {...props} />;
  } else if (isGridLayoutNode(node)) {
    element = <GridLayout {...props} />;
  } else if (node.nodeType === 'TagElement') {
    const flatNode = node as FlatNode;

    switch (flatNode.tagName) {
      case 'text':
        element = <NodeText {...props} />;
        break;
      case 'img':
        element = <NodeImg {...props} />;
        break;
      case 'a':
        element = <NodeA {...props} />;
        break;
      case 'button':
        element = <NodeButton {...props} />;
        break;
      case 'code': {
        const hookData = parseCodeHook(node);
        element = hookData ? (
          <Widget
            {...props}
            hook={hookData.hook}
            value1={hookData.value1}
            value2={hookData.value2}
            value3={hookData.value3}
          />
        ) : null;
        break;
      }
      default:
        element = (
          <NodeBasicTag
            {...props}
            tagName={flatNode.tagName as keyof JSX.IntrinsicElements}
            isSelectableText={true}
          />
        );
        break;
    }
  }

  // 3. Apply Overlay if addressable
  if (element && isAddressableNode(node, ctx)) {
    const isInline = getNodeDisplayMode(node, viewport, ctx);
    const isTopLevel = isTopLevelBlockNode(node, ctx);

    return (
      <NodeOverlay isInline={isInline} isTopLevel={isTopLevel} {...props}>
        {element}
      </NodeOverlay>
    );
  }

  return <>{element}</>;
});
