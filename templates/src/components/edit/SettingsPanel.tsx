import { useStore } from '@nanostores/react';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import {
  settingsPanelOpenStore,
  toolModeStore,
  toggleSettingsPanel,
} from '@/stores/storykeep';

interface SettingsPanelProps {
  availableCodeHooks: string[];
}

const SettingsPanel = ({ availableCodeHooks }: SettingsPanelProps) => {
  const isOpen = useStore(settingsPanelOpenStore);
  const toolModeVal = useStore(toolModeStore);

  // Don't show settings button or panel when in insert mode (ToolBar takes over)
  if (toolModeVal === 'insert') {
    return null;
  }

  return (
    <>
      {/* Settings Toggle Button - hide when panel is open */}
      {!isOpen && (
        <button
          onClick={toggleSettingsPanel}
          className="text-myblue hover:bg-myblue rounded-full bg-white p-3 shadow-lg transition-all hover:text-white"
          title="Settings"
        >
          <CogIcon className="h-6 w-6" />
        </button>
      )}

      {/* Settings Panel */}
      {isOpen && (
        <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-myblue text-lg font-bold">Settings</h3>
            <button
              onClick={toggleSettingsPanel}
              className="hover:text-myblue text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded bg-gray-50 p-4">
              <p className="text-center text-gray-600">
                Settings panel placeholder
              </p>
              <p className="mt-2 text-center text-sm text-gray-500">
                Component properties and styling controls will be implemented
                here
              </p>
            </div>

            {/* Available CodeHooks Display */}
            {availableCodeHooks.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-bold text-gray-700">
                  Available Code Hooks:
                </h4>
                <div className="space-y-1">
                  {availableCodeHooks.map((hook) => (
                    <div
                      key={hook}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {hook}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPanel;
