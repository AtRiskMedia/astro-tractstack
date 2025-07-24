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
  goBackend?: string;
  tenantId?: string;
  enableMultiTenant?: boolean;
  includeExamples?: boolean;
  theme?: {
    colorScheme: 'light' | 'dark' | 'auto';
    customCss?: string;
  };
  htmx?: {
    version: string;
    extensions: string[];
  };
  dev?: {
    debug: boolean;
  };
  isDev?: boolean;
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

export type Theme =
  | 'light'
  | 'light-bw'
  | 'light-bold'
  | 'dark'
  | 'dark-bw'
  | 'dark-bold';
export const themes: Theme[] = [
  'light',
  'light-bw',
  'light-bold',
  'dark',
  'dark-bw',
  'dark-bold',
];

export interface Topic {
  id: number;
  title: string;
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
  KNOWN_RESOURCES?: KnownResourcesConfig;
}

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
  knownResources: KnownResourcesConfig;
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

export interface AdvancedConfigStatus {
  tursoConfigured: boolean;
  tursoTokenSet: boolean;
  adminPasswordSet: boolean;
  editorPasswordSet: boolean;
  aaiAPIKeySet: boolean;
  tursoEnabled: boolean;
}

export interface AdvancedConfigState {
  tursoUrl: string;
  tursoToken: string;
  adminPassword: string;
  editorPassword: string;
  aaiApiKey: string;
}

export interface AdvancedConfigUpdateRequest {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  ADMIN_PASSWORD?: string;
  EDITOR_PASSWORD?: string;
  AAI_API_KEY?: string;
  HOME_SLUG?: string;
  TRACTSTACK_HOME_SLUG?: string;
}

export interface MenuNodeState {
  id: string;
  title: string;
  theme: string;
  menuLinks: MenuLinkState[];
}

export interface MenuLinkState {
  name: string;
  description: string;
  featured: boolean;
  actionLisp: string;
}

interface BaseTarget {
  name: string;
  description: string;
}

interface SimpleTarget extends BaseTarget {
  subcommands?: never;
  requiresParam?: never;
  paramLabel?: never;
  requiresSecondParam?: never;
  param2Label?: never;
  placeholder?: never;
}

interface SubcommandTarget extends BaseTarget {
  subcommands: string[];
  requiresParam?: never;
  paramLabel?: never;
  requiresSecondParam?: never;
  param2Label?: never;
  placeholder?: never;
}

interface SingleParamTarget extends BaseTarget {
  subcommands?: never;
  requiresParam: true;
  paramLabel: string;
  requiresSecondParam?: never;
  param2Label?: never;
  requiresThirdParam?: never;
  param3Label?: never;
  placeholder?: string;
}

interface DoubleParamTarget extends BaseTarget {
  subcommands?: never;
  requiresParam: true;
  paramLabel: string;
  requiresSecondParam: true;
  param2Label: string;
  requiresThirdParam?: boolean;
  param3Label?: string;
  placeholder?: never;
}

interface TripleParamTarget extends BaseTarget {
  subcommands?: never;
  requiresParam: true;
  paramLabel: string;
  requiresSecondParam: true;
  param2Label: string;
  requiresThirdParam: true;
  param3Label: string;
  placeholder?: never;
}

type TargetConfig =
  | SimpleTarget
  | SubcommandTarget
  | SingleParamTarget
  | DoubleParamTarget
  | TripleParamTarget;

export type GotoTargets = {
  [key: string]: TargetConfig;
};

export interface BeliefNode {
  id: string;
  title: string;
  slug: string;
  scale: string;
  customValues?: string[];
}

export interface BeliefNodeState {
  id: string;
  title: string;
  slug: string;
  scale: string;
  customValues: string[];
}

// Known Resources types
export interface FieldDefinition {
  type: string;
  optional: boolean;
  defaultValue?: any;
  belongsToCategory?: string;
  minNumber?: number;
  maxNumber?: number;
}

export interface KnownResourcesConfig {
  [categoryName: string]: {
    [fieldName: string]: FieldDefinition;
  };
}

export interface ResourceConfig {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  oneliner: string;
  optionsPayload: Record<string, any>; // Object, not JSON string
  actionLisp?: string;
}

export interface ResourceState {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  oneliner: string;
  optionsPayload: Record<string, any>;
  actionLisp?: string;
}

// Multi-tenant types following backend interfaces

export interface TenantProvisioningData {
  tenantId: string;
  adminPassword: string;
  name: string;
  email: string;
  tursoEnabled: boolean;
  tursoDatabaseURL?: string;
  tursoAuthToken?: string;
}

export interface TenantCapacity {
  currentCount: number;
  maxTenants: number;
  available: number;
  existingTenants: string[];
}

export interface TenantActivationRequest {
  token: string;
}

// Form state for tenant registration
export interface TenantRegistrationState {
  tenantId: string;
  adminPassword: string;
  name: string;
  email: string;
  tursoEnabled: boolean;
  tursoDatabaseURL: string;
  tursoAuthToken: string;
}
