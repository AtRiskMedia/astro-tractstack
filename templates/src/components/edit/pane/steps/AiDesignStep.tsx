import ColorPickerCombo from '@/components/fields/ColorPickerCombo';

export interface AiDesignConfig {
  harmony: string;
  baseColor: string;
  accentColor: string;
  theme: string;
  additionalNotes: string;
}

interface AiDesignStepProps {
  designConfig: AiDesignConfig;
  onDesignConfigChange: (newConfig: AiDesignConfig) => void;
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
}: AiDesignStepProps) => {
  const updateField = <K extends keyof AiDesignConfig>(
    field: K,
    value: AiDesignConfig[K]
  ) => {
    onDesignConfigChange({ ...designConfig, [field]: value });
  };

  return (
    <div className="space-y-6 rounded-lg bg-gray-50 p-4 shadow-inner">
      <label className="block text-lg font-bold text-gray-800">
        2. Configure AI Design
      </label>
      <div>
        <label className="block text-base font-bold text-gray-800">
          Color Harmony
        </label>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {harmonyOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`harmony-${option}`}
                name="harmonyOptions"
                value={option}
                checked={designConfig.harmony === option}
                onChange={(e) => updateField('harmony', e.target.value)}
                className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label
                htmlFor={`harmony-${option}`}
                className="text-sm font-bold text-gray-700"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <ColorPickerCombo
            title="Base Color (Optional)"
            defaultColor={designConfig.baseColor}
            onColorChange={(color) => updateField('baseColor', color)}
            allowNull={true}
          />
        </div>
        <div>
          <ColorPickerCombo
            title="Accent Color (Optional)"
            defaultColor={designConfig.accentColor}
            onColorChange={(color) => updateField('accentColor', color)}
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
                id={`theme-${option}`}
                name="themeOptions"
                value={option}
                checked={designConfig.theme === option}
                onChange={(e) => updateField('theme', e.target.value)}
                className="h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label
                htmlFor={`theme-${option}`}
                className="text-sm font-bold text-gray-700"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="additional-notes"
          className="block text-base font-bold text-gray-800"
        >
          Additional Design Notes (Optional)
        </label>
        <p className="mb-2 mt-1 text-sm text-gray-500">
          Add specific requests like "use rounded corners", "add subtle
          texture".
        </p>
        <textarea
          id="additional-notes"
          value={designConfig.additionalNotes}
          onChange={(e) => updateField('additionalNotes', e.target.value)}
          placeholder="Enter additional notes..."
          rows={3}
          className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
        />
      </div>
    </div>
  );
};
