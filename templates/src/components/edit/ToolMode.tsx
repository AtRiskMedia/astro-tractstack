import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import PencilSquareIcon from '@heroicons/react/24/outline/PencilSquareIcon';
import PaintBrushIcon from '@heroicons/react/24/outline/PaintBrushIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import ArrowsUpDownIcon from '@heroicons/react/24/outline/ArrowsUpDownIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import BugAntIcon from '@heroicons/react/24/outline/BugAntIcon';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { debounce } from '@/utils/helpers';
import type { ToolModeVal } from '@/types/compositorTypes';

const SHORT_THRESHOLD = 650;

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
  const navRef = useRef<HTMLElement>(null);

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
      }
    };

    const toolModeNav = navRef.current;

    // If the <nav> element hasn't been rendered yet, do nothing.
    // The hook will re-run when hasTitle/hasPanes changes and it does render.
    if (!toolModeNav) {
      return;
    }

    const updateToolbarLayout = debounce(() => {
      const isWideAndShort =
        window.innerWidth >= 801 && window.innerHeight <= SHORT_THRESHOLD;
      toolModeNav.classList.toggle('is-compact-widget', isWideAndShort);
    }, 50);

    document.addEventListener('keydown', handleEscapeKey);
    window.addEventListener('resize', updateToolbarLayout);

    updateToolbarLayout(); // Initial check

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('resize', updateToolbarLayout);
    };
    // This dependency array is the key. The effect will re-run when the render conditions change.
  }, [ctx, hasTitle, hasPanes, isContext]);

  if (!hasTitle || (!hasPanes && !isContext)) {
    return null;
  }

  return (
    <>
      <style>{`
        #mainNav.is-compact-widget {
          position: fixed;
          bottom: 0.25rem;
          left: 0rem;
          top: auto;
          right: auto;
          height: auto;
          width: auto;
          padding: 0.5rem;
          border-radius: 0 0.75rem 0.75rem 0;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          background-color: rgba(252, 252, 252, 0.7);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        #mainNav.is-compact-widget > div {
          flex-direction: row;
          flex-wrap: nowrap;
          align-items: center;
          gap: 1rem;
          margin: 0;
          padding: 0;
          height: auto;
        }
      `}</style>
      <nav
        id="mainNav"
        ref={navRef}
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
    </>
  );
};

export default StoryKeepToolMode;
