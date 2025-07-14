// Enhanced SEOSection with Open Graph image auto-resize
// File: templates/src/components/storykeep/form/brand/SEOSection.tsx

import StringInput from '../StringInput';
import FileUpload from '../FileUpload';
import NumberInput from '../NumberInput';
import type { BrandConfigState } from '../../../../utils/brandHelpers';
import type { FormStateReturn } from '../../../../hooks/useFormState';

interface SEOSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

export default function SEOSection({ formState }: SEOSectionProps) {
  const { state, updateField, errors } = formState;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">SEO & Open Graph</h3>

      <div className="space-y-6">
        {/* OG Basic Info */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <StringInput
            value={state.ogtitle}
            onChange={(value) => updateField('ogtitle', value)}
            label="Open Graph Title"
            placeholder="Page title for social sharing"
            error={errors.ogtitle}
          />

          <StringInput
            value={state.ogauthor}
            onChange={(value) => updateField('ogauthor', value)}
            label="Open Graph Author"
            placeholder="Author name"
            error={errors.ogauthor}
          />
        </div>

        {/* OG Description */}
        <StringInput
          value={state.ogdesc}
          onChange={(value) => updateField('ogdesc', value)}
          label="Open Graph Description"
          placeholder="Description for social sharing"
          error={errors.ogdesc}
        />

        {/* OG Image - Auto-resized to 1200x630 for optimal social sharing */}
        <FileUpload
          value={state.og}
          onChange={(value) => updateField('og', value)}
          label="Open Graph Image"
          autoResize={{ width: 1200, height: 630 }}
          allowAnyImageWithWarning={true}
          maxSizeKB={3072} // 3MB for high-quality social images
          showPreview={true}
          imageQuality={0.85} // Slightly lower quality for smaller file size
          error={errors.og}
        />
      </div>

      {/* SEO Help Text */}
      <div className="mt-6 rounded-md bg-green-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-bold text-green-800">
              Open Graph Optimization
            </h4>
            <div className="mt-2 text-sm text-green-700">
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <strong>Image:</strong> Automatically resized to 1200x630px
                  for optimal social media display
                </li>
                <li>
                  <strong>Title:</strong> Keep under 60 characters for best
                  display across platforms
                </li>
                <li>
                  <strong>Description:</strong> Aim for 150-160 characters for
                  optimal visibility
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
