import { useState, useEffect, useCallback } from 'react';
import StringInput from '../StringInput';
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from '@/utils/api/adminsConfig';
import type { AdminAccount, AdminRole } from '@/types/tractstack';

interface SiteUserManagementSectionProps {
  isMain: boolean;
  currentSub: string;
  hasResend: boolean;
}

interface CreateFormState {
  username: string;
  email: string;
  displayName: string;
  role: AdminRole;
  password: string;
  mustChangePassword: boolean;
}

interface EditFormState {
  username: string;
  email: string;
  displayName: string;
  role: AdminRole;
  password: string;
}

const EMPTY_CREATE: CreateFormState = {
  username: '',
  email: '',
  displayName: '',
  role: 'editor',
  password: '',
  mustChangePassword: true,
};

const selectClasses =
  'block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-cyan-600 md:text-sm md:leading-6';

export default function SiteUserManagementSection({
  isMain,
  currentSub,
  hasResend,
}: SiteUserManagementSectionProps) {
  const tenantId = window.TRACTSTACK_CONFIG?.tenantId || 'default';

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await listAdmins(tenantId);
      setAccounts(list);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const canManage = (account: AdminAccount): boolean => {
    if (account.isMain || account.id === currentSub) return false;
    if (isMain) return true;
    return account.role === 'editor';
  };

  const createValid =
    createForm.username.trim() !== '' &&
    createForm.email.trim() !== '' &&
    createForm.password.length >= 8;

  const handleCreate = async () => {
    if (!createValid || isCreating) return;
    setIsCreating(true);
    setError('');
    setMessage('');
    try {
      await createAdmin(tenantId, {
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        displayName: createForm.displayName.trim(),
        role: isMain ? createForm.role : 'editor',
        password: createForm.password,
        mustChangePassword: createForm.mustChangePassword,
      });
      setCreateForm(EMPTY_CREATE);
      setMessage('Account created');
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (account: AdminAccount) => {
    setEditingId(account.id);
    setEditForm({
      username: account.username,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      password: '',
    });
    setMessage('');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (account: AdminAccount) => {
    if (!editForm || isSavingEdit) return;
    if (editForm.password && editForm.password.length < 8) {
      setError('Password should be at least 8 characters long');
      return;
    }
    setIsSavingEdit(true);
    setError('');
    setMessage('');
    try {
      await updateAdmin(tenantId, account.id, {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        displayName: editForm.displayName.trim(),
        ...(isMain ? { role: editForm.role } : {}),
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      setMessage('Account updated');
      cancelEdit();
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (account: AdminAccount) => {
    if (
      !window.confirm(
        `Delete account "${account.username}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyId(account.id);
    setError('');
    setMessage('');
    try {
      await deleteAdmin(tenantId, account.id);
      setMessage('Account deleted');
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white shadow md:rounded-lg">
      <div className="px-4 py-5 md:p-6">
        <h3 className="text-base font-bold leading-6 text-gray-900">
          Site User Management
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Create and manage admin and editor accounts for this StoryKeep.
            {!isMain && ' Admins can manage editor accounts.'}
          </p>
        </div>

        {!hasResend && (
          <div className="mt-4 rounded-md border border-dashed border-orange-200 bg-orange-50 p-4">
            <div className="text-sm text-mydarkgrey">
              Password reset by email is unavailable until Resend is configured.
              Share initial passwords with new users directly.
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        {message && (
          <div className="mt-4 rounded-md bg-green-50 p-3">
            <div className="text-sm text-green-700">{message}</div>
          </div>
        )}

        <div className="mt-5">
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="text-sm text-gray-500">No accounts found.</div>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
              {accounts.map((account) => {
                const manageable = canManage(account);
                const isEditing = editingId === account.id && editForm;
                return (
                  <li key={account.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {account.displayName || account.username}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">
                            {account.role}
                          </span>
                          {account.isMain && (
                            <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-800">
                              main
                            </span>
                          )}
                          {account.id === currentSub && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                              you
                            </span>
                          )}
                          {account.mustChangePassword && (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">
                              must change password
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {account.username} · {account.email}
                        </div>
                      </div>
                      {manageable && !isEditing && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(account)}
                            className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(account)}
                            disabled={busyId === account.id}
                            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {busyId === account.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing && editForm && (
                      <div className="mt-4 space-y-4 rounded-md bg-gray-50 p-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <StringInput
                            label="Username"
                            value={editForm.username}
                            onChange={(value) =>
                              setEditForm({ ...editForm, username: value })
                            }
                          />
                          <StringInput
                            label="Email"
                            type="email"
                            value={editForm.email}
                            onChange={(value) =>
                              setEditForm({ ...editForm, email: value })
                            }
                          />
                          <StringInput
                            label="Display Name"
                            value={editForm.displayName}
                            onChange={(value) =>
                              setEditForm({ ...editForm, displayName: value })
                            }
                          />
                          {isMain && (
                            <div className="space-y-1">
                              <label className="block text-sm font-bold text-gray-700">
                                Role
                              </label>
                              <select
                                value={editForm.role}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    role: e.target.value as AdminRole,
                                  })
                                }
                                className={selectClasses}
                              >
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          )}
                          <StringInput
                            label="New Password"
                            type="password"
                            placeholder="Leave blank to keep existing"
                            value={editForm.password}
                            onChange={(value) =>
                              setEditForm({ ...editForm, password: value })
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(account)}
                            disabled={isSavingEdit}
                            className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
                          >
                            {isSavingEdit ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-md bg-white px-3 py-1.5 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-8">
          <h4 className="text-sm font-bold text-gray-900">Add Account</h4>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <StringInput
              label="Username"
              value={createForm.username}
              onChange={(value) =>
                setCreateForm({ ...createForm, username: value })
              }
              required
            />
            <StringInput
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(value) =>
                setCreateForm({ ...createForm, email: value })
              }
              required
            />
            <StringInput
              label="Display Name"
              value={createForm.displayName}
              onChange={(value) =>
                setCreateForm({ ...createForm, displayName: value })
              }
            />
            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700">
                Role
              </label>
              <select
                value={isMain ? createForm.role : 'editor'}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    role: e.target.value as AdminRole,
                  })
                }
                className={selectClasses}
              >
                <option value="editor">Editor</option>
                {isMain && <option value="admin">Admin</option>}
              </select>
            </div>
            <StringInput
              label="Password"
              type="password"
              value={createForm.password}
              onChange={(value) =>
                setCreateForm({ ...createForm, password: value })
              }
              error={
                createForm.password && createForm.password.length < 8
                  ? 'Password should be at least 8 characters long'
                  : undefined
              }
              required
            />
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={createForm.mustChangePassword}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      mustChangePassword: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-600"
                />
                Require password change at first sign in
              </label>
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!createValid || isCreating}
              className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
