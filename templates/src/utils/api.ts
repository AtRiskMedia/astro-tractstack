// Template file - will be injected into user projects
// Do not use relative imports here as this gets copied

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TractStackEvent {
  type: 'page_view' | 'click' | 'form_submit' | 'custom';
  target?: string;
  data?: Record<string, any>;
  timestamp?: number;
  sessionId?: string;
  userId?: string;
}

function getConfig() {
  return {
    goBackend: import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080',
    tenantId: import.meta.env.PUBLIC_TENANTID || 'default'
  };
}

function getTenantFromDomain(): string {
  if (typeof window === 'undefined') return 'default';

  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }

  const parts = hostname.split('.');
  if (parts.length >= 4 &&
    parts[1] === 'sandbox' &&
    ['tractstack', 'freewebpress'].includes(parts[2]) &&
    parts[3] === 'com') {
    return parts[0];
  }

  return 'default';
}

export class TractStackAPI {
  private baseUrl: string;
  private tenantId: string;

  constructor(baseUrl?: string, tenantId?: string) {
    const config = getConfig();
    this.baseUrl = baseUrl || config.goBackend;
    this.tenantId = tenantId || getTenantFromDomain() || config.tenantId;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.tenantId,
    };

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          data: data.data,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T = any>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async trackEvent(event: TractStackEvent): Promise<APIResponse> {
    return this.post('/api/v1/events', {
      ...event,
      timestamp: event.timestamp || Date.now(),
    });
  }

  async getContent(slug: string): Promise<APIResponse> {
    return this.get(`/api/v1/content/${slug}`);
  }

  async getFragment(fragmentId: string): Promise<APIResponse> {
    return this.get(`/api/v1/fragments/${fragmentId}`);
  }

  getTenantId(): string {
    return this.tenantId;
  }

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }
}

export const api = new TractStackAPI();

export function handleAPIResponse<T>(
  response: APIResponse<T>,
  onSuccess?: (data: T) => void,
  onError?: (error: string) => void
): boolean {
  if (response.success && response.data) {
    onSuccess?.(response.data);
    return true;
  } else {
    const error = response.error || 'Unknown error occurred';
    onError?.(error);
    console.error('TractStack API Error:', error);
    return false;
  }
}

export function setupHTMXDefaults(): void {
  if (typeof window !== 'undefined' && window.htmx) {
    const tenantId = getTenantFromDomain() || getConfig().tenantId;

    document.body.addEventListener('htmx:configRequest', (event: any) => {
      event.detail.headers['X-Tenant-ID'] = tenantId;
    });

    document.body.addEventListener('htmx:responseError', (event: any) => {
      console.error('HTMX Error:', event.detail);
    });

    document.body.addEventListener('htmx:beforeRequest', (event: any) => {
      const target = event.target;
      target.classList.add('htmx-loading');
    });

    document.body.addEventListener('htmx:afterRequest', (event: any) => {
      const target = event.target;
      target.classList.remove('htmx-loading');
    });
  }
}

declare global {
  interface Window {
    htmx: any;
  }

  namespace ImportMeta {
    interface Env {
      PUBLIC_GO_BACKEND?: string;
      PUBLIC_TENANTID?: string;
      DEV?: boolean;
    }
  }
}

if (typeof window !== 'undefined') {
  if (window.htmx) {
    setupHTMXDefaults();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.htmx) {
        setupHTMXDefaults();
      }
    });
  }
}
