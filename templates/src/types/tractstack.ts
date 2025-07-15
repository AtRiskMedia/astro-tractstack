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

export interface MenuLink {
  name: string;
  description: string;
  featured: boolean;
  actionLisp: string;
}

export interface MenuNode {
  id: string;
  title: string;
  theme: string;
  optionsPayload: MenuLink[];
}

export interface FullContentMapItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  // Epinet specific
  promoted?: boolean;
  // Menu specific
  theme?: string;
  // Resource specific
  categorySlug?: string;
  // Pane specific
  isContext?: boolean;
  // StoryFragment specific
  parentId?: string;
  parentTitle?: string;
  parentSlug?: string;
  panes?: string[];
  socialImagePath?: string;
  thumbSrc?: string;
  thumbSrcSet?: string;
  description?: string;
  topics?: string[];
  changed?: string;
  // Belief specific
  scale?: string;
}

// Complete BrandConfig interface for templates/src/types/tractstack.ts
// This replaces the current partial BrandConfig interface

export interface BrandConfig {
  // Core site configuration
  SITE_INIT: boolean;
  WORDMARK_MODE: string;
  OPEN_DEMO: boolean;
  STYLES_VER: number;
  HOME_SLUG: string;
  TRACTSTACK_HOME_SLUG: string;
  THEME: string; // e.g., "light-bold"
  BRAND_COLOURS: string; // e.g., "10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3"
  SOCIALS: string; // e.g., "github|https://github.com/user,twitter|https://twitter.com/user"
  LOGO: string;
  WORDMARK: string;
  FAVICON: string;
  SITE_URL: string;
  SLOGAN: string;
  FOOTER: string;
  OG: string;
  OGLOGO: string;
  OGTITLE: string;
  OGAUTHOR: string;
  OGDESC: string;
  LOGO_BASE64?: string;
  WORDMARK_BASE64?: string;
  OG_BASE64?: string;
  OGLOGO_BASE64?: string;
  FAVICON_BASE64?: string;
  GTAG: string;
}

// Local state interface for form handling
// Uses simplified types (arrays instead of CSV strings) for easier client-side manipulation
export interface BrandConfigState {
  // Core site configuration
  siteInit: boolean;
  wordmarkMode: string;
  openDemo: boolean;
  stylesVer: number;
  homeSlug: string;
  tractstackHomeSlug: string;
  theme: string;
  brandColours: string[]; // ["10120d", "fcfcfc", "f58333", "c8df8c", "293f58", "a7b1b7", "393d34", "e3e3e3"]
  socials: string[]; // ["github|https://github.com/user", "twitter|https://twitter.com/user"]
  logo: string;
  wordmark: string;
  favicon: string;
  siteUrl: string;
  slogan: string;
  footer: string;
  og: string;
  oglogo: string;
  ogtitle: string;
  ogauthor: string;
  ogdesc: string;
  logoBase64?: string;
  wordmarkBase64?: string;
  ogBase64?: string;
  oglogoBase64?: string;
  faviconBase64?: string;
  gtag: string;
}

// Form validation types
export interface FieldErrors {
  [key: string]: string;
}

// Form state management types
export interface FormStateConfig<T> {
  initialData: T;
  validator?: (state: T) => FieldErrors;
  interceptor?: (newState: T, field: keyof T, value: any) => T;
  onSave: (data: T) => void;
}

export interface FormStateReturn<T> {
  state: T;
  originalState: T;
  updateField: (field: keyof T, value: any) => void;
  save: () => void;
  cancel: () => void;
  isDirty: boolean;
  isValid: boolean;
  errors: FieldErrors;
}
