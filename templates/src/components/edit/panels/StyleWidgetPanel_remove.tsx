import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
import {
  isMarkdownPaneFragmentNode,
  isGridLayoutNode,
} from '@/utils/compositor/typeGuards';
import { cloneDeep } from '@/utils/helpers';
import type { BasePanelProps, FlatNode } from '@/types/compositorTypes';

const StyleWidgetRemovePanel = ({
  node,
  parentNode,
  className,
  childId,
}: BasePanelProps) => {
  if (
    !className ||
    !node?.tagName ||
    !parentNode ||
    (!isMarkdownPaneFragmentNode(parentNode) && !isGridLayoutNode(parentNode))
  ) {
    return null;
  }
  const friendlyName = tailwindClasses[className]?.title || className;
  const isOuterContainer = node.tagName === 'ul' || node.tagName === 'ol';
  const isContainer = node.tagName === 'li';

  const elementTypeTitle = isOuterContainer
    ? 'Outer Container'
    : isContainer
      ? 'Container'
      : 'Widget';

  const resetStore = () => {
    if (node?.id)
      settingsPanelStore.set({
        action: 'style-widget',
        nodeId: isOuterContainer || isContainer ? childId || node.id : node.id,
        expanded: true,
      });
  };

  const handleYesClick = () => {
    if (!node || !className) {
      console.error('Missing required properties for class removal');
      return;
    }

    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();

    const targetNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    const deepParentClone = cloneDeep(parentNode);

    if (!targetNode) return;

    // Remove from defaultClasses if present
    if (deepParentClone.defaultClasses?.[targetNode.tagName]) {
      const defaultClasses = deepParentClone.defaultClasses[targetNode.tagName];
      if (className in defaultClasses.mobile)
        delete defaultClasses.mobile[className];
      if (className in defaultClasses.tablet)
        delete defaultClasses.tablet[className];
      if (className in defaultClasses.desktop)
        delete defaultClasses.desktop[className];
    }

    // Remove from overrideClasses if present
    if (targetNode.overrideClasses) {
      if (
        targetNode.overrideClasses.mobile &&
        className in targetNode.overrideClasses.mobile
      ) {
        delete targetNode.overrideClasses.mobile[className];
      }
      if (
        targetNode.overrideClasses.tablet &&
        className in targetNode.overrideClasses.tablet
      ) {
        delete targetNode.overrideClasses.tablet[className];
      }
      if (
        targetNode.overrideClasses.desktop &&
        className in targetNode.overrideClasses.desktop
      ) {
        delete targetNode.overrideClasses.desktop[className];
      }

      // If there are no overrides left, remove the overrideClasses object
      const overrides =
        `overrideClasses` in targetNode && targetNode.overrideClasses;
      const hasRemainingOverrides =
        (overrides &&
          `mobile` in overrides &&
          typeof overrides.mobile !== `undefined` &&
          Object.keys(overrides.mobile).length > 0) ||
        (overrides &&
          `tablet` in overrides &&
          typeof overrides.tablet !== `undefined` &&
          Object.keys(overrides.tablet).length > 0) ||
        (overrides &&
          `desktop` in overrides &&
          typeof overrides.desktop !== `undefined` &&
          Object.keys(overrides.desktop).length > 0);

      if (!hasRemainingOverrides) {
        delete targetNode.overrideClasses;
      }
    }
    ctx.modifyNodes([{ ...targetNode }, { ...deepParentClone }]);
    resetStore();
  };

  const handleNoClick = () => {
    resetStore();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">
        Remove <span className="font-bold">{friendlyName}</span>
        <span className="ml-1">from {elementTypeTitle}?</span>
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

export default StyleWidgetRemovePanel;
