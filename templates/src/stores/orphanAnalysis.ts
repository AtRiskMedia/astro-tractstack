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
    notify: function () { },
    off: function () { },
    get value() {
      return this.get();
    },
    set: function () { }, // Orphan store is read-only for components
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

// Enhanced polling state management (per tenant)
const pollingIntervals = new Map<string, NodeJS.Timeout>();
const pollingState = new Map<
  string,
  {
    attempts: number;
    startTime: number;
    consecutiveErrors: number;
    lastAttemptTime: number;
  }
>();

// Constants for polling configuration
const MAX_POLLING_ATTEMPTS = 10;
const MAX_POLLING_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const BASE_POLLING_INTERVAL = 2000; // 2 seconds base interval
const MAX_POLLING_INTERVAL = 32000; // 32 seconds max interval

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

  // Initialize polling state
  const startTime = Date.now();
  pollingState.set(tenantId, {
    attempts: 0,
    startTime,
    consecutiveErrors: 0,
    lastAttemptTime: startTime,
  });

  // Start the first poll immediately
  scheduleNextPoll(tenantId);
}

function scheduleNextPoll(tenantId: string): void {
  const state = pollingState.get(tenantId);
  if (!state) return;

  // Check if we've exceeded maximum attempts
  if (state.attempts >= MAX_POLLING_ATTEMPTS) {
    console.warn(
      `Orphan analysis polling stopped: Maximum attempts (${MAX_POLLING_ATTEMPTS}) reached for tenant ${tenantId}`
    );
    handlePollingFailure(tenantId, 'Maximum polling attempts reached');
    return;
  }

  // Check if we've exceeded maximum duration
  const elapsed = Date.now() - state.startTime;
  if (elapsed >= MAX_POLLING_DURATION) {
    console.warn(
      `Orphan analysis polling stopped: Maximum duration (${MAX_POLLING_DURATION}ms) exceeded for tenant ${tenantId}`
    );
    handlePollingFailure(tenantId, 'Polling timeout exceeded');
    return;
  }

  // Calculate delay using exponential backoff for consecutive errors
  let delay = BASE_POLLING_INTERVAL;
  if (state.consecutiveErrors > 0) {
    // Exponential backoff: 2s → 4s → 8s → 16s → 32s (capped)
    delay = Math.min(
      BASE_POLLING_INTERVAL * Math.pow(2, state.consecutiveErrors),
      MAX_POLLING_INTERVAL
    );
  }

  // Schedule the next poll
  const timeoutId = setTimeout(() => executePoll(tenantId), delay);
  pollingIntervals.set(tenantId, timeoutId);
}

async function executePoll(tenantId: string): Promise<void> {
  const state = pollingState.get(tenantId);
  if (!state) return;

  // Update attempt count and last attempt time
  state.attempts++;
  state.lastAttemptTime = Date.now();

  try {
    const data = await fetchOrphanAnalysis();

    // Update tenant state with successful fetch
    updateTenantState(tenantId, {
      data,
      lastFetched: Date.now(),
      error: null, // Clear any previous errors
    });

    // Reset consecutive errors on success
    state.consecutiveErrors = 0;

    // Check if analysis is complete
    if (data.status === 'complete') {
      stopPolling(tenantId);
      return;
    }

    // If still loading, schedule next poll
    if (data.status === 'loading') {
      scheduleNextPoll(tenantId);
    } else {
      // Unexpected status - stop polling
      console.warn(
        `Unexpected orphan analysis status: ${data.status} for tenant ${tenantId}`
      );
      handlePollingFailure(tenantId, `Unexpected status: ${data.status}`);
    }
  } catch (error) {
    console.error(`Polling error for tenant ${tenantId}:`, error);

    // Increment consecutive errors
    state.consecutiveErrors++;

    // Update tenant state with error
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown polling error';
    updateTenantState(tenantId, {
      error: `Polling error (attempt ${state.attempts}/${MAX_POLLING_ATTEMPTS}): ${errorMessage}`,
      lastFetched: Date.now(),
    });

    // Check if we should stop polling due to consecutive errors
    if (state.consecutiveErrors >= 5) {
      console.warn(
        `Stopping polling due to ${state.consecutiveErrors} consecutive errors for tenant ${tenantId}`
      );
      handlePollingFailure(
        tenantId,
        `Too many consecutive errors (${state.consecutiveErrors})`
      );
      return;
    }

    // Schedule next poll with exponential backoff
    scheduleNextPoll(tenantId);
  }
}

function handlePollingFailure(tenantId: string, reason: string): void {
  console.error(
    `Orphan analysis polling failed for tenant ${tenantId}: ${reason}`
  );

  // Update tenant state with final error
  updateTenantState(tenantId, {
    isLoading: false,
    error: `Orphan analysis polling failed: ${reason}. Please try refreshing the page or contact support if the issue persists.`,
    lastFetched: Date.now(),
  });

  // Clean up polling state
  stopPolling(tenantId);
}

function stopPolling(tenantId: string): void {
  // Clear any active interval
  const intervalId = pollingIntervals.get(tenantId);
  if (intervalId) {
    clearTimeout(intervalId);
    pollingIntervals.delete(tenantId);
  }

  // Clean up polling state
  pollingState.delete(tenantId);
}

export function clearOrphanAnalysis(): void {
  const tenantId = getCurrentTenantId();
  stopPolling(tenantId);
  fetchingStates.set(tenantId, false);

  updateTenantState(tenantId, defaultOrphanState);
}

// Enhanced utility function to get polling status for debugging
export function getPollingStatus(tenantId?: string): Record<string, any> {
  const targetTenantId = tenantId || getCurrentTenantId();
  const state = pollingState.get(targetTenantId);
  const isActive = pollingIntervals.has(targetTenantId);

  if (!state && !isActive) {
    return { status: 'inactive', tenantId: targetTenantId };
  }

  return {
    status: isActive ? 'active' : 'stopped',
    tenantId: targetTenantId,
    attempts: state?.attempts || 0,
    maxAttempts: MAX_POLLING_ATTEMPTS,
    consecutiveErrors: state?.consecutiveErrors || 0,
    startTime: state?.startTime,
    lastAttemptTime: state?.lastAttemptTime,
    elapsed: state?.startTime ? Date.now() - state.startTime : 0,
    maxDuration: MAX_POLLING_DURATION,
  };
}
