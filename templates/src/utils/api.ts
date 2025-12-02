import type {
  DiscoverySuggestion,
  CategorizedResults,
} from '@/types/tractstack';

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
  };
}

export class TractStackAPI {
  private explicitTenantId?: string;
  constructor(tenantId?: string) {
    this.explicitTenantId = tenantId;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const config = getConfig();

    const effectiveTenantId = this.explicitTenantId;

    if (!effectiveTenantId) {
      console.error(
        '[TractStackAPI] CRITICAL ERROR: Tenant ID is required but was not provided to the constructor. Failing request.'
      );
      return {
        success: false,
        error: 'Tenant ID missing. Must be provided in constructor.',
      };
    }

    const baseUrl = config.goBackend;

    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': effectiveTenantId,
      ...(typeof window !== 'undefined' &&
        (window as any).TRACTSTACK_CONFIG?.sessionId && {
          'X-TractStack-Session-ID': (window as any).TRACTSTACK_CONFIG
            .sessionId,
        }),
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

  async put<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async trackEvent(event: TractStackEvent): Promise<APIResponse> {
    return this.post('/api/v1/events', {
      ...event,
      timestamp: event.timestamp || Date.now(),
    });
  }

  async discover(
    query: string
  ): Promise<APIResponse<{ suggestions: DiscoverySuggestion[] }>> {
    return this.get(`/api/v1/search/discover?q=${encodeURIComponent(query)}`);
  }

  async retrieve(
    term: string,
    isTopic: boolean = false
  ): Promise<APIResponse<CategorizedResults>> {
    return this.get(
      `/api/v1/search/retrieve?term=${encodeURIComponent(term)}&topic=${isTopic}`
    );
  }

  async getContent(slug: string): Promise<APIResponse> {
    return this.get(`/api/v1/content/${slug}`);
  }

  async getFragment(fragmentId: string): Promise<APIResponse> {
    return this.get(`/api/v1/fragments/${fragmentId}`);
  }

  async getContentMapWithTimestamp(
    lastUpdated?: number
  ): Promise<APIResponse<{ data: any[]; lastUpdated: number }>> {
    let endpoint = 'api/v1/content/full-map';
    if (lastUpdated) {
      endpoint += `?lastUpdated=${lastUpdated}`;
    }

    const response = await this.request(endpoint);
    return response as APIResponse<{ data: any[]; lastUpdated: number }>;
  }
}

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
