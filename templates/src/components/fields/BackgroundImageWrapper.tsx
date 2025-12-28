import { useState, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { Select } from '@ark-ui/react/select';
import { createListCollection } from '@ark-ui/react/collection';
import BackgroundImage from './BackgroundImage';
import ArtpackImage from './ArtpackImage';
import ColorPickerCombo from './ColorPickerCombo';
import { getCtx } from '@/stores/nodes';
import { hasArtpacksStore, settingsPanelStore } from '@/stores/storykeep';
import { cloneDeep } from '@/utils/helpers';
import type {
  BgImageNode,
  ArtpackImageNode,
  PaneNode,
} from '@/types/compositorTypes';
import { isArtpackImageNode } from '@/utils/compositor/typeGuards';

export interface BackgroundImageWrapperProps {
  paneId: string;
}

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const BackgroundImageWrapper = ({ paneId }: BackgroundImageWrapperProps) => {
  const ctx = getCtx();
  const allNodes = useStore(ctx.allNodes);
  const $artpacks = useStore(hasArtpacksStore);
  const hasArtpacks = $artpacks && Object.keys($artpacks).length > 0;
  const [, setUpdateCounter] = useState(0);

  const onUpdate = useCallback(() => {
    setUpdateCounter((prev) => prev + 1);
  }, []);

  const bgNode = (() => {
    const paneNode = allNodes.get(paneId) as PaneNode;
    if (!paneNode) return null;
    const childNodeIds = ctx.getChildNodeIDs(paneNode.id);
    const bgNodes = childNodeIds
      .map((id) => allNodes.get(id))
      .filter(
        (node) =>
          node?.nodeType === 'BgPane' &&
          'type' in node &&
          (node.type === 'background-image' || node.type === 'artpack-image')
      ) as (BgImageNode | ArtpackImageNode)[];
    return bgNodes[0] || null;
  })();

  const handleColorChange = (color: string) => {
    const paneNode = allNodes.get(paneId) as PaneNode;
    if (!paneNode) return;
    const updatedPaneNode = cloneDeep(paneNode);
    if (color) updatedPaneNode.bgColour = color;
    else if (typeof updatedPaneNode.bgColour === `string` && !color)
      delete updatedPaneNode.bgColour;
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedPaneNode]);
  };

  const handlePositionChange = (
    newPosition: 'background' | 'left' | 'right' | 'leftBleed' | 'rightBleed'
  ) => {
    if (!bgNode) return;
    const updatedBgNode = cloneDeep(bgNode);
    updatedBgNode.position = newPosition;
    updatedBgNode.isChanged = true;
    const updatedPaneNode = cloneDeep(allNodes.get(paneId) as PaneNode);
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    onUpdate();
  };

  const handleSizeChange = (newSize: 'equal' | 'narrow' | 'wide') => {
    if (!bgNode) return;
    const updatedBgNode = cloneDeep(bgNode);
    updatedBgNode.size = newSize;
    updatedBgNode.isChanged = true;
    const updatedPaneNode = cloneDeep(allNodes.get(paneId) as PaneNode);
    updatedPaneNode.isChanged = true;
    ctx.modifyNodes([updatedBgNode, updatedPaneNode]);
    onUpdate();
  };

  const position = bgNode?.position || 'background';
  const size = bgNode?.size || 'equal';

  const positionOptions = [
    { label: 'Background', value: 'background' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
    { label: 'Left Bleed', value: 'leftBleed' },
    { label: 'Right Bleed', value: 'rightBleed' },
  ];

  const collection = useMemo(
    () =>
      createListCollection({
        items: positionOptions,
        itemToValue: (item) => item.value,
        itemToString: (item) => item.label,
      }),
    []
  );

  const selectItemStyles = `
    .position-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .position-item[data-highlighted] .position-indicator {
      color: white;
    }
    .position-item[data-state="checked"] .position-indicator {
      display: flex;
    }
    .position-item .position-indicator {
      display: none;
    }
    .position-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="w-full space-y-6">
      <style>{selectItemStyles}</style>

      <h3 className="text-sm font-bold text-gray-700">Background</h3>

      <ColorPickerCombo
        title="Pane Background Color"
        defaultColor={(allNodes.get(paneId) as PaneNode)?.bgColour || ''}
        onColorChange={handleColorChange}
        allowNull={true}
      />
      {!bgNode && (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <h4 className="mb-2 text-sm font-bold text-gray-700">
              Background Image
            </h4>
            <BackgroundImage paneId={paneId} onUpdate={onUpdate} />
            {hasArtpacks && (
              <ArtpackImage paneId={paneId} onUpdate={onUpdate} />
            )}
          </div>
        </div>
      )}
      {bgNode && (
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <Select.Root
              collection={collection}
              positioning={{ sameWidth: true }}
              value={[position]}
              onValueChange={(details) => {
                const currentSignal = settingsPanelStore.get();
                if (currentSignal) {
                  settingsPanelStore.set({
                    ...currentSignal,
                    editLock: Date.now(),
                  });
                }
                handlePositionChange(
                  details.value[0] as
                    | 'background'
                    | 'left'
                    | 'right'
                    | 'leftBleed'
                    | 'rightBleed'
                );
              }}
            >
              <Select.Label className="block text-sm font-bold text-gray-700">
                Position
              </Select.Label>
              <Select.Control>
                <Select.Trigger className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-myblue focus:outline-none focus:ring-1 focus:ring-myblue">
                  <Select.ValueText
                    className="capitalize"
                    placeholder="Select a position"
                  />
                  <Select.Indicator>
                    <ChevronDownIcon />
                  </Select.Indicator>
                </Select.Trigger>
              </Select.Control>
              <Select.Positioner>
                <Select.Content className="z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <Select.ItemGroup>
                    {collection.items.map((item) => (
                      <Select.Item
                        key={item.value}
                        item={item}
                        className="position-item relative cursor-pointer select-none py-2 pl-10 pr-4 text-sm text-gray-900"
                      >
                        <Select.ItemText>{item.label}</Select.ItemText>
                        <Select.ItemIndicator className="position-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <CheckIcon />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.ItemGroup>
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </div>

          {position !== 'background' && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Size
              </label>
              <div className="flex space-x-4">
                {(['equal', 'narrow', 'wide'] as const).map((s) => (
                  <label key={s} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="size"
                      value={s}
                      checked={size === s}
                      onChange={() => handleSizeChange(s)}
                      className="h-4 w-4 border-gray-300 text-myblue focus:ring-myblue"
                    />
                    <span className="ml-2 text-sm capitalize text-gray-700">
                      {s === 'narrow'
                        ? 'Narrow (1/3)'
                        : s === 'wide'
                          ? 'Wide (2/3)'
                          : 'Equal (1/2)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {isArtpackImageNode(bgNode) ? (
            <ArtpackImage paneId={paneId} onUpdate={onUpdate} />
          ) : (
            <BackgroundImage paneId={paneId} onUpdate={onUpdate} />
          )}
        </div>
      )}
    </div>
  );
};

export default BackgroundImageWrapper;
