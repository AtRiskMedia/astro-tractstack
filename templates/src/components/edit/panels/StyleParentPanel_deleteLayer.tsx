import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import {
  isMarkdownPaneFragmentNode,
  isGridLayoutNode,
} from '@/utils/compositor/typeGuards';
import { cloneDeep } from '@/utils/helpers';
import type {
  ParentBasePanelProps,
  MarkdownPaneFragmentNode,
  GridLayoutNode,
} from '@/types/compositorTypes';

type StyleableNode = MarkdownPaneFragmentNode | GridLayoutNode;

const StyleParentDeleteLayerPanel = ({ node, layer }: ParentBasePanelProps) => {
  const styleableNode = node as StyleableNode | null;

  if (
    !layer ||
    !styleableNode ||
    !(
      isMarkdownPaneFragmentNode(styleableNode) ||
      isGridLayoutNode(styleableNode)
    )
  ) {
    return null;
  }
  if (!styleableNode.parentClasses) return null;

  const layerIndex = layer - 1;
  if (layerIndex >= styleableNode.parentClasses.length) return null;

  const currentLayer = styleableNode.parentClasses[layerIndex];
  const allKeys = new Set([
    ...Object.keys(currentLayer.mobile || {}),
    ...Object.keys(currentLayer.tablet || {}),
    ...Object.keys(currentLayer.desktop || {}),
  ]);
  const count = allKeys.size;

  const resetStore = () => {
    settingsPanelStore.set({
      nodeId: styleableNode.id,
      action: 'style-parent',
      expanded: true,
    });
  };

  const handleYesClick = () => {
    const ctx = getCtx();
    const nodeToUpdate = cloneDeep(
      ctx.allNodes.get().get(styleableNode.id)
    ) as StyleableNode;

    if (!nodeToUpdate.parentClasses) return;

    // If this is the last layer, replace with empty classes instead of removing
    if (nodeToUpdate.parentClasses.length === 1) {
      const emptyLayer = {
        mobile: {},
        tablet: {},
        desktop: {},
      };

      const updatedNode = {
        ...nodeToUpdate,
        parentClasses: [emptyLayer],
        isChanged: true,
      };

      ctx.modifyNodes([updatedNode]);
      resetStore();
      return;
    }

    // Otherwise remove the layer
    const newParentClasses = [
      ...nodeToUpdate.parentClasses.slice(0, layerIndex),
      ...nodeToUpdate.parentClasses.slice(layerIndex + 1),
    ];

    const updatedNode = {
      ...nodeToUpdate,
      parentClasses: newParentClasses,
      isChanged: true,
    };

    ctx.modifyNodes([updatedNode]);
    resetStore();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">
        Remove Layer <span className="font-bold">{layer}</span>?
      </h3>
      <div className="space-y-4 rounded bg-slate-50 p-6">
        <p className="font-bold text-myorange">
          This layer has {count} classes.
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
          <li>
            <em>Are you sure?</em>
          </li>
          <li>
            <button
              onClick={handleYesClick}
              className="font-bold underline hover:text-black"
            >
              Yes
            </button>
          </li>
          <li>
            <button
              onClick={resetStore}
              className="font-bold underline hover:text-black"
            >
              No / Cancel
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StyleParentDeleteLayerPanel;
