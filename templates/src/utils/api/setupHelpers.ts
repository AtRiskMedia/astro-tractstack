import { TractStackAPI } from '@/utils/api';

export interface SetupWizardState {
  email: string;
  adminPassword: string;
  confirmPassword: string;
  tursoEnabled: boolean;
  tursoDatabaseURL: string;
  tursoAuthToken: string;
}

export const initialSetupState: SetupWizardState = {
  email: '',
  adminPassword: '',
  confirmPassword: '',
  tursoEnabled: false,
  tursoDatabaseURL: '',
  tursoAuthToken: '',
};

/**
 * State interceptor (Preserving existing UI patterns)
 */
export function setupStateIntercept(
  newState: SetupWizardState,
  field: keyof SetupWizardState,
  value: any
): SetupWizardState {
  // Pattern: Clear Turso fields when disabled
  if (field === 'tursoEnabled' && !value) {
    return {
      ...newState,
      tursoEnabled: false,
      tursoDatabaseURL: '',
      tursoAuthToken: '',
    };
  }

  // Pattern: Clear confirmation password when main password changes
  if (field === 'adminPassword') {
    return {
      ...newState,
      adminPassword: value,
      confirmPassword: '',
    };
  }

  return newState;
}

/**
 * Validation Logic (Preserving existing Regex and Rules)
 */
export function validateSetup(state: SetupWizardState): Record<string, string> {
  const errors: Record<string, string> = {};

  // Email Validation pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!state.email.trim()) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(state.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  // Password Validation pattern
  if (!state.adminPassword.trim()) {
    errors.adminPassword = 'Admin password is required';
  } else if (state.adminPassword.length < 8) {
    errors.adminPassword = 'Admin password must be at least 8 characters long';
  }

  // Confirmation Pattern
  if (!errors.adminPassword && state.adminPassword !== state.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Turso Validation Pattern
  if (state.tursoEnabled) {
    if (!state.tursoDatabaseURL.trim()) {
      errors.tursoDatabaseURL = 'Turso Database URL is required';
    } else if (!state.tursoDatabaseURL.startsWith('libsql://')) {
      errors.tursoDatabaseURL =
        'Turso Database URL must start with "libsql://"';
    }

    if (!state.tursoAuthToken.trim()) {
      errors.tursoAuthToken = 'Turso Auth Token is required';
    }
  }

  return errors;
}

/**
 * API Call (Preserving Payload Structure)
 */
export async function initializeSystem(state: SetupWizardState): Promise<void> {
  const api = new TractStackAPI('default');

  const payload = {
    adminEmail: state.email.trim(),
    adminPassword: state.adminPassword.trim(),
    ...(state.tursoEnabled && {
      tursoDatabaseURL: state.tursoDatabaseURL.trim(),
      tursoAuthToken: state.tursoAuthToken.trim(),
    }),
  };

  const response = await api.post('/api/v1/setup/initialize', payload);

  if (!response.success) {
    throw new Error(response.error || 'Setup failed');
  }
}
