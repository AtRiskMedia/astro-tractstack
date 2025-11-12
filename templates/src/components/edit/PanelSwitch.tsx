import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import {
  isGridLayoutNode,
  isMarkdownPaneFragmentNode,
} from '@/utils/compositor/typeGuards';
import StyleBreakPanel from './panels/StyleBreakPanel';
import StyleParentPanel from './panels/StyleParentPanel';
import StyleParentAddPanel from './panels/StyleParentPanel_add';
import StyleParentRemovePanel from './panels/StyleParentPanel_remove';
import StyleParentUpdatePanel from './panels/StyleParentPanel_update';
import StyleParentDeleteLayerPanel from './panels/StyleParentPanel_deleteLayer';
import StyleLinkPanel from './panels/StyleLinkPanel';
import StyleLinkAddPanel from './panels/StyleLinkPanel_add';
import StyleLinkUpdatePanel from './panels/StyleLinkPanel_update';
import StyleLinkRemovePanel from './panels/StyleLinkPanel_remove';
import StyleElementPanel from './panels/StyleElementPanel';
import StyleLinkConfigPanel from './panels/StyleLinkPanel_config';
import StyleElementAddPanel from './panels/StyleElementPanel_add';
import StyleElementRemovePanel from './panels/StyleElementPanel_remove';
import StyleElementUpdatePanel from './panels/StyleElementPanel_update';
import StyleImagePanel from './panels/StyleImagePanel';
import StyleImageAddPanel from './panels/StyleImagePanel_add';
import StyleImageUpdatePanel from './panels/StyleImagePanel_update';
import StyleImageRemovePanel from './panels/StyleImagePanel_remove';
import StyleWidgetPanel from './panels/StyleWidgetPanel';
import StyleWidgetConfigPanel from './panels/StyleWidgetPanel_config';
import StyleWidgetAddPanel from './panels/StyleWidgetPanel_add';
import StyleWidgetUpdatePanel from './panels/StyleWidgetPanel_update';
import StyleWidgetRemovePanel from './panels/StyleWidgetPanel_remove';
import StyleLiElementPanel from './panels/StyleLiElementPanel';
import StyleLiElementAddPanel from './panels/StyleLiElementPanel_add';
import StyleLiElementUpdatePanel from './panels/StyleLiElementPanel_update';
import StyleLiElementRemovePanel from './panels/StyleLiElementPanel_remove';
import StyleWordCarouselPanel from './panels/StyleWordCarouselPanel';
import StyleCodeHookPanel from './panels/StyleCodeHookPanel';
import { getSettingsPanelTitle } from '@/utils/helpers';
import type {
  FlatNode,
  GridLayoutNode,
  MarkdownPaneFragmentNode,
} from '@/types/compositorTypes';

interface SettingsPanelProps {
  availableCodeHooks: string[];
  onTitleChange?: (title: string) => void;
}

const PanelSwitch = ({
  availableCodeHooks,
  onTitleChange,
}: SettingsPanelProps) => {
  const signal = useStore(settingsPanelStore);

  useEffect(() => {
    if (signal?.action && onTitleChange) {
      const title = getSettingsPanelTitle(signal.action);
      if (title) onTitleChange(title);
    }
  }, [signal?.action, onTitleChange]);

  if (!signal) {
    return null;
  }

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const clickedNode = allNodes.get(signal.nodeId) as FlatNode | undefined;

  const paneId =
    clickedNode?.nodeType === 'Pane'
      ? clickedNode.id
      : ctx.getClosestNodeTypeFromId(signal.nodeId, 'Pane');
  const paneNode =
    clickedNode?.nodeType === 'Pane'
      ? clickedNode
      : paneId
        ? (allNodes.get(paneId) as FlatNode)
        : undefined;
  const childNodeIds = paneNode ? ctx.getChildNodeIDs(paneId) : [];
  const childNodes = childNodeIds
    .map((id) => allNodes.get(id))
    .filter((node): node is FlatNode => !!node);
  const markdownNode =
    clickedNode &&
    signal.targetProperty &&
    signal.targetProperty === 'gridClasses' &&
    isMarkdownPaneFragmentNode(clickedNode)
      ? clickedNode
      : childNodes.find(isMarkdownPaneFragmentNode);
  const gridLayoutNode = childNodes.find(isGridLayoutNode);

  if (markdownNode && !isMarkdownPaneFragmentNode(markdownNode)) return null;
  if (gridLayoutNode && !isGridLayoutNode(gridLayoutNode)) return null;
  const styleContextNode = markdownNode || gridLayoutNode;

  switch (signal.action) {
    case 'style-break':
      if (clickedNode && paneNode)
        return <StyleBreakPanel node={clickedNode} parentNode={paneNode} />;
      break;

    case 'style-parent':
      if (markdownNode && paneNode)
        return (
          <StyleParentPanel
            node={markdownNode}
            parentNode={paneNode}
            layer={signal.layer || 0}
          />
        );
      else if (gridLayoutNode && paneNode)
        return (
          <StyleParentPanel
            node={gridLayoutNode}
            parentNode={paneNode}
            layer={signal.layer || 0}
          />
        );
      break;

    case 'style-parent-add': {
      if (markdownNode)
        return (
          <StyleParentAddPanel
            node={markdownNode}
            layer={signal.layer || 0}
            targetProperty={(signal as any).targetProperty}
          />
        );
      else if (gridLayoutNode)
        return (
          <StyleParentAddPanel
            node={gridLayoutNode}
            layer={signal.layer || 0}
            targetProperty={(signal as any).targetProperty}
          />
        );
      break;
    }

    case 'style-parent-remove': {
      if (
        clickedNode &&
        (isMarkdownPaneFragmentNode(clickedNode) ||
          isGridLayoutNode(clickedNode)) &&
        signal.className
      )
        return (
          <StyleParentRemovePanel
            node={clickedNode}
            layer={signal.layer || 0}
            className={signal.className}
            targetProperty={(signal as any).targetProperty}
          />
        );
      break;
    }

    case 'style-parent-update': {
      if (
        clickedNode &&
        (isMarkdownPaneFragmentNode(clickedNode) ||
          isGridLayoutNode(clickedNode)) &&
        signal.className
      )
        return (
          <StyleParentUpdatePanel
            node={clickedNode}
            layer={signal.layer || 0}
            className={signal.className}
            targetProperty={(signal as any).targetProperty}
          />
        );
      break;
    }

    case 'style-parent-delete-layer': {
      if (markdownNode)
        return (
          <StyleParentDeleteLayerPanel
            node={markdownNode}
            layer={signal.layer || 0}
          />
        );
      break;
    }

    case 'style-link':
      if (clickedNode) return <StyleLinkPanel node={clickedNode} />;
      break;

    case 'style-link-add':
    case 'style-link-add-hover':
      if (clickedNode) return <StyleLinkAddPanel node={clickedNode} />;
      break;

    case 'style-link-update':
    case 'style-link-update-hover':
      if (clickedNode && signal.className)
        return (
          <StyleLinkUpdatePanel
            node={clickedNode}
            className={signal.className}
          />
        );
      break;

    case 'style-link-remove':
    case 'style-link-remove-hover':
      if (clickedNode && signal.className)
        return (
          <StyleLinkRemovePanel
            node={clickedNode}
            className={signal.className}
          />
        );
      break;

    case 'style-link-config':
      if (clickedNode) return <StyleLinkConfigPanel node={clickedNode} />;
      break;

    case 'style-element':
      if (clickedNode && styleContextNode)
        return (
          <StyleElementPanel
            node={clickedNode}
            parentNode={
              styleContextNode as MarkdownPaneFragmentNode | GridLayoutNode
            }
            onTitleChange={onTitleChange}
          />
        );
      break;

    case 'style-element-add':
      if (clickedNode && styleContextNode)
        return (
          <StyleElementAddPanel
            node={clickedNode}
            parentNode={styleContextNode}
            onTitleChange={onTitleChange}
          />
        );
      break;

    case 'style-element-remove':
      if (clickedNode && styleContextNode && signal.className)
        return (
          <StyleElementRemovePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
            onTitleChange={onTitleChange}
          />
        );
      break;

    case 'style-element-update':
      if (clickedNode && styleContextNode && signal.className)
        return (
          <StyleElementUpdatePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
            onTitleChange={onTitleChange}
          />
        );
      break;

    case 'style-word-carousel':
      if (clickedNode) return <StyleWordCarouselPanel node={clickedNode} />;
      break;

    case 'style-image': {
      let imageNode: FlatNode | undefined;
      let containerNode: FlatNode | undefined;
      let outerContainerNode: FlatNode | undefined;

      if (
        clickedNode &&
        (clickedNode.tagName === 'ul' || clickedNode.tagName === 'ol')
      ) {
        outerContainerNode = clickedNode;
        const liNodeIds = ctx.getChildNodeIDs(outerContainerNode.id);
        if (liNodeIds.length > 0) {
          containerNode = allNodes.get(liNodeIds[0]) as FlatNode;
          if (containerNode) {
            const imgNodeIds = ctx.getChildNodeIDs(containerNode.id);
            if (imgNodeIds.length > 0) {
              imageNode = allNodes.get(imgNodeIds[0]) as FlatNode;
            }
          }
        }
      } else if (clickedNode?.parentId) {
        imageNode = clickedNode;
        containerNode = allNodes.get(clickedNode.parentId) as FlatNode;
        if (containerNode?.parentId) {
          outerContainerNode = allNodes.get(containerNode.parentId) as FlatNode;
        }
      }
      if (
        styleContextNode &&
        imageNode &&
        containerNode &&
        outerContainerNode
      ) {
        return (
          <StyleImagePanel
            node={imageNode}
            parentNode={styleContextNode}
            containerNode={containerNode}
            outerContainerNode={outerContainerNode}
          />
        );
      }
      break;
    }

    case 'style-img-add':
    case 'style-img-container-add':
    case 'style-img-outer-add':
      if (clickedNode && styleContextNode && signal.childId)
        return (
          <StyleImageAddPanel
            node={clickedNode}
            parentNode={styleContextNode}
            childId={signal.childId}
          />
        );
      break;

    case 'style-img-update':
    case 'style-img-container-update':
    case 'style-img-outer-update':
      if (clickedNode && styleContextNode && signal.className && signal.childId)
        return (
          <StyleImageUpdatePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
            childId={signal.childId}
          />
        );
      break;

    case 'style-img-remove':
      if (clickedNode && styleContextNode && signal.className)
        return (
          <StyleImageRemovePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
          />
        );
      break;

    case 'style-img-container-remove':
    case 'style-img-outer-remove':
      if (clickedNode && styleContextNode && signal.className && signal.childId)
        return (
          <StyleImageRemovePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
            childId={signal.childId}
          />
        );
      break;

    case 'style-widget': {
      let widgetNode: FlatNode | undefined;
      let containerNode: FlatNode | undefined;
      let outerContainerNode: FlatNode | undefined;

      if (
        clickedNode &&
        (clickedNode.tagName === 'ul' || clickedNode.tagName === 'ol')
      ) {
        outerContainerNode = clickedNode;
        const liNodeIds = ctx.getChildNodeIDs(outerContainerNode.id);
        if (liNodeIds.length > 0) {
          containerNode = allNodes.get(liNodeIds[0]) as FlatNode;
          if (containerNode) {
            const codeNodeIds = ctx.getChildNodeIDs(containerNode.id);
            if (codeNodeIds.length > 0) {
              widgetNode = allNodes.get(codeNodeIds[0]) as FlatNode;
            }
          }
        }
      } else if (clickedNode?.parentId) {
        widgetNode = clickedNode;
        containerNode = allNodes.get(clickedNode.parentId) as FlatNode;
        if (containerNode?.parentId) {
          outerContainerNode = allNodes.get(containerNode.parentId) as FlatNode;
        }
      }

      if (
        styleContextNode &&
        widgetNode &&
        containerNode &&
        outerContainerNode
      ) {
        return (
          <StyleWidgetPanel
            node={widgetNode}
            parentNode={styleContextNode}
            containerNode={containerNode}
            outerContainerNode={outerContainerNode}
          />
        );
      }
      break;
    }

    case 'style-code-config':
      if (clickedNode) return <StyleWidgetConfigPanel node={clickedNode} />;
      break;

    case 'style-code-add':
    case 'style-code-container-add':
    case 'style-code-outer-add':
      if (clickedNode && styleContextNode)
        return (
          <StyleWidgetAddPanel
            node={clickedNode}
            parentNode={styleContextNode}
            childId={signal?.childId}
          />
        );
      break;

    case 'style-code-update':
      if (clickedNode && styleContextNode && signal.className)
        return (
          <StyleWidgetUpdatePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
          />
        );
      break;

    case 'style-code-container-update':
    case 'style-code-outer-update':
      if (clickedNode && styleContextNode && signal.childId && signal.className)
        return (
          <StyleWidgetUpdatePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
            childId={signal.childId}
          />
        );
      break;

    case 'style-code-remove':
      if (clickedNode && styleContextNode && signal.className)
        return (
          <StyleWidgetRemovePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
          />
        );
      break;

    case 'style-code-container-remove':
    case 'style-code-outer-remove':
      if (clickedNode && styleContextNode && signal.childId && signal.className)
        return (
          <StyleWidgetRemovePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
            childId={signal.childId}
          />
        );
      break;

    case 'style-li-element':
      if (clickedNode?.parentId) {
        const outerContainerNode = allNodes.get(clickedNode.parentId);
        if (
          styleContextNode &&
          outerContainerNode &&
          signal.action === 'style-li-element'
        )
          return (
            <StyleLiElementPanel
              node={clickedNode}
              parentNode={styleContextNode}
              outerContainerNode={outerContainerNode as FlatNode}
            />
          );
      }
      break;

    case 'style-li-element-add':
      if (clickedNode && styleContextNode)
        return (
          <StyleLiElementAddPanel
            node={clickedNode}
            parentNode={styleContextNode}
          />
        );
      break;

    case 'style-li-container-add':
      if (clickedNode && styleContextNode)
        return (
          <StyleLiElementAddPanel
            node={clickedNode}
            parentNode={styleContextNode}
          />
        );
      break;

    case 'style-li-element-update':
      if (clickedNode && styleContextNode && signal.className)
        return (
          <StyleLiElementUpdatePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
          />
        );
      break;

    case 'style-li-container-update':
      if (clickedNode && styleContextNode && signal.className && signal.childId)
        return (
          <StyleLiElementUpdatePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
            childId={signal.childId}
          />
        );
      break;

    case 'style-li-element-remove':
      if (clickedNode && styleContextNode && signal.className)
        return (
          <StyleLiElementRemovePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
          />
        );
      break;

    case 'style-li-container-remove':
      if (clickedNode && styleContextNode && signal.className && signal.childId)
        return (
          <StyleLiElementRemovePanel
            node={clickedNode}
            parentNode={styleContextNode}
            className={signal.className}
            childId={signal.childId}
          />
        );
      break;

    case 'setup-codehook':
      if (paneNode)
        return (
          <StyleCodeHookPanel
            node={paneNode}
            availableCodeHooks={availableCodeHooks}
          />
        );
      break;

    default:
      settingsPanelStore.set(null);
  }
  console.warn(`SettingsPanel switch miss`, signal, clickedNode);
  return null;
};

export default PanelSwitch;
