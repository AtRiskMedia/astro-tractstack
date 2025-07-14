import EnumSelect from '../EnumSelect';
import ColorPicker from '../ColorPicker';
import { THEME_OPTIONS } from '../../../../constants/brandThemes';
import type { BrandConfigState } from '../../../../utils/brandHelpers';
import type { FormStateReturn } from '../../../../hooks/useFormState';

interface BrandColorsSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

export default function BrandColorsSection({
  formState,
}: BrandColorsSectionProps) {
  const { state, updateField, errors } = formState;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">
        Brand Colors & Theme
      </h3>

      <div className="space-y-6">
        {/* Theme Selector */}
        <EnumSelect
          value={state.theme}
          onChange={(value) => updateField('theme', value)}
          label="Theme Preset"
          options={THEME_OPTIONS.map((theme) => ({
            value: theme,
            label: theme,
          }))}
          error={errors.theme}
          id="theme"
        />

        {/* Brand Colors */}
        <div>
          <div className="mb-3 block text-sm font-bold text-gray-700">
            Brand Colors
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <ColorPicker
                key={index}
                value={state.brandColours[index] || ''}
                onChange={(value) => {
                  const newColors = [...state.brandColours];
                  newColors[index] = value.replace('#', '');
                  updateField('brandColours', newColors);
                }}
                label={`Color ${index + 1}`}
                id={`brand-${index}`}
              />
            ))}
          </div>
          {errors.brandColours && (
            <p className="mt-2 text-sm text-red-600">{errors.brandColours}</p>
          )}
        </div>
      </div>
    </div>
  );
}
