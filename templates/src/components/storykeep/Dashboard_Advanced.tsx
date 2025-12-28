import { useState, useEffect } from 'react';
import { useFormState } from '@/hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
  validateAdvancedConfig,
  advancedStateIntercept,
} from '@/utils/api/advancedHelpers';
import {
  getAdvancedConfigStatus,
  saveAdvancedConfig,
} from '@/utils/api/advancedConfig';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import AuthConfigSection from '@/components/form/advanced/AuthConfigSection';
import APIConfigSection from '@/components/form/advanced/APIConfigSection';
import type {
  AdvancedConfigState,
  AdvancedConfigStatus,
} from '@/types/tractstack';

interface StoryKeepDashboardAdvancedProps {
  initialize?: boolean;
}

export default function StoryKeepDashboard_Advanced({
  initialize = false,
}: StoryKeepDashboardAdvancedProps) {
  const [status, setStatus] = useState<AdvancedConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load status on mount
  useEffect(() => {
    async function loadStatus() {
      try {
        setIsLoading(true);
        const statusData = await getAdvancedConfigStatus(
          window.TRACTSTACK_CONFIG?.tenantId || 'default'
        );
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
  }, []);

  const formState = useFormState<AdvancedConfigState>({
    initialData: convertToLocalState(status),
    validator: validateAdvancedConfig,
    interceptor: advancedStateIntercept,
    onSave: async (state: AdvancedConfigState) => {
      const backendPayload = convertToBackendFormat(state);
      await saveAdvancedConfig(
        window.TRACTSTACK_CONFIG?.tenantId || 'default',
        backendPayload
      );

      // Reload status after save
      const newStatus = await getAdvancedConfigStatus(
        window.TRACTSTACK_CONFIG?.tenantId || 'default'
      );
      setStatus(newStatus);

      // Reset form to new state (clears password fields and isDirty)
      const newState = convertToLocalState(newStatus);
      formState.resetToState(newState);

      return newState;
    },
  });

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

  // Database status component
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
