import { useStore } from '@nanostores/react';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { getCtx } from '@/stores/nodes';
import { toggleSettingsPanel } from '@/stores/storykeep';
import { toolAddModeTitles, toolAddModes } from '@/constants';
import { startToolDrag } from '@/stores/toolDrag';
import { initToolDragListeners } from '@/utils/compositor/toolDragManager';

import type { ToolAddMode } from '@/types/compositorTypes';

const AddElementsPanel = ({
  currentToolAddMode,
}: {
  currentToolAddMode: ToolAddMode;
}) => {
  const ctx = getCtx();

  const handleElementClick = (mode: ToolAddMode) => {
    ctx.toolAddModeStore.set({ value: mode });
    ctx.notifyNode('root');
  };

  const handleMouseDown = (e: React.MouseEvent, mode: ToolAddMode) => {
    e.preventDefault();
    startToolDrag('insert', mode, e.clientX, e.clientY);
    initToolDragListeners();
  };

  return (
    <>
      {toolAddModes.map((mode) => (
        <button
          key={mode}
          onMouseDown={(e) => handleMouseDown(e, mode)}
          onClick={() => handleElementClick(mode)}
          className={`rounded px-3 py-1.5 text-sm font-bold transition-colors ${
            currentToolAddMode === mode
              ? 'bg-myblue text-white'
              : 'border border-gray-200 bg-white text-myblue hover:bg-myblue/10'
          }`}
        >
          {toolAddModeTitles[mode]}
        </button>
      ))}
    </>
  );
};

const StoryKeepToolBar = () => {
  const ctx = getCtx();
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const { value: toolAddModeVal } = useStore(ctx.toolAddModeStore);

  if (toolModeVal !== 'insert') {
    return null;
  }

  return (
    <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-myblue">Add Elements</h3>
        <button
          onClick={() => {
            ctx.toolModeValStore.set({ value: `text` });
            toggleSettingsPanel;
          }}
          className="text-gray-500 hover:text-myblue"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-x-2 gap-y-1">
        <AddElementsPanel currentToolAddMode={toolAddModeVal} />
      </div>
      <p className="px-2 pt-4 text-xs">
        Drag and drop, or select element and click the + to insert into a pane.
      </p>
    </div>
  );
};

export default StoryKeepToolBar;
