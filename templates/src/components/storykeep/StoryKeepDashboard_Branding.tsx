import { useState } from 'react';
import { useFormState } from '../../hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
  brandStateIntercept,
  validateBrandConfig,
} from '../../utils/brandHelpers';
import { saveBrandConfigWithStateUpdate } from '../../utils/api/brandConfig';
import BrandColorsSection from './form/brand/BrandColorsSection';
import BrandAssetsSection from './form/brand/BrandAssetsSection';
import SiteConfigSection from './form/brand/SiteConfigSection';
import SocialLinksSection from './form/brand/SocialLinksSection';
import SEOSection from './form/brand/SEOSection';
import FormActions from './form/brand/FormActions';
import UnsavedChangesBar from './form/UnsavedChangesBar';
import type { BrandConfig, BrandConfigState } from '../../types/tractstack';

const VERBOSE = true;

interface StoryKeepDashboardBrandingProps {
  brandConfig: BrandConfig;
}

export default function StoryKeepDashboard_Branding({
  brandConfig,
}: StoryKeepDashboardBrandingProps) {
  const [currentBrandConfig, setCurrentBrandConfig] = useState(brandConfig);
  const initialState: BrandConfigState =
    convertToLocalState(currentBrandConfig);

  const formState = useFormState({
    initialData: initialState,
    interceptor: brandStateIntercept,
    validator: validateBrandConfig,
    onSave: async (data) => {
      try {
        const updatedState = await saveBrandConfigWithStateUpdate(
          data,
          formState.originalState
        );

        // After successful save, update the brand config state
        // This will cause the component to re-render with fresh form state
        const updatedBrandConfig = convertToBackendFormat(updatedState);
        setCurrentBrandConfig(updatedBrandConfig);
      } catch (error) {
        if (VERBOSE) console.error('Save failed:', error);
        alert('Failed to save brand configuration. Please try again.');
      }
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

      {VERBOSE && (
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
