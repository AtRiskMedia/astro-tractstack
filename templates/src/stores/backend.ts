import { atom } from 'nanostores';

interface FreshInstallState {
  needsSetup: boolean;
  activeTenants: string[];
  lastChecked: number;
}

export const freshInstallStore = atom<FreshInstallState>({
  needsSetup: true,
  activeTenants: [],
  lastChecked: 0,
});

// Cache duration: 5 minutes (to avoid indefinite caching)
export const FRESH_INSTALL_CACHE_DURATION = 5 * 60 * 1000;
