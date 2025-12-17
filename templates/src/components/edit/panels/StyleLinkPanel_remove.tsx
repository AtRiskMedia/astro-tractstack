import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
import { cloneDeep } from '@/utils/helpers';
import type { BasePanelProps, FlatNode } from '@/types/compositorTypes';

const StyleLinkRemovePanel = ({ node, className }: BasePanelProps) => {
  if (
    !className ||
    !node?.tagName ||
    (node.tagName !== 'a' && node.tagName !== 'button')
  ) {
    return null;
  }

  const friendlyName = tailwindClasses[className]?.title || className;
  const isHoverMode = settingsPanelStore.get()?.action?.endsWith('-hover');

  const resetStore = () => {
    if (node?.id) {
      settingsPanelStore.set({
        action: 'style-link',
        nodeId: node.id,
        expanded: true,
      });
    }
  };

  const handleYesClick = () => {
    if (!node || !className) {
      console.error('Missing required properties for class removal');
      return;
    }

    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    // Get markdown node
    const markdownId = ctx.getClosestNodeTypeFromId(node.id, 'Markdown');
    if (!linkNode || !linkNode.buttonPayload || !markdownId) return;
    // Remove from appropriate classes object based on action
    if (isHoverMode) {
      if (className in linkNode.buttonPayload.buttonHoverClasses) {
        delete linkNode.buttonPayload.buttonHoverClasses[className];
      }
    } else {
      if (className in linkNode.buttonPayload.buttonClasses) {
        delete linkNode.buttonPayload.buttonClasses[className];
      }
    }
    ctx.modifyNodes([{ ...linkNode, isChanged: true }]);
    resetStore();
  };

  const handleNoClick = () => {
    resetStore();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">
        Remove <span className="font-bold">{friendlyName}</span>
        <span className="ml-1">
          from {isHoverMode ? 'Hover' : 'Button'} State?
        </span>
      </h3>
      <div className="space-y-4 rounded bg-slate-50 p-6">
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

export default StyleLinkRemovePanel;
