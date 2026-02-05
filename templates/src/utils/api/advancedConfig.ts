import { TractStackAPI } from '../api';
import type {
  AdvancedConfigStatus,
  AdvancedConfigUpdateRequest,
} from '@/types/tractstack';

/**
 * Get advanced configuration status (boolean flags only)
 */
export async function getAdvancedConfigStatus(
  tenantId: string
): Promise<AdvancedConfigStatus> {
  const api = new TractStackAPI(tenantId);
  try {
    const response = await api.get<AdvancedConfigStatus>(
      '/api/v1/config/advanced'
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'No data received from server');
    }

    const data = response.data;

    // Validate response structure
    if (
      typeof data.tursoConfigured !== 'boolean' ||
      typeof data.tursoTokenSet !== 'boolean' ||
      typeof data.adminPasswordSet !== 'boolean' ||
      typeof data.editorPasswordSet !== 'boolean' ||
      typeof data.aaiAPIKeySet !== 'boolean' ||
      typeof data.shopifyStorefrontTokenSet !== 'boolean' ||
      typeof data.shopifyApiSecretSet !== 'boolean' ||
      typeof data.shopifyStoreDomainSet !== 'boolean' ||
      typeof data.resendApiKeySet !== 'boolean'
    ) {
      throw new Error('Invalid response format from server');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch advanced config status:', error);
    throw new Error('Failed to load advanced configuration status');
  }
}

/**
 * Save advanced configuration
 */
export async function saveAdvancedConfig(
  tenantId: string,
  config: AdvancedConfigUpdateRequest
): Promise<void> {
  const api = new TractStackAPI(tenantId);
  try {
    const response = await api.put('/api/v1/config/advanced', config);

    if (!response.success) {
      throw new Error(response.error || 'Failed to save configuration');
    }
  } catch (error) {
    console.error('Failed to save advanced config:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to save advanced configuration');
  }
}
