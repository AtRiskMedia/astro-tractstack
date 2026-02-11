import { atom } from 'nanostores';

export const skipWizard = atom<boolean>(false);

export interface ContentNavigationState {
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

const defaultContentNavigationState: ContentNavigationState = {
  manageSubtab: 'summary',
};

const CONTENT_NAVIGATION_STORAGE_KEY = 'tractstack_content_navigation_state';

function loadContentNavigationFromStorage(): ContentNavigationState {
  try {
    const stored = localStorage.getItem(CONTENT_NAVIGATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure we only merge valid keys, ignoring old 'subtab' if present
      return {
        ...defaultContentNavigationState,
        manageSubtab:
          parsed.manageSubtab || defaultContentNavigationState.manageSubtab,
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

export const contentNavigationStore = atom<ContentNavigationState>(
  loadContentNavigationFromStorage()
);

contentNavigationStore.subscribe((state) => {
  saveContentNavigationToStorage(state);
});

export const contentNavigationActions = {
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

/**
 * Handle manage content sub-subtab change with navigation tracking
 */
export function handleManageSubtabChange(
  newSubtab: ContentNavigationState['manageSubtab'],
  setActiveTab: (tab: string) => void
) {
  setActiveTab(newSubtab);
  contentNavigationActions.setManageSubtab(newSubtab);
}

/**
 * Restore navigation state for Content tab
 * Returns the sub-navigation state that should be restored
 */
export function restoreTabNavigation() {
  const state = contentNavigationStore.get();
  return {
    manageSubtab: state.manageSubtab,
  };
}
