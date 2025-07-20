import { atom } from 'nanostores';
import {
  saveBrandConfig as apiSave,
  getBrandConfig as apiGet,
} from '@/utils/api/brandConfig';
import type { BrandConfig } from '@/types/tractstack';

export const brandConfigStore = atom<BrandConfig | null>(null);

export async function getBrandConfig(tenantId: string): Promise<BrandConfig> {
  const cached = brandConfigStore.get();
  if (cached) return cached;
  const config = await apiGet(tenantId);
  brandConfigStore.set(config);
  return config;
}

export async function saveBrandConfig(
  tenantId: string,
  brandConfig: BrandConfig
): Promise<void> {
  const updatedConfig = await apiSave(tenantId, brandConfig);
  brandConfigStore.set(updatedConfig);
}
