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
] as const;

interface StoryKeepToolModeProps {
  isContext: boolean;
}

const StoryKeepToolMode = ({ isContext }: StoryKeepToolModeProps) => {
  const ctx = getCtx();
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const showGuids = useStore(ctx.showGuids);

  const hasTitle = useStore(ctx.hasTitle);
  const hasPanes = useStore(ctx.hasPanes);

  const className =
    'w-8 h-8 py-1 rounded-xl bg-white text-myblue hover:bg-mygreen/20 hover:text-black hover:rotate-3 cursor-pointer transition-all';
  const classNameActive = 'w-8 h-8 py-1.5 rounded-md bg-myblue text-white';
  const classNameDebugActive =
    'w-8 h-8 py-1.5 rounded-md bg-orange-500 text-white';

  const currentToolMode =
    storykeepToolModes.find((mode) => mode.key === toolModeVal) ??
    storykeepToolModes[0];

  const handleClick = (mode: ToolModeVal) => {
    settingsPanelStore.set(null);
    ctx.toolModeValStore.set({ value: mode });
    ctx.notifyNode('root');
  };

  const handleDebugToggle = () => {
    ctx.showGuids.set(!showGuids);
    ctx.notifyNode('root');
  };

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
    <nav
      id="mainNav"
      className="z-102 bg-mywhite fixed bottom-0 left-0 right-0 pt-1.5 md:sticky md:bottom-auto md:left-0 md:top-24 md:h-screen md:w-16 md:pt-0"
    >
      <div className="flex flex-wrap justify-around gap-4 py-0.5 md:mt-0 md:flex-col md:items-center md:gap-8 md:space-x-0 md:space-y-2 md:py-2">
        <div className="text-mydarkgrey text-center text-sm font-bold">
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
        <div title="Toggle debug node ids" key="debug">
          <BugAntIcon
            className={showGuids ? classNameDebugActive : className}
            onClick={handleDebugToggle}
          />
        </div>
      </div>
    </nav>
  );
};

export default StoryKeepToolMode;
