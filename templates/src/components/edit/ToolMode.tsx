import { useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import PencilSquareIcon from '@heroicons/react/24/outline/PencilSquareIcon';
import PaintBrushIcon from '@heroicons/react/24/outline/PaintBrushIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import ArrowPathRoundedSquareIcon from '@heroicons/react/24/outline/ArrowPathRoundedSquareIcon';
import ArrowsUpDownIcon from '@heroicons/react/24/outline/ArrowsUpDownIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import BugAntIcon from '@heroicons/react/24/outline/BugAntIcon';
import LinkIcon from '@heroicons/react/24/solid/LinkIcon';
import ChatBubbleBottomCenterTextIcon from '@heroicons/react/24/outline/ChatBubbleBottomCenterTextIcon';
import XMarkIcon from '@heroicons/react/24/solid/XMarkIcon';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { classNames } from '@/utils/helpers';
import type { ToolModeVal } from '@/types/compositorTypes';
import { selectionStore, resetSelectionStore } from '@/stores/selection';

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
    key: 'designLibrary' as const,
    Icon: ArrowPathRoundedSquareIcon,
    title: 'Design Library',
    description: 'Save pane to design library',
  },
  {
    key: 'debug' as const,
    Icon: BugAntIcon,
    title: 'Debug Mode',
    description: 'Toggle node tree id reveal',
  },
] as const;

interface StoryKeepToolModeProps {
  isContext: boolean;
}

const StoryKeepToolMode = ({ isContext }: StoryKeepToolModeProps) => {
  const ctx = getCtx();
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const $selection = useStore(selectionStore);
  const navRef = useRef<HTMLElement>(null);

  const hasTitle = useStore(ctx.hasTitle);
  const hasPanes = useStore(ctx.hasPanes);

  const isSelectionActive = $selection.isActive;

  const className =
    'w-8 h-8 py-1 rounded-xl bg-white text-myblue hover:bg-mygreen/20 hover:text-black hover:rotate-3 cursor-pointer transition-all';
  const classNameActive = 'w-8 h-8 py-1.5 rounded-md bg-myblue text-white';

  const currentToolMode =
    storykeepToolModes.find((mode) => mode.key === toolModeVal) ??
    storykeepToolModes[0];

  const handleClick = (mode: ToolModeVal) => {
    settingsPanelStore.set(null);
    ctx.toolModeValStore.set({ value: mode });
    ctx.notifyNode('root');
  };

  const handleStyleClick = () => {
    selectionStore.setKey('pendingAction', 'style');
  };

  const handleLinkClick = () => {
    selectionStore.setKey('pendingAction', 'link');
  };

  const handleCarouselClick = () => {
    selectionStore.setKey('pendingAction', 'carousel');
  };

  const handleCancelClick = () => {
    resetSelectionStore();
  };

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectionStore.get().isActive) {
          resetSelectionStore();
        } else {
          ctx.toolModeValStore.set({ value: 'text' });
          ctx.notifyNode('root');
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [ctx]);

  if (!hasTitle || (!hasPanes && !isContext)) {
    return null;
  }

  return (
    <>
      <nav
        id="mainNav"
        ref={navRef}
        className={classNames(
          'z-102 bg-mywhite md:bg-mywhite/70 fixed bottom-0 left-0 right-0 p-1.5 md:bottom-2 md:right-auto md:h-auto md:w-auto md:rounded-r-xl md:border md:border-black/5 md:p-2 md:shadow-lg md:backdrop-blur-sm',
          isSelectionActive ? `outline-dashed outline-4 outline-red-600` : ``
        )}
      >
        {!isSelectionActive && (
          <div className="flex flex-wrap justify-around gap-4 py-0.5 md:flex-nowrap md:justify-start md:gap-4 md:p-0">
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
                  <Icon
                    className={className}
                    onClick={() => handleClick(key)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {isSelectionActive && (
          <div className="flex items-center justify-around gap-x-2 py-0.5 md:justify-start md:p-0">
            <div className="text-mydarkgrey text-center text-sm font-bold">
              mode:
              <div className="font-action text-myblue pt-1.5 text-center text-xs">
                Action Pending
              </div>
            </div>
            <div className="flex gap-x-1 rounded-lg bg-gray-100 p-2 shadow-inner">
              <button
                type="button"
                onClick={handleStyleClick}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shadow-sm hover:bg-blue-200"
                aria-label="Style selection"
                title="Add custom styles"
              >
                <PaintBrushIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleLinkClick}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shadow-sm hover:bg-blue-200"
                aria-label="Create link"
                title="Hyperlink"
              >
                <LinkIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleCarouselClick}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shadow-sm hover:bg-blue-200"
                aria-label="Create Word Carousel"
                title="Word Carousel"
              >
                <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleCancelClick}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-700 shadow-sm hover:bg-gray-300"
                aria-label="Cancel selection"
                title="Cancel Selection"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default StoryKeepToolMode;
