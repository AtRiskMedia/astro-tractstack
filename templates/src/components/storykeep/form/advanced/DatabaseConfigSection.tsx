import StringInput from '../StringInput';
import type { FormStateReturn } from '../../../../hooks/useFormState';
import type {
  AdvancedConfigState,
  AdvancedConfigStatus,
} from '../../../../types/tractstack';

interface DatabaseConfigSectionProps {
  formState: FormStateReturn<AdvancedConfigState>;
  status: AdvancedConfigStatus | null;
}

export default function DatabaseConfigSection({
  formState,
  status,
}: DatabaseConfigSectionProps) {
  const { state, updateField, errors } = formState;

  const tursoConfigured = status?.tursoConfigured && status?.tursoTokenSet;
  const hasError = !tursoConfigured && status !== null;

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold leading-6 text-gray-900">
            Database Configuration
          </h3>
          <div className="flex items-center">
            {tursoConfigured ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                ✓ Configured
              </span>
            ) : hasError ? (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
                ! Not Configured
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-800">
                Loading...
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Configure your Turso database connection. Both URL and token are
            required together.
          </p>
        </div>
        <div className="mt-5 space-y-4">
          <StringInput
            label="Turso Database URL"
            value={state.tursoUrl}
            onChange={(value) => updateField('tursoUrl', value)}
            type="password"
            placeholder={
              tursoConfigured
                ? '••••••••••••••••'
                : 'libsql://[your-database].turso.io'
            }
            required
            error={errors.tursoUrl}
          />
          <StringInput
            label="Turso Auth Token"
            value={state.tursoToken}
            onChange={(value) => updateField('tursoToken', value)}
            type="password"
            placeholder={tursoConfigured ? '••••••••••••••••' : 'eyJ...'}
            required
            error={errors.tursoToken}
          />
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <p>
            Both fields must be provided together. The connection will be tested
            before saving.
            {tursoConfigured && ' Leave blank to keep existing values.'}
          </p>
        </div>
      </div>
    </div>
  );
}
