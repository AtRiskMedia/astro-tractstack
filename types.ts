// Core TractStack configuration
export interface TractStackConfig {
  /** Custom theme configuration */
  theme?: ThemeConfig;

  /** HTMX configuration */
  htmx?: HTMXConfig;

  /** Development configuration */
  dev?: DevConfig;
}

export interface ThemeConfig {
  /** Color scheme */
  colorScheme?: 'light' | 'dark' | 'auto';

  /** Custom CSS file path */
  customCss?: string;
}

export interface HTMXConfig {
  /** HTMX version to use */
  version?: string;

  /** Additional HTMX extensions to load */
  extensions?: string[];
}

export interface DevConfig {
  /** Show debug information */
  debug?: boolean;
}

// Runtime configuration (from .env and user config)
export interface TractStackRuntimeConfig extends Required<TractStackConfig> {
  /** Go backend URL from PRIVATE_GO_BACKEND */
  goBackend: string;

  /** Tenant ID from PRIVATE_TENANTID */
  tenantId: string;

  /** Whether we're in development mode */
  isDev: boolean;
}

// Base component props
export interface BaseComponentProps {
  /** Additional CSS classes */
  class?: string;

  /** Inline styles */
  style?: string;
}

// HTMX-specific types
export interface HTMXAttributes {
  'hx-get'?: string;
  'hx-post'?: string;
  'hx-target'?: string;
  'hx-swap'?: string;
  'hx-trigger'?: string;
  [key: `hx-${string}`]: string | undefined;
}

// API Response types (matching Go backend)
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Setup wizard types
export interface SetupOptions {
  /** Go backend URL */
  goBackend: string;

  /** Tenant ID */
  tenantId: string;

  /** Color scheme preference */
  colorScheme: 'light' | 'dark' | 'auto';
}
