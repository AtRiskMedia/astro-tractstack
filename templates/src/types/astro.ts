export interface AstroIntegration {
  name: string;
  hooks: {
    'astro:config:setup'?: (params: {
      config: any;
      updateConfig: (config: any) => void;
      logger: AstroIntegrationLogger;
    }) => void | Promise<void>;
    [key: string]: any;
  };
}

export interface AstroIntegrationLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
}

export interface APIRoute {
  (context: APIContext): Response | Promise<Response>;
}

export interface APIContext {
  cookies: any;
  params: Record<string, string | undefined>;
  request: Request;
  site?: URL;
  generator: string;
  props: Record<string, any>;
  redirect: (path: string, status?: number) => Response;
  url: URL;
  clientAddress: string;
  locals: {
    tenant?: {
      id: string;
      domain: string | null;
      isMultiTenant: boolean;
      isLocalhost: boolean;
    };
  };
}

export interface AstroGlobal {
  cookies: any;
  params: Record<string, string | undefined>;
  request: Request;
  site?: URL;
  generator: string;
  props: Record<string, any>;
  redirect: (path: string, status?: number) => Response;
  url: URL;
  clientAddress: string;
  locals: {
    tenant?: {
      id: string;
      domain: string | null;
      isMultiTenant: boolean;
      isLocalhost: boolean;
    };
  };
}

export interface MiddlewareNext {
  (): Response | Promise<Response>;
}

// TractStack specific types
export interface TractStackConfig {
  includeExamples?: boolean;
  enableMultiTenant?: boolean;
  [key: string]: any;
}

declare global {
  namespace App {
    interface Locals {
      tenant?: {
        id: string;
        domain: string | null;
        isMultiTenant: boolean;
        isLocalhost: boolean;
      };
    }
  }
}
