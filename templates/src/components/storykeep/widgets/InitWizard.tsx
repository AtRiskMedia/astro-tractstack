import { useFormState } from '@/hooks/useFormState';
import StringInput from '@/components/form/StringInput';
import BooleanToggle from '@/components/form/BooleanToggle';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import {
  initialSetupState,
  setupStateIntercept,
  validateSetup,
  initializeSystem,
} from '@/utils/api/setupHelpers';

export default function InitWizard() {
  const formState = useFormState({
    initialData: initialSetupState,
    validator: validateSetup,
    interceptor: setupStateIntercept,
    onSave: async (data) => {
      try {
        await initializeSystem(data);
        setTimeout(() => {
          window.location.href = '/storykeep';
        }, 1000);
        return data;
      } catch (error) {
        console.error('Installation failed:', error);
        throw error;
      }
    },
  });

  const { state, updateField, errors } = formState;

  return (
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
            Install Tract Stack
          </h2>
          <p className="text-gray-600">
            Create your admin account to initialize this node.
          </p>
        </div>

        <div className="space-y-6">
          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              Email Address *
            </label>
            <StringInput
              value={state.email}
              onChange={(value) => updateField('email', value)}
              type="email"
              placeholder="admin@example.com"
              error={errors.email}
            />
            <p className="mt-1 text-sm text-gray-500">
              Used for system notifications and recovery.
            </p>
          </div>

          {/* Admin Password */}
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              Admin Password *
            </label>
            <StringInput
              value={state.adminPassword}
              onChange={(value) => updateField('adminPassword', value)}
              type="password"
              placeholder="Strong password"
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
              placeholder="Confirm your password"
              error={errors.confirmPassword}
            />
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
                By default, we use a local SQLite3 database. Enable this to
                connect to a Turso instance.
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
                    onChange={(value) => updateField('tursoDatabaseURL', value)}
                    placeholder="libsql://your-database.turso.io"
                    error={errors.tursoDatabaseURL}
                  />
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
          message="Initialize System"
          saveLabel="Install"
          cancelLabel="Clear Form"
        />
      </div>
    </div>
  );
}
