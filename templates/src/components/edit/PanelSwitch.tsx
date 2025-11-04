import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { isMarkdownPaneFragmentNode } from '@/utils/compositor/typeGuards';
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
import StyleCodeHookPanel from './panels/StyleCodeHookPanel';
import { getSettingsPanelTitle } from '@/utils/helpers';
import type { BrandConfig } from '@/types/tractstack';
import type {
  FlatNode,
  MarkdownPaneFragmentNode,
} from '@/types/compositorTypes';

interface SettingsPanelProps {
  config: BrandConfig;
  availableCodeHooks: string[];
  onTitleChange?: (title: string) => void;
}

const PanelSwitch = ({
  config,
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
  const markdownNode = childNodes.find((node) => node.nodeType === 'Markdown');

  if (markdownNode && !isMarkdownPaneFragmentNode(markdownNode)) return null;

  switch (signal.action) {
    case 'style-break':
      if (clickedNode && paneNode)
        return (
          <StyleBreakPanel
            config={config}
            node={clickedNode}
            parentNode={paneNode}
          />
        );
      break;

    case 'style-parent':
      if (markdownNode && paneNode)
        return (
          <StyleParentPanel
            node={markdownNode}
            parentNode={paneNode}
            layer={signal.layer || 0}
            config={config}
          />
        );
      break;

    case 'style-parent-add':
      if (markdownNode)
        return (
          <StyleParentAddPanel node={markdownNode} layer={signal.layer || 0} />
        );
      break;

    case 'style-parent-remove':
      if (markdownNode && signal.className)
        return (
          <StyleParentRemovePanel
            node={markdownNode}
            layer={signal.layer || 0}
            className={signal.className}
          />
        );
      break;

    case 'style-parent-update':
      if (markdownNode && signal.className)
        return (
          <StyleParentUpdatePanel
            node={markdownNode}
            layer={signal.layer || 0}
            className={signal.className}
            config={config}
          />
        );
      break;

    case 'style-parent-delete-layer':
      if (markdownNode)
        return (
          <StyleParentDeleteLayerPanel
            node={markdownNode}
            layer={signal.layer || 0}
          />
        );
      break;

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
            config={config}
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
      if (clickedNode)
        return <StyleLinkConfigPanel node={clickedNode} config={config} />;
      break;

    case 'style-element':
      if (clickedNode && markdownNode)
        return (
          <StyleElementPanel
            node={clickedNode}
            parentNode={markdownNode as MarkdownPaneFragmentNode}
            onTitleChange={onTitleChange}
          />
        );
      break;

    case 'style-element-add':
      if (clickedNode && markdownNode)
        return (
          <StyleElementAddPanel
            node={clickedNode}
            parentNode={markdownNode}
            onTitleChange={onTitleChange}
          />
        );
      break;

    case 'style-element-remove':
      if (clickedNode && markdownNode && signal.className)
        return (
          <StyleElementRemovePanel
            node={clickedNode}
            parentNode={markdownNode}
            className={signal.className}
            onTitleChange={onTitleChange}
          />
        );
      break;

    case 'style-element-update':
      if (clickedNode && markdownNode && signal.className)
        return (
          <StyleElementUpdatePanel
            node={clickedNode}
            parentNode={markdownNode}
            className={signal.className}
            onTitleChange={onTitleChange}
            config={config}
          />
        );
      break;

    case 'style-image': {
      if (clickedNode?.parentId) {
        const containerNode = allNodes.get(clickedNode.parentId);
        if (containerNode?.parentId) {
          const outerContainerNode = allNodes.get(containerNode.parentId);
          if (markdownNode && containerNode && outerContainerNode)
            return (
              <StyleImagePanel
                node={clickedNode}
                parentNode={markdownNode}
                containerNode={containerNode as FlatNode}
                outerContainerNode={outerContainerNode as FlatNode}
              />
            );
        }
      }
      break;
    }

    case 'style-img-add':
    case 'style-img-container-add':
    case 'style-img-outer-add':
      if (clickedNode && markdownNode && signal.childId)
        return (
          <StyleImageAddPanel
            node={clickedNode}
            parentNode={markdownNode}
            childId={signal.childId}
          />
        );
      break;

    case 'style-img-update':
    case 'style-img-container-update':
    case 'style-img-outer-update':
      if (clickedNode && markdownNode && signal.className && signal.childId)
        return (
          <StyleImageUpdatePanel
            node={clickedNode}
            parentNode={markdownNode}
            className={signal.className}
            childId={signal.childId}
            config={config}
          />
        );
      break;

    case 'style-img-remove':
    case 'style-img-container-remove':
    case 'style-img-outer-remove':
      if (clickedNode && markdownNode && signal.className && signal.childId)
        return (
          <StyleImageRemovePanel
            node={clickedNode}
            parentNode={markdownNode}
            className={signal.className}
            childId={signal.childId}
          />
        );
      break;

    case 'style-widget':
      if (clickedNode?.parentId) {
        const containerNode = allNodes.get(clickedNode.parentId);
        if (containerNode?.parentId) {
          const outerContainerNode = allNodes.get(containerNode.parentId);
          if (markdownNode && containerNode && outerContainerNode)
            return (
              <StyleWidgetPanel
                node={clickedNode}
                parentNode={markdownNode}
                containerNode={containerNode as FlatNode}
                outerContainerNode={outerContainerNode as FlatNode}
              />
            );
        }
      }
      break;

    case 'style-code-config':
      if (clickedNode)
        return <StyleWidgetConfigPanel node={clickedNode} config={config} />;
      break;

    case 'style-code-add':
    case 'style-code-container-add':
    case 'style-code-outer-add':
      if (clickedNode && markdownNode)
        return (
          <StyleWidgetAddPanel
            node={clickedNode}
            parentNode={markdownNode}
            childId={signal?.childId}
          />
        );
      break;

    case 'style-code-update':
    case 'style-code-container-update':
    case 'style-code-outer-update':
      if (clickedNode && markdownNode && signal.childId && signal.className)
        return (
          <StyleWidgetUpdatePanel
            node={clickedNode}
            parentNode={markdownNode}
            className={signal.className}
            childId={signal.childId}
            config={config}
          />
        );
      break;

    case 'style-code-remove':
    case 'style-code-container-remove':
    case 'style-code-outer-remove':
      if (clickedNode && markdownNode && signal.childId && signal.className)
        return (
          <StyleWidgetRemovePanel
            node={clickedNode}
            parentNode={markdownNode}
            className={signal.className}
            childId={signal.childId}
          />
        );
      break;

    case 'style-li-element':
      if (clickedNode?.parentId) {
        const outerContainerNode = allNodes.get(clickedNode.parentId);
        if (
          markdownNode &&
          outerContainerNode &&
          signal.action === 'style-li-element'
        )
          return (
            <StyleLiElementPanel
              node={clickedNode}
              parentNode={markdownNode}
              outerContainerNode={outerContainerNode as FlatNode}
            />
          );
      }
      break;

    case 'style-li-element-add':
    case 'style-li-container-add':
      if (clickedNode && markdownNode && signal.childId)
        return (
          <StyleLiElementAddPanel
            node={clickedNode}
            parentNode={markdownNode}
            childId={signal.childId}
          />
        );
      break;

    case 'style-li-element-update':
    case 'style-li-container-update':
      if (clickedNode && markdownNode && signal.className && signal.childId)
        return (
          <StyleLiElementUpdatePanel
            node={clickedNode}
            parentNode={markdownNode}
            className={signal.className}
            childId={signal.childId}
            config={config}
          />
        );
      break;

    case 'style-li-element-remove':
    case 'style-li-container-remove':
      if (clickedNode && markdownNode && signal.className && signal.childId)
        return (
          <StyleLiElementRemovePanel
            node={clickedNode}
            parentNode={markdownNode}
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
  console.log(
    `SettingsPanel miss`,
    signal,
    clickedNode,
    paneId,
    paneNode,
    childNodeIds,
    childNodes,
    availableCodeHooks
  );
  return null;
};

export default PanelSwitch;
