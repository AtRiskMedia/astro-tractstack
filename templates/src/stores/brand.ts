import { atom } from 'nanostores';
import {
  saveBrandConfig as apiSave,
  getBrandConfig as apiGet,
} from '@/utils/api/brandConfig';
import type { BrandConfig } from '@/types/tractstack';

// Internal tenant-keyed storage
const tenantBrandConfigs = atom<Record<string, BrandConfig>>({});

// Helper to get current tenant ID
function getCurrentTenantId(): string {
  if (typeof window !== 'undefined' && window.TRACTSTACK_CONFIG?.tenantId) {
    return window.TRACTSTACK_CONFIG.tenantId;
  }
  return import.meta.env.PUBLIC_TENANTID || 'default';
}

// Create tenant-aware atom that works with useStore
const createBrandConfigStore = () => {
  const store = {
    get: () => {
      const tenantId = getCurrentTenantId();
      return tenantBrandConfigs.get()[tenantId] || null;
    },

    set: (tenantId: string, config: BrandConfig) => {
      tenantBrandConfigs.set({
        ...tenantBrandConfigs.get(),
        [tenantId]: config,
      });
    },

    subscribe: (callback: (value: BrandConfig | null) => void) => {
      const tenantId = getCurrentTenantId();
      return tenantBrandConfigs.subscribe((configs) => {
        callback(configs[tenantId] || null);
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

export const brandConfigStore = createBrandConfigStore();

export async function getBrandConfig(tenantId: string): Promise<BrandConfig> {
  // Check tenant-specific cache
  const cached = tenantBrandConfigs.get()[tenantId];
  if (cached) return cached;

  // Fetch from API
  const config = await apiGet(tenantId);

  // Store in tenant-specific cache
  tenantBrandConfigs.set({
    ...tenantBrandConfigs.get(),
    [tenantId]: config,
  });

  return config;
}

export async function saveBrandConfig(
  tenantId: string,
  brandConfig: BrandConfig
): Promise<void> {
  // Save via API
  const updatedConfig = await apiSave(tenantId, brandConfig);

  // Update tenant-specific cache
  tenantBrandConfigs.set({
    ...tenantBrandConfigs.get(),
    [tenantId]: updatedConfig,
  });
}
