import { useStore } from '@nanostores/react';
import QuestionMarkCircleIcon from '@heroicons/react/24/outline/QuestionMarkCircleIcon';
import ArrowUturnLeftIcon from '@heroicons/react/24/outline/ArrowUturnLeftIcon';
import ArrowUturnRightIcon from '@heroicons/react/24/outline/ArrowUturnRightIcon';
import PresentationChartBarIcon from '@heroicons/react/24/outline/PresentationChartBarIcon';
import CursorArrowRaysIcon from '@heroicons/react/24/outline/CursorArrowRaysIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';

import {
  viewportModeStore,
  showHelpStore,
  showAnalyticsStore,
  keyboardAccessibleStore,
  canUndoStore,
  canRedoStore,
  setViewportMode,
  toggleShowHelp,
  toggleShowAnalytics,
  toggleKeyboardAccessible,
  setCanUndo,
  setCanRedo,
} from '@/stores/storykeep';

interface StoryKeepHeaderProps {
  keyboardAccessibleEnabled: boolean;
  nodeId: string;
  isContext: boolean;
}

const StoryKeepHeader = ({
  keyboardAccessibleEnabled,
  nodeId,
  isContext = false,
}: StoryKeepHeaderProps) => {
  // Connect to stores
  const viewport = useStore(viewportModeStore);
  const showHelp = useStore(showHelpStore);
  const showAnalytics = useStore(showAnalyticsStore);
  const keyboardAccessible = useStore(keyboardAccessibleStore);
  const canUndo = useStore(canUndoStore);
  const canRedo = useStore(canRedoStore);

  // Determine current viewport key for conditional rendering
  const viewportKey = viewport === 'auto' ? 'desktop' : viewport;

  const handleSave = () => {
    console.log('Save placeholder - will implement later');
  };

  const handleCancel = () => {
    console.log('Cancel placeholder - will navigate to /storykeep');
    window.location.href = '/storykeep';
  };

  const handleUndo = () => {
    console.log('Undo placeholder');
    setCanUndo(false);
  };

  const handleRedo = () => {
    console.log('Redo placeholder');
    setCanRedo(false);
  };

  const visitPage = () => {
    console.log('Visit page placeholder');
  };

  const activeIconClassName =
    '-rotate-2 w-8 h-8 text-white rounded bg-myblue p-1';
  const iconClassName =
    'w-8 h-8 text-myblue hover:text-white hover:bg-myblue rounded-xl hover:rounded bg-white p-1 cursor-pointer transition-all';

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-2">
      {/* Viewport Selector */}
      <div className="flex items-center gap-2">
        <select
          value={viewport}
          onChange={(e) =>
            setViewportMode(
              e.target.value as 'auto' | 'mobile' | 'tablet' | 'desktop'
            )
          }
          className="text-myblue rounded border border-gray-200 bg-white px-2 py-1 text-sm"
        >
          <option value="auto">Auto</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
          <option value="desktop">Desktop</option>
        </select>
      </div>

      {/* Undo/Redo */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ArrowUturnLeftIcon
          title="Undo"
          style={{ visibility: canUndo ? 'visible' : 'hidden' }}
          className={iconClassName}
          onClick={handleUndo}
        />
        <ArrowUturnRightIcon
          title="Redo"
          style={{ visibility: canRedo ? 'visible' : 'hidden' }}
          className={iconClassName}
          onClick={handleRedo}
        />
      </div>

      {/* Save/Exit Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <button
          onClick={handleSave}
          className="text-myblue font-action bg-white px-2 py-1 font-bold hover:underline"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="text-myblue font-action bg-white px-2 py-1 font-bold hover:underline"
        >
          Exit
        </button>
      </div>

      {/* Control Icons */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        {viewportKey !== 'mobile' && (
          <QuestionMarkCircleIcon
            onClick={toggleShowHelp}
            title="Toggle Help Text"
            className={showHelp ? activeIconClassName : iconClassName}
          />
        )}
        <PresentationChartBarIcon
          onClick={toggleShowAnalytics}
          title="Toggle Interaction Analytics"
          className={showAnalytics ? activeIconClassName : iconClassName}
        />
        {!keyboardAccessibleEnabled && (
          <CursorArrowRaysIcon
            onClick={toggleKeyboardAccessible}
            title="Toggle Mobile/Keyboard Accessibility"
            className={keyboardAccessible ? activeIconClassName : iconClassName}
          />
        )}
        <ArrowTopRightOnSquareIcon
          onClick={visitPage}
          title="Visit Page"
          className={iconClassName}
        />
      </div>
    </div>
  );
};

export default StoryKeepHeader;
