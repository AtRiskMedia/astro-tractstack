import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import BackgroundImage from './BackgroundImage';
import ArtpackImage from './ArtpackImage';
import ColorPickerCombo from './ColorPickerCombo';
import { getCtx } from '@/stores/nodes';
import { hasArtpacksStore } from '@/stores/storykeep';
import { cloneDeep } from '@/utils/helpers';
import type { BrandConfig } from '@/types/tractstack';
import type {
  BgImageNode,
  ArtpackImageNode,
  PaneNode,
} from '@/types/compositorTypes';
import { isArtpackImageNode } from '@/utils/compositor/typeGuards';

export interface BackgroundImageWrapperProps {
  paneId: string;
  config?: BrandConfig;
}

const BackgroundImageWrapper = ({
  paneId,
  config,
}: BackgroundImageWrapperProps) => {
  const ctx = getCtx();
  const allNodes = useStore(ctx.allNodes);
  const $artpacks = useStore(hasArtpacksStore);
  const hasArtpacks = $artpacks && Object.keys($artpacks).length > 0;

  // State to force re-renders when child components need it
  const [, setUpdateCounter] = useState(0);

  // Using useCallback to create a stable reference to the update function
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

  return (
    <div className="w-full space-y-6">
      <h3 className="text-sm font-bold text-gray-700">Background</h3>

      <ColorPickerCombo
        title="Pane Background Color"
        defaultColor={(allNodes.get(paneId) as PaneNode)?.bgColour || ''}
        onColorChange={handleColorChange}
        config={config!}
        allowNull={true}
      />
      {!bgNode && (
        <div className="flex flex-col gap-4 sm:flex-row">
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
          {/* Position Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Position
            </label>
            <div className="flex space-x-4">
              {(
                [
                  'background',
                  'left',
                  'right',
                  'leftBleed',
                  'rightBleed',
                ] as const
              ).map((pos) => (
                <label key={pos} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="position"
                    value={pos}
                    checked={position === pos}
                    onChange={() => handlePositionChange(pos)}
                    className="text-myblue focus:ring-myblue h-4 w-4 border-gray-300"
                  />
                  <span className="ml-2 text-sm capitalize text-gray-700">
                    {pos}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Size Toggle - Only show when position is left or right */}
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
                      className="text-myblue focus:ring-myblue h-4 w-4 border-gray-300"
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

          {/* Render the appropriate image component */}
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
