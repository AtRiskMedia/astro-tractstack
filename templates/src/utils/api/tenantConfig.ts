// Tenant configuration API utilities following TractStack v2 patterns
import { TractStackAPI } from '../api';
import type {
  TenantProvisioningData,
  TenantCapacity,
  TenantProvisioningResponse,
} from '@/types/multiTenant';
import type { TenantActivationRequest } from '@/types/multiTenant';

/**
 * Check tenant capacity and existing tenants
 */
export async function checkTenantCapacity(
  tenantId: string
): Promise<TenantCapacity> {
  const api = new TractStackAPI(tenantId);
  try {
    const response = await api.get<TenantCapacity>('/api/v1/tenant/capacity');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'No data received from server');
    }

    const data = response.data;

    // Validate response structure to match backend
    if (
      typeof data.available !== 'boolean' ||
      typeof data.currentTenants !== 'number' ||
      typeof data.maxTenants !== 'number' ||
      typeof data.availableSlots !== 'number'
    ) {
      throw new Error('Invalid response format from server');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch tenant capacity:', error);
    throw new Error('Failed to load tenant capacity information');
  }
}

/**
 * Provision a new tenant with reserved status
 */
export async function provisionTenant(
  tenantId: string,
  data: TenantProvisioningData
): Promise<TenantProvisioningResponse> {
  const api = new TractStackAPI(tenantId);
  try {
    const response = await api.post<TenantProvisioningResponse>(
      '/api/v1/tenant/provision',
      data
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to provision tenant');
    }

    return response.data;
  } catch (error) {
    console.error('Failed to provision tenant:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to provision tenant');
  }
}

/**
 * Activate a tenant using the activation token
 */
export async function activateTenant(
  tenantId: string,
  token: string
): Promise<void> {
  const api = new TractStackAPI(tenantId);
  try {
    const request: TenantActivationRequest = { token };
    const response = await api.post('/api/v1/activate-tenant', request);

    if (!response.success) {
      throw new Error(response.error || 'Failed to activate tenant');
    }
  } catch (error) {
    console.error('Failed to activate tenant:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to activate tenant');
  }
}
