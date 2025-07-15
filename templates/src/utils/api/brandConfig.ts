import { TractStackAPI } from '../api';
import type { BrandConfig } from '../../types/tractstack';

const api = new TractStackAPI();

export async function saveBrandConfig(
  brandConfig: BrandConfig
): Promise<BrandConfig> {
  const response = await api.put('/api/v1/config/brand', brandConfig);
  if (!response.success) {
    throw new Error(response.error || 'Failed to save brand configuration');
  }
  return response.data;
}

export async function getBrandConfig(): Promise<BrandConfig> {
  const response = await api.get('/api/v1/config/brand');
  if (!response.success) {
    throw new Error(response.error || 'Failed to get brand configuration');
  }
  return response.data;
}
