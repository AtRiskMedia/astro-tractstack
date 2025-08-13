import type { CSSProperties } from 'react';
import { useStore } from '@nanostores/react';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import PanelSwitch from './PanelSwitch';
import type { BrandConfig } from '@/types/tractstack';

interface SettingsPanelProps {
  config: BrandConfig;
  availableCodeHooks: string[];
}

const SettingsPanel = ({ config, availableCodeHooks }: SettingsPanelProps) => {
  const signal = useStore(settingsPanelStore);
  const ctx = getCtx();
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);

  if (toolModeVal !== `styles` || !signal) {
    return null;
  }

  return (
    <div
      className="bg-mydarkgrey rounded-xl bg-opacity-20 p-0.5 backdrop-blur-sm"
      style={
        {
          animation: window.matchMedia(
            '(prefers-reduced-motion: no-preference)'
          ).matches
            ? 'fadeInFromHalf 150ms ease-in'
            : 'none',
          '--fade-start': '0.5',
          '--fade-end': '1',
        } as CSSProperties & { [key: string]: string }
      }
    >
      <style>{`
    @keyframes fadeInFromHalf {
      0% { opacity: var(--fade-start, 0.5); }
      100% { opacity: var(--fade-end, 1); }
    }
  `}</style>
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl md:p-2.5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-myblue text-lg font-bold">Settings</h3>
          <button
            onClick={() => settingsPanelStore.set(null)}
            className="hover:text-myblue text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded bg-gray-50 p-1.5 md:p-2.5">
            <PanelSwitch
              config={config}
              availableCodeHooks={availableCodeHooks}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
