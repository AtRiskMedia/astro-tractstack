import ColorPickerCombo from '@/components/fields/ColorPickerCombo';
import { findClosestTailwindColor } from '@/utils/compositor/tailwindColors';

export interface AiDesignConfig {
  harmony: string;
  baseColor: string;
  accentColor: string;
  theme: string;
}

interface AiDesignStepProps {
  designConfig: AiDesignConfig;
  onDesignConfigChange: (newConfig: AiDesignConfig) => void;
  idPrefix?: string;
}

const harmonyOptions = [
  'Analogous',
  'Monochromatic',
  'Complementary',
  'Triadic',
];
const themeOptions = ['Light', 'Dark', 'Bright', 'Muted', 'Pastel', 'Earthy'];

export const AiDesignStep = ({
  designConfig,
  onDesignConfigChange,
  idPrefix = '',
}: AiDesignStepProps) => {
  const updateField = <K extends keyof AiDesignConfig>(
    field: K,
    value: AiDesignConfig[K]
  ) => {
    onDesignConfigChange({ ...designConfig, [field]: value });
  };

  const handleColorChange = (
    field: 'baseColor' | 'accentColor',
    color: string
  ) => {
    if (!color) {
      updateField(field, '');
      return;
    }
    const closest = findClosestTailwindColor(color);
    if (closest) {
      updateField(field, `${closest.name}-${closest.shade}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-base font-bold text-gray-800">
          Color Harmony
        </label>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {harmonyOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`${idPrefix}harmony-${option}`}
                name={`${idPrefix}harmonyOptions`}
                value={option}
                checked={designConfig.harmony === option}
                onChange={(e) => updateField('harmony', e.target.value)}
                className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label
                htmlFor={`${idPrefix}harmony-${option}`}
                className="text-sm font-bold text-gray-700"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <ColorPickerCombo
            title="Base Color (Optional)"
            defaultColor={designConfig.baseColor}
            onColorChange={(color) => handleColorChange('baseColor', color)}
            allowNull={true}
          />
        </div>
        <div>
          <ColorPickerCombo
            title="Accent Color (Optional)"
            defaultColor={designConfig.accentColor}
            onColorChange={(color) => handleColorChange('accentColor', color)}
            allowNull={true}
          />
        </div>
      </div>

      <div>
        <label className="block text-base font-bold text-gray-800">
          Theme / Mood
        </label>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {themeOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`${idPrefix}theme-${option}`}
                name={`${idPrefix}themeOptions`}
                value={option}
                checked={designConfig.theme === option}
                onChange={(e) => updateField('theme', e.target.value)}
                className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label
                htmlFor={`${idPrefix}theme-${option}`}
                className="text-sm font-bold text-gray-700"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
