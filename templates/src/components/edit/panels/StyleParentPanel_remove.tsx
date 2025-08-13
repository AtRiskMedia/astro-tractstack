import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
import { isMarkdownPaneFragmentNode } from '@/utils/compositor/typeGuards';
import { cloneDeep } from '@/utils/helpers';
import type {
  BasePanelProps,
  MarkdownPaneFragmentNode,
} from '@/types/compositorTypes';

const StyleParentRemovePanel = ({ node, layer, className }: BasePanelProps) => {
  if (!className) return null;

  const friendlyName = tailwindClasses[className]?.title || className;

  const resetStore = () => {
    if (node?.id)
      settingsPanelStore.set({
        nodeId: node.id,
        layer: layer,
        action: `style-parent`,
        expanded: true,
      });
  };

  const handleYesClick = () => {
    if (!node || !className || !layer) {
      console.error('Missing required properties for class removal');
      return;
    }
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const markdownNode = cloneDeep(
      allNodes.get(node.id) as MarkdownPaneFragmentNode
    );
    if (!markdownNode || !isMarkdownPaneFragmentNode(markdownNode)) return;
    const layerIndex = layer - 1;
    const layerClasses = markdownNode?.parentClasses?.[layerIndex];
    if (!layerClasses) return;
    // Remove the class from each viewport if it exists
    if (className in layerClasses.mobile) delete layerClasses.mobile[className];
    if (className in layerClasses.tablet) delete layerClasses.tablet[className];
    if (className in layerClasses.desktop)
      delete layerClasses.desktop[className];
    // Update the node in the store
    const newData = { ...markdownNode, isChanged: true };
    ctx.modifyNodes([newData]);
    resetStore();
  };

  const handleNoClick = () => {
    resetStore();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">
        Remove <span className="font-bold">{friendlyName}</span>?
      </h2>
      <div className="space-y-4 rounded bg-slate-50 p-6">
        <ul className="text-mydarkgrey flex flex-wrap gap-x-4 gap-y-1">
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
              onClick={handleNoClick}
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

export default StyleParentRemovePanel;
