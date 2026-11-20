import { TractStackAPI } from '../api';
import type { AdminAccount, AdminRole } from '@/types/tractstack';

export interface CreateAdminRequest {
  username: string;
  email: string;
  displayName?: string;
  role: AdminRole;
  password: string;
  mustChangePassword?: boolean;
}

export interface UpdateAdminRequest {
  username?: string;
  email?: string;
  displayName?: string;
  role?: AdminRole;
  password?: string;
}

export interface UpdateMeRequest {
  displayName?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * List admin/editor accounts for the tenant
 */
export async function listAdmins(tenantId: string): Promise<AdminAccount[]> {
  const api = new TractStackAPI(tenantId);
  const response = await api.get<{ admins: AdminAccount[] }>('/api/v1/admins');
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load accounts');
  }
  return response.data.admins || [];
}

export async function createAdmin(
  tenantId: string,
  payload: CreateAdminRequest
): Promise<AdminAccount> {
  const api = new TractStackAPI(tenantId);
  const response = await api.post<AdminAccount>('/api/v1/admins', payload);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create account');
  }
  return response.data;
}

export async function updateAdmin(
  tenantId: string,
  id: string,
  payload: UpdateAdminRequest
): Promise<AdminAccount> {
  const api = new TractStackAPI(tenantId);
  const response = await api.put<AdminAccount>(
    `/api/v1/admins/${encodeURIComponent(id)}`,
    payload
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to update account');
  }
  return response.data;
}

export async function deleteAdmin(tenantId: string, id: string): Promise<void> {
  const api = new TractStackAPI(tenantId);
  const response = await api.request(
    `/api/v1/admins/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete account');
  }
}

export async function getMe(tenantId: string): Promise<AdminAccount> {
  const api = new TractStackAPI(tenantId);
  const response = await api.get<any>('/api/v1/auth/me');
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load account');
  }
  const data = response.data;
  return {
    id: data.sub || data.id || '',
    username: data.username || '',
    email: data.email || '',
    displayName: data.displayName || '',
    role: data.role,
    isMain: data.isMain === true,
    mustChangePassword: data.mustChangePassword === true,
  };
}

export async function updateMe(
  tenantId: string,
  payload: UpdateMeRequest
): Promise<void> {
  const api = new TractStackAPI(tenantId);
  const response = await api.put('/api/v1/auth/me', payload);
  if (!response.success) {
    throw new Error(response.error || 'Failed to update account');
  }
}

export async function changePassword(
  tenantId: string,
  payload: ChangePasswordRequest
): Promise<void> {
  const api = new TractStackAPI(tenantId);
  const response = await api.post('/api/v1/auth/password', payload);
  if (!response.success) {
    throw new Error(response.error || 'Failed to change password');
  }
}

export async function deleteMe(tenantId: string): Promise<void> {
  const api = new TractStackAPI(tenantId);
  const response = await api.request('/api/v1/auth/me', { method: 'DELETE' });
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete account');
  }
}
