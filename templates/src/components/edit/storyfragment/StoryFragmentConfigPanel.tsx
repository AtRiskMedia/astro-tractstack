import { useState, useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import TagIcon from '@heroicons/react/24/outline/TagIcon';
import {
  fullContentMapStore,
  settingsPanelStore,
  urlParamsStore,
} from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import ColorPickerCombo from '@/components/fields/ColorPickerCombo';
import StoryFragmentSlugPanel from './StoryFragmentPanel_slug';
import StoryFragmentMenuPanel from './StoryFragmentPanel_menu';
import StoryFragmentOpenGraphPanel from './StoryFragmentPanel_og';
import {
  tailwindToHex,
  hexToTailwind,
  findClosestTailwindColor,
} from '@/utils/compositor/tailwindColors';
import { cloneDeep } from '@/utils/helpers';
import type { FullContentMapItem, BrandConfig } from '@/types/tractstack';
import {
  StoryFragmentMode,
  type StoryFragmentNode,
} from '@/types/compositorTypes';

const StoryFragmentConfigPanel = ({
  nodeId,
  config,
}: {
  nodeId: string;
  config?: BrandConfig;
}) => {
  const [isNodeAvailable, setIsNodeAvailable] = useState(false);
  const [storyfragmentNode, setStoryfragmentNode] =
    useState<StoryFragmentNode | null>(null);
  const [isSEOReady, setIsSEOReady] = useState(false);
  const [tempBgColor, setTempBgColor] = useState<string | null>(null);
  const urlParamsProcessed = useRef(false);

  const ctx = getCtx();
  const isTemplate = useStore(ctx.isTemplate);
  const activePaneMode = useStore(ctx.activePaneMode);
  const $contentMap = useStore(fullContentMapStore) as FullContentMapItem[];
  const $urlParams = useStore(urlParamsStore);

  // Check if this specific panel is active
  const isActive =
    activePaneMode.panel === 'storyfragment' &&
    activePaneMode.paneId === nodeId;

  // Get the mode from activePaneMode or use DEFAULT
  const mode =
    isActive && activePaneMode.mode
      ? (activePaneMode.mode as StoryFragmentMode)
      : StoryFragmentMode.DEFAULT;

  const setMode = (newMode: StoryFragmentMode) => {
    // Set the panel mode in the context
    ctx.setPanelMode(nodeId, 'storyfragment', newMode);

    // Clear any settings panel
    settingsPanelStore.set(null);
  };

  useEffect(() => {
    // Check for node availability
    const checkNode = () => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const node = allNodes.get(nodeId) as StoryFragmentNode;

      if (node) {
        setStoryfragmentNode(node);
        setIsNodeAvailable(true);
      }
    };

    // Initial check
    checkNode();

    // Set up an interval to check until node is available
    const intervalId = setInterval(() => {
      if (!isNodeAvailable) {
        checkNode();
      } else {
        clearInterval(intervalId);
      }
    }, 100); // Check every 100ms

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [nodeId]);

  // Handle URL params auto-opening
  useEffect(() => {
    if (!isNodeAvailable || urlParamsProcessed.current) return;

    const params = $urlParams;

    // Check for URL params and auto-open panels
    if (params.menu || params.seo) {
      // Menu takes priority if both are present
      if (params.menu) {
        setMode(StoryFragmentMode.MENU);
      } else if (params.seo) {
        setMode(StoryFragmentMode.OG);
      }

      // Remove the flags from URL params store (one-time action)
      const cleanedParams = { ...params };
      delete cleanedParams.menu;
      delete cleanedParams.seo;
      urlParamsStore.set(cleanedParams);

      urlParamsProcessed.current = true;
    }
  }, [isNodeAvailable, $urlParams]);

  // Check if SEO is ready by checking the content map
  useEffect(() => {
    if (!isNodeAvailable || !storyfragmentNode) return;

    // Find the story fragment content in the content map
    const storyFragmentContent = $contentMap.find(
      (item) => item.type === 'StoryFragment' && item.id === nodeId
    );

    // Set SEO ready if description exists and is not empty
    const hasValidDescription = Boolean(
      storyFragmentContent?.description &&
        storyFragmentContent.description.trim() !== ''
    );

    setIsSEOReady(hasValidDescription);
  }, [nodeId, isNodeAvailable, storyfragmentNode, $contentMap]);

  const handleBgColorChange = (newColor: string) => {
    setTempBgColor(newColor);
  };

  const applyBgColorChange = () => {
    if (!storyfragmentNode) return;

    const ctx = getCtx();
    const updatedNode: StoryFragmentNode = {
      ...cloneDeep(storyfragmentNode),
      isChanged: true,
    };

    if (!tempBgColor) {
      // Remove background color entirely (empty string means no color)
      delete updatedNode.tailwindBgColour;
    } else {
      // Set the new background color
      const val = hexToTailwind(tempBgColor, config?.BRAND_COLOURS);
      const exactValPayload = val
        ? null
        : findClosestTailwindColor(tempBgColor);
      const exactVal =
        exactValPayload && `${exactValPayload.name}-${exactValPayload.shade}`;

      if (typeof exactVal === `string`) updatedNode.tailwindBgColour = exactVal;
      else if (typeof val === `string`) updatedNode.tailwindBgColour = val;
      else updatedNode.tailwindBgColour = undefined;
    }

    ctx.modifyNodes([updatedNode]);
    setStoryfragmentNode(updatedNode);
    setTempBgColor(null);
  };

  if (!isNodeAvailable || !storyfragmentNode) {
    return null;
  }

  if (mode === StoryFragmentMode.SLUG) {
    return (
      <StoryFragmentSlugPanel
        nodeId={nodeId}
        setMode={setMode}
        config={config!}
      />
    );
  } else if (mode === StoryFragmentMode.MENU) {
    return <StoryFragmentMenuPanel nodeId={nodeId} setMode={setMode} />;
  } else if (mode === StoryFragmentMode.OG) {
    return (
      <StoryFragmentOpenGraphPanel
        nodeId={nodeId}
        setMode={setMode}
        config={config}
      />
    );
  }

  return (
    <div className="mb-4">
      <div className="w-full rounded-b-md bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode(StoryFragmentMode.OG)}
            className="text-md min-h-9 rounded border border-cyan-200 bg-white px-3 text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
          >
            Title: <span className="font-bold">{storyfragmentNode.title}</span>
          </button>

          <button
            onClick={() => setMode(StoryFragmentMode.SLUG)}
            className="text-md h-9 rounded border border-cyan-200 bg-white px-3 text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
          >
            Slug: <span className="font-bold">{storyfragmentNode.slug}</span>
          </button>

          {!isTemplate && (
            <>
              <button
                onClick={() => setMode(StoryFragmentMode.MENU)}
                className="text-md flex h-9 items-center gap-1 rounded border border-cyan-200 bg-white px-3 text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
              >
                {storyfragmentNode.menuId ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    <span className="font-bold">Has Menu</span>
                  </>
                ) : (
                  <>
                    <XMarkIcon className="h-4 w-4" />
                    <span>No Menu</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setMode(StoryFragmentMode.OG)}
                className="text-md flex h-9 items-center gap-1 rounded border border-cyan-200 bg-white px-3 text-cyan-700 shadow-sm transition-colors hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white"
              >
                {isSEOReady ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    <span className="font-bold">SEO Ready</span>
                  </>
                ) : (
                  <>
                    <TagIcon className="mr-1 h-4 w-4" />
                    <span>SEO Ready?</span>
                  </>
                )}
              </button>
            </>
          )}

          {config && (
            <div className="flex items-center gap-2">
              <div className="text-md">Background Colour:</div>
              <ColorPickerCombo
                title=""
                defaultColor={
                  storyfragmentNode.tailwindBgColour
                    ? tailwindToHex(
                        storyfragmentNode.tailwindBgColour,
                        config?.BRAND_COLOURS || null
                      )
                    : ''
                }
                onColorChange={handleBgColorChange}
                config={config}
                allowNull={true}
              />
              {tempBgColor !== null && (
                <button
                  onClick={applyBgColorChange}
                  className="text-md h-9 rounded bg-cyan-700 px-3 text-white shadow-sm transition-colors hover:bg-cyan-800 focus:bg-cyan-800"
                >
                  Apply
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentConfigPanel;
