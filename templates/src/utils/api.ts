// TractStack API Utilities
// Helper functions for communicating with the Go backend

import type { APIResponse, TractStackEvent } from '../types/tractstack.ts';

/**
 * Get environment variables (client-side safe)
 */
function getConfig() {
  return {
    goBackend: import.meta.env.PUBLIC_GO_BACKEND || 'http://127.0.0.1:8080',
    tenantId: import.meta.env.PUBLIC_TENANTID || 'default'
  };
}

/**
 * Base API client for TractStack Go backend
 */
export class TractStackAPI {
  private baseUrl: string;
  private tenantId: string;

  constructor(baseUrl?: string, tenantId?: string) {
    const config = getConfig();
    this.baseUrl = baseUrl || config.goBackend;
    this.tenantId = tenantId || config.tenantId;
  }

  /**
   * Make a request to the Go backend
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-TractStack-Tenant': this.tenantId,
    };

    try {
      const response = await fetch(url, {
        ...options,
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

  /**
   * GET request
   */
  async get<T = any>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Send tracking event
   */
  async trackEvent(event: TractStackEvent): Promise<APIResponse> {
    return this.post('/api/v1/events', {
      ...event,
      timestamp: event.timestamp || Date.now(),
    });
  }

  /**
   * Get content by slug
   */
  async getContent(slug: string): Promise<APIResponse> {
    return this.get(`/api/v1/content/${slug}`);
  }

  /**
   * Get fragment by ID
   */
  async getFragment(fragmentId: string): Promise<APIResponse> {
    return this.get(`/api/v1/fragments/${fragmentId}`);
  }
}

// Default API instance
export const api = new TractStackAPI();

/**
 * Helper function to handle API responses consistently
 */
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

/**
 * HTMX helper to set up default headers
 */
export function setupHTMXDefaults(): void {
  if (typeof window !== 'undefined' && window.htmx) {
    const config = getConfig();

    // Set up default headers for all HTMX requests
    document.body.addEventListener('htmx:configRequest', (event: any) => {
      event.detail.headers['X-TractStack-Tenant'] = config.tenantId;
    });

    // Handle errors consistently
    document.body.addEventListener('htmx:responseError', (event: any) => {
      console.error('HTMX Error:', event.detail);
    });

    // Add loading indicators
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

// Auto-setup HTMX defaults when this module is imported in the browser
if (typeof window !== 'undefined') {
  // Wait for HTMX to be available
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
