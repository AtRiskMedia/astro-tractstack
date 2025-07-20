import EnumSelect from '../EnumSelect';
import FileUpload from '../FileUpload';
import type { BrandConfigState } from '@/types/tractstack';
import type { FormStateReturn } from '@/hooks/useFormState';

interface BrandAssetsSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

// Wordmark mode options
const WORDMARK_MODE_OPTIONS = [
  { value: 'default', label: 'Show Logo and Wordmark' },
  { value: 'wordmark', label: 'Wordmark Only' },
  { value: 'logo', label: 'Logo Only' },
];

export default function BrandAssetsSection({
  formState,
}: BrandAssetsSectionProps) {
  const { state, updateField, errors } = formState;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">Brand Assets</h3>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Logo - SVG preferred for scalability */}
          <FileUpload
            value={state.logoBase64 || state.logo}
            onChange={(value) => updateField('logoBase64', value)}
            label="Logo"
            allowedFormats={['svg', 'png', 'jpg', 'jpeg']}
            maxSizeKB={512}
            showPreview={true}
            allowAnyImageWithWarning={true}
            error={errors.logo}
          />

          {/* Wordmark - SVG preferred for scalability */}
          <FileUpload
            value={state.wordmarkBase64 || state.wordmark}
            onChange={(value) => updateField('wordmarkBase64', value)}
            label="Wordmark"
            allowedFormats={['svg', 'png', 'jpg', 'jpeg']}
            maxSizeKB={512}
            showPreview={true}
            allowAnyImageWithWarning={true}
            error={errors.wordmark}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Favicon - ICO or SVG only */}
          <FileUpload
            value={state.faviconBase64 || state.favicon}
            onChange={(value) => updateField('faviconBase64', value)}
            label="Favicon"
            allowedFormats={['ico', 'svg']}
            maxSizeKB={100}
            showPreview={true}
            error={errors.favicon}
          />

          {/* OG Logo - Auto-resized to 1200x630 */}
          <FileUpload
            value={state.oglogoBase64 || state.oglogo}
            onChange={(value) => updateField('oglogoBase64', value)}
            label="Open Graph Logo"
            autoResize={{ width: 1200, height: 630 }}
            allowAnyImageWithWarning={true}
            maxSizeKB={2048}
            showPreview={true}
            error={errors.oglogo}
          />
        </div>

        {/* Wordmark Mode */}
        <EnumSelect
          value={state.wordmarkMode}
          onChange={(value) => updateField('wordmarkMode', value)}
          label="Display Mode"
          options={WORDMARK_MODE_OPTIONS}
          error={errors.wordmarkMode}
          id="wordmark-mode"
          placeholder="Select display mode"
        />
      </div>
    </div>
  );
}
