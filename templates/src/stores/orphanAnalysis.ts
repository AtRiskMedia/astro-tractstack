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

// Create the store
export const orphanAnalysisStore = atom<OrphanAnalysisState>({
  data: null,
  isLoading: false,
  error: null,
  lastFetched: null,
});

// Helper function to count orphans from the analysis data
export function countOrphans(data: OrphanAnalysisData | null): number {
  if (!data) return 0;

  let orphanCount = 0;

  // Count items with empty dependency arrays (these are orphans)
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

// Polling interval for loading status
let pollingInterval: NodeJS.Timeout | null = null;

// Track if we're currently fetching to prevent duplicate requests
let isFetching = false;

// Action to load orphan analysis data
export async function loadOrphanAnalysis(): Promise<void> {
  const currentState = orphanAnalysisStore.get();

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
  if (isFetching) {
    return;
  }

  isFetching = true;

  // Set loading state
  orphanAnalysisStore.set({
    ...currentState,
    isLoading: true,
    error: null,
  });

  try {
    const data = await fetchOrphanAnalysis();

    orphanAnalysisStore.set({
      data,
      isLoading: false,
      error: null,
      lastFetched: Date.now(),
    });

    // If status is still "loading", start polling
    if (data.status === 'loading') {
      startPolling();
    } else {
      // Analysis is complete, stop any existing polling
      stopPolling();
    }
  } catch (error) {
    orphanAnalysisStore.set({
      data: null,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      lastFetched: null,
    });
    stopPolling();
  } finally {
    isFetching = false;
  }
}

// Start polling for updates when analysis is in progress
function startPolling(): void {
  // Clear any existing polling
  stopPolling();

  pollingInterval = setInterval(async () => {
    try {
      const data = await fetchOrphanAnalysis();
      const currentState = orphanAnalysisStore.get();

      orphanAnalysisStore.set({
        ...currentState,
        data,
        lastFetched: Date.now(),
      });

      // Stop polling when analysis is complete
      if (data.status === 'complete') {
        stopPolling();
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Continue polling on error, but log it
    }
  }, 2000); // Poll every 2 seconds
}

// Stop polling
function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// Action to clear the store (useful for forced refresh)
export function clearOrphanAnalysis(): void {
  stopPolling(); // Stop any polling when clearing
  isFetching = false; // Reset the fetching flag
  orphanAnalysisStore.set({
    data: null,
    isLoading: false,
    error: null,
    lastFetched: null,
  });
}
