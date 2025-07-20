// Tenant form validation and state helpers following TractStack v2 patterns
import type { TenantProvisioningData } from '@/types/multiTenant';
import type {
  TenantRegistrationState,
  TenantValidationErrors,
} from '@/types/multiTenant';

/**
 * Convert tenant provisioning data to local form state
 */
export function convertToLocalState(
  data?: TenantProvisioningData
): TenantRegistrationState {
  if (!data) {
    return {
      tenantId: '',
      adminPassword: '',
      name: '',
      email: '',
      tursoEnabled: false,
      tursoDatabaseURL: '',
      tursoAuthToken: '',
    };
  }

  return {
    tenantId: data.tenantId,
    adminPassword: data.adminPassword,
    name: data.name,
    email: data.email,
    tursoEnabled: data.tursoEnabled,
    tursoDatabaseURL: data.tursoDatabaseURL || '',
    tursoAuthToken: data.tursoAuthToken || '',
  };
}

/**
 * Convert local form state to backend format
 */
export function convertToBackendFormat(
  state: TenantRegistrationState
): TenantProvisioningData {
  const data: TenantProvisioningData = {
    tenantId: state.tenantId.trim(),
    adminPassword: state.adminPassword.trim(),
    name: state.name.trim(),
    email: state.email.trim(),
    tursoEnabled: state.tursoEnabled,
  };

  // Only include Turso credentials if enabled
  if (state.tursoEnabled) {
    data.tursoDatabaseURL = state.tursoDatabaseURL.trim();
    data.tursoAuthToken = state.tursoAuthToken.trim();
  }

  return data;
}

/**
 * Validate tenant registration form
 */
export function validateTenantRegistration(
  state: TenantRegistrationState,
  existingTenants?: string[]
): TenantValidationErrors {
  const errors: TenantValidationErrors = {};

  // Tenant ID validation (matches backend ValidateTenantID)
  const tenantId = state.tenantId.trim();
  if (!tenantId) {
    errors.tenantId = 'Tenant ID is required';
  } else if (tenantId.length < 3 || tenantId.length > 12) {
    errors.tenantId = 'Tenant ID must be 3-12 characters long';
  } else if (tenantId !== tenantId.toLowerCase()) {
    errors.tenantId = 'Tenant ID must be lowercase';
  } else if (!/^[a-z0-9-]+$/.test(tenantId)) {
    errors.tenantId =
      'Tenant ID can only contain lowercase letters, numbers, and dashes';
  } else if (tenantId === 'default') {
    errors.tenantId = "'default' is a reserved tenant ID";
  } else if (existingTenants && existingTenants.includes(tenantId)) {
    errors.tenantId = 'This tenant ID is already taken';
  }

  // Admin password validation
  if (!state.adminPassword.trim()) {
    errors.adminPassword = 'Admin password is required';
  } else if (state.adminPassword.length < 8) {
    errors.adminPassword = 'Admin password must be at least 8 characters long';
  }

  // Name validation
  if (!state.name.trim()) {
    errors.name = 'Name is required';
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!state.email.trim()) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(state.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  // Turso validation (if enabled)
  if (state.tursoEnabled) {
    if (!state.tursoDatabaseURL.trim()) {
      errors.tursoDatabaseURL =
        'Turso Database URL is required when Turso is enabled';
    } else if (!state.tursoDatabaseURL.startsWith('libsql://')) {
      errors.tursoDatabaseURL =
        'Turso Database URL must start with "libsql://"';
    }

    if (!state.tursoAuthToken.trim()) {
      errors.tursoAuthToken =
        'Turso Auth Token is required when Turso is enabled';
    }
  }

  return errors;
}

/**
 * State interceptor for cross-field logic
 */
export function tenantStateIntercept(
  newState: TenantRegistrationState,
  field: keyof TenantRegistrationState,
  value: any
): TenantRegistrationState {
  // Clear Turso fields when disabled
  if (field === 'tursoEnabled' && !value) {
    return {
      ...newState,
      tursoEnabled: false,
      tursoDatabaseURL: '',
      tursoAuthToken: '',
    };
  }

  // Normalize tenant ID
  if (field === 'tenantId' && typeof value === 'string') {
    return {
      ...newState,
      tenantId: value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    };
  }

  // Default behavior
  return newState;
}
