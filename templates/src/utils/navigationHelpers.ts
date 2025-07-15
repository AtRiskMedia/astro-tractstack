import {
  navigationStore,
  navigationActions,
  type NavigationState,
} from '../stores/navigation';

/**
 * Update URL parameters for tab navigation
 */
export function updateUrlTab(tab: string): void {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  } catch (error) {
    console.warn('Failed to update URL tab:', error);
  }
}

/**
 * Get the current tab from URL parameters
 */
export function getTabFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab');
  } catch (error) {
    console.warn('Failed to get tab from URL:', error);
    return null;
  }
}

/**
 * Restore navigation state for a main tab
 * Returns the sub-navigation state that should be restored
 */
export function restoreTabNavigation(
  mainTab: NavigationState['currentMainTab']
) {
  const state = navigationStore.get();

  switch (mainTab) {
    case 'content':
      return {
        subtab: state.tabPaths.content.subtab,
        manageSubtab: state.tabPaths.content.manageSubtab,
      };
    // Future: add other main tabs when they have sub-navigation
    default:
      return null;
  }
}

/**
 * Handle main tab change with navigation tracking and URL update
 */
export function handleMainTabChange(
  newTab: NavigationState['currentMainTab'],
  setActiveTab: (tab: string) => void
) {
  // Update the active tab in the component
  setActiveTab(newTab);

  // Update navigation store and URL
  navigationActions.setMainTab(newTab, true);
}

/**
 * Handle content subtab change with navigation tracking
 */
export function handleContentSubtabChange(
  newSubtab: NavigationState['tabPaths']['content']['subtab'],
  setActiveContentTab: (tab: string) => void
) {
  // Update the active subtab in the component
  setActiveContentTab(newSubtab);

  // Update navigation store
  navigationActions.setContentSubtab(newSubtab);
}

/**
 * Handle manage content sub-subtab change with navigation tracking
 */
export function handleManageSubtabChange(
  newSubtab: NavigationState['tabPaths']['content']['manageSubtab'],
  setActiveTab: (tab: string) => void
) {
  // Update the active sub-subtab in the component
  setActiveTab(newSubtab);

  // Update navigation store
  navigationActions.setManageSubtab(newSubtab);
}

/**
 * Initialize navigation state from URL and stored preferences
 * This should be called when components mount
 */
export function initializeNavigation(
  validTabs: string[],
  defaultTab: string
): {
  initialMainTab: string;
  contentNavigation: {
    subtab: NavigationState['tabPaths']['content']['subtab'];
    manageSubtab: NavigationState['tabPaths']['content']['manageSubtab'];
  } | null;
} {
  // First priority: URL parameter
  const urlTab = getTabFromUrl();
  const initialMainTab =
    urlTab && validTabs.includes(urlTab) ? urlTab : defaultTab;

  // Get stored navigation state
  const state = navigationStore.get();

  // If we're starting on the content tab, return the stored sub-navigation
  if (initialMainTab === 'content') {
    return {
      initialMainTab,
      contentNavigation: {
        subtab: state.tabPaths.content.subtab,
        manageSubtab: state.tabPaths.content.manageSubtab,
      },
    };
  }

  return {
    initialMainTab,
    contentNavigation: null,
  };
}

/**
 * Utility to check if we should restore sub-navigation when switching to a tab
 */
export function shouldRestoreNavigation(
  currentTab: string,
  newTab: string
): boolean {
  // Only restore if switching between different main tabs
  return currentTab !== newTab && newTab === 'content';
}
