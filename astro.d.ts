/// <reference types="astro/client" />

import type { PlayerJS } from '@/types/tractstack';

declare module 'astro:transitions/client' {
  export function navigate(url: string): void;
}

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
      backendUrl: string;
      tenantId: string;
      sessionId: string;
      storyfragmentId: string;
      session?: {
        isReady: boolean;
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
