import { type MouseEvent } from 'react';
import PencilSquareIcon from '@heroicons/react/24/outline/PencilSquareIcon';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import type { NodeProps } from '@/types/nodeProps';

interface PaneOverlayProps extends NodeProps {
  layer?: number;
  isColumn?: boolean;
  hasBackground?: boolean;
}

export const PaneOverlay = (props: PaneOverlayProps) => {
  const { nodeId, layer, isColumn, hasBackground } = props;
  const ctx = getCtx(props);
  const node = ctx.allNodes.get().get(nodeId);

  if (!node) return null;

  if (!layer && !isColumn && !hasBackground) {
    return null;
  }

  const handleBgClick = (e: MouseEvent) => {
    e.stopPropagation();
    settingsPanelStore.set({
      nodeId,
      action: 'style-parent',
      view: 'backgroundImage',
      expanded: true,
    });
  };

  const handleLayerClick = (e: MouseEvent) => {
    e.stopPropagation();
    settingsPanelStore.set({
      nodeId,
      action: 'style-parent',
      view: 'wrapperStyles',
      layer: layer || 1,
      expanded: true,
    });
  };

  const handleColumnClick = (e: MouseEvent) => {
    e.stopPropagation();
    settingsPanelStore.set({
      nodeId,
      action: 'style-parent',
      view: 'summary',
      expanded: true,
    });
  };

  return (
    <div
      className="pane-overlay compositor-chrome absolute flex gap-1 opacity-10 transition-opacity duration-200 group-hover:opacity-100"
      style={{
        top: '-24px',
        right: 0,
        zIndex: 10,
      }}
      onClick={(e) => e.stopPropagation()}
      data-attr="exclude"
      data-node-id={nodeId}
      data-layer={layer}
    >
      {hasBackground && (
        <button
          onClick={handleBgClick}
          className="flex h-6 w-auto min-w-px cursor-help items-center justify-center px-1"
          title="Edit Background"
        >
          <img
            src="/icons/image.svg"
            alt="background"
            className="h-3.5 w-auto"
          />
        </button>
      )}

      {layer && (
        <button
          onClick={handleLayerClick}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white shadow-md hover:scale-110 hover:bg-purple-600"
          title={`Edit Layer ${layer}`}
        >
          <PencilSquareIcon className="h-3.5 w-3.5" />
        </button>
      )}

      {isColumn && (
        <button
          onClick={handleColumnClick}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white shadow-md hover:scale-110 hover:bg-purple-600"
          title="Edit Column Styles"
        >
          <PencilSquareIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
