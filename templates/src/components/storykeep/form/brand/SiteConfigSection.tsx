import StringInput from '../StringInput';
import BooleanToggle from '../BooleanToggle';
import type { BrandConfigState } from '../../../../utils/brandHelpers';
import type { FormStateReturn } from '../../../../hooks/useFormState';

interface SiteConfigSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

export default function SiteConfigSection({
  formState,
}: SiteConfigSectionProps) {
  const { state, updateField, errors } = formState;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">
        Site Configuration
      </h3>

      <div className="space-y-6">
        {/* Basic Site Info */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <StringInput
            value={state.siteUrl}
            onChange={(value) => updateField('siteUrl', value)}
            label="Site URL"
            type="url"
            placeholder="https://example.com"
            required={true}
            error={errors.siteUrl}
          />

          <StringInput
            value={state.slogan}
            onChange={(value) => updateField('slogan', value)}
            label="Site Slogan"
            placeholder="Your site tagline"
            required={true}
            error={errors.slogan}
          />
        </div>

        {/* Footer */}
        <StringInput
          value={state.footer}
          onChange={(value) => updateField('footer', value)}
          label="Footer Text"
          placeholder="© 2025 Your Company"
          error={errors.footer}
        />

        {/* Slugs */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <StringInput
            value={state.homeSlug}
            onChange={(value) => updateField('homeSlug', value)}
            label="Home Slug"
            placeholder="home"
            error={errors.homeSlug}
          />

          <StringInput
            value={state.tractstackHomeSlug}
            onChange={(value) => updateField('tractstackHomeSlug', value)}
            label="TractStack Home Slug"
            placeholder="tractstack"
            error={errors.tractstackHomeSlug}
          />
        </div>

        {/* Analytics */}
        <StringInput
          value={state.gtag}
          onChange={(value) => updateField('gtag', value)}
          label="Google Analytics Tag"
          placeholder="GA-XXXXXXXXX-X"
          error={errors.gtag}
        />
      </div>
    </div>
  );
}
