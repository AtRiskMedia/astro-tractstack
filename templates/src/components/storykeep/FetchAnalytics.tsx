import { useEffect, useCallback, useRef, useState } from 'react';
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

  // Add polling state
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);
  const MAX_POLLING_ATTEMPTS = 3;
  const POLLING_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s
  const MAX_POLLING_TIME = 30000; // 30 seconds total max

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

  // Clear polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
      }
    };
  }, [pollingTimer]);

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
      // Clear existing timer
      if (pollingTimer) {
        clearTimeout(pollingTimer);
        setPollingTimer(null);
      }

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

      // Check if data is still loading - add polling logic here
      const isStillLoading =
        data?.status === 'loading' ||
        data?.status === 'refreshing' ||
        data?.dashboard?.status === 'loading' ||
        data?.dashboard?.status === 'refreshing' ||
        data?.leads?.status === 'loading' ||
        data?.leads?.status === 'refreshing' ||
        data?.epinet?.status === 'loading' ||
        data?.epinet?.status === 'refreshing';

      if (VERBOSE) {
        console.log('🔍 Loading status check', {
          overallStatus: data?.status,
          dashboardStatus: data?.dashboard?.status,
          leadsStatus: data?.leads?.status,
          epinetStatus: data?.epinet?.status,
          isStillLoading,
          pollingAttempts,
        });
      }

      if (isStillLoading && pollingAttempts < MAX_POLLING_ATTEMPTS) {
        // Check if we've been polling too long
        const now = Date.now();
        if (pollingStartTime && now - pollingStartTime > MAX_POLLING_TIME) {
          if (VERBOSE) console.log('⏰ Max polling time reached, stopping');
          setPollingStartTime(null);
          // Continue with data even if still loading
        } else {
          if (VERBOSE)
            console.log('⏳ Analytics data still loading, polling...', {
              attempt: pollingAttempts + 1,
            });

          // Set start time if this is the first poll
          if (!pollingStartTime) {
            setPollingStartTime(now);
          }

          const delayMs =
            POLLING_DELAYS[pollingAttempts] ||
            POLLING_DELAYS[POLLING_DELAYS.length - 1];

          const newTimer = setTimeout(() => {
            setPollingAttempts(pollingAttempts + 1);
            fetchAllAnalytics();
          }, delayMs);

          setPollingTimer(newTimer);

          // Update with partial data but keep loading state
          onAnalyticsUpdate({
            dashboard: data.dashboard,
            leads: data.leads,
            epinet: data.epinet,
            userCounts: data.userCounts || [],
            hourlyNodeActivity: data.hourlyNodeActivity || {},
            status: 'loading',
            error: null,
            isLoading: true,
          });

          return;
        }
      }

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

      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
        ...$epinetCustomFilters,
        userCounts: data.userCounts || [],
        hourlyNodeActivity: data.hourlyNodeActivity || {},
      });

      // Reset polling attempts and start time on success
      setPollingAttempts(0);
      setPollingStartTime(null);

      if (VERBOSE)
        console.log('🔄 AFTER store update', {
          newStoreRef: epinetCustomFilters.get(),
        });
    } catch (error) {
      console.error('❌ Analytics fetch error:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      onAnalyticsUpdate({
        dashboard: null,
        leads: null,
        epinet: null,
        userCounts: [],
        hourlyNodeActivity: {},
        status: 'error',
        error: errorMessage,
        isLoading: false,
      });

      // Schedule retry if we haven't reached max attempts
      if (pollingAttempts < MAX_POLLING_ATTEMPTS) {
        if (VERBOSE)
          console.log(
            '🔄 Scheduling retry due to error, attempt',
            pollingAttempts + 1
          );

        const delayMs =
          POLLING_DELAYS[pollingAttempts] ||
          POLLING_DELAYS[POLLING_DELAYS.length - 1];

        const newTimer = setTimeout(() => {
          setPollingAttempts(pollingAttempts + 1);
          fetchAllAnalytics();
        }, delayMs);

        setPollingTimer(newTimer);
      }
    }
  }, [
    $epinetCustomFilters.startTimeUTC,
    $epinetCustomFilters.endTimeUTC,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
    pollingAttempts,
  ]);

  // Initialize on first mount
  useEffect(() => {
    if (!isInitialized.current && !isInitializing.current) {
      if (VERBOSE) console.log('🏁 Initializing FetchAnalytics');
      isInitializing.current = true;

      const nowUTC = new Date();
      const oneWeekAgoUTC = new Date(
        nowUTC.getTime() - 7 * 24 * 60 * 60 * 1000
      );

      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
        enabled: true,
        visitorType: 'all',
        selectedUserId: null,
        startTimeUTC: oneWeekAgoUTC.toISOString(),
        endTimeUTC: nowUTC.toISOString(),
        userCounts: [],
        hourlyNodeActivity: {},
      });

      isInitialized.current = true;
      isInitializing.current = false;
    }
  }, []);

  // Fetch when filters change
  useEffect(() => {
    if (
      isInitialized.current &&
      $epinetCustomFilters.enabled &&
      $epinetCustomFilters.visitorType !== null &&
      $epinetCustomFilters.startTimeUTC !== null &&
      $epinetCustomFilters.endTimeUTC !== null
    ) {
      if (VERBOSE) console.log('🔄 Filters changed, fetching analytics');
      setPollingAttempts(0); // Reset polling attempts when filters change
      setPollingStartTime(null); // Reset polling start time
      fetchAllAnalytics();
    }
  }, [
    $epinetCustomFilters.enabled,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
    $epinetCustomFilters.startTimeUTC,
    $epinetCustomFilters.endTimeUTC,
    fetchAllAnalytics,
  ]);

  return null;
}
