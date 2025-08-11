// templates/src/types/astro.d.ts

import type { FullContentMapItem } from './tractstack';
export {};

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

  interface Window {
    initAnalyticsTracking: (storyfragmentId?: string) => Promise<void>;
    htmx: any;
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
