import EnumSelect from '../EnumSelect';
import ColorPicker from '../ColorPicker';
import { THEME_OPTIONS, getThemeColors } from '@/constants/brandThemes';
import type { BrandConfigState } from '@/types/tractstack';
import type { FormStateReturn } from '@/hooks/useFormState';

interface BrandColorsSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

// Layout theme options for the actual theme dropdown
const LAYOUT_THEME_OPTIONS = [
  'light',
  'light-bw',
  'light-bold',
  'dark',
  'dark-bw',
  'dark-bold'
] as const;

// Helper function to determine current brand color preset from colors
function getCurrentBrandColorPreset(colors: string[]): string {
  const colorString = colors.join(',');
  for (const preset of THEME_OPTIONS) {
    if (preset === 'Custom') continue;
    const presetColors = getThemeColors(preset);
    if (presetColors.join(',') === colorString) {
      return preset;
    }
  }
  return 'Custom';
}

// Helper function to calculate contrast ratio between two hex colors
function getContrastRatio(color1: string, color2: string): number {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  };

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// Check contrast for key color pairs based on brandThemes.ts requirements
function checkContrastPairs(colors: string[]): string[] {
  if (colors.length !== 8 || colors.some((color) => !color)) {
    return [];
  }

  const issues: string[] = [];

  // Key pairs from brandThemes.ts
  // - 1-2, 1-8 (text on backgrounds) should be >7:1 (WCAG AAA)
  // - 5-2, 5-6, 5-8 (content on backgrounds) should be >4.5:1 (WCAG AA)

  const pairs = [
    { indices: [0, 1], threshold: 7, label: 'Color 1 and Color 2' },
    { indices: [0, 7], threshold: 7, label: 'Color 1 and Color 8' },
    { indices: [4, 1], threshold: 4.5, label: 'Color 5 and Color 2' },
    { indices: [4, 5], threshold: 4.5, label: 'Color 5 and Color 6' },
    { indices: [4, 7], threshold: 4.5, label: 'Color 5 and Color 8' },
  ];

  pairs.forEach(({ indices, threshold, label }) => {
    const [i1, i2] = indices;
    const color1 = colors[i1].startsWith('#') ? colors[i1] : `#${colors[i1]}`;
    const color2 = colors[i2].startsWith('#') ? colors[i2] : `#${colors[i2]}`;

    const ratio = getContrastRatio(color1, color2);

    if (ratio < threshold) {
      issues.push(`Insufficient contrast between ${label}`);
    }
  });

  return issues;
}

export default function BrandColorsSection({
  formState,
}: BrandColorsSectionProps) {
  const { state, updateField, errors } = formState;

  // Check contrast issues
  const contrastIssues = checkContrastPairs(state.brandColours);
  const hasContrastIssues = contrastIssues.length > 0;

  // Derive the current brand color preset from the colors
  const currentBrandColorPreset = getCurrentBrandColorPreset(state.brandColours);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">
        Brand Colors & Theme
      </h3>

      <div className="space-y-6">
        {/* Layout Theme Selector - this saves to state.theme */}
        <EnumSelect
          value={state.theme || 'light-bold'}
          onChange={(value) => updateField('theme', value)}
          label="Theme"
          options={LAYOUT_THEME_OPTIONS.map((theme) => ({
            value: theme,
            label: theme.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          }))}
          error={errors.theme}
          id="theme"
        />

        {/* Color Preset Selector - directly sets brand colours */}
        <EnumSelect
          value={currentBrandColorPreset}
          onChange={(value) => {
            if (value !== 'Custom') {
              updateField('brandColours', getThemeColors(value));
            }
          }}
          label="Color Preset"
          options={THEME_OPTIONS.map((theme) => ({
            value: theme,
            label: theme,
          }))}
          error={errors.brandColours}
          id="brandColorPreset"
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

        {/* Contrast Check Results */}
        <div>
          <div className="mb-2 block text-sm font-bold text-gray-700">
            Accessibility Contrast Check
          </div>
          {!hasContrastIssues ? (
            <p className="text-sm text-green-600">
              All colors properly contrasted
            </p>
          ) : (
            <div className="space-y-1">
              {contrastIssues.map((issue, index) => (
                <p key={index} className="text-mydarkgrey text-sm">
                  {issue}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
