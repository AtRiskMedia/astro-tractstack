import { atom, computed } from 'nanostores';

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
  const resolvedTenantId =
    (typeof window !== 'undefined' && window.TRACTSTACK_CONFIG?.tenantId) ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';
  return resolvedTenantId;
}

// Default state
const defaultOrphanState: OrphanAnalysisState = {
  data: null,
  isLoading: false,
  error: null,
  lastFetched: null,
};

// Computed store that slices the state for the current tenant
export const orphanAnalysisStore = computed(tenantOrphanAnalysis, (states) => {
  const tenantId = getCurrentTenantId();
  return states[tenantId] || defaultOrphanState;
});

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

const MAX_POLLING_ATTEMPTS = 25;
const MAX_POLLING_DURATION = 10 * 60 * 1000; // 10 minutes
const BASE_POLLING_INTERVAL = 10000; // 10 seconds
const MAX_POLLING_INTERVAL = 30000; // 30 seconds

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
      isLoading: data.status === 'loading', // Only stop loading if complete
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

  // Start the first poll
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
      `Orphan analysis polling stopped: Maximum duration (${MAX_POLLING_DURATION / 1000
      }s) exceeded for tenant ${tenantId}`
    );
    handlePollingFailure(tenantId, 'Polling timeout exceeded');
    return;
  }

  // This is more suitable for long-running jobs, as it spaces out requests
  // even when the server responds successfully with a 'loading' status.
  // Polling sequence: 10s → 20s → 30s → 30s...
  const delay = Math.min(
    BASE_POLLING_INTERVAL * Math.pow(2, state.attempts),
    MAX_POLLING_INTERVAL
  );

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
      updateTenantState(tenantId, { isLoading: false });
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

    // Schedule next poll (will use exponential backoff due to increased consecutiveErrors)
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
    error: `Orphan analysis failed: ${reason}. Please try refreshing the page.`,
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
