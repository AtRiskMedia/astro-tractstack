// TractStack Types
// Common types for TractStack components and utilities

// Base component props that all TractStack components should support
export interface BaseComponentProps {
  /** Additional CSS classes */
  class?: string;

  /** Inline styles */
  style?: React.CSSProperties | string;

  /** Component ID */
  id?: string;
}

// HTMX-specific attributes for components
export interface HTMXAttributes {
  'hx-get'?: string;
  'hx-post'?: string;
  'hx-put'?: string;
  'hx-delete'?: string;
  'hx-target'?: string;
  'hx-swap'?: string;
  'hx-trigger'?: string;
  'hx-vals'?: string;
  'hx-headers'?: string;
  [key: `hx-${string}`]: string | undefined;
}

// API Response structure from Go backend
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// Content structure from Go backend
export interface ContentResponse {
  id: string;
  title: string;
  description?: string;
  html?: string;
  fragments?: FragmentReference[];
  metadata?: Record<string, any>;
}

// Fragment reference
export interface FragmentReference {
  id: string;
  type: string;
  lazy?: boolean;
}

// Configuration from virtual module
export interface TractStackConfig {
  goBackend: string;
  tenantId: string;
  theme: {
    colorScheme: 'light' | 'dark' | 'auto';
    customCss?: string;
  };
  htmx: {
    version: string;
    extensions: string[];
  };
  dev: {
    debug: boolean;
  };
  isDev: boolean;
}

// Event types for tracking and analytics
export interface TractStackEvent {
  type: string;
  target?: string;
  data?: Record<string, any>;
  timestamp?: number;
}

// Fragment component props
export interface FragmentProps
  extends BaseComponentProps,
    Partial<HTMXAttributes> {
  /** Fragment ID */
  fragmentId?: string;

  /** Whether to load fragment immediately */
  eager?: boolean;

  /** Fallback content while loading */
  fallback?: React.ReactNode;
}

// Utility type for extracting props from Astro components
export type AstroComponentProps<T> = T extends (props: infer P) => any
  ? P
  : never;

// StoryFragment types matching Go backend
export interface StoryFragmentNode {
  id: string;
  title: string;
  slug: string;
  tractStackId: string;
  menuId?: string;
  paneIds: string[];
  tailwindBgColour?: string;
  socialImagePath?: string;
  codeHookTargets?: Record<string, string>; // paneId -> codeHookTarget
  isHome: boolean;
  created: string;
  changed?: string;
}

// CodeHook execution data
export interface CodeHookData {
  paneId: string;
  target: string;
  payload?: Record<string, string>;
}
