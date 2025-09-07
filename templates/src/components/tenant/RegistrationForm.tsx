import { useState, useEffect } from 'react';
import { useFormState } from '@/hooks/useFormState';
import {
  convertToLocalState,
  convertToBackendFormat,
  validateTenantRegistration,
  tenantStateIntercept,
} from '@/utils/api/tenantHelpers';
import { checkTenantCapacity, provisionTenant } from '@/utils/api/tenantConfig';
import { TractStackAPI } from '@/utils/api';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import StringInput from '@/components/form/StringInput';
import BooleanToggle from '@/components/form/BooleanToggle';
import type { TenantCapacity } from '@/types/multiTenant';
import type { TenantRegistrationState } from '@/types/multiTenant';

interface RegistrationFormProps {
  isInitMode?: boolean;
  onSuccess?: (tenantId?: string) => void;
  onCapacityFull?: () => void;
}

export default function RegistrationForm({
  isInitMode = false,
  onSuccess,
  onCapacityFull,
}: RegistrationFormProps) {
  const [capacity, setCapacity] = useState<TenantCapacity | null>(null);
  const [loadingCapacity, setLoadingCapacity] = useState(!isInitMode);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  // Modal state for tenant preparation
  const [showPreparationModal, setShowPreparationModal] = useState(false);
  const [activationToken, setActivationToken] = useState<string>('');
  const [preparingTenantId, setPreparingTenantId] = useState<string>('');

  // Load capacity information on mount
  useEffect(() => {
    if (isInitMode) {
      return;
    }

    const loadCapacity = async () => {
      try {
        const capacityData = await checkTenantCapacity('default');
        setCapacity(capacityData);

        // Check if at capacity
        if (!capacityData.available) {
          onCapacityFull?.();
        }
      } catch (error) {
        setCapacityError(
          error instanceof Error ? error.message : 'Failed to load capacity'
        );
      } finally {
        setLoadingCapacity(false);
      }
    };

    loadCapacity();
  }, [onCapacityFull, isInitMode]);

  const initialState: TenantRegistrationState = convertToLocalState();

  const formState = useFormState({
    initialData: initialState,
    validator: (data) =>
      validateTenantRegistration(data, undefined, isInitMode),
    interceptor: tenantStateIntercept,
    onSave: async (data) => {
      try {
        if (isInitMode) {
          const api = new TractStackAPI('default');
          const setupData = {
            adminEmail: data.email.trim(),
            adminPassword: data.adminPassword.trim(),
            ...(data.tursoEnabled && {
              tursoDatabaseURL: data.tursoDatabaseURL.trim(),
              tursoAuthToken: data.tursoAuthToken.trim(),
            }),
          };

          const response = await api.post(
            '/api/v1/setup/initialize',
            setupData
          );
          if (!response.success) {
            throw new Error(response.error || 'Setup failed');
          }
          window.location.href = '/storykeep';
          return data;
        } else {
          const backendData = convertToBackendFormat(data);
          const result = await provisionTenant('default', backendData);

          // Store the activation token and tenant ID for the modal
          setActivationToken(result.token);
          setPreparingTenantId(data.tenantId);
          setShowPreparationModal(true);

          return data;
        }
      } catch (error) {
        console.error('Tenant provisioning failed:', error);
        throw error;
      }
    },
  });

  const { state, updateField, errors } = formState;

  // Handle activation button click in modal
  const handleActivate = () => {
    if (activationToken && preparingTenantId) {
      // Check if we're in dev mode
      const isDev = import.meta.env.DEV;

      if (isDev) {
        // In dev mode, navigate to local activation page with tenant ID param
        window.location.href = `/sandbox/activate?token=${activationToken}&tenantId=${preparingTenantId}`;
      } else {
        // In production, use the full subdomain URL
        window.location.href = `https://${preparingTenantId}.sandbox.freewebpress.com/sandbox/activate?token=${activationToken}`;
      }
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowPreparationModal(false);
    onSuccess?.(preparingTenantId);
  };

  if (loadingCapacity) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 rounded bg-gray-200"></div>
          <div className="mb-2 h-4 rounded bg-gray-200"></div>
          <div className="mb-4 h-4 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (capacityError) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="mb-2 text-lg font-bold text-red-800">
            Unable to Load Registration
          </h3>
          <p className="text-red-700">{capacityError}</p>
        </div>
      </div>
    );
  }

  if (!capacity && !isInitMode) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="mb-2 text-lg font-bold text-yellow-800">
            Registration Currently Unavailable
          </h3>
          <p className="text-yellow-700">
            We've reached our current capacity. Please check back later for
            availability.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-2xl p-6" style={{ paddingBottom: '112px' }}>
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-8">
            <div className="h-16">
              <img
                src="/brand/logo.svg"
                className="pointer-events-none mx-auto h-full"
                alt="Logo"
              />
            </div>

            <h2 className="mb-2 mt-8 text-2xl font-bold text-gray-900">
              {isInitMode ? `Install Tract Stack` : `Try Tract Stack`}
            </h2>
            {!isInitMode && (
              <p className="text-gray-600">
                Set up your free sandbox environment to try TractStack.
              </p>
            )}
            {!isInitMode && capacity && (
              <div className="mt-4 rounded-lg bg-orange-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-orange-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-700">
                      {capacity.availableSlots} of {capacity.maxTenants} slots
                      remaining
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Tenant ID field - hidden in init mode */}
            {!isInitMode && (
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Tenant ID *
                </label>
                <StringInput
                  value={state.tenantId}
                  onChange={(value) => updateField('tenantId', value)}
                  placeholder="my-awesome-tenant"
                  error={errors.tenantId}
                />
                <p className="mt-1 text-sm text-gray-500">
                  3-12 characters, lowercase letters, numbers, and dashes only
                </p>
              </div>
            )}

            {/* Admin Password */}
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">
                Admin Password *
              </label>
              <StringInput
                value={state.adminPassword}
                onChange={(value) => updateField('adminPassword', value)}
                type="password"
                placeholder="Strong password for admin access"
                error={errors.adminPassword}
              />
              <p className="mt-1 text-sm text-gray-500">Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">
                Confirm Password *
              </label>
              <StringInput
                value={state.confirmPassword}
                onChange={(value) => updateField('confirmPassword', value)}
                type="password"
                placeholder="Confirm your admin password"
                error={errors.confirmPassword}
              />
            </div>

            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">
                Your Name *
              </label>
              <StringInput
                value={state.name}
                onChange={(value) => updateField('name', value)}
                placeholder="John Doe"
                error={errors.name}
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">
                Email Address *
              </label>
              <StringInput
                value={state.email}
                onChange={(value) => updateField('email', value)}
                type="email"
                placeholder="susie@amazing.com"
                error={errors.email}
              />
              <p className="mt-1 text-sm text-gray-500">
                {isInitMode
                  ? `Used for password reset, etc.`
                  : `You'll receive an activation email at this address`}
              </p>
            </div>

            {/* Database Configuration */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-4">
                <BooleanToggle
                  value={state.tursoEnabled}
                  onChange={(value) => updateField('tursoEnabled', value)}
                  label="Enable Turso Database"
                />
                <p className="mt-2 text-sm text-gray-500">
                  By default, your tenant will use SQLite3. Enable this option
                  to use your own Turso database instead.
                </p>
              </div>

              {state.tursoEnabled && (
                <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">
                      Turso Database URL *
                    </label>
                    <StringInput
                      value={state.tursoDatabaseURL}
                      onChange={(value) =>
                        updateField('tursoDatabaseURL', value)
                      }
                      placeholder="libsql://your-database.turso.io"
                      error={errors.tursoDatabaseURL}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Must start with libsql://
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">
                      Turso Auth Token *
                    </label>
                    <StringInput
                      value={state.tursoAuthToken}
                      onChange={(value) => updateField('tursoAuthToken', value)}
                      type="password"
                      placeholder="Your Turso auth token"
                      error={errors.tursoAuthToken}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <UnsavedChangesBar
            formState={formState}
            message={
              isInitMode
                ? `Install Tract Stack`
                : `Complete your tenant registration`
            }
            saveLabel={isInitMode ? `Install` : `Create Tenant`}
            cancelLabel="Clear Form"
          />
        </div>
      </div>

      {/* Tenant Preparation Modal */}
      {showPreparationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black opacity-25"
              onClick={handleModalClose}
            />

            <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="p-6">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Your TractStack is Being Prepared
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    We've successfully provisioned your tenant{' '}
                    <strong>{preparingTenantId}</strong>. Click the button below
                    to activate your sandbox environment.
                  </p>
                </div>

                <div className="mb-6 rounded-lg bg-orange-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-orange-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-orange-700">
                        You'll also receive an email with this activation link
                        at <strong>{state.email}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleModalClose}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    I'll Use the Email Link
                  </button>
                  <button
                    onClick={handleActivate}
                    className="rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    Activate Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
