import { useStore } from '@nanostores/react';
import {
  settingsPanelStore,
  showHelpStore,
} from '@/stores/storykeep';

const HudDisplay = () => {
  const signal = useStore(settingsPanelStore);
  const showHelp = useStore(showHelpStore);
  const isVisible = !signal && showHelp

  if (!isVisible) {
    return null;
  }

  return (
    <div className="max-w-sm rounded-lg bg-black bg-opacity-85 p-3 text-white backdrop-blur-sm">
      <div className="text-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-bold">Help Display</span>
        </div>
        <p className="text-xs text-gray-300">
          Help text will appear here based on current context and selected tools
        </p>
      </div>
    </div>
  );
};

export default HudDisplay;
