import { useState, useEffect } from 'react';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import {
  isMarkdownPaneFragmentNode,
  isPaneNode,
} from '@/utils/compositor/typeGuards';
import { StylesMemory } from '@/components/edit/state/StylesMemory';
import SelectedTailwindClass from '@/components/fields/SelectedTailwindClass';
import BackgroundImageWrapper from '@/components/fields/BackgroundImageWrapper';
import { cloneDeep } from '@/utils/helpers';
import type {
  MarkdownPaneFragmentNode,
  BasePanelProps,
} from '@/types/compositorTypes';

interface ParentStyles {
  bgColor: string;
  parentClasses: {
    mobile: Record<string, string>;
    tablet: Record<string, string>;
    desktop: Record<string, string>;
  }[];
}

const StyleParentPanel = ({
  node,
  parentNode,
  layer,
  config,
}: BasePanelProps) => {
  if (
    !parentNode ||
    !node ||
    !isMarkdownPaneFragmentNode(node) ||
    !isPaneNode(parentNode) ||
    !isMarkdownPaneFragmentNode(node)
  ) {
    return null;
  }

  const [layerCount, setLayerCount] = useState(node.parentClasses?.length || 0);
  const [currentLayer, setCurrentLayer] = useState<number>(layer || 1);
  const [settings, setSettings] = useState<ParentStyles>({
    bgColor: parentNode.bgColour || '',
    parentClasses: node.parentClasses || [],
  });

  // Update state when node changes
  useEffect(() => {
    setLayerCount(node.parentClasses?.length || 0);
    setSettings({
      bgColor: parentNode.bgColour || '',
      parentClasses: node.parentClasses || [],
    });
  }, [node, parentNode.bgColour]);

  useEffect(() => {
    setCurrentLayer(layer || 1);
  }, [layer]);

  const handleLayerAdd = (position: 'before' | 'after', layerNum: number) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const markdownNode = cloneDeep(allNodes.get(node.id));
    if (!markdownNode || !isMarkdownPaneFragmentNode(markdownNode)) return;

    // Create an empty layer
    const emptyLayer = {
      mobile: {},
      tablet: {},
      desktop: {},
    };

    // Create new arrays for both parentClasses
    let newParentClasses = [...(markdownNode.parentClasses || [])];

    // Calculate the insert index based on position and layerNum
    const insertIndex = position === 'before' ? layerNum - 1 : layerNum;

    // Insert the empty layer at the calculated index
    newParentClasses = [
      ...newParentClasses.slice(0, insertIndex),
      emptyLayer,
      ...newParentClasses.slice(insertIndex),
    ];

    ctx.modifyNodes([
      {
        ...markdownNode,
        parentClasses: newParentClasses,
        isChanged: true,
      } as MarkdownPaneFragmentNode,
    ]);

    // Update local state
    setSettings((prev) => ({
      ...prev,
      parentClasses: newParentClasses,
    }));
    setLayerCount(newParentClasses.length);

    // Set the current layer to the newly added layer
    const newLayer = position === 'before' ? layerNum : layerNum + 1;
    setCurrentLayer(newLayer);
  };

  const handleClickDeleteLayer = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      layer: currentLayer,
      action: `style-parent-delete-layer`,
      expanded: true,
    });
  };

  const handleClickRemove = (name: string) => {
    settingsPanelStore.set({
      nodeId: node.id,
      layer: currentLayer,
      className: name,
      action: `style-parent-remove`,
      expanded: true,
    });
  };

  const handleClickUpdate = (name: string) => {
    settingsPanelStore.set({
      nodeId: node.id,
      layer: currentLayer,
      className: name,
      action: `style-parent-update`,
      expanded: true,
    });
  };

  const handleClickAdd = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      layer: currentLayer,
      action: `style-parent-add`,
      expanded: true,
    });
  };

  // Safely get current classes
  const currentClasses = settings.parentClasses?.[currentLayer - 1] || {
    mobile: {},
    tablet: {},
    desktop: {},
  };
  const hasNoClasses = !Object.values(currentClasses).some(
    (breakpoint) => Object.keys(breakpoint).length > 0
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Pane Outer Styles</h2>

      <div className="space-y-4">
        <BackgroundImageWrapper
          paneId={parentNode.id}
          config={config || undefined}
        />
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-md bg-slate-50 p-3">
        <span className="text-mydarkgrey text-sm font-bold">Layer:</span>
        <div className="flex items-center gap-2">
          <button
            key="first-add"
            className="border-mydarkgrey/30 text-mydarkgrey rounded border border-dashed p-1 text-xs transition-colors hover:bg-white/50 hover:text-black"
            title="Add Layer Here"
            onClick={() => handleLayerAdd('before', 1)}
          >
            <PlusIcon className="h-3 w-3" />
          </button>
          {[...Array(layerCount).keys()]
            .map((i) => i + 1)
            .map((num, index) => (
              <div
                key={`layer-group-${num}`}
                className="flex items-center gap-1"
              >
                <button
                  className={`min-w-[32px] rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${
                    currentLayer === num
                      ? 'bg-myblue text-white shadow-sm'
                      : 'hover:bg-mydarkgrey/10 text-mydarkgrey bg-white hover:text-black'
                  }`}
                  onClick={() => setCurrentLayer(num)}
                >
                  {num}
                </button>
                <button
                  className="border-mydarkgrey/30 text-mydarkgrey rounded border border-dashed p-1 text-xs transition-colors hover:bg-white/50 hover:text-black"
                  title="Add Layer Here"
                  onClick={() =>
                    handleLayerAdd(
                      index === layerCount - 1 ? 'after' : 'before',
                      index === layerCount - 1 ? num : num + 1
                    )
                  }
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {hasNoClasses ? (
        <div className="space-y-4">
          <em>No styles.</em>
        </div>
      ) : currentClasses ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(currentClasses.mobile).map(([className]) => (
            <SelectedTailwindClass
              key={className}
              name={className}
              values={{
                mobile: currentClasses.mobile[className],
                tablet: currentClasses.tablet?.[className],
                desktop: currentClasses.desktop?.[className],
              }}
              onRemove={handleClickRemove}
              onUpdate={handleClickUpdate}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        <ul className="text-mydarkgrey flex flex-wrap gap-x-4 gap-y-1">
          <li>
            <em>Actions:</em>
          </li>
          <li>
            <button
              onClick={() => handleClickAdd()}
              className="text-myblue font-bold underline hover:text-black"
            >
              Add Style
            </button>
          </li>
          <li>
            <button
              onClick={() => handleClickDeleteLayer()}
              className="text-myblue font-bold underline hover:text-black"
            >
              Delete Layer
            </button>
          </li>
          <li>
            <StylesMemory node={node} parentNode={parentNode} />
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StyleParentPanel;
