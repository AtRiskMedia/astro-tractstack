import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import QuestionMarkCircleIcon from '@heroicons/react/24/outline/QuestionMarkCircleIcon';
import ArrowUturnLeftIcon from '@heroicons/react/24/outline/ArrowUturnLeftIcon';
import ArrowUturnRightIcon from '@heroicons/react/24/outline/ArrowUturnRightIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import { showHelpStore, settingsPanelStore } from '@/stores/storykeep';
import { getCtx, ROOT_NODE_NAME } from '@/stores/nodes';

interface StoryKeepHeaderProps {
  viewportSelector: React.ReactNode;
  slug: string;
}

const StoryKeepHeader = ({ viewportSelector, slug }: StoryKeepHeaderProps) => {
  const showHelp = useStore(showHelpStore);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const ctx = getCtx();

  useEffect(() => {
    const updateUndoRedo = () => {
      setCanUndo(ctx.history.canUndo());
      setCanRedo(ctx.history.canRedo());
    };
    ctx.history.headIndex.listen(updateUndoRedo);
    ctx.history.history.listen(updateUndoRedo);
  }, [ctx.history]);

  const toggleShowHelp = () => {
    showHelpStore.set(!showHelp);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Save clicked');
  };

  const handleCancel = () => {
    // TODO: Implement cancel/exit functionality
    console.log('Exit clicked');
  };

  const handleUndo = () => {
    settingsPanelStore.set(null);
    ctx.history.undo();
    ctx.notifyNode(ROOT_NODE_NAME);
  };

  const handleRedo = () => {
    settingsPanelStore.set(null);
    ctx.history.redo();
    ctx.notifyNode(ROOT_NODE_NAME);
  };

  const activeIconClassName =
    '-rotate-2 w-8 h-8 text-white rounded bg-myblue p-1';
  const iconClassName =
    'w-8 h-8 text-myblue hover:text-white hover:bg-myblue rounded-xl hover:rounded bg-white p-1';

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-2">
      {/* Viewport Selector */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {viewportSelector}
      </div>

      {/* Undo/Redo */}
      {(canUndo || canRedo) && (
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
      )}

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
        <QuestionMarkCircleIcon
          onClick={toggleShowHelp}
          title="Toggle Help Text"
          className={showHelp ? activeIconClassName : iconClassName}
        />
        <a href={`/${slug}`} title="Visit Page">
          <ArrowTopRightOnSquareIcon className={iconClassName} />
        </a>
      </div>
    </div>
  );
};

export default StoryKeepHeader;
