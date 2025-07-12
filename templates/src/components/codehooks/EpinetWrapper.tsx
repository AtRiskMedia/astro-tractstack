import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters } from '../../stores/analytics';
import SankeyDiagram from './SankeyDiagram';
import EpinetDurationSelector from './EpinetDurationSelector';
import EpinetTableView from './EpinetTableView';

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

interface FullContentMapItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  promoted?: boolean;
}

const EpinetWrapper = ({
  fullContentMap,
}: {
  fullContentMap: FullContentMapItem[];
}) => {
  // Use the global store instead of local state
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
  const POLLING_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s

  // Get backend URL
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  // Clear polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
      }
    };
  }, [pollingTimer]);

  // Auto-discover epinet ID following V1 pattern
  useEffect(() => {
    const discoverEpinetId = async () => {
      try {
        // First, try to find a promoted epinet from content map
        const promotedEpinet = fullContentMap.find(
          (item) => item.type === 'Epinet' && item.promoted
        );

        if (promotedEpinet) {
          setEpinetId(promotedEpinet.id);
          return;
        }

        // If no promoted epinet, get first epinet from content map
        const firstEpinet = fullContentMap.find(
          (item) => item.type === 'Epinet'
        );

        if (firstEpinet) {
          setEpinetId(firstEpinet.id);
          return;
        }

        // Fallback: no epinet found
        console.warn('No epinet found in content map');
        setEpinetId(null);
      } catch (error) {
        console.error('Error discovering epinet ID:', error);
        setEpinetId(null);
      }
    };

    discoverEpinetId();
  }, [fullContentMap]);

  // Initialize epinet custom filters with default values on mount
  useEffect(() => {
    const nowUTC = new Date();
    const oneWeekAgoUTC = new Date(nowUTC.getTime() - 7 * 24 * 60 * 60 * 1000);

    epinetCustomFilters.set({
      enabled: true,
      visitorType: 'all',
      selectedUserId: null,
      startTimeUTC: oneWeekAgoUTC.toISOString(),
      endTimeUTC: nowUTC.toISOString(),
      userCounts: [],
      hourlyNodeActivity: {},
    });
  }, []);

  // Fetch data when epinet ID is available
  useEffect(() => {
    if (epinetId) {
      fetchEpinetData();
    }
  }, [epinetId]);

  // Watch for changes in the global filters and refetch data
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
  ]);

  const fetchEpinetData = useCallback(async () => {
    if (!epinetId) return;

    try {
      setAnalytics((prev) => ({ ...prev, isLoading: true }));

      if (pollingTimer) {
        clearTimeout(pollingTimer);
        setPollingTimer(null);
      }

      // V2 API call with discovered epinet ID
      const url = new URL(
        `${goBackend}/api/v1/analytics/epinet/${epinetId}`,
        window.location.origin
      );

      url.searchParams.append(
        'visitorType',
        $epinetCustomFilters.visitorType || 'all'
      );
      if ($epinetCustomFilters.selectedUserId) {
        url.searchParams.append('userId', $epinetCustomFilters.selectedUserId);
      }
      if ($epinetCustomFilters.startTimeUTC) {
        url.searchParams.append('startTime', $epinetCustomFilters.startTimeUTC);
      }
      if ($epinetCustomFilters.endTimeUTC) {
        url.searchParams.append('endTime', $epinetCustomFilters.endTimeUTC);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success !== false) {
        // Check if data is still loading
        const epinetData = result.epinet;

        if (
          epinetData &&
          (epinetData.status === 'loading' ||
            epinetData.status === 'refreshing')
        ) {
          // If data is still loading, poll again after delay
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

        setAnalytics((prev) => ({
          ...prev,
          epinet: result.epinet,
          status: 'complete',
          error: null,
        }));

        // Update the global store with additional data from API response
        epinetCustomFilters.set({
          ...$epinetCustomFilters,
          userCounts: result.userCounts || [],
          hourlyNodeActivity: result.hourlyNodeActivity || {},
        });

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

      // Schedule a retry if we haven't reached max attempts
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
  }, [epinetId, $epinetCustomFilters, pollingAttempts, goBackend]);

  const { epinet, isLoading, status, error } = analytics;

  // Show loading while discovering epinet ID
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
      <div className="flex h-96 w-full items-center justify-center rounded bg-gray-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-sm text-gray-600">
            Computing user journey data...
          </p>
        </div>
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
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-800">
        <p>
          No user journey data is available yet. This visualization will appear
          when users start interacting with your content.
        </p>
      </div>
    );
  }

  return (
    <div className="epinet-wrapper rounded-lg bg-white p-4 shadow">
      <ErrorBoundary
        fallback={
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            Error rendering user flow diagram. Please check the data and try
            again.
          </div>
        }
      >
        <div className="relative">
          {(isLoading || status === 'loading' || status === 'refreshing') && (
            <div className="absolute right-0 top-0 rounded bg-white px-2 py-1 text-xs text-gray-500 shadow-sm">
              Updating...
            </div>
          )}
          <SankeyDiagram data={{ nodes: epinet.nodes, links: epinet.links }} />
          <EpinetDurationSelector />
          <EpinetTableView fullContentMap={fullContentMap} />
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default EpinetWrapper;
