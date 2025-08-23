import { useState } from 'react';
import { navigate } from 'astro:transitions/client';
import { useFormState } from '@/hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
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

interface StoryKeepDashboardBrandingProps {
  brandConfig: BrandConfig;
  onBrandConfigUpdate?: (config: BrandConfig) => void;
}

export default function StoryKeepDashboard_Branding({
  brandConfig,
  onBrandConfigUpdate,
}: StoryKeepDashboardBrandingProps) {
  const [currentBrandConfig, setCurrentBrandConfig] = useState(brandConfig);
  const initialState: BrandConfigState =
    convertToLocalState(currentBrandConfig);

  const formState = useFormState({
    initialData: initialState,
    validator: validateBrandConfig,
    onSave: async (data) => {
      try {
        const isFirstSave = !currentBrandConfig.SITE_INIT;

        const updatedState = await saveBrandConfigWithStateUpdate(
          window.TRACTSTACK_CONFIG?.tenantId || 'default',
          data
        );

        // Preserve existing paths when updating parent state
        const updatedBrandConfig = {
          ...currentBrandConfig,
          ...convertToBackendFormat(updatedState),
        };

        // Update local state
        setCurrentBrandConfig(updatedBrandConfig);

        if (onBrandConfigUpdate) {
          onBrandConfigUpdate(updatedBrandConfig);
        }

        if (isFirstSave) {
          navigate('/storykeep');
        }
      } catch (error) {
        console.error('Save failed:', error);
        throw error;
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
