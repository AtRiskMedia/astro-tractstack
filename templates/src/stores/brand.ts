import { atom } from 'nanostores';
import type { BrandConfig } from '../types/tractstack';

// Server-side cache - persists across requests in SSR
export const brandConfigStore = atom<BrandConfig | null>(null);

export async function getBrandConfig(goBackend: string): Promise<BrandConfig> {
  const cached = brandConfigStore.get();
  if (cached) {
    return cached;
  }

  // Fetch from Go backend
  const response = await fetch(`${goBackend}/api/v1/config/brand`);
  const config = await response.json();

  // Cache in server-side store
  brandConfigStore.set(config);

  return config;
}
