import StringInput from '../StringInput';
import FileUpload from '../FileUpload';
import type { BrandConfigState } from '../../../../utils/brandHelpers';
import type { FormStateReturn } from '../../../../hooks/useFormState';

interface BrandAssetsSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

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
            value={state.logo}
            onChange={(value) => updateField('logo', value)}
            label="Logo"
            allowedFormats={['svg', 'png', 'jpg', 'jpeg']}
            maxSizeKB={512}
            showPreview={true}
            allowAnyImageWithWarning={true}
            error={errors.logo}
          />

          {/* Wordmark - SVG preferred for scalability */}
          <FileUpload
            value={state.wordmark}
            onChange={(value) => updateField('wordmark', value)}
            label="Wordmark"
            allowedFormats={['svg', 'png', 'jpg', 'jpeg']}
            maxSizeKB={512}
            showPreview={true}
            allowAnyImageWithWarning={true}
            error={errors.wordmark}
          />
        </div>

        {/* Wordmark Mode */}
        <StringInput
          value={state.wordmarkMode}
          onChange={(value) => updateField('wordmarkMode', value)}
          label="Wordmark Mode"
          placeholder="e.g., light, dark, color"
          error={errors.wordmarkMode}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Favicon - ICO or SVG only */}
          <FileUpload
            value={state.favicon}
            onChange={(value) => updateField('favicon', value)}
            label="Favicon"
            allowedFormats={['ico', 'svg']}
            maxSizeKB={100}
            showPreview={true}
            error={errors.favicon}
          />

          {/* OG Logo - Auto-resized to 1200x630 */}
          <FileUpload
            value={state.oglogo}
            onChange={(value) => updateField('oglogo', value)}
            label="Open Graph Logo"
            autoResize={{ width: 1200, height: 630 }}
            allowAnyImageWithWarning={true}
            maxSizeKB={2048}
            showPreview={true}
            error={errors.oglogo}
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 rounded-md bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M5 10 L8 13 L15 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-bold text-blue-800">
              Image Requirements
            </h4>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <strong>Logo & Wordmark:</strong> SVG preferred for
                  scalability, PNG/JPG accepted
                </li>
                <li>
                  <strong>Favicon:</strong> ICO or SVG only, max 100KB
                </li>
                <li>
                  <strong>Open Graph Logo:</strong> Any image format,
                  auto-resized to 1200x630px for social sharing
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
