import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters, type AppliedFilter } from '@/stores/analytics';
import { TractStackAPI } from '@/utils/api';
import SankeyDiagram from './SankeyDiagram';
import EpinetDurationSelector from './EpinetDurationSelector';
import type { FullContentMapItem } from '@/types/tractstack';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

const ErrorBoundary = ({ children, fallback }: ErrorBoundaryProps) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (hasError) return <>{fallback}</>;

  return <div onError={handleError}>{children}</div>;
};

const EpinetWrapper = ({
  fullContentMap,
}: {
  fullContentMap: FullContentMapItem[];
}) => {
  const $epinetCustomFilters = useStore(epinetCustomFilters);

  const [analytics, setAnalytics] = useState<{
    epinet: any;
    isLoading: boolean;
    status: string;
    error: string | null;
  }>({
    epinet: null,
    isLoading: false,
    status: 'idle',
    error: null,
  });

  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [epinetId, setEpinetId] = useState<string | null>(null);

  const MAX_POLLING_ATTEMPTS = 3;
  const POLLING_DELAYS = [2000, 5000, 10000];

  const api = useMemo(
    () => new TractStackAPI(window.TRACTSTACK_CONFIG?.tenantId || 'default'),
    []
  );

  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
      }
    };
  }, [pollingTimer]);

  useEffect(() => {
    const discoverEpinetId = async () => {
      try {
        const promotedEpinet = fullContentMap.find(
          (item) => item.type === 'Epinet' && item.promoted
        );
        if (promotedEpinet) {
          setEpinetId(promotedEpinet.id);
          return;
        }
        const firstEpinet = fullContentMap.find(
          (item) => item.type === 'Epinet'
        );
        if (firstEpinet) {
          setEpinetId(firstEpinet.id);
          return;
        }
        setEpinetId(null);
      } catch (error) {
        console.error('Error discovering epinet ID:', error);
        setEpinetId(null);
      }
    };
    discoverEpinetId();
  }, [fullContentMap]);

  useEffect(() => {
    const nowUTC = new Date();
    const oneWeekAgoUTC = new Date(nowUTC.getTime() - 7 * 24 * 60 * 60 * 1000);
    epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
      enabled: true,
      visitorType: 'all',
      selectedUserId: null,
      startTimeUTC: oneWeekAgoUTC.toISOString(),
      endTimeUTC: nowUTC.toISOString(),
      userCounts: [],
      hourlyNodeActivity: {},
      availableFilters: [],
      appliedFilters: [],
    });
  }, []);

  useEffect(() => {
    if (
      epinetId &&
      $epinetCustomFilters.enabled &&
      $epinetCustomFilters.visitorType !== null &&
      $epinetCustomFilters.startTimeUTC !== null &&
      $epinetCustomFilters.endTimeUTC !== null
    ) {
      setPollingAttempts(0);
      fetchEpinetData();
    }
  }, [
    epinetId,
    $epinetCustomFilters.enabled,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
    $epinetCustomFilters.startTimeUTC,
    $epinetCustomFilters.endTimeUTC,
    $epinetCustomFilters.appliedFilters,
  ]);

  const handleBeliefFilterChange = (beliefSlug: string, value: string) => {
    const tenantId = window.TRACTSTACK_CONFIG?.tenantId || 'default';
    const currentFilters = epinetCustomFilters.get();
    let newFilters: AppliedFilter[] = [
      ...(currentFilters.appliedFilters || []),
    ];

    if (value === 'All') {
      newFilters = newFilters.filter((f) => f.beliefSlug !== beliefSlug);
    } else {
      const existingIndex = newFilters.findIndex(
        (f) => f.beliefSlug === beliefSlug
      );
      if (existingIndex > -1) {
        newFilters[existingIndex] = { beliefSlug, value };
      } else {
        newFilters.push({ beliefSlug, value });
      }
    }

    epinetCustomFilters.set(tenantId, {
      ...currentFilters,
      appliedFilters: newFilters,
    });
  };

  const fetchEpinetData = useCallback(async () => {
    if (!epinetId) return;
    try {
      setAnalytics((prev) => ({ ...prev, isLoading: true, status: 'loading' }));
      if (pollingTimer) {
        clearTimeout(pollingTimer);
        setPollingTimer(null);
      }
      const params = new URLSearchParams();
      if (
        $epinetCustomFilters.startTimeUTC &&
        $epinetCustomFilters.endTimeUTC
      ) {
        const now = new Date();
        const startTime = new Date($epinetCustomFilters.startTimeUTC);
        const endTime = new Date($epinetCustomFilters.endTimeUTC);
        const startHour = Math.ceil(
          (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        );
        const endHour = Math.floor(
          (now.getTime() - endTime.getTime()) / (1000 * 60 * 60)
        );
        params.append('startHour', startHour.toString());
        params.append('endHour', endHour.toString());
      }
      params.append('visitorType', $epinetCustomFilters.visitorType || 'all');
      if ($epinetCustomFilters.selectedUserId) {
        params.append('userId', $epinetCustomFilters.selectedUserId);
      }

      // MODIFICATION: Properly format appliedFilters for the backend
      if (
        $epinetCustomFilters.appliedFilters &&
        $epinetCustomFilters.appliedFilters.length > 0
      ) {
        params.append(
          'appliedFilters',
          JSON.stringify($epinetCustomFilters.appliedFilters)
        );
      }

      const response = await api.get(
        `/api/v1/analytics/epinet/${epinetId}?${params.toString()}`
      );
      if (!response.success)
        throw new Error(`API request failed: ${response.error}`);
      const result = response.data;
      if (result.success !== false) {
        const epinetData = result.epinet;
        if (
          epinetData &&
          (epinetData.status === 'loading' ||
            epinetData.status === 'refreshing')
        ) {
          if (pollingAttempts < MAX_POLLING_ATTEMPTS) {
            const delayMs =
              POLLING_DELAYS[pollingAttempts] ||
              POLLING_DELAYS[POLLING_DELAYS.length - 1];
            const newTimer = setTimeout(() => {
              setPollingAttempts(pollingAttempts + 1);
              fetchEpinetData();
            }, delayMs);
            setPollingTimer(newTimer);
            return;
          }
        }
        setAnalytics({
          epinet: result.epinet,
          status: 'complete',
          error: null,
          isLoading: false,
        });
        epinetCustomFilters.set(
          window.TRACTSTACK_CONFIG?.tenantId || 'default',
          {
            ...$epinetCustomFilters,
            userCounts: result.userCounts || [],
            hourlyNodeActivity: result.hourlyNodeActivity || {},
            availableFilters: result?.availableFilters || [],
          }
        );
        setPollingAttempts(0);
      } else {
        throw new Error(result.error || 'Unknown API error');
      }
    } catch (error) {
      setAnalytics((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      }));
      if (pollingAttempts < MAX_POLLING_ATTEMPTS) {
        const delayMs =
          POLLING_DELAYS[pollingAttempts] ||
          POLLING_DELAYS[POLLING_DELAYS.length - 1];
        const newTimer = setTimeout(() => {
          setPollingAttempts(pollingAttempts + 1);
          fetchEpinetData();
        }, delayMs);
        setPollingTimer(newTimer);
      }
    } finally {
      setAnalytics((prev) => ({ ...prev, isLoading: false }));
    }
  }, [epinetId, $epinetCustomFilters, pollingAttempts, api]);

  const { epinet, isLoading, status, error } = analytics;

  if (!epinetId) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded bg-gray-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-sm text-gray-600">
            Discovering analytics configuration...
          </p>
        </div>
      </div>
    );
  }

  if ((isLoading || status === 'loading') && !epinet) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (error && !epinet) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <p className="font-bold">Error loading user journey visualization</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => {
            setPollingAttempts(0);
            fetchEpinetData();
          }}
          className="mt-3 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (
    !epinet ||
    !epinet.nodes ||
    !epinet.links ||
    epinet.nodes.length === 0 ||
    epinet.links.length === 0
  ) {
    if (isLoading || status === 'loading') {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
        </div>
      );
    }
    return (
      <>
        <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-800">
          <p>No user journey data is available for the selected filters.</p>
        </div>
        <EpinetDurationSelector
          fullContentMap={fullContentMap}
          isLoading={isLoading || status === 'loading'}
          hourlyNodeActivity={$epinetCustomFilters.hourlyNodeActivity}
          availableFilters={$epinetCustomFilters.availableFilters}
          appliedFilters={$epinetCustomFilters.appliedFilters}
          onBeliefFilterChange={handleBeliefFilterChange}
        />
      </>
    );
  }

  return (
    <div className="px-3.5 py-12 md:px-6">
      <ErrorBoundary
        fallback={
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            <p className="font-bold">
              Error rendering user journey visualization
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              {(isLoading || status === 'loading') && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                  <span>Updating...</span>
                </div>
              )}
            </div>
            <SankeyDiagram
              data={epinet}
              isLoading={isLoading || status === 'loading'}
            />
          </div>
          <EpinetDurationSelector
            fullContentMap={fullContentMap}
            isLoading={isLoading || status === 'loading'}
            hourlyNodeActivity={$epinetCustomFilters.hourlyNodeActivity}
            availableFilters={$epinetCustomFilters.availableFilters}
            appliedFilters={$epinetCustomFilters.appliedFilters}
            onBeliefFilterChange={handleBeliefFilterChange}
          />
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default EpinetWrapper;
