import StringInput from '../StringInput';
import FileUpload from '../FileUpload';
import type { BrandConfigState } from '@/types/tractstack';
import type { FormStateReturn } from '@/hooks/useFormState';

interface SEOSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

export default function SEOSection({ formState }: SEOSectionProps) {
  const { state, updateField, errors } = formState;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">SEO & Open Graph</h3>

      <div className="space-y-6">
        <StringInput
          value={state.ogtitle}
          onChange={(value) => updateField('ogtitle', value)}
          label="Open Graph Title"
          placeholder="Page title for social sharing"
          maxLength={142}
          error={errors.ogtitle}
        />

        <StringInput
          value={state.ogauthor}
          onChange={(value) => updateField('ogauthor', value)}
          label="Open Graph Author"
          placeholder="Author name"
          maxLength={142}
          error={errors.ogauthor}
        />

        <StringInput
          value={state.ogdesc}
          onChange={(value) => updateField('ogdesc', value)}
          label="Open Graph Description"
          placeholder="Description for social sharing"
          maxLength={284}
          error={errors.ogdesc}
        />

        {/* OG Image - Auto-resized to 1200x630 for optimal social sharing */}
        <FileUpload
          value={state.ogBase64 || state.og}
          onChange={(value) => updateField('ogBase64', value)}
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
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-green-800">
              SEO Best Practices
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Keep titles under 60 characters for optimal display in search
                  results
                </li>
                <li>
                  Descriptions should be 150-160 characters for best social
                  sharing
                </li>
                <li>
                  Open Graph images work best at 1200x630 pixels (1.91:1 ratio)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
