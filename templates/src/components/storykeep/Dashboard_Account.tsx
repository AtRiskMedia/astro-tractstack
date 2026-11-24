import { useState, useEffect, useRef, useCallback } from 'react';
import { useFormState } from '@/hooks/useFormState';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import StringInput from '@/components/form/StringInput';
import {
  getMe,
  updateMe,
  changePassword,
  deleteMe,
} from '@/utils/api/adminsConfig';
import type { FieldErrors } from '@/hooks/useFormState';

interface AccountState {
  displayName: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface StoryKeepDashboardAccountProps {
  isMain: boolean;
  forceChange?: boolean;
  username?: string;
  role?: 'admin' | 'editor';
}

const EMPTY_STATE: AccountState = {
  displayName: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function validateAccount(state: AccountState): FieldErrors {
  const errors: FieldErrors = {};

  if (state.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
    errors.email = 'Please enter a valid email address';
  }

  const hasPasswordInput = Boolean(
    state.currentPassword || state.newPassword || state.confirmPassword
  );
  if (hasPasswordInput) {
    if (!state.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!state.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (state.newPassword.length < 8) {
      errors.newPassword = 'New password should be at least 8 characters long';
    }
    if (state.newPassword !== state.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  return errors;
}

export default function StoryKeepDashboard_Account({
  isMain,
  forceChange = false,
  username = '',
  role,
}: StoryKeepDashboardAccountProps) {
  const tenantId = window.TRACTSTACK_CONFIG?.tenantId || 'default';

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState<AccountState | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const hasHydrated = useRef(false);
  const baseline = useRef({ displayName: '', email: '' });

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const me = await getMe(tenantId);
        baseline.current = {
          displayName: me.displayName,
          email: me.email,
        };
        setLoaded({
          ...EMPTY_STATE,
          displayName: me.displayName,
          email: me.email,
        });
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load account'
        );
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [tenantId]);

  const onSave = useCallback(
    async (state: AccountState): Promise<AccountState> => {
      const displayName = state.displayName.trim();
      const email = state.email.trim();

      if (
        displayName !== baseline.current.displayName ||
        email !== baseline.current.email
      ) {
        await updateMe(tenantId, { displayName, email });
        baseline.current = { displayName, email };
      }

      if (state.newPassword) {
        await changePassword(tenantId, {
          currentPassword: state.currentPassword,
          newPassword: state.newPassword,
        });
        if (forceChange) {
          window.location.href = '/storykeep';
        }
      }

      return {
        ...EMPTY_STATE,
        displayName,
        email,
      };
    },
    [tenantId, forceChange]
  );

  const formState = useFormState<AccountState>({
    initialData: loaded || EMPTY_STATE,
    validator: validateAccount,
    onSave,
  });

  useEffect(() => {
    if (!loaded || hasHydrated.current) return;
    formState.resetToState(loaded);
    hasHydrated.current = true;
  }, [loaded, formState]);

  const handleDelete = async () => {
    if (
      !window.confirm(
        'Delete your account? This cannot be undone and you will be signed out.'
      )
    ) {
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteMe(tenantId);
      window.location.href = '/storykeep/logout';
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete account'
      );
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">Loading account...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">{loadError}</div>
      </div>
    );
  }

  const { state, updateField, errors } = formState;

  return (
    <div className="space-y-8">
      {forceChange && (
        <div className="rounded-md border border-dashed border-orange-200 bg-orange-50 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔑</span>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-black">
                Password change required
              </h3>
              <div className="mt-2 text-sm text-mydarkgrey">
                <p>
                  Your password was set by an administrator. Choose a new
                  password below to continue using StoryKeep.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesBar formState={formState} />

      <div className="bg-white shadow md:rounded-lg">
        <div className="px-4 py-5 md:p-6">
          <h3 className="text-base font-bold leading-6 text-gray-900">
            My Account
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              {username ? `Signed in as ${username}` : 'Signed in'}
              {role ? ` (${role}${isMain ? ', main admin' : ''})` : ''}
            </p>
          </div>
          <div className="mt-5 space-y-4">
            <StringInput
              label="Display Name"
              value={state.displayName}
              onChange={(value) => updateField('displayName', value)}
              error={errors.displayName}
            />
            <StringInput
              label="Email"
              type="email"
              value={state.email}
              onChange={(value) => updateField('email', value)}
              error={errors.email}
            />
          </div>
        </div>
      </div>

      <div
        className={
          forceChange
            ? 'bg-white shadow ring-2 ring-orange-300 md:rounded-lg'
            : 'bg-white shadow md:rounded-lg'
        }
      >
        <div className="px-4 py-5 md:p-6">
          <h3 className="text-base font-bold leading-6 text-gray-900">
            Change Password
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              {forceChange
                ? 'Enter your current password and choose a new one.'
                : 'Leave blank to keep your current password.'}
            </p>
          </div>
          <div className="mt-5 space-y-4">
            <StringInput
              label="Current Password"
              type="password"
              value={state.currentPassword}
              onChange={(value) => updateField('currentPassword', value)}
              error={errors.currentPassword}
            />
            <StringInput
              label="New Password"
              type="password"
              value={state.newPassword}
              onChange={(value) => updateField('newPassword', value)}
              error={errors.newPassword}
            />
            <StringInput
              label="Confirm New Password"
              type="password"
              value={state.confirmPassword}
              onChange={(value) => updateField('confirmPassword', value)}
              error={errors.confirmPassword}
            />
          </div>
        </div>
      </div>

      {!isMain && (
        <div className="bg-white shadow md:rounded-lg">
          <div className="px-4 py-5 md:p-6">
            <h3 className="text-base font-bold leading-6 text-gray-900">
              Delete Account
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Permanently delete your account and sign out.</p>
            </div>
            {deleteError && (
              <div className="mt-3 text-sm text-red-700">{deleteError}</div>
            )}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
