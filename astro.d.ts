/// <reference types="astro/client" />

import type { FullContentMapItem, PlayerJS } from './tractstack';

declare global {
  interface ImportMeta {
    env: {
      PUBLIC_GO_BACKEND?: string;
      PUBLIC_TENANTID?: string;
      PUBLIC_ENABLE_MULTI_TENANT?: string;
      DEV?: boolean;
      PROD?: boolean;
    };
  }

  interface Window {
    initAnalyticsTracking: (storyfragmentId?: string) => Promise<void>;
    htmx: any;
    playerjs: PlayerJS;
    TRACTSTACK_CONFIG: {
      configured: boolean;
      backendUrl: string;
      tenantId: string;
      sessionId: string;
      fontBasePath: string;
      storyfragmentId: string;
      session?: {
        isReady: boolean;
        fingerprint?: string;
        visitId?: string;
        hasProfile?: boolean;
        consent?: string;
      };
    };
    BELIEF_INITIALIZED?: boolean;
    SSE_INITIALIZED?: boolean;
    ANALYTICS_INITIALIZED?: boolean;
    HTMX_CONFIGURED?: boolean;
  }
}

declare namespace App {
  interface Locals {
    session?: Record<string, any>;
    fullContentMap?: FullContentMapItem[];
    tenant?: {
      id: string;
      domain: string | null;
      isMultiTenant: boolean;
      isLocalhost: boolean;
    };
  }
}

// Astro script attributes
declare global {
  namespace astroHTML.JSX {
    interface ScriptHTMLAttributes {
      'is:inline'?: boolean;
      'is:persist'?: boolean;
      'define:vars'?: Record<string, any>;
      crossorigin?: string;
    }
  }
}

export {};
