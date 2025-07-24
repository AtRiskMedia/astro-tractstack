import { useStore } from '@nanostores/react';
import { addPanelOpenStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import type { ToolModeVal, ToolAddMode } from '@/types/compositorTypes';

const toolAddModeTitles: Record<ToolAddMode, string> = {
  p: 'Paragraph',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  img: 'Image',
  signup: 'Email Sign-up Widget',
  yt: 'YouTube Video',
  bunny: 'Bunny Video',
  belief: 'Belief Select',
  identify: 'Identity As',
  toggle: 'Toggle Belief',
};

const toolAddModes: ToolAddMode[] = [
  'p',
  'h2',
  'h3',
  'h4',
  'img',
  'signup',
  'yt',
  'bunny',
  'belief',
  'identify',
  'toggle',
];

const AddElementsPanel = ({
  currentToolAddMode,
}: {
  currentToolAddMode: ToolAddMode;
}) => {
  const ctx = getCtx();

  const handleElementClick = (mode: ToolAddMode) => {
    ctx.toolAddModeStore.set({ value: mode });
    console.log('Tool add mode changed to:', mode);
  };

  return (
    <>
      {toolAddModes.map((mode) => (
        <button
          key={mode}
          onClick={() => handleElementClick(mode)}
          className={`rounded px-3 py-1.5 text-sm font-bold transition-colors ${
            currentToolAddMode === mode
              ? 'bg-myblue text-white'
              : 'text-myblue hover:bg-myblue/10 border border-gray-200 bg-white'
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

  // Connect to stores
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const { value: toolAddModeVal } = useStore(ctx.toolAddModeStore);
  const isAddPanelOpen = useStore(addPanelOpenStore);

  // Placeholder state - these would come from actual content data
  const hasTitle = true;
  const hasPanes = true;

  // Only show when in insert mode
  if (toolModeVal !== 'insert' || !hasTitle || !hasPanes) {
    return null;
  }

  return (
    <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
      <div className="mb-4">
        <h3 className="text-myblue text-lg font-bold">Add Elements</h3>
      </div>

      <div className="flex flex-wrap gap-x-2 gap-y-1">
        <AddElementsPanel currentToolAddMode={toolAddModeVal} />
      </div>
    </div>
  );
};

export default StoryKeepToolBar;
