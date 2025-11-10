import { useState, useEffect } from 'react';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import ArrowUturnLeftIcon from '@heroicons/react/24/outline/ArrowUturnLeftIcon';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import {
  settingsPanelStore,
  stylePanelTargetMemoryStore,
} from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import {
  isMarkdownPaneFragmentNode,
  isArtpackImageNode,
  isBgImageNode,
  isGridLayoutNode,
  isPaneNode,
} from '@/utils/compositor/typeGuards';
import SelectedTailwindClass from '@/components/fields/SelectedTailwindClass';
import BackgroundImageWrapper from '@/components/fields/BackgroundImageWrapper';
import ColorPickerCombo from '@/components/fields/ColorPickerCombo';
import { cloneDeep } from '@/utils/helpers';
import {
  convertToGrid,
  revertFromGrid,
  addColumn,
} from '@/utils/compositor/nodesHelper';
import type {
  MarkdownPaneFragmentNode,
  ParentBasePanelProps,
  ArtpackImageNode,
  BgImageNode,
  GridLayoutNode,
  BaseNode,
  DefaultClassValue,
} from '@/types/compositorTypes';

type VisibilityKey =
  | 'hiddenViewportMobile'
  | 'hiddenViewportTablet'
  | 'hiddenViewportDesktop';
type PanelView = 'summary' | 'wrapperStyles' | 'backgroundImage';

type StyleableNode = MarkdownPaneFragmentNode | GridLayoutNode;

type StyleableTarget = {
  id: string;
  name: string;
  node: StyleableNode;
  targetProperty: 'parentClasses' | 'gridClasses';
};

const StyleParentPanel = ({
  node: initialNode,
  parentNode: paneNode,
  layer,
}: ParentBasePanelProps) => {
  const [currentView, setCurrentView] = useState<PanelView>('summary');
  const [currentLayer, setCurrentLayer] = useState<number>(layer || 1);
  const [styleTargets, setStyleTargets] = useState<StyleableTarget[]>([]);
  const [selectedTargetIndex, setSelectedTargetIndex] = useState(0);

  const ctx = getCtx();

  useEffect(() => {
    if (
      !initialNode ||
      !(
        isMarkdownPaneFragmentNode(initialNode) || isGridLayoutNode(initialNode)
      ) ||
      !paneNode ||
      !isPaneNode(paneNode)
    ) {
      return;
    }

    const targets: StyleableTarget[] = [];
    const isGrid = isGridLayoutNode(initialNode);

    targets.push({
      id: initialNode.id,
      name: isGrid ? 'Outer Container' : 'Pane Styles',
      node: initialNode,
      targetProperty: 'parentClasses',
    });

    if (isGrid) {
      const columnNodes = ctx
        .getChildNodeIDs(initialNode.id)
        .map((id) => ctx.allNodes.get().get(id) as BaseNode)
        .filter(isMarkdownPaneFragmentNode);

      columnNodes.forEach((colNode, index) => {
        targets.push({
          id: colNode.id,
          name: `Column ${index + 1}`,
          node: colNode,
          targetProperty: 'gridClasses',
        });
      });
    }

    setStyleTargets(targets);

    const rememberedIndex = stylePanelTargetMemoryStore.get().get(paneNode.id);

    if (rememberedIndex != null && rememberedIndex < targets.length) {
      setSelectedTargetIndex(rememberedIndex);
    } else {
      setSelectedTargetIndex(0);
    }

    setCurrentView('summary');
  }, [initialNode, ctx, paneNode]);

  useEffect(() => {
    setCurrentLayer(layer || 1);
  }, [layer]);

  useEffect(() => {
    if (paneNode?.id) {
      const newMemory = new Map(stylePanelTargetMemoryStore.get());
      newMemory.set(paneNode.id, selectedTargetIndex);
      stylePanelTargetMemoryStore.set(newMemory);
    }
  }, [selectedTargetIndex, paneNode?.id]);

  const selectedTarget = styleTargets[selectedTargetIndex];
  if (!selectedTarget || !paneNode || !isPaneNode(paneNode)) {
    return null;
  }

  const {
    id: selectedTargetId,
    name: selectedTargetName,
    node: selectedTargetNode,
    targetProperty,
  } = selectedTarget;

  const handleLayerAdd = (position: 'before' | 'after', layerNum: number) => {
    const targetNode = cloneDeep(selectedTargetNode);

    const emptyLayer = { mobile: {}, tablet: {}, desktop: {} };
    let newParentClasses = [...(targetNode.parentClasses || [])];
    const insertIndex = position === 'before' ? layerNum - 1 : layerNum;

    newParentClasses = [
      ...newParentClasses.slice(0, insertIndex),
      emptyLayer,
      ...newParentClasses.slice(insertIndex),
    ];

    ctx.modifyNodes([
      {
        ...targetNode,
        parentClasses: newParentClasses,
        isChanged: true,
      } as StyleableNode,
    ]);

    const newLayer = position === 'before' ? layerNum : layerNum + 1;
    setCurrentLayer(newLayer);
  };

  const dispatchToSubPanel = (
    action: string,
    extraProps: Record<string, any> = {}
  ) => {
    settingsPanelStore.set({
      nodeId: selectedTargetId,
      action,
      ...extraProps,
      targetProperty: targetProperty,
      expanded: true,
    });
  };

  const handleGridColumnChange = (
    viewport: 'mobile' | 'tablet' | 'desktop',
    value: string
  ) => {
    const count = parseInt(value, 10);
    if (isNaN(count) || !isGridLayoutNode(selectedTargetNode)) return;

    const updatedNode = cloneDeep(selectedTargetNode);
    updatedNode.gridColumns[viewport] = count;
    updatedNode.isChanged = true;
    ctx.modifyNodes([updatedNode]);
    ctx.notifyNode('root');
  };

  const handleClickDeleteLayer = () => {
    dispatchToSubPanel('style-parent-delete-layer', { layer: currentLayer });
  };
  const handleClickRemove = (name: string) => {
    dispatchToSubPanel('style-parent-remove', {
      layer: currentLayer,
      className: name,
    });
  };
  const handleClickUpdate = (name: string) => {
    dispatchToSubPanel('style-parent-update', {
      layer: currentLayer,
      className: name,
    });
  };
  const handleClickAdd = () => {
    dispatchToSubPanel('style-parent-add', { layer: currentLayer });
  };

  const handleColorChange = (color: string) => {
    const updatedPaneNode = cloneDeep(paneNode);
    if (color) {
      updatedPaneNode.bgColour = color;
    } else if (typeof updatedPaneNode.bgColour === 'string' && !color) {
      delete updatedPaneNode.bgColour;
    }
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedPaneNode]);
    ctx.notifyNode('root');
  };

  const handleVisibilityChange = (
    viewport: 'mobile' | 'tablet' | 'desktop'
  ) => {
    const updatedNode = cloneDeep(selectedTargetNode);
    const key: VisibilityKey = `hiddenViewport${
      viewport.charAt(0).toUpperCase() + viewport.slice(1)
    }` as VisibilityKey;
    updatedNode[key] = !updatedNode[key];
    updatedNode.isChanged = true;
    ctx.modifyNodes([updatedNode]);
    ctx.notifyNode('root');
  };

  const BackButton = () => (
    <button
      onClick={() => setCurrentView('summary')}
      className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black"
    >
      <ArrowUturnLeftIcon className="h-4 w-4" />
      Back to Summary
    </button>
  );

  const TargetNavigator = () => (
    <div className="mb-4 flex items-center justify-between rounded-md bg-slate-100 p-2">
      <button
        onClick={() =>
          setSelectedTargetIndex(
            (prev) => (prev - 1 + styleTargets.length) % styleTargets.length
          )
        }
        className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-black"
        disabled={styleTargets.length < 2}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <span className="text-sm font-bold uppercase tracking-wider text-gray-700">
        {selectedTargetName}
      </span>
      <button
        onClick={() =>
          setSelectedTargetIndex((prev) => (prev + 1) % styleTargets.length)
        }
        className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-black"
        disabled={styleTargets.length < 2}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );

  const renderSummaryView = () => {
    if (!initialNode) return null;
    const isGrid = isGridLayoutNode(initialNode);
    const childNodeIds = ctx.getChildNodeIDs(paneNode.id);
    const bgNode = childNodeIds
      .map((id) => ctx.allNodes.get().get(id))
      .find(
        (n) =>
          n?.nodeType === 'BgPane' &&
          'type' in n &&
          (n.type === 'background-image' || n.type === 'artpack-image')
      ) as (BgImageNode | ArtpackImageNode) | undefined;
    let bgSummary = 'None';
    if (bgNode) {
      if (isArtpackImageNode(bgNode)) bgSummary = `Artpack: ${bgNode.image}`;
      else if (isBgImageNode(bgNode)) bgSummary = `Custom Image`;
    }

    const wrapperSummary = `${selectedTargetNode.parentClasses?.length || 0} layers`;

    let columnClasses: DefaultClassValue = {
      mobile: {},
      tablet: {},
      desktop: {},
    };
    let columnHasNoClasses = true;

    if (
      selectedTargetIndex > 0 &&
      isMarkdownPaneFragmentNode(selectedTargetNode)
    ) {
      columnClasses = selectedTargetNode.gridClasses || {
        mobile: {},
        tablet: {},
        desktop: {},
      };
      columnHasNoClasses = !Object.values(columnClasses).some(
        (breakpoint) => Object.keys(breakpoint).length > 0
      );
    }

    return (
      <div className="space-y-4">
        {styleTargets.length > 1 && <TargetNavigator />}

        {selectedTargetIndex === 0 && (
          <div className="space-y-3">
            <ColorPickerCombo
              title="Pane Background Color"
              defaultColor={paneNode.bgColour || ''}
              onColorChange={handleColorChange}
              allowNull={true}
            />
            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <span>Pane Styles:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{wrapperSummary}</span>
                <button
                  onClick={() => setCurrentView('wrapperStyles')}
                  className="rounded bg-gray-100 px-3 py-1 text-sm font-bold text-gray-700 hover:bg-gray-200"
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Background Image:</span>
              <div className="flex items-center gap-2">
                <span className="max-w-36 truncate text-right text-sm text-gray-600">
                  {bgSummary}
                </span>
                <button
                  onClick={() => setCurrentView('backgroundImage')}
                  className="rounded bg-gray-100 px-3 py-1 text-sm font-bold text-gray-700 hover:bg-gray-200"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTargetIndex > 0 &&
          isMarkdownPaneFragmentNode(selectedTargetNode) && (
            <div className="space-y-4">
              <h3 className="mb-3 text-sm font-bold uppercase text-gray-500">
                Column Styles
              </h3>
              {columnHasNoClasses ? (
                <div>
                  <em>No styles for this column.</em>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(columnClasses.mobile || {}).map(
                    ([className]) => (
                      <SelectedTailwindClass
                        key={className}
                        name={className}
                        values={{
                          mobile: columnClasses.mobile[className],
                          tablet: columnClasses.tablet?.[className],
                          desktop: columnClasses.desktop?.[className],
                        }}
                        onRemove={handleClickRemove}
                        onUpdate={handleClickUpdate}
                      />
                    )
                  )}
                </div>
              )}
              <div>
                <ul className="text-mydarkgrey flex flex-wrap gap-x-4 gap-y-1">
                  <li>
                    <em>Actions:</em>
                  </li>
                  <li>
                    <button
                      onClick={handleClickAdd}
                      className="text-myblue font-bold underline hover:text-black"
                    >
                      Add Style
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          )}

        {selectedTargetIndex === 0 && (
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-bold uppercase text-gray-500">
              Layout
            </h3>
            {!isGrid ? (
              <button
                onClick={() => convertToGrid(initialNode.id)}
                className="w-full rounded bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"
              >
                Convert to Grid Layout
              </button>
            ) : (
              <>
                {isGridLayoutNode(selectedTargetNode) && (
                  <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <h4 className="text-xs font-bold uppercase text-gray-500">
                      Grid Columns
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {(['mobile', 'tablet', 'desktop'] as const).map(
                        (viewport) => (
                          <div key={viewport}>
                            <label className="block text-center text-xs capitalize text-gray-600">
                              {viewport}
                            </label>
                            <select
                              value={selectedTargetNode.gridColumns[viewport]}
                              onChange={(e) =>
                                handleGridColumnChange(viewport, e.target.value)
                              }
                              className="mt-1 block w-full rounded-md border-gray-300 py-1 pl-2 pr-7 text-sm focus:border-cyan-500 focus:outline-none focus:ring-cyan-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(
                                (n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => revertFromGrid(initialNode.id)}
                  className="w-full rounded bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-300"
                >
                  Revert to Standard Pane
                </button>
                <button
                  onClick={() => addColumn(initialNode.id)}
                  className="w-full rounded border border-dashed border-gray-400 bg-transparent px-4 py-2 text-sm font-bold text-gray-700 hover:border-gray-600 hover:bg-gray-50"
                >
                  Add Column
                </button>
              </>
            )}
          </div>
        )}

        <div className="space-y-3 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-bold uppercase text-gray-500">
            Hide on Viewport
          </h3>
          <div className="flex justify-around">
            {(['mobile', 'tablet', 'desktop'] as const).map((viewport) => {
              const key: VisibilityKey =
                `hiddenViewport${viewport.charAt(0).toUpperCase() + viewport.slice(1)}` as VisibilityKey;
              return (
                <label key={viewport} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    checked={!!selectedTargetNode[key]}
                    onChange={() => handleVisibilityChange(viewport)}
                  />
                  <span className="text-sm capitalize text-gray-700">
                    {viewport}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWrapperStylesView = () => {
    const layerCount = selectedTargetNode.parentClasses?.length || 0;
    const currentClasses = selectedTargetNode.parentClasses?.[
      currentLayer - 1
    ] || { mobile: {}, tablet: {}, desktop: {} };
    const hasNoClasses = !Object.values(currentClasses).some(
      (breakpoint) => Object.keys(breakpoint).length > 0
    );

    return (
      <div className="space-y-4">
        <BackButton />
        <div className="mb-4 flex items-center gap-3 rounded-md bg-slate-50 p-3">
          <span className="text-mydarkgrey text-sm font-bold">Layer:</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
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
                    className={`min-w-8 rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${
                      currentLayer === num
                        ? 'bg-myblue text-white shadow-sm'
                        : 'text-mydarkgrey hover:bg-mydarkgrey/10 bg-white hover:text-black'
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
          <div>
            <em>No styles for this layer.</em>
          </div>
        ) : (
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
        )}
        <div>
          <ul className="text-mydarkgrey flex flex-wrap gap-x-4 gap-y-1">
            <li>
              <em>Actions:</em>
            </li>
            <li>
              <button
                onClick={handleClickAdd}
                className="text-myblue font-bold underline hover:text-black"
              >
                Add Style
              </button>
            </li>
            <li>
              <button
                onClick={handleClickDeleteLayer}
                className="text-myblue font-bold underline hover:text-black"
              >
                Delete Layer
              </button>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const renderBackgroundImageVIew = () => (
    <div className="space-y-4">
      <BackButton />
      <BackgroundImageWrapper paneId={paneNode.id} />
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'summary':
        return renderSummaryView();
      case 'wrapperStyles':
        return renderWrapperStylesView();
      case 'backgroundImage':
        return renderBackgroundImageVIew();
      default:
        return renderSummaryView();
    }
  };

  return <div className="space-y-4">{renderContent()}</div>;
};

export default StyleParentPanel;
