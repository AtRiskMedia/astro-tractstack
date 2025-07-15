import { useFormState } from '../../hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
  brandStateIntercept,
  validateBrandConfig,
} from '../../utils/brandHelpers';
import { saveBrandConfig } from '../../stores/brand';
import BrandColorsSection from './form/brand/BrandColorsSection';
import BrandAssetsSection from './form/brand/BrandAssetsSection';
import SiteConfigSection from './form/brand/SiteConfigSection';
import SocialLinksSection from './form/brand/SocialLinksSection';
import SEOSection from './form/brand/SEOSection';
import FormActions from './form/brand/FormActions';
import UnsavedChangesBar from './form/UnsavedChangesBar';
import type { BrandConfig, BrandConfigState } from '../../types/tractstack';

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
    onSave: async (data) => {
      try {
        const backendFormat = convertToBackendFormat(data);
        const originalBackendFormat = convertToBackendFormat(
          formState.originalState
        );
        // Backend-controlled fields that should not be sent
        const backendControlledFields = new Set([
          'STYLES_VER',
          'LOGO',
          'WORDMARK',
          'FAVICON',
          'OG',
          'OGLOGO'
        ]);
        // Base64 upload fields - always include if they have content
        const base64Fields = [
          'LOGO_BASE64',
          'WORDMARK_BASE64',
          'OG_BASE64',
          'OGLOGO_BASE64',
          'FAVICON_BASE64'
        ];
        const changedFields: Partial<BrandConfig> = {};
        Object.keys(backendFormat).forEach((key) => {
          const typedKey = key as keyof BrandConfig;
          const value = backendFormat[typedKey];
          if (backendControlledFields.has(key)) {
            // Skip backend-controlled fields
            return;
          }
          if (base64Fields.includes(key)) {
            // Include Base64 fields if they have content
            if (value && typeof value === 'string' && value.trim() !== '') {
              (changedFields as any)[typedKey] = value;
            }
          } else {
            // Include other fields if they changed
            if (value !== originalBackendFormat[typedKey]) {
              (changedFields as any)[typedKey] = value;
            }
          }
        });
        // Only send if there are actual changes
        if (Object.keys(changedFields).length > 0) {
          await saveBrandConfig('', changedFields as BrandConfig);
        }
      } catch (error) {
        console.error('Failed to save brand config:', error);
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
