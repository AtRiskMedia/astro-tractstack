import { useState, useEffect, useRef, useCallback } from 'react';
import { useFormState } from '@/hooks/useFormState';
import {
  convertToLocalState as convertAdvancedToLocalState,
  convertToBackendFormat,
  validateAdvancedConfig,
  advancedStateIntercept,
} from '@/utils/api/advancedHelpers';
import {
  convertToLocalState as convertBrandToLocalState,
  convertToBackendFormat as convertBrandToBackendFormat,
  validateBrandConfig,
} from '@/utils/api/brandHelpers';
import {
  getAdvancedConfigStatus,
  saveAdvancedConfig,
} from '@/utils/api/advancedConfig';
import { getBrandConfig, saveBrandConfig } from '@/utils/api/brandConfig';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import AuthConfigSection from '@/components/form/advanced/AuthConfigSection';
import APIConfigSection from '@/components/form/advanced/APIConfigSection';
import type {
  AdvancedConfigState,
  AdvancedConfigStatus,
  BrandConfig,
} from '@/types/tractstack';

interface StoryKeepDashboardAdvancedProps {
  brandConfig: BrandConfig;
  initialize?: boolean;
}

export default function StoryKeepDashboard_Advanced({
  brandConfig,
  initialize = false,
}: StoryKeepDashboardAdvancedProps) {
  const [status, setStatus] = useState<AdvancedConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const hasHydratedInitialFormState = useRef(false);

  const tenantId = window.TRACTSTACK_CONFIG?.tenantId || 'default';

  const validateAdvancedForm = useCallback(
    (state: AdvancedConfigState) => {
      const advancedErrors = validateAdvancedConfig(state);
      const brandLocal = {
        ...convertBrandToLocalState(brandConfig),
        adminEmail: state.adminEmail,
        adminEmailName: state.adminEmailName,
      };
      const brandErrors = validateBrandConfig(brandLocal);
      return {
        ...advancedErrors,
        ...(brandErrors.adminEmail && { adminEmail: brandErrors.adminEmail }),
        ...(brandErrors.adminEmailName && {
          adminEmailName: brandErrors.adminEmailName,
        }),
      };
    },
    [brandConfig]
  );

  useEffect(() => {
    async function loadStatus() {
      try {
        setIsLoading(true);
        const statusData = await getAdvancedConfigStatus(tenantId);
        setStatus(statusData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load configuration status'
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadStatus();
  }, [tenantId]);

  const formState = useFormState<AdvancedConfigState>({
    initialData: convertAdvancedToLocalState(status),
    validator: validateAdvancedForm,
    interceptor: advancedStateIntercept,
    onSave: async (state: AdvancedConfigState) => {
      const backendPayload = convertToBackendFormat(state);
      await saveAdvancedConfig(tenantId, backendPayload);

      const brandConfigFresh = await getBrandConfig(tenantId);
      const brandLocal = convertBrandToLocalState(brandConfigFresh);
      brandLocal.adminEmail = state.adminEmail.trim();
      brandLocal.adminEmailName = state.adminEmailName.trim();
      await saveBrandConfig(tenantId, convertBrandToBackendFormat(brandLocal));

      const newStatus = await getAdvancedConfigStatus(tenantId);
      setStatus(newStatus);

      const brandLocalHydrate = convertBrandToLocalState(brandConfigFresh);
      const newState = {
        ...convertAdvancedToLocalState(newStatus),
        adminEmail: brandLocalHydrate.adminEmail,
        adminEmailName: brandLocalHydrate.adminEmailName,
      };
      formState.resetToState(newState);

      window.location.reload();
      return newState;
    },
  });

  useEffect(() => {
    if (!status || hasHydratedInitialFormState.current) {
      return;
    }
    const brandLocal = convertBrandToLocalState(brandConfig);
    formState.resetToState({
      ...convertAdvancedToLocalState(status),
      adminEmail: brandLocal.adminEmail,
      adminEmailName: brandLocal.adminEmailName,
    });
    hasHydratedInitialFormState.current = true;
  }, [status, formState, brandConfig]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const DatabaseStatusSection = () => {
    const databaseType = status?.tursoEnabled
      ? 'Turso Cloud Database'
      : 'SQLite file on host server';
    const icon = status?.tursoEnabled ? '☁️' : '📁';

    return (
      <div className="bg-white shadow md:rounded-lg">
        <div className="px-4 py-5 md:p-6">
          <h3 className="text-base font-bold leading-6 text-gray-900">
            Database Configuration
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              Database configuration is managed at the infrastructure level.
            </p>
          </div>
          <div className="mt-5">
            <div className="flex items-center space-x-3 rounded-md bg-gray-50 p-4">
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="text-sm font-bold text-gray-900">
                  Current Database: {databaseType}
                </div>
                <div className="text-xs text-gray-500">
                  {status?.tursoEnabled
                    ? 'Using Turso cloud-hosted SQLite database'
                    : 'Using local SQLite database file'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {initialize && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-xl text-blue-500">🚀</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-bold text-blue-800">
                Initialize Your StoryKeep
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Complete your advanced configuration to secure your
                  installation and enable features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesBar formState={formState} />

      <div className="space-y-8">
        <DatabaseStatusSection />
        <AuthConfigSection formState={formState} status={status} />
        <APIConfigSection formState={formState} status={status} />
      </div>
    </div>
  );
}
