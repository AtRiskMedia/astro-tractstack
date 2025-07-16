import { useState, useEffect } from 'react';
import { useFormState } from '../../hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
  validateAdvancedConfig,
  advancedStateIntercept,
} from '../../utils/advancedHelpers';
import {
  getAdvancedConfigStatus,
  saveAdvancedConfig,
} from '../../utils/api/advancedConfig';
import UnsavedChangesBar from './form/UnsavedChangesBar';
import DatabaseConfigSection from './form/advanced/DatabaseConfigSection';
import AuthConfigSection from './form/advanced/AuthConfigSection';
import APIConfigSection from './form/advanced/APIConfigSection';
import type {
  AdvancedConfigState,
  AdvancedConfigStatus,
} from '../../types/tractstack';

export default function StoryKeepDashboard_Advanced() {
  const [status, setStatus] = useState<AdvancedConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load status on mount
  useEffect(() => {
    async function loadStatus() {
      try {
        setIsLoading(true);
        const statusData = await getAdvancedConfigStatus();
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
      await saveAdvancedConfig(backendPayload);

      // Reload status after save
      const newStatus = await getAdvancedConfigStatus();
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

  return (
    <div className="space-y-6">
      <UnsavedChangesBar formState={formState} />

      <div className="space-y-8">
        <DatabaseConfigSection formState={formState} status={status} />
        <AuthConfigSection formState={formState} status={status} />
        <APIConfigSection formState={formState} status={status} />
      </div>
    </div>
  );
}
