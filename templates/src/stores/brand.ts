import { atom } from 'nanostores';
import {
  saveBrandConfig as apiSave,
  getBrandConfig as apiGet,
} from '../utils/api/brandConfig';
import type { BrandConfig } from '../types/tractstack';

export const brandConfigStore = atom<BrandConfig | null>(null);

export async function getBrandConfig(goBackend: string): Promise<BrandConfig> {
  const cached = brandConfigStore.get();
  if (cached) return cached;

  const config = await apiGet();
  brandConfigStore.set(config);
  return config;
}

export async function saveBrandConfig(
  goBackend: string,
  brandConfig: BrandConfig
): Promise<void> {
  const updatedConfig = await apiSave(brandConfig);
  brandConfigStore.set(updatedConfig);
}
