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
          maxLength={142}
          required={true}
          error={errors.slogan}
        />

        <StringInput
          value={state.footer}
          onChange={(value) => updateField('footer', value)}
          label="Footer Text"
          placeholder="© 2025 Your Company"
          maxLength={142}
          required={true}
          error={errors.footer}
        />

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
