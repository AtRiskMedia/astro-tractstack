import { atom } from 'nanostores';

// Used by StoryKeepWizard
export const skipWizard = atom<boolean>(false);

// Navigation state structure for Content sub-navigation only
export interface ContentNavigationState {
  subtab: 'webpages' | 'manage';
  manageSubtab:
    | 'summary'
    | 'storyfragments'
    | 'panes'
    | 'menus'
    | 'resources'
    | 'beliefs'
    | 'epinets'
    | 'files';
}

// Default content navigation state
const defaultContentNavigationState: ContentNavigationState = {
  subtab: 'webpages',
  manageSubtab: 'summary',
};

// Storage key for localStorage persistence
const CONTENT_NAVIGATION_STORAGE_KEY = 'tractstack_content_navigation_state';

// Helper functions for localStorage
function loadContentNavigationFromStorage(): ContentNavigationState {
  try {
    const stored = localStorage.getItem(CONTENT_NAVIGATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultContentNavigationState,
        ...parsed,
      };
    }
  } catch (error) {
    console.warn(
      'Failed to load content navigation state from localStorage:',
      error
    );
  }
  return defaultContentNavigationState;
}

function saveContentNavigationToStorage(state: ContentNavigationState): void {
  try {
    localStorage.setItem(CONTENT_NAVIGATION_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn(
      'Failed to save content navigation state to localStorage:',
      error
    );
  }
}

// Create the persistent nanostore for content navigation
export const contentNavigationStore = atom<ContentNavigationState>(
  loadContentNavigationFromStorage()
);

// Subscribe to changes and persist to localStorage
contentNavigationStore.subscribe((state) => {
  saveContentNavigationToStorage(state);
});

// Action creators for content navigation
export const contentNavigationActions = {
  /**
   * Set content subtab (webpages vs manage)
   */
  setContentSubtab: (subtab: ContentNavigationState['subtab']) => {
    const currentState = contentNavigationStore.get();
    contentNavigationStore.set({
      ...currentState,
      subtab,
    });
  },

  /**
   * Set manage content sub-subtab (summary, storyfragments, etc.)
   */
  setManageSubtab: (subtab: ContentNavigationState['manageSubtab']) => {
    const currentState = contentNavigationStore.get();
    contentNavigationStore.set({
      ...currentState,
      manageSubtab: subtab,
    });
  },

  /**
   * Get the current content navigation state
   */
  getState: () => {
    return contentNavigationStore.get();
  },

  /**
   * Reset content navigation to defaults
   */
  reset: () => {
    contentNavigationStore.set(defaultContentNavigationState);
  },
};

// Navigation helper functions (moved from navigationHelpers.ts)

/**
 * Handle content subtab change with navigation tracking
 */
export function handleContentSubtabChange(
  newSubtab: ContentNavigationState['subtab'],
  setActiveContentTab: (tab: string) => void
) {
  // Update the active subtab in the component
  setActiveContentTab(newSubtab);

  // Update navigation store
  contentNavigationActions.setContentSubtab(newSubtab);
}

/**
 * Handle manage content sub-subtab change with navigation tracking
 */
export function handleManageSubtabChange(
  newSubtab: ContentNavigationState['manageSubtab'],
  setActiveTab: (tab: string) => void
) {
  // Update the active sub-subtab in the component
  setActiveTab(newSubtab);

  // Update navigation store
  contentNavigationActions.setManageSubtab(newSubtab);
}

/**
 * Restore navigation state for Content tab
 * Returns the sub-navigation state that should be restored
 */
export function restoreTabNavigation() {
  const state = contentNavigationStore.get();
  return {
    subtab: state.subtab,
    manageSubtab: state.manageSubtab,
  };
}
