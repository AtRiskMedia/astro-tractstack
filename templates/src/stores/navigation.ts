import { atom } from 'nanostores';

// Used by StoryKeepWizard
export const skipWizard = atom<boolean>(false);

// Navigation state structure based on actual project tabs
export interface NavigationState {
  currentMainTab: 'analytics' | 'content' | 'branding' | 'advanced';
  tabPaths: {
    content: {
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
    };
    // Future: other main tabs can add their sub-navigation here
  };
}

// Default navigation state
const defaultNavigationState: NavigationState = {
  currentMainTab: 'analytics',
  tabPaths: {
    content: {
      subtab: 'webpages',
      manageSubtab: 'summary',
    },
  },
};

// Storage key for localStorage persistence
const NAVIGATION_STORAGE_KEY = 'tractstack_navigation_state';

// Helper functions for localStorage
function loadNavigationFromStorage(): NavigationState {
  try {
    const stored = localStorage.getItem(NAVIGATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle any missing properties
      return {
        ...defaultNavigationState,
        ...parsed,
        tabPaths: {
          ...defaultNavigationState.tabPaths,
          ...parsed.tabPaths,
          content: {
            ...defaultNavigationState.tabPaths.content,
            ...parsed.tabPaths?.content,
          },
        },
      };
    }
  } catch (error) {
    console.warn('Failed to load navigation state from localStorage:', error);
  }
  return defaultNavigationState;
}

function saveNavigationToStorage(state: NavigationState): void {
  try {
    localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save navigation state to localStorage:', error);
  }
}

// Create the persistent nanostore
export const navigationStore = atom<NavigationState>(
  loadNavigationFromStorage()
);

// Subscribe to changes and persist to localStorage
navigationStore.subscribe((state) => {
  saveNavigationToStorage(state);
});

// Action creators for updating navigation state
export const navigationActions = {
  /**
   * Set the current main tab and optionally update URL
   */
  setMainTab: (tab: NavigationState['currentMainTab'], updateUrl = true) => {
    const currentState = navigationStore.get();
    navigationStore.set({
      ...currentState,
      currentMainTab: tab,
    });

    if (updateUrl && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', url.toString());
    }
  },

  /**
   * Set content subtab (webpages vs manage)
   */
  setContentSubtab: (
    subtab: NavigationState['tabPaths']['content']['subtab']
  ) => {
    const currentState = navigationStore.get();
    navigationStore.set({
      ...currentState,
      tabPaths: {
        ...currentState.tabPaths,
        content: {
          ...currentState.tabPaths.content,
          subtab,
        },
      },
    });
  },

  /**
   * Set manage content sub-subtab (summary, storyfragments, etc.)
   */
  setManageSubtab: (
    subtab: NavigationState['tabPaths']['content']['manageSubtab']
  ) => {
    const currentState = navigationStore.get();
    navigationStore.set({
      ...currentState,
      tabPaths: {
        ...currentState.tabPaths,
        content: {
          ...currentState.tabPaths.content,
          manageSubtab: subtab,
        },
      },
    });
  },

  /**
   * Get the stored navigation path for a main tab
   */
  getTabPath: (tab: NavigationState['currentMainTab']) => {
    const state = navigationStore.get();
    return state.tabPaths[tab as keyof typeof state.tabPaths] || null;
  },

  /**
   * Clear navigation history (useful for testing or reset)
   */
  reset: () => {
    navigationStore.set(defaultNavigationState);
  },
};
