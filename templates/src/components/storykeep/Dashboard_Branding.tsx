import { useState } from 'react';
import { useFormState } from '@/hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
  brandStateIntercept,
  validateBrandConfig,
} from '@/utils/api/brandHelpers';
import { saveBrandConfigWithStateUpdate } from '@/utils/api/brandConfig';
import BrandColorsSection from '@/components/form/brand/BrandColorsSection';
import BrandAssetsSection from '@/components/form/brand/BrandAssetsSection';
import SiteConfigSection from '@/components/form/brand/SiteConfigSection';
import SocialLinksSection from '@/components/form/brand/SocialLinksSection';
import SEOSection from '@/components/form/brand/SEOSection';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import type { BrandConfig, BrandConfigState } from '@/types/tractstack';

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
          window.TRACTSTACK_CONFIG?.tenantId || 'default',
          data,
          formState.originalState
        );

        // Reset form to new baseline state (clears isDirty)
        formState.resetToState(updatedState);

        // Update parent component state
        const updatedBrandConfig = convertToBackendFormat(updatedState);
        setCurrentBrandConfig(updatedBrandConfig);
      } catch (error) {
        if (VERBOSE) console.error('Save failed:', error);
        throw error; // Let UnsavedChangesBar handle error display
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

      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved brand configuration changes"
        saveLabel="Save Brand Config"
        cancelLabel="Discard Changes"
      />
    </div>
  );
}
