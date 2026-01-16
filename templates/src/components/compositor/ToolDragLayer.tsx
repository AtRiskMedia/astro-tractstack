import { useStore } from '@nanostores/react';
import { toolDragStore } from '@/stores/toolDrag';
import { toolAddModeTitles } from '@/constants';
import type { ToolAddMode } from '@/types/compositorTypes';
import ArrowsUpDownIcon from '@heroicons/react/24/outline/ArrowsUpDownIcon';

const ToolDragLayer = () => {
  const { isDragging, pointer, payload, dragType } = useStore(toolDragStore);

  if (!isDragging || !payload) return null;

  const style = {
    transform: `translate(${pointer.x}px, ${pointer.y}px)`,
    position: 'fixed' as const,
    left: 0,
    top: 0,
    zIndex: 9999,
    pointerEvents: 'none' as const,
    marginTop: '-20px',
    marginLeft: '-20px',
  };

  return (
    <div style={style} className="pointer-events-none flex items-center gap-2">
      {dragType === 'insert' ? (
        <div className="rounded-lg border-2 border-myblue bg-white px-4 py-2 font-bold text-myblue opacity-90 shadow-xl">
          {toolAddModeTitles[payload as ToolAddMode] || payload}
        </div>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-myblue bg-white text-myblue opacity-90 shadow-xl">
          <ArrowsUpDownIcon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};

export default ToolDragLayer;
