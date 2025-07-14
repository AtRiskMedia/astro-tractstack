import StringArrayInput from '../StringArrayInput';
import type { BrandConfigState } from '../../../../utils/brandHelpers';
import type { FormStateReturn } from '../../../../hooks/useFormState';

interface SocialLinksSectionProps {
  formState: FormStateReturn<BrandConfigState>;
}

export default function SocialLinksSection({
  formState,
}: SocialLinksSectionProps) {
  const { state, updateField, errors } = formState;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900">Social Links</h3>

      <div className="space-y-4">
        <StringArrayInput
          value={state.socials}
          onChange={(value) => updateField('socials', value)}
          label="Social Media Links"
          placeholder="platform|https://url.com (e.g., github|https://github.com/username)"
          error={errors.socials}
        />

        <p className="text-sm text-gray-600">
          Format: platform|url (e.g., "github|https://github.com/username")
        </p>
      </div>
    </div>
  );
}
