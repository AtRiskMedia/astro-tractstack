import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import PencilSquareIcon from '@heroicons/react/24/outline/PencilSquareIcon';
import PaintBrushIcon from '@heroicons/react/24/outline/PaintBrushIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import ArrowsUpDownIcon from '@heroicons/react/24/outline/ArrowsUpDownIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import BugAntIcon from '@heroicons/react/24/outline/BugAntIcon';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import type { ToolModeVal } from '@/types/compositorTypes';

const storykeepToolModes = [
  {
    key: 'styles' as const,
    Icon: PaintBrushIcon,
    title: 'Styles',
    description: 'Click to edit styles',
  },
  {
    key: 'text' as const,
    Icon: PencilSquareIcon,
    title: 'Write',
    description: 'Click to edit text',
  },
  {
    key: 'insert' as const,
    Icon: PlusIcon,
    title: 'Add',
    description: 'Add new element, e.g. paragraph or image',
  },
  {
    key: 'eraser' as const,
    Icon: TrashIcon,
    title: 'Eraser',
    description: 'Erase any element(s)',
  },
  {
    key: 'move' as const,
    Icon: ArrowsUpDownIcon,
    title: 'Move',
    description: 'Keyboard accessible re-order',
  },
  {
    key: 'debug' as const,
    Icon: BugAntIcon,
    title: 'Debug',
    description: 'Debug node ids',
  },
] as const;

interface StoryKeepToolModeProps {
  isContext: boolean;
}

const StoryKeepToolMode = ({ isContext }: StoryKeepToolModeProps) => {
  const signal = useStore(settingsPanelStore);
  const ctx = getCtx();
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);

  // Placeholder state - these would come from actual content data
  const hasTitle = true;
  const hasPanes = true;

  const className =
    'w-8 h-8 py-1 rounded-xl bg-white text-myblue hover:bg-mygreen/20 hover:text-black hover:rotate-3 cursor-pointer transition-all';
  const classNameActive = 'w-8 h-8 py-1.5 rounded-md bg-myblue text-white';

  const currentToolMode =
    storykeepToolModes.find((mode) => mode.key === toolModeVal) ??
    storykeepToolModes[0];

  const handleClick = (mode: ToolModeVal) => {
    settingsPanelStore.set(null);
    ctx.toolModeValStore.set({ value: mode });
    ctx.showGuids.set(mode === `debug`);
    ctx.notifyNode('root');
  };

  // Escape key listener
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        ctx.toolModeValStore.set({ value: 'text' });
        console.log('Tool mode reset to text via Escape');
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [ctx]);

  if (!hasTitle || (!hasPanes && !isContext)) return null;

  return (
    <>
      <div className="text-mydarkgrey h-16 text-center text-sm font-bold">
        mode:
        <div className="font-action text-myblue pt-1.5 text-center text-xs">
          {currentToolMode.title}
        </div>
      </div>
      {storykeepToolModes.map(({ key, Icon, description }) => (
        <div title={description} key={key}>
          {key === toolModeVal ? (
            <Icon className={classNameActive} />
          ) : (
            <Icon className={className} onClick={() => handleClick(key)} />
          )}
        </div>
      ))}
    </>
  );
};

export default StoryKeepToolMode;
