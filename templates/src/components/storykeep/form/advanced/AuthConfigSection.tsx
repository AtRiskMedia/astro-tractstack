import StringInput from '../StringInput';
import type { FormStateReturn } from '../../../../hooks/useFormState';
import type {
  AdvancedConfigState,
  AdvancedConfigStatus,
} from '../../../../types/tractstack';

interface AuthConfigSectionProps {
  formState: FormStateReturn<AdvancedConfigState>;
  status: AdvancedConfigStatus | null;
}

export default function AuthConfigSection({
  formState,
  status,
}: AuthConfigSectionProps) {
  const { state, updateField, errors } = formState;

  const adminConfigured = status?.adminPasswordSet;
  const editorConfigured = status?.editorPasswordSet;

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          Authentication Configuration
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Set passwords for admin and editor access to the StoryKeep
            dashboard.
          </p>
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Admin Password
              </label>
              {adminConfigured ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  ✓ Set
                </span>
              ) : status !== null ? (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  ! Not Set
                </span>
              ) : null}
            </div>
            <StringInput
              value={state.adminPassword}
              onChange={(value) => updateField('adminPassword', value)}
              type="password"
              placeholder={
                adminConfigured ? '••••••••••••••••' : 'Enter admin password'
              }
              error={errors.adminPassword}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Editor Password
              </label>
              {editorConfigured ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  ✓ Set
                </span>
              ) : status !== null ? (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  ! Not Set
                </span>
              ) : null}
            </div>
            <StringInput
              value={state.editorPassword}
              onChange={(value) => updateField('editorPassword', value)}
              type="password"
              placeholder={
                editorConfigured ? '••••••••••••••••' : 'Enter editor password'
              }
              error={errors.editorPassword}
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <p>
            Admin has full access. Editor has limited access to content
            management only.
            {(adminConfigured || editorConfigured) &&
              ' Leave blank to keep existing passwords.'}
          </p>
        </div>
      </div>
    </div>
  );
}
