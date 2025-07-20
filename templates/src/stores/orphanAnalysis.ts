import { atom } from 'nanostores';

export interface OrphanAnalysisData {
  storyFragments: Record<string, string[]>;
  panes: Record<string, string[]>;
  menus: Record<string, string[]>;
  files: Record<string, string[]>;
  resources: Record<string, string[]>;
  beliefs: Record<string, string[]>;
  epinets: Record<string, string[]>;
  tractstacks: Record<string, string[]>;
  status: 'loading' | 'complete';
}

export interface OrphanAnalysisState {
  data: OrphanAnalysisData | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

// Internal tenant-keyed storage
const tenantOrphanAnalysis = atom<Record<string, OrphanAnalysisState>>({});

// Helper to get current tenant ID
function getCurrentTenantId(): string {
  if (typeof window !== 'undefined' && window.TRACTSTACK_CONFIG?.tenantId) {
    return window.TRACTSTACK_CONFIG.tenantId;
  }
  return import.meta.env.PUBLIC_TENANTID || 'default';
}

// Default state
const defaultOrphanState: OrphanAnalysisState = {
  data: null,
  isLoading: false,
  error: null,
  lastFetched: null,
};

// Create tenant-aware store that works with useStore
const createOrphanAnalysisStore = () => {
  const store = {
    get: () => {
      const tenantId = getCurrentTenantId();
      return tenantOrphanAnalysis.get()[tenantId] || defaultOrphanState;
    },

    subscribe: (callback: (value: OrphanAnalysisState) => void) => {
      const tenantId = getCurrentTenantId();
      return tenantOrphanAnalysis.subscribe((analysis) => {
        callback(analysis[tenantId] || defaultOrphanState);
      });
    },

    // Required nanostore properties for useStore
    lc: 0,
    listen: function (callback: any) {
      return this.subscribe(callback);
    },
    notify: function () {},
    off: function () {},
    get value() {
      return this.get();
    },
    set: function () {}, // Orphan store is read-only for components
  };

  return store;
};

export const orphanAnalysisStore = createOrphanAnalysisStore();

// Helper to update state for specific tenant
function updateTenantState(
  tenantId: string,
  updates: Partial<OrphanAnalysisState>
): void {
  const currentStates = tenantOrphanAnalysis.get();
  const currentState = currentStates[tenantId] || defaultOrphanState;

  tenantOrphanAnalysis.set({
    ...currentStates,
    [tenantId]: {
      ...currentState,
      ...updates,
    },
  });
}

// Helper function to count orphans from the analysis data
export function countOrphans(data: OrphanAnalysisData | null): number {
  if (!data) return 0;

  let orphanCount = 0;

  Object.values(data.storyFragments || {}).forEach((deps) => {
    if (deps.length === 0) orphanCount++;
  });

  Object.values(data.panes || {}).forEach((deps) => {
    if (deps.length === 0) orphanCount++;
  });

  Object.values(data.menus || {}).forEach((deps) => {
    if (deps.length === 0) orphanCount++;
  });

  Object.values(data.files || {}).forEach((deps) => {
    if (deps.length === 0) orphanCount++;
  });

  Object.values(data.resources || {}).forEach((deps) => {
    if (deps.length === 0) orphanCount++;
  });

  Object.values(data.beliefs || {}).forEach((deps) => {
    if (deps.length === 0) orphanCount++;
  });

  Object.values(data.epinets || {}).forEach((deps) => {
    if (deps.length === 0) orphanCount++;
  });

  Object.values(data.tractstacks || {}).forEach((deps) => {
    if (deps.length === 0) orphanCount++;
  });

  return orphanCount;
}

// API function to fetch orphan analysis
export async function fetchOrphanAnalysis(): Promise<OrphanAnalysisData> {
  const response = await fetch('/api/orphan-analysis', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': getCurrentTenantId(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch orphan analysis: ${response.status} ${errorText}`
    );
  }

  return await response.json();
}

// Polling and state management (per tenant)
const pollingIntervals = new Map<string, NodeJS.Timeout>();
const fetchingStates = new Map<string, boolean>();

export async function loadOrphanAnalysis(): Promise<void> {
  const tenantId = getCurrentTenantId();
  const currentState =
    tenantOrphanAnalysis.get()[tenantId] || defaultOrphanState;

  // Don't reload if we've fetched in the last 5 minutes and it's complete
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  if (
    currentState.lastFetched &&
    currentState.lastFetched > fiveMinutesAgo &&
    currentState.data &&
    currentState.data.status === 'complete'
  ) {
    return;
  }

  // Prevent duplicate concurrent requests
  if (fetchingStates.get(tenantId)) {
    return;
  }

  fetchingStates.set(tenantId, true);

  // Set loading state
  updateTenantState(tenantId, {
    isLoading: true,
    error: null,
  });

  try {
    const data = await fetchOrphanAnalysis();

    updateTenantState(tenantId, {
      data,
      isLoading: false,
      error: null,
      lastFetched: Date.now(),
    });

    // If status is still "loading", start polling
    if (data.status === 'loading') {
      startPolling(tenantId);
    } else {
      stopPolling(tenantId);
    }
  } catch (error) {
    updateTenantState(tenantId, {
      data: null,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      lastFetched: null,
    });
    stopPolling(tenantId);
  } finally {
    fetchingStates.set(tenantId, false);
  }
}

function startPolling(tenantId: string): void {
  stopPolling(tenantId);

  const intervalId = setInterval(async () => {
    try {
      const data = await fetchOrphanAnalysis();

      updateTenantState(tenantId, {
        data,
        lastFetched: Date.now(),
      });

      if (data.status === 'complete') {
        stopPolling(tenantId);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 2000);

  pollingIntervals.set(tenantId, intervalId);
}

function stopPolling(tenantId: string): void {
  const intervalId = pollingIntervals.get(tenantId);
  if (intervalId) {
    clearInterval(intervalId);
    pollingIntervals.delete(tenantId);
  }
}

export function clearOrphanAnalysis(): void {
  const tenantId = getCurrentTenantId();
  stopPolling(tenantId);
  fetchingStates.set(tenantId, false);

  updateTenantState(tenantId, defaultOrphanState);
}
