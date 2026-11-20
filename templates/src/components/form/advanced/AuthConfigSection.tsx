import StringInput from '../StringInput';
import type { FormStateReturn } from '@/hooks/useFormState';
import type {
  AdvancedConfigState,
  AdvancedConfigStatus,
} from '@/types/tractstack';

interface AuthConfigSectionProps {
  formState: FormStateReturn<AdvancedConfigState>;
  status: AdvancedConfigStatus | null;
  isMain?: boolean;
}

export default function AuthConfigSection({
  formState,
  status,
  isMain = true,
}: AuthConfigSectionProps) {
  const { state, updateField, errors } = formState;

  const adminConfigured = status?.adminPasswordSet;

  return (
    <div className="bg-white shadow md:rounded-lg">
      <div className="px-4 py-5 md:p-6">
        <h3 className="text-base font-bold leading-6 text-gray-900">
          Authentication Configuration
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Set the main admin password for access to the StoryKeep dashboard.
            Additional admins and editors are managed under Site User
            Management.
          </p>
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-bold text-gray-700">
                Main Admin Password
              </label>
              {adminConfigured ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                  ✓ Set
                </span>
              ) : status !== null ? (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                  ! Not Set
                </span>
              ) : null}
            </div>
            <StringInput
              value={state.adminPassword}
              onChange={(value) => updateField('adminPassword', value)}
              type="password"
              disabled={!isMain}
              placeholder={
                adminConfigured
                  ? '••••••••••••••••'
                  : 'Enter main admin password'
              }
              error={errors.adminPassword}
            />
            {!isMain && (
              <p className="mt-1 text-sm text-gray-500">
                Only the main site admin can change this
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <p>
            Admin has full access. Editors have limited access to content
            management only.
            {adminConfigured && ' Leave blank to keep the existing password.'}
          </p>
        </div>
      </div>
    </div>
  );
}
