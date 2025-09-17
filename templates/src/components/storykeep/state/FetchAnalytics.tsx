import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters } from '@/stores/analytics';
import { TractStackAPI } from '@/utils/api';

const VERBOSE = false;

interface AnalyticsState {
  dashboard: any;
  leads: any;
  epinet: any;
  userCounts: any[];
  hourlyNodeActivity: any;
  isLoading: boolean;
  status: string;
  error: string | null;
}

interface FetchAnalyticsProps {
  onAnalyticsUpdate: (analytics: AnalyticsState) => void;
}

// Global singleton state to prevent multi-component conflicts
class AnalyticsService {
  private static instance: AnalyticsService;
  private isInitialized = false;
  private activeRequest: AbortController | null = null;
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 seconds
  private readonly DEBOUNCE_MS = 300;
  private debounceTimer: NodeJS.Timeout | null = null;
  private floodProtection = {
    requestCount: 0,
    windowStart: 0,
    isBlocked: false,
  };
  private readonly FLOOD_WINDOW_MS = 10000; // 10 seconds
  private readonly FLOOD_THRESHOLD = 5;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private getCacheKey(params: URLSearchParams): string {
    const sorted = new URLSearchParams([...params.entries()].sort());
    return sorted.toString();
  }

  private isFloodBlocked(): boolean {
    const now = Date.now();

    // Reset window if needed
    if (now - this.floodProtection.windowStart > this.FLOOD_WINDOW_MS) {
      this.floodProtection.requestCount = 0;
      this.floodProtection.windowStart = now;
      this.floodProtection.isBlocked = false;
    }

    // Check if blocked
    if (this.floodProtection.isBlocked) {
      if (VERBOSE) console.log('🚫 Request blocked by flood protection');
      return true;
    }

    // Increment counter and check threshold
    this.floodProtection.requestCount++;
    if (this.floodProtection.requestCount > this.FLOOD_THRESHOLD) {
      this.floodProtection.isBlocked = true;
      if (VERBOSE) console.log('🚨 Flood protection activated');

      // Auto-unblock after delay
      setTimeout(() => {
        this.floodProtection.isBlocked = false;
        if (VERBOSE) console.log('✅ Flood protection deactivated');
      }, 30000); // 30 second cooldown

      return true;
    }

    return false;
  }

  private getCachedResponse(cacheKey: string): any | null {
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      if (VERBOSE) console.log('📦 Using cached response');
      return cached.data;
    }
    return null;
  }

  private setCachedResponse(cacheKey: string, data: any): void {
    this.requestCache.set(cacheKey, { data, timestamp: Date.now() });

    // Cleanup old cache entries
    const cutoff = Date.now() - this.CACHE_TTL;
    for (const [key, value] of this.requestCache.entries()) {
      if (value.timestamp < cutoff) {
        this.requestCache.delete(key);
      }
    }
  }

  async fetchAnalytics(
    filters: any,
    onUpdate: (data: AnalyticsState) => void
  ): Promise<void> {
    // Flood protection
    if (this.isFloodBlocked()) {
      return;
    }

    try {
      // Cancel any existing request
      if (this.activeRequest) {
        this.activeRequest.abort();
        if (VERBOSE) console.log('🛑 Cancelled previous request');
      }

      // Create new abort controller
      this.activeRequest = new AbortController();

      // Build URL parameters
      const params = new URLSearchParams();
      if (filters.startTimeUTC && filters.endTimeUTC) {
        const now = new Date();
        const startTime = new Date(filters.startTimeUTC);
        const endTime = new Date(filters.endTimeUTC);

        const startHour = Math.ceil(
          (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        );
        const endHour = Math.floor(
          (now.getTime() - endTime.getTime()) / (1000 * 60 * 60)
        );

        params.append('startHour', startHour.toString());
        params.append('endHour', endHour.toString());
      }

      if (filters.visitorType)
        params.append('visitorType', filters.visitorType);
      if (filters.selectedUserId)
        params.append('userId', filters.selectedUserId);

      const cacheKey = this.getCacheKey(params);

      // Check cache first
      const cachedData = this.getCachedResponse(cacheKey);
      if (cachedData) {
        onUpdate(cachedData);
        return;
      }

      // Set loading state
      onUpdate({
        dashboard: null,
        leads: null,
        epinet: null,
        userCounts: [],
        hourlyNodeActivity: {},
        isLoading: true,
        status: 'loading',
        error: null,
      });

      // Make request using existing TractStackAPI
      const api = new TractStackAPI(
        window.TRACTSTACK_CONFIG?.tenantId || 'default'
      );
      const endpoint = `/api/v1/analytics/all${params.toString() ? `?${params.toString()}` : ''}`;

      if (VERBOSE) console.log('🔥 Making API request', { endpoint });

      const response = await api.get(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics data');
      }

      const data = response.data;

      // Check if data is still loading - implement polling logic
      const isStillLoading =
        data?.status === 'loading' ||
        data?.status === 'refreshing' ||
        data?.dashboard?.status === 'loading' ||
        data?.dashboard?.status === 'refreshing' ||
        data?.leads?.status === 'loading' ||
        data?.leads?.status === 'refreshing' ||
        data?.epinet?.status === 'loading' ||
        data?.epinet?.status === 'refreshing';

      if (isStillLoading) {
        if (VERBOSE) console.log('⏳ Backend data still loading, will poll...');

        // Update with partial data but keep loading state
        const partialAnalytics = {
          dashboard: data.dashboard,
          leads: data.leads,
          epinet: data.epinet,
          userCounts: data.userCounts || [],
          hourlyNodeActivity: data.hourlyNodeActivity || {},
          status: 'loading',
          error: null,
          isLoading: true,
        };

        onUpdate(partialAnalytics);

        // Schedule polling retry - use the cache key to prevent multiple polls
        const pollKey = `poll_${cacheKey}`;
        if (!this.requestCache.has(pollKey)) {
          this.requestCache.set(pollKey, { data: null, timestamp: Date.now() });

          setTimeout(() => {
            this.requestCache.delete(pollKey);
            // Clear the main cache entry to force fresh request
            this.requestCache.delete(cacheKey);
            // Retry the fetch
            this.fetchAnalytics(filters, onUpdate);
          }, 2000);
        }

        return;
      }

      // Process successful response
      const analyticsData = {
        dashboard: data.dashboard,
        leads: data.leads,
        epinet: data.epinet,
        userCounts: data.userCounts || [],
        hourlyNodeActivity: data.hourlyNodeActivity || {},
        status: 'complete',
        error: null,
        isLoading: false,
      };

      // Cache the response
      this.setCachedResponse(cacheKey, analyticsData);

      // Update caller
      onUpdate(analyticsData);

      if (VERBOSE) console.log('✅ Analytics request completed successfully');

      this.activeRequest = null;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (VERBOSE) console.log('🔄 Request aborted');
        return;
      }

      console.error('❌ Analytics fetch error:', error);

      onUpdate({
        dashboard: null,
        leads: null,
        epinet: null,
        userCounts: [],
        hourlyNodeActivity: {},
        status: 'error',
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        isLoading: false,
      });

      this.activeRequest = null;
    }
  }

  cleanup(): void {
    if (this.activeRequest) {
      this.activeRequest.abort();
      this.activeRequest = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  initializeFilters(tenantId: string): void {
    if (this.isInitialized) return;

    if (VERBOSE) console.log('🏁 Initializing analytics filters');

    const nowUTC = new Date();
    const oneWeekAgoUTC = new Date(nowUTC.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Only set if not already initialized to prevent store churn
    const current = epinetCustomFilters.get();
    if (!current.enabled) {
      epinetCustomFilters.set(tenantId, {
        enabled: true,
        visitorType: 'all',
        selectedUserId: null,
        startTimeUTC: oneWeekAgoUTC.toISOString(),
        endTimeUTC: nowUTC.toISOString(),
      });
    }

    this.isInitialized = true;
  }

  debouncedFetch(filters: any, onUpdate: (data: AnalyticsState) => void): void {
    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounced fetch
    this.debounceTimer = setTimeout(() => {
      this.fetchAnalytics(filters, onUpdate);
    }, this.DEBOUNCE_MS);
  }
}

export default function FetchAnalytics({
  onAnalyticsUpdate,
}: FetchAnalyticsProps) {
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const analyticsService = useRef(AnalyticsService.getInstance());
  const lastFiltersRef = useRef<string>('');

  if (VERBOSE) {
    console.log('🔄 FetchAnalytics render', {
      filters: {
        startTimeUTC: $epinetCustomFilters.startTimeUTC,
        endTimeUTC: $epinetCustomFilters.endTimeUTC,
        visitorType: $epinetCustomFilters.visitorType,
        selectedUserId: $epinetCustomFilters.selectedUserId,
      },
    });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      analyticsService.current.cleanup();
    };
  }, []);

  // Initialize filters once
  useEffect(() => {
    const tenantId = window.TRACTSTACK_CONFIG?.tenantId || 'default';
    analyticsService.current.initializeFilters(tenantId);
  }, []);

  // Debounced fetch when filters change
  useEffect(() => {
    if (
      !$epinetCustomFilters.enabled ||
      $epinetCustomFilters.visitorType === null ||
      $epinetCustomFilters.startTimeUTC === null ||
      $epinetCustomFilters.endTimeUTC === null
    ) {
      return;
    }

    // Create stable filter signature to prevent unnecessary fetches
    const filtersSignature = JSON.stringify({
      startTimeUTC: $epinetCustomFilters.startTimeUTC,
      endTimeUTC: $epinetCustomFilters.endTimeUTC,
      visitorType: $epinetCustomFilters.visitorType,
      selectedUserId: $epinetCustomFilters.selectedUserId,
    });

    // Skip if filters haven't actually changed
    if (filtersSignature === lastFiltersRef.current) {
      return;
    }

    lastFiltersRef.current = filtersSignature;

    if (VERBOSE) console.log('🔄 Filters changed, debouncing fetch');

    analyticsService.current.debouncedFetch(
      $epinetCustomFilters,
      onAnalyticsUpdate
    );
  }, [
    $epinetCustomFilters.enabled,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
    $epinetCustomFilters.startTimeUTC,
    $epinetCustomFilters.endTimeUTC,
    onAnalyticsUpdate,
  ]);

  return null;
}
