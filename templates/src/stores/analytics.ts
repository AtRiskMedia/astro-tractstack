import { atom, computed } from 'nanostores';
import { TractStackAPI } from '@/utils/api';

interface AvailableFilter {
  beliefSlug: string;
  values: string[];
}

export interface AppliedFilter {
  beliefSlug: string;
  value: string;
}

export interface EpinetFiltersState {
  enabled: boolean;
  visitorType: 'all' | 'anonymous' | 'known';
  selectedUserId: string | null;
  startTimeUTC: string | null;
  endTimeUTC: string | null;
  userCounts: Array<{ id: string; count: number; isKnown: boolean }>;
  hourlyNodeActivity: Record<
    string,
    Record<
      string,
      {
        events: Record<string, number>;
        visitorIds: string[];
      }
    >
  >;
  availableFilters: AvailableFilter[];
  appliedFilters: AppliedFilter[];
}

export interface TenantFullContentMapState {
  data: any[];
  lastUpdated: number;
}

const tenantEpinetCustomFilters = atom<Record<string, EpinetFiltersState>>({});

const tenantFullContentMaps = atom<Record<string, TenantFullContentMapState>>(
  {}
);

function getCurrentTenantId(): string {
  const resolvedTenantId =
    (typeof window !== 'undefined' && window.TRACTSTACK_CONFIG?.tenantId) ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';
  return resolvedTenantId;
}

const defaultEpinetFilters: EpinetFiltersState = {
  enabled: false,
  visitorType: 'all',
  selectedUserId: null,
  startTimeUTC: null,
  endTimeUTC: null,
  userCounts: [],
  hourlyNodeActivity: {},
  availableFilters: [],
  appliedFilters: [],
};

export const epinetCustomFilters = computed(
  tenantEpinetCustomFilters,
  (filters) => {
    const tenantId = getCurrentTenantId();
    return filters[tenantId] || defaultEpinetFilters;
  }
);

export function getEpinetCustomFilters(): EpinetFiltersState {
  return epinetCustomFilters.get();
}

export function setEpinetCustomFilters(
  tenantId: string,
  updates: Partial<EpinetFiltersState>
): void {
  const currentFilters =
    tenantEpinetCustomFilters.get()[tenantId] || defaultEpinetFilters;
  tenantEpinetCustomFilters.set({
    ...tenantEpinetCustomFilters.get(),
    [tenantId]: {
      ...currentFilters,
      ...updates,
    },
  });
}

export const fullContentMapStore = computed(tenantFullContentMaps, (maps) => {
  const tenantId = getCurrentTenantId();
  return maps[tenantId] || null;
});

export function setTenantFullContentMap(
  tenantId: string,
  data: TenantFullContentMapState
): void {
  tenantFullContentMaps.set({
    ...tenantFullContentMaps.get(),
    [tenantId]: data,
  });
}

// Synchronous in-process accessor for the warm content-map atom, keyed on an
// explicit tenantId (unlike fullContentMapStore.get(), which keys on
// getCurrentTenantId() and resolves the wrong tenant during SSR sub-requests).
// Returns [] on a cold miss; codehook blades fall back to the async
// getFullContentMap(tenantId) when this is empty.
export function getCachedFullContentMap(tenantId: string): any[] {
  return tenantFullContentMaps.get()[tenantId]?.data ?? [];
}

export async function getFullContentMap(tenantId: string): Promise<any[]> {
  const api = new TractStackAPI(tenantId);
  const cached = tenantFullContentMaps.get()[tenantId];

  try {
    const response = await api.getContentMapWithTimestamp(cached?.lastUpdated);

    if (response.success && response.data) {
      const newData = {
        data: response.data.data,
        lastUpdated: response.data.lastUpdated,
      };

      tenantFullContentMaps.set({
        ...tenantFullContentMaps.get(),
        [tenantId]: newData,
      });

      return newData.data;
    } else {
      const errorMsg = response.error || '';
      if (errorMsg.includes('304')) {
        return cached?.data || [];
      }
    }
  } catch (error) {
    console.error('Failed to fetch content map:', error);
  }
  return cached?.data || [];
}
