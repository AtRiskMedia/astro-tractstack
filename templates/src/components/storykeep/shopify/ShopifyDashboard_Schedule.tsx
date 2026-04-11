import { useState } from 'react';
import { useFormState } from '@/hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
  validateBrandConfig,
} from '@/utils/api/brandHelpers';
import { saveBrandConfigWithStateUpdate } from '@/utils/api/brandConfig';
import SchedulingSection from '@/components/form/shopify/SchedulingSection';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import type { BrandConfig, BrandConfigState } from '@/types/tractstack';

interface ShopifyDashboardScheduleProps {
  brandConfig: BrandConfig;
  onBrandConfigUpdate?: (config: BrandConfig) => void;
}

export default function ShopifyDashboard_Schedule({
  brandConfig,
  onBrandConfigUpdate,
}: ShopifyDashboardScheduleProps) {
  const [currentBrandConfig, setCurrentBrandConfig] = useState(brandConfig);
  const initialState: BrandConfigState =
    convertToLocalState(currentBrandConfig);

  const formState = useFormState({
    initialData: initialState,
    validator: validateBrandConfig,
    onSave: async (data) => {
      try {
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
      } catch (error) {
        console.error('Save failed:', error);
        throw error;
      }
    },
    unsavedChanges: {
      enableBrowserWarning: true,
      browserWarningMessage: 'Your scheduling changes will be lost!',
    },
  });

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Booking Schedule</h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage your store timezone, business hours, and blackout dates.
        </p>
      </div>

      <SchedulingSection formState={formState} />

      <UnsavedChangesBar
        formState={formState}
        message="You have unsaved scheduling changes"
        saveLabel="Save Schedule"
        cancelLabel="Discard Changes"
      />
    </div>
  );
}
