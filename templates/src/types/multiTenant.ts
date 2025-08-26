export interface TenantProvisioningData {
  tenantId: string;
  adminPassword: string;
  name: string;
  adminEmail: string;
  tursoEnabled: boolean;
  tursoDatabaseURL?: string;
  tursoAuthToken?: string;
}

export interface TenantCapacity {
  available: boolean;
  currentTenants: number;
  maxTenants: number;
  availableSlots: number;
}

export interface ActivationRequest {
  token: string;
}

export interface TenantActivationRequest {
  token: string;
}

export interface TenantProvisioningResponse {
  message: string;
  token: string;
}

export interface TenantRegistrationState {
  tenantId: string;
  adminPassword: string;
  confirmPassword: string;
  name: string;
  email: string;
  tursoEnabled: boolean;
  tursoDatabaseURL: string;
  tursoAuthToken: string;
}

export interface TenantValidationErrors {
  [key: string]: string;
}

// Validation functions matching backend
export function validateTenantId(tenantId: string): {
  valid: boolean;
  error?: string;
} {
  // Must be 3-12 characters
  if (tenantId.length < 3 || tenantId.length > 12) {
    return { valid: false, error: 'Tenant ID must be 3-12 characters long' };
  }

  // Must be lowercase
  if (tenantId !== tenantId.toLowerCase()) {
    return { valid: false, error: 'Tenant ID must be lowercase' };
  }

  // Only alphanumeric and dashes
  const validPattern = /^[a-z0-9-]+$/;
  if (!validPattern.test(tenantId)) {
    return {
      valid: false,
      error:
        'Tenant ID can only contain lowercase letters, numbers, and dashes',
    };
  }

  // Cannot be "default" (reserved)
  if (tenantId === 'default') {
    return { valid: false, error: "'default' is a reserved tenant ID" };
  }

  return { valid: true };
}
