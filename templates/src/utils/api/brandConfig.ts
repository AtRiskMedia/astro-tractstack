import { TractStackAPI } from '../api';
import { brandConfigStore } from '../../stores/brand';
import type { BrandConfig, BrandConfigState } from '../../types/tractstack';
import { convertToLocalState, convertToBackendFormat } from '../brandHelpers';

const VERBOSE = true;

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

/**
 * Handle complete brand config save workflow including state updates
 */
export async function saveBrandConfigWithStateUpdate(
  currentState: BrandConfigState,
  originalState: BrandConfigState
): Promise<BrandConfigState> {
  const backendFormat = convertToBackendFormat(currentState);
  const originalBackendFormat = convertToBackendFormat(originalState);

  // Filter to only changed fields
  const changedFields: Partial<BrandConfig> = {};
  Object.keys(backendFormat).forEach((key) => {
    const typedKey = key as keyof BrandConfig;
    if (backendFormat[typedKey] !== originalBackendFormat[typedKey]) {
      (changedFields as any)[typedKey] = backendFormat[typedKey];
    }
  });

  // Only send if there are actual changes
  if (Object.keys(changedFields).length === 0) {
    if (VERBOSE) console.log('ℹ️ No changes detected, skipping save');
    return currentState;
  }

  if (VERBOSE) console.log('🚀 Saving brand config changes:', changedFields);

  try {
    // Save to backend and get updated config
    const updatedConfig = await saveBrandConfig(changedFields as BrandConfig);

    if (VERBOSE)
      console.log('✅ Brand config saved successfully:', updatedConfig);

    // Update the brand store
    brandConfigStore.set(updatedConfig);

    // Convert updated config back to local state format
    const newLocalState = convertToLocalState(updatedConfig);

    return newLocalState;
  } catch (error) {
    if (VERBOSE) console.error('❌ Failed to save brand config:', error);
    throw error;
  }
}
