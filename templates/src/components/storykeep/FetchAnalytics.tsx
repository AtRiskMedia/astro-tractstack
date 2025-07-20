import { useEffect, useCallback, useRef } from 'react';
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

export default function FetchAnalytics({
  onAnalyticsUpdate,
}: FetchAnalyticsProps) {
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const isInitialized = useRef<boolean>(false);
  const isInitializing = useRef<boolean>(false);
  const fetchCount = useRef<number>(0);

  if (VERBOSE)
    console.log('🔄 FetchAnalytics RENDER', {
      renderCount: ++fetchCount.current,
      filters: {
        startTimeUTC: $epinetCustomFilters.startTimeUTC,
        endTimeUTC: $epinetCustomFilters.endTimeUTC,
        visitorType: $epinetCustomFilters.visitorType,
        selectedUserId: $epinetCustomFilters.selectedUserId,
      },
      isInitialized: isInitialized.current,
      storeObjectRef: $epinetCustomFilters,
    });

  // Fetch all analytics data
  const fetchAllAnalytics = useCallback(async () => {
    if (VERBOSE)
      console.log('🚀 fetchAllAnalytics CALLED', {
        timestamp: new Date().toISOString(),
        filters: {
          startTimeUTC: $epinetCustomFilters.startTimeUTC,
          endTimeUTC: $epinetCustomFilters.endTimeUTC,
          visitorType: $epinetCustomFilters.visitorType,
          selectedUserId: $epinetCustomFilters.selectedUserId,
        },
      });

    try {
      // Set loading state
      if (VERBOSE) console.log('📤 Setting loading state');
      onAnalyticsUpdate({
        dashboard: null,
        leads: null,
        epinet: null,
        userCounts: [],
        hourlyNodeActivity: {},
        isLoading: true,
        status: 'loading',
        error: null,
      });

      const { startTimeUTC, endTimeUTC, visitorType, selectedUserId } =
        $epinetCustomFilters;

      // Build URL parameters for TractStackAPI
      const params = new URLSearchParams();

      if (startTimeUTC && endTimeUTC) {
        // Convert UTC timestamps to hours-back integers (what backend expects)
        const now = new Date();
        const startTime = new Date(startTimeUTC);
        const endTime = new Date(endTimeUTC);

        const startHour = Math.ceil(
          (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        );
        const endHour = Math.floor(
          (now.getTime() - endTime.getTime()) / (1000 * 60 * 60)
        );

        params.append('startHour', startHour.toString());
        params.append('endHour', endHour.toString());

        if (VERBOSE)
          console.log('⏰ Time calculations', {
            now: now.toISOString(),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            startHour,
            endHour,
          });
      }

      if (visitorType) params.append('visitorType', visitorType);
      if (selectedUserId) params.append('userId', selectedUserId);

      // Use TractStackAPI
      const api = new TractStackAPI(
        window.TRACTSTACK_CONFIG?.tenantId || 'default'
      );
      const endpoint = `/api/v1/analytics/all${params.toString() ? `?${params.toString()}` : ''}`;

      if (VERBOSE) console.log('📡 Making API request', { endpoint });
      const response = await api.get(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics data');
      }

      const data = response.data;
      if (VERBOSE)
        console.log('✅ API response received', {
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : [],
          userCountsLength: data?.userCounts?.length || 0,
          hasHourlyNodeActivity: !!data?.hourlyNodeActivity,
        });

      const newAnalytics = {
        dashboard: data.dashboard,
        leads: data.leads,
        epinet: data.epinet,
        userCounts: data.userCounts || [],
        hourlyNodeActivity: data.hourlyNodeActivity || {},
        status: 'complete',
        error: null,
        isLoading: false,
      };

      if (VERBOSE) console.log('📤 Calling onAnalyticsUpdate');
      onAnalyticsUpdate(newAnalytics);

      // Update epinetCustomFilters with additional data from response
      if (VERBOSE)
        console.log('🔄 BEFORE store update', {
          currentStoreRef: epinetCustomFilters.get(),
          aboutToSet: {
            userCounts: data.userCounts?.length || 0,
            hourlyNodeActivity: !!data.hourlyNodeActivity,
          },
        });

      const current = epinetCustomFilters.get();
      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
        ...current,
        userCounts: data.userCounts || [],
        hourlyNodeActivity: data.hourlyNodeActivity || {},
      });

      if (VERBOSE)
        console.log('✅ AFTER store update', {
          newStoreRef: epinetCustomFilters.get(),
        });
    } catch (error) {
      console.error('❌ Analytics fetch error:', error);
      onAnalyticsUpdate({
        dashboard: null,
        leads: null,
        epinet: null,
        userCounts: [],
        hourlyNodeActivity: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        isLoading: false,
      });
    }
  }, [onAnalyticsUpdate]);

  if (VERBOSE) console.log('🔄 fetchAllAnalytics callback recreated');

  // Initialize filters
  useEffect(() => {
    if (VERBOSE)
      console.log('🏁 Initialize effect running', {
        isInitialized: isInitialized.current,
        isInitializing: isInitializing.current,
      });

    if (!isInitialized.current && !isInitializing.current) {
      if (VERBOSE) console.log('🚀 INITIALIZING filters');
      isInitializing.current = true;

      const nowUTC = new Date();
      const oneMonthAgoUTC = new Date(
        nowUTC.getTime() - 28 * 24 * 60 * 60 * 1000
      );

      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
        enabled: true,
        visitorType: 'all',
        selectedUserId: null,
        startTimeUTC: oneMonthAgoUTC.toISOString(),
        endTimeUTC: nowUTC.toISOString(),
        userCounts: [],
        hourlyNodeActivity: {},
      });

      isInitialized.current = true;
      isInitializing.current = false;
      if (VERBOSE) console.log('✅ Filters initialized');
    }
  }, []);

  // REACTIVE FETCH: Only fetch when filters change AFTER initialization
  useEffect(() => {
    if (VERBOSE)
      console.log('🎯 REACTIVE FETCH useEffect triggered', {
        startTimeUTC: $epinetCustomFilters.startTimeUTC,
        endTimeUTC: $epinetCustomFilters.endTimeUTC,
        visitorType: $epinetCustomFilters.visitorType,
        selectedUserId: $epinetCustomFilters.selectedUserId,
        isInitialized: isInitialized.current,
      });

    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;

    // Only fetch if we're initialized and have valid date range
    if (isInitialized.current && startTimeUTC && endTimeUTC) {
      if (VERBOSE) console.log('✅ Conditions met, calling fetchAllAnalytics');
      fetchAllAnalytics();
    } else {
      if (VERBOSE)
        console.log('❌ Conditions NOT met', {
          isInitialized: isInitialized.current,
          hasStartTime: !!startTimeUTC,
          hasEndTime: !!endTimeUTC,
        });
    }
  }, [
    $epinetCustomFilters.startTimeUTC,
    $epinetCustomFilters.endTimeUTC,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
  ]);

  return null;
}
