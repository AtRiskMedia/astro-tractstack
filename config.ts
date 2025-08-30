import type { TractStackConfig } from '@/types/astro';

export interface AuthConfig {
  // Session configuration
  sessionTimeout?: number; // minutes, default: 120 (2 hours)
  enableAutoSession?: boolean; // default: true
  enableSSE?: boolean; // default: true

  // Cookie configuration
  cookiePath?: string; // default: '/'
  cookieSecure?: boolean; // default: false in dev, true in prod
  cookieSameSite?: 'strict' | 'lax' | 'none'; // default: 'lax'

  // Profile fast-pass
  enableFastPass?: boolean; // default: true
  fastPassStorageKey?: string; // default: 'tractstack_credentials'

  // Consent management
  requireConsent?: boolean; // default: false
  consentTimeout?: number; // days, default: 30

  // Debug options
  enableDebugMode?: boolean; // default: false (true in dev)
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug'; // default: 'warn'
}

export interface TractStackConfigWithAuth extends TractStackConfig {
  auth?: AuthConfig;
}

export interface TractStackConfigComplete extends TractStackConfig {
  auth: Required<AuthConfig>;
}

const defaultAuthConfig: Required<AuthConfig> = {
  sessionTimeout: 120, // 2 hours
  enableAutoSession: true,
  enableSSE: true,
  cookiePath: '/',
  cookieSecure: false, // Will be overridden based on environment
  cookieSameSite: 'lax',
  enableFastPass: true,
  fastPassStorageKey: 'tractstack_credentials',
  requireConsent: false,
  consentTimeout: 30, // 30 days
  enableDebugMode: false, // Will be overridden in dev
  logLevel: 'warn',
};

export function defineConfig(
  config: TractStackConfigWithAuth = {}
): TractStackConfigComplete {
  const isProduction = process.env.NODE_ENV === 'production';

  const authConfig: Required<AuthConfig> = {
    ...defaultAuthConfig,
    ...(config.auth || {}),
    // Override security settings based on environment
    cookieSecure: config.auth?.cookieSecure ?? isProduction,
    enableDebugMode: config.auth?.enableDebugMode ?? !isProduction,
  };

  return {
    ...config,
    auth: authConfig,
  };
}

export function validateAuthConfig(config: AuthConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate session timeout
  if (config.sessionTimeout !== undefined) {
    if (config.sessionTimeout < 1) {
      errors.push('sessionTimeout must be at least 1 minute');
    }
    if (config.sessionTimeout > 1440) {
      // 24 hours
      warnings.push('sessionTimeout > 24 hours may cause memory issues');
    }
  }

  // Validate consent timeout
  if (config.consentTimeout !== undefined) {
    if (config.consentTimeout < 1) {
      errors.push('consentTimeout must be at least 1 day');
    }
    if (config.consentTimeout > 365) {
      warnings.push(
        'consentTimeout > 365 days may not comply with privacy regulations'
      );
    }
  }

  // Validate cookie settings
  if (config.cookieSameSite === 'none' && !config.cookieSecure) {
    errors.push('cookieSameSite "none" requires cookieSecure to be true');
  }

  // Validate fast-pass settings
  if (config.enableFastPass && !config.fastPassStorageKey) {
    errors.push('fastPassStorageKey is required when enableFastPass is true');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Environment variable validation
export function getEnvironmentConfig(): {
  backendUrl: string;
  tenantId: string;
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const backendUrl = process.env.PUBLIC_GO_BACKEND || '';
  const tenantId = process.env.PUBLIC_TENANTID || '';

  if (!backendUrl) {
    errors.push('PUBLIC_GO_BACKEND environment variable is required');
  } else {
    try {
      new URL(backendUrl);
    } catch {
      errors.push('PUBLIC_GO_BACKEND must be a valid URL');
    }
  }

  if (!tenantId) {
    errors.push('PUBLIC_TENANTID environment variable is required');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    errors.push(
      'PUBLIC_TENANTID must contain only alphanumeric characters, hyphens, and underscores'
    );
  }

  return {
    backendUrl,
    tenantId,
    isValid: errors.length === 0,
    errors,
  };
}

// Helper to get runtime configuration for client-side
export function getClientConfig(config: TractStackConfigWithAuth): {
  backendUrl: string;
  tenantId: string;
  auth: Required<AuthConfig>;
  version: string;
} {
  const env = getEnvironmentConfig();

  if (!env.isValid) {
    throw new Error(
      `Invalid environment configuration: ${env.errors.join(', ')}`
    );
  }

  const mergedConfig = defineConfig(config);

  return {
    backendUrl: env.backendUrl,
    tenantId: env.tenantId,
    auth: mergedConfig.auth,
    version: '2.0.0',
  };
}

// Type exports
export type {
  TractStackConfigWithAuth as TractStackConfigExport,
  AuthConfig as AuthConfigExport,
};
