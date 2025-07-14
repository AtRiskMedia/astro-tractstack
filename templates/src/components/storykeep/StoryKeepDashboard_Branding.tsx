import { useFormState } from '../../hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
  brandStateIntercept,
  validateBrandConfig,
  type BrandConfigState,
} from '../../utils/brandHelpers';
import type { BrandConfig } from '../../types/tractstack';
import BrandColorsSection from './form/brand/BrandColorsSection';
import BrandAssetsSection from './form/brand/BrandAssetsSection';
import SiteConfigSection from './form/brand/SiteConfigSection';
import SocialLinksSection from './form/brand/SocialLinksSection';
import SEOSection from './form/brand/SEOSection';
import FormActions from './form/brand/FormActions';
import UnsavedChangesBar from './form/UnsavedChangesBar';

interface StoryKeepDashboardBrandingProps {
  brandConfig: BrandConfig;
}

export default function StoryKeepDashboard_Branding({
  brandConfig,
}: StoryKeepDashboardBrandingProps) {
  const initialState: BrandConfigState = convertToLocalState(brandConfig);

  const formState = useFormState({
    initialData: initialState,
    interceptor: brandStateIntercept,
    validator: validateBrandConfig,
    onSave: (data) => {
      const backendFormat = convertToBackendFormat(data);
      console.log('Saving brand config:', backendFormat);
      console.log('Local state before save:', data);
    },
    unsavedChanges: {
      enableBrowserWarning: true,
      browserWarningMessage: 'Your brand configuration changes will be lost!',
    },
  });

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Brand Configuration
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Configure your site's branding, colors, assets, and social presence.
        </p>
      </div>

      <SiteConfigSection formState={formState} />

      <BrandColorsSection formState={formState} />

      <BrandAssetsSection formState={formState} />

      <SEOSection formState={formState} />

      <SocialLinksSection formState={formState} />

      <FormActions formState={formState} />

      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved brand configuration changes"
        saveLabel="Save Brand Config"
        cancelLabel="Discard Changes"
      />

      {process.env.NODE_ENV === 'development' && (
        <div className="rounded-lg bg-gray-100 p-4 text-xs">
          <h4 className="mb-2 font-bold">Debug Info:</h4>
          <p>
            <strong>Is Dirty:</strong> {formState.isDirty ? 'Yes' : 'No'}
          </p>
          <p>
            <strong>Is Valid:</strong> {formState.isValid ? 'Yes' : 'No'}
          </p>
        </div>
      )}
    </div>
  );
}
