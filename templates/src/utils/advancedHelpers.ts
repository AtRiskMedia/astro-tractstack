import type {
  AdvancedConfigStatus,
  AdvancedConfigState,
  AdvancedConfigUpdateRequest,
  FieldErrors,
} from '../types/tractstack';

/**
 * Convert backend status response to local form state
 * Since backend only returns boolean flags, we use empty strings for form values
 */
export function convertToLocalState(
  status: AdvancedConfigStatus | null
): AdvancedConfigState {
  if (!status) {
    return {
      tursoUrl: '',
      tursoToken: '',
      adminPassword: '',
      editorPassword: '',
      aaiApiKey: '',
    };
  }

  // Convert boolean status to empty string form state
  // The form will show as "configured" or "not configured" based on boolean flags
  // but never expose actual values
  return {
    tursoUrl: '',
    tursoToken: '',
    adminPassword: '',
    editorPassword: '',
    aaiApiKey: '',
  };
}

/**
 * Convert local form state to backend update request format
 * Only include fields that have values (user has entered something)
 */
export function convertToBackendFormat(
  state: AdvancedConfigState
): AdvancedConfigUpdateRequest {
  const request: AdvancedConfigUpdateRequest = {};

  // Only include fields that have been filled in
  if (state.tursoUrl?.trim()) {
    request.TURSO_DATABASE_URL = state.tursoUrl.trim();
  }

  if (state.tursoToken?.trim()) {
    request.TURSO_AUTH_TOKEN = state.tursoToken.trim();
  }

  if (state.adminPassword?.trim()) {
    request.ADMIN_PASSWORD = state.adminPassword.trim();
  }

  if (state.editorPassword?.trim()) {
    request.EDITOR_PASSWORD = state.editorPassword.trim();
  }

  if (state.aaiApiKey?.trim()) {
    request.AAI_API_KEY = state.aaiApiKey.trim();
  }

  return request;
}

/**
 * Validate advanced configuration state
 */
export function validateAdvancedConfig(
  state: AdvancedConfigState
): FieldErrors {
  const errors: FieldErrors = {};

  // Turso validation: both URL and token must be provided together
  const hasTursoUrl = Boolean(state.tursoUrl?.trim());
  const hasTursoToken = Boolean(state.tursoToken?.trim());

  if (hasTursoUrl && !hasTursoToken) {
    errors.tursoToken =
      'Turso Auth Token is required when Turso URL is provided';
  }

  if (hasTursoToken && !hasTursoUrl) {
    errors.tursoUrl =
      'Turso Database URL is required when Turso Token is provided';
  }

  // Basic URL validation for Turso
  if (hasTursoUrl && state.tursoUrl) {
    const urlPattern = /^libsql:\/\/.+/;
    if (!urlPattern.test(state.tursoUrl.trim())) {
      errors.tursoUrl = 'Turso Database URL must start with "libsql://"';
    }
  }

  // Password strength validation (optional but recommended)
  if (state.adminPassword && state.adminPassword.length < 8) {
    errors.adminPassword =
      'Admin password should be at least 8 characters long';
  }

  if (state.editorPassword && state.editorPassword.length < 8) {
    errors.editorPassword =
      'Editor password should be at least 8 characters long';
  }

  return errors;
}

/**
 * State interceptor for advanced config form
 * This allows for custom logic when state changes
 */
export function advancedStateIntercept(
  newState: AdvancedConfigState,
  field: keyof AdvancedConfigState,
  value: any
): AdvancedConfigState {
  // Clear related field when one half of Turso config is cleared
  if (field === 'tursoUrl' && !value.trim()) {
    return { ...newState, tursoUrl: value, tursoToken: '' };
  }

  if (field === 'tursoToken' && !value.trim()) {
    return { ...newState, tursoToken: value, tursoUrl: '' };
  }

  // Default behavior - just update the field
  return newState;
}
