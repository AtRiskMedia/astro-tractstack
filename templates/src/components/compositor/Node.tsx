import { memo, type ReactElement, useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { getCtx } from '@/stores/nodes';
import { styleElementInfoStore } from '@/stores/storykeep';
import { getType } from '@/utils/compositor/typeGuards';
import { NodeWithGuid } from './NodeWithGuid';
import PanelVisibilityWrapper from './PanelVisibilityWrapper';
import { Pane } from './nodes/Pane';
import { PaneEraser } from './nodes/Pane_eraser';
import { PaneLayout } from './nodes/Pane_layout';
import { Markdown } from './nodes/Markdown';
import { BgPaneWrapper } from './nodes/BgPaneWrapper';
import { StoryFragment } from './nodes/StoryFragment';
import { TagElement } from './nodes/TagElement';
import { Widget } from './nodes/Widget';
import { NodeText } from './nodes/tagElements/NodeText';
import { NodeA } from './nodes/tagElements/NodeA';
import { NodeAEraser } from './nodes/tagElements/NodeA_eraser';
import { NodeButton } from './nodes/tagElements/NodeButton';
import { NodeButtonEraser } from './nodes/tagElements/NodeButton_eraser';
import { NodeImg } from './nodes/tagElements/NodeImg';
import { NodeBasicTag } from './nodes/tagElements/NodeBasicTag';
import { NodeBasicTagInsert } from './nodes/tagElements/NodeBasicTag_insert';
import { NodeBasicTagEraser } from './nodes/tagElements/NodeBasicTag_eraser';
import { NodeBasicTagSettings } from './nodes/tagElements/NodeBasicTag_settings';
import AddPanePanel from '@/components/edit/pane/AddPanePanel';
import PageCreationSelector from '@/components/edit/pane/PageGenSelector';
import ConfigPanePanel from '@/components/edit/pane/ConfigPanePanel';
import StoryFragmentConfigPanel from '@/components/edit/storyfragment/StoryFragmentConfigPanel';
import StoryFragmentTitlePanel from '@/components/edit/storyfragment/StoryFragmentPanel_title';
import ContextPanePanel from '@/components/edit/context/ContextPaneConfig';
import ContextPaneTitlePanel from '@/components/edit/context/ContextPaneConfig_title';
import { regexpHook } from '@/constants';
import type {
  StoryFragmentNode,
  PaneNode,
  BaseNode,
  FlatNode,
} from '@/types/compositorTypes';
import type { NodeProps } from '@/types/nodeProps';

function parseCodeHook(node: BaseNode | FlatNode) {
  if ('codeHookParams' in node && Array.isArray(node.codeHookParams)) {
    const hookMatch = node.copy?.match(regexpHook);

    if (!hookMatch) return null;

    return {
      hook: hookMatch[1],
      value1: node.codeHookParams[0] || null,
      value2: node.codeHookParams[1] || null,
      value3: node.codeHookParams[2] || '',
    };
  }

  if ('children' in node && Array.isArray(node.children)) {
    const firstChild = node.children[0];
    if (!firstChild?.value) return null;

    const regexpValues = /((?:[^\\|]+|\\\|?)+)/g;
    const hookMatch = firstChild.value.match(regexpHook);

    if (!hookMatch) return null;

    const hook = hookMatch[1];
    const hookValuesRaw = hookMatch[2].match(regexpValues);

    return {
      hook,
      value1: hookValuesRaw?.[0] || null,
      value2: hookValuesRaw?.[1] || null,
      value3: hookValuesRaw?.[2] || '',
    };
  }

  return null;
}

const getElement = (
  node: BaseNode | FlatNode,
  props: NodeProps
): ReactElement => {
  if (node === undefined) return <></>;
  const isPreview = getCtx(props).rootNodeId.get() === `tmp`;
  const hasPanes = useStore(getCtx(props).hasPanes);
  const isTemplate = useStore(getCtx(props).isTemplate);
  const sharedProps = { nodeId: node.id, ctx: props.ctx, config: props.config };
  const type = getType(node);

  switch (type) {
    case 'Markdown':
      return <Markdown {...sharedProps} />;

    case 'StoryFragment': {
      const sf = node as StoryFragmentNode;
      if (!isPreview) getCtx(props).hasTitle.set(!(!sf.slug || !sf.title));

      return (
        <>
          {!(sf.slug && sf.title) ? (
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
                  <div className="absolute right-4 top-4 z-10">
                    <button
                      onClick={() => (window.location.href = '/storykeep')}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white bg-opacity-90 shadow-lg transition-all duration-200 hover:bg-opacity-100"
                      title="Cancel and return to StoryKeep"
                      aria-label="Cancel and return to StoryKeep"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-6">
                    <StoryFragmentTitlePanel nodeId={props.nodeId} />
                  </div>
                </div>
              </div>
            </div>
          ) : !hasPanes && sf.slug && sf.title && !isPreview ? (
            <PageCreationSelector
              nodeId={props.nodeId}
              ctx={getCtx(props)}
              isTemplate={isTemplate}
            />
          ) : (
            <>
              <PanelVisibilityWrapper
                nodeId={props.nodeId}
                panelType="storyfragment"
                ctx={getCtx(props)}
              >
                <StoryFragmentConfigPanel
                  nodeId={props.nodeId}
                  config={props.config!}
                />
              </PanelVisibilityWrapper>
              <StoryFragment {...sharedProps} />
            </>
          )}
        </>
      );
    }

    case 'Pane': {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      const paneNodes = getCtx(props).getChildNodeIDs(node.id);
      const paneNode = node as PaneNode;
      if (paneNode.isContextPane) {
        if (!isPreview)
          getCtx(props).hasTitle.set(!(!paneNode.slug || !paneNode.title));
        return (
          <>
            {!isPreview && !(paneNode.slug && paneNode.title) ? (
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
            ) : !isPreview ? (
              <ContextPanePanel nodeId={node.id} />
            ) : null}
            <div>
              <Pane {...sharedProps} />
              {!isPreview &&
                paneNode.slug &&
                paneNode.title &&
                paneNodes.length === 0 && (
                  <PanelVisibilityWrapper
                    nodeId={node.id}
                    panelType="add"
                    ctx={getCtx(props)}
                  >
                    <AddPanePanel
                      nodeId={node.id}
                      first={true}
                      ctx={getCtx(props)}
                      isContextPane={true}
                    />
                  </PanelVisibilityWrapper>
                )}
            </div>
          </>
        );
      }

      const storyFragmentId = getCtx(props).getClosestNodeTypeFromId(
        node.id,
        'StoryFragment'
      );
      const storyFragment = getCtx(props)
        .allNodes.get()
        .get(storyFragmentId) as StoryFragmentNode;
      const firstPane =
        storyFragment?.paneIds?.length && storyFragment.paneIds[0];
      if (isPreview) return <Pane {...sharedProps} />;
      return (
        <>
          {storyFragment && firstPane === node.id && (
            <PanelVisibilityWrapper
              nodeId={`${node.id}-0`}
              panelType="add"
              ctx={getCtx(props)}
            >
              <AddPanePanel nodeId={node.id} first={true} ctx={getCtx(props)} />
            </PanelVisibilityWrapper>
          )}
          <div className="py-0.5">
            <PanelVisibilityWrapper
              nodeId={node.id}
              panelType="settings"
              ctx={getCtx(props)}
            >
              <ConfigPanePanel nodeId={node.id} />
            </PanelVisibilityWrapper>
            {toolModeVal === `eraser` ? (
              <PaneEraser {...sharedProps} />
            ) : toolModeVal === `layout` ? (
              <PaneLayout {...sharedProps} />
            ) : (
              <Pane {...sharedProps} />
            )}
          </div>
          <PanelVisibilityWrapper
            nodeId={node.id}
            panelType="add"
            ctx={getCtx(props)}
          >
            <AddPanePanel nodeId={node.id} first={false} ctx={getCtx(props)} />
          </PanelVisibilityWrapper>
        </>
      );
    }

    case 'BgPane':
      return <BgPaneWrapper {...sharedProps} />;
    case 'TagElement':
      return <TagElement {...sharedProps} />;
    // tag elements
    case 'h2':
    case 'h3':
    case 'h4':
    case 'ol':
    case 'ul':
    case 'li':
    case 'aside':
    case 'p': {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      if (toolModeVal === `insert`)
        return <NodeBasicTagInsert {...sharedProps} tagName={type} />;
      else if (toolModeVal === `eraser`)
        return <NodeBasicTagEraser {...sharedProps} tagName={type} />;
      else if (toolModeVal === `move`)
        return <NodeBasicTagSettings {...sharedProps} tagName={type} />;
      return <NodeBasicTag {...sharedProps} tagName={type} />;
    }

    case 'strong':
    case 'em':
      return <NodeBasicTag {...sharedProps} tagName={type} />;

    case 'text':
      return <NodeText {...sharedProps} />;
    case 'button': {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      if (toolModeVal === `eraser`)
        return <NodeButtonEraser {...sharedProps} />;
      return <NodeButton {...sharedProps} />;
    }
    case 'a': {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      if (toolModeVal === `eraser`) return <NodeAEraser {...sharedProps} />;
      return <NodeA {...sharedProps} />;
    }
    case 'img':
      return <NodeImg {...sharedProps} />;
    case 'code': {
      const hookData = parseCodeHook(node);
      return hookData ? <Widget {...hookData} {...sharedProps} /> : <></>;
    }
    case 'impression':
      return <></>;
    default:
      console.warn(`Node.tsx miss on ${type}`, node);
      return <></>;
  }
};

const Node = memo((props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  const isPreview = getCtx(props).rootNodeId.get() === `tmp`;

  const {
    markdownParentId,
    tagName: styleTagName,
    overrideNodeId,
  } = useStore(styleElementInfoStore, {
    keys: ['markdownParentId', 'tagName', 'overrideNodeId'],
  });

  // Subscribe to edit lock state for this node
  const [isEditLocked, setIsEditLocked] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsEditLocked(getCtx(props).isEditLocked(props.nodeId));

    // Subscribe to changes in edit lock
    const unsubscribe = getCtx(props).editingNodeId.subscribe((editingId) => {
      setIsEditLocked(editingId === props.nodeId);
    });

    return () => unsubscribe();
  }, [props.nodeId]);

  useEffect(() => {
    // Only subscribe to notifications if not edit-locked
    if (!isEditLocked) {
      const unsubscribe = getCtx(props).notifications.subscribe(
        props.nodeId,
        () => {}
      );
      return () => unsubscribe();
    }
  }, [props.nodeId, isEditLocked]);

  const nodeTagName = node?.tagName || '';
  const isBlockTag = ['h2', 'h3', 'h4', 'ol', 'ul', 'li', 'p'].includes(
    nodeTagName
  );

  const parentNode = node?.parentId
    ? getCtx(props).allNodes.get().get(node.parentId)
    : null;
  const isTopLevelBlock = isBlockTag && parentNode?.nodeType === 'Markdown';

  const closestMarkdownId = getCtx(props).getClosestNodeTypeFromId(
    props.nodeId,
    'Markdown'
  );
  const isEditableMode = [`text`].includes(
    getCtx(props).toolModeValStore.get().value
  );
  const isStylesMode = [`styles`].includes(
    getCtx(props).toolModeValStore.get().value
  );

  const isHighlighted =
    isTopLevelBlock &&
    closestMarkdownId === markdownParentId &&
    nodeTagName === styleTagName &&
    !isEditableMode;

  const isOverride = overrideNodeId === props.nodeId;

  const highlightStyle = isHighlighted
    ? {
        outline: isOverride
          ? '3.5px dotted rgba(255, 165, 0, 0.85)'
          : '2.5px dashed rgba(0, 0, 0, 0.3)',
      }
    : {};
  const hoverClasses = isStylesMode
    ? 'hover:outline hover:outline-2 hover:outline-black'
    : '';

  const element = getElement(node, props);

  if (!isPreview && getCtx(props).showGuids.get()) {
    return <NodeWithGuid {...props} element={element} />;
  }

  if (isTopLevelBlock) {
    return (
      <div className={hoverClasses} style={highlightStyle}>
        {element}
      </div>
    );
  }

  return element;
});

export default Node;
