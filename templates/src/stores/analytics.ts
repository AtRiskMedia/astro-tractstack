import { atom } from 'nanostores';
import { TractStackAPI } from '@/utils/api';

// Internal tenant-keyed storage
const tenantEpinetCustomFilters = atom<
  Record<
    string,
    {
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
    }
  >
>({});

const tenantFullContentMaps = atom<
  Record<
    string,
    {
      data: any[];
      lastUpdated: number;
    }
  >
>({});

// Helper to get current tenant ID
function getCurrentTenantId(): string {
  if (typeof window !== 'undefined' && window.TRACTSTACK_CONFIG?.tenantId) {
    return window.TRACTSTACK_CONFIG.tenantId;
  }
  return import.meta.env.PUBLIC_TENANTID || 'default';
}

// Default filter state
const defaultEpinetFilters = {
  enabled: false,
  visitorType: 'all' as 'all' | 'anonymous' | 'known',
  selectedUserId: null,
  startTimeUTC: null,
  endTimeUTC: null,
  userCounts: [],
  hourlyNodeActivity: {},
};

// Create tenant-aware atoms that work with useStore
const createEpinetFiltersStore = () => {
  const store = {
    get: () => {
      const tenantId = getCurrentTenantId();
      return tenantEpinetCustomFilters.get()[tenantId] || defaultEpinetFilters;
    },

    set: (tenantId: string, updates: any) => {
      const currentFilters =
        tenantEpinetCustomFilters.get()[tenantId] || defaultEpinetFilters;
      tenantEpinetCustomFilters.set({
        ...tenantEpinetCustomFilters.get(),
        [tenantId]: {
          ...currentFilters,
          ...updates,
        },
      });
    },

    subscribe: (callback: (value: any) => void) => {
      const tenantId = getCurrentTenantId();
      return tenantEpinetCustomFilters.subscribe((filters) => {
        callback(filters[tenantId] || defaultEpinetFilters);
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
  };

  return store;
};

const createFullContentMapStore = () => {
  const store = {
    get: () => {
      const tenantId = getCurrentTenantId();
      return tenantFullContentMaps.get()[tenantId] || null;
    },

    set: (tenantId: string, data: { data: any[]; lastUpdated: number }) => {
      tenantFullContentMaps.set({
        ...tenantFullContentMaps.get(),
        [tenantId]: data,
      });
    },

    subscribe: (callback: (value: any) => void) => {
      const tenantId = getCurrentTenantId();
      return tenantFullContentMaps.subscribe((maps) => {
        callback(maps[tenantId] || null);
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
  };

  return store;
};

export const epinetCustomFilters = createEpinetFiltersStore();
export const fullContentMapStore = createFullContentMapStore();

export async function getFullContentMap(tenantId: string): Promise<any[]> {
  const api = new TractStackAPI(tenantId);

  // Check tenant-specific cache
  const cached = tenantFullContentMaps.get()[tenantId];

  try {
    const response = await api.getContentMapWithTimestamp(cached?.lastUpdated);

    if (response.success && response.data) {
      // Update tenant-specific cache
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
