import { TractStackAPI } from '../api';
import { convertToLocalState, convertToBackendFormat } from './brandHelpers';
import type { BrandConfig, BrandConfigState } from '@/types/tractstack';

export async function saveBrandConfig(
  tenantId: string,
  brandConfig: BrandConfig
): Promise<BrandConfig> {
  const api = new TractStackAPI(tenantId);
  try {
    const response = await api.put('/api/v1/config/brand', {
      ...brandConfig,
      SITE_INIT: true,
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to save brand configuration');
    }
    return response.data;
  } catch (error) {
    // If it's a network error (backend down), redirect to maintenance
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      window.location.href = `/maint?from=${encodeURIComponent(window.location.pathname)}`;
      throw error; // Still throw so caller knows something failed
    }
    throw error;
  }
}

export async function getBrandConfig(tenantId: string): Promise<BrandConfig> {
  const api = new TractStackAPI(tenantId);
  try {
    const response = await api.get('/api/v1/config/brand');
    if (!response.success) {
      // Check if it's a backend down scenario based on error message
      if (
        response.error &&
        (response.error.includes('Network error') ||
          response.error.includes('fetch failed'))
      ) {
        // Return empty/default config when backend is down
        return {
          SITE_INIT: false,
          WORDMARK_MODE: '',
          BRAND_COLOURS: '',
          OPEN_DEMO: false,
          HOME_SLUG: 'hello',
          TRACTSTACK_HOME_SLUG: 'HELLO',
          THEME: 'Default',
          SOCIALS: '',
          LOGO: '',
          WORDMARK: '',
          OG: '',
          OGLOGO: '',
          FAVICON: '',
          SITE_URL: '',
          SLOGAN: '',
          FOOTER: '',
          OGTITLE: '',
          OGAUTHOR: '',
          OGDESC: '',
          GTAG: '',
          STYLES_VER: 1,
          KNOWN_RESOURCES: {},
          HAS_AAI: false,
        } as BrandConfig;
      }
      throw new Error(response.error || 'Failed to get brand configuration');
    }
    return response.data;
  } catch (error) {
    // If it's a network error (backend down), return default config
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return {
        SITE_INIT: false,
        WORDMARK_MODE: '',
        BRAND_COLOURS: '',
        OPEN_DEMO: false,
        HOME_SLUG: 'hello',
        TRACTSTACK_HOME_SLUG: 'HELLO',
        THEME: 'Default',
        SOCIALS: '',
        LOGO: '',
        WORDMARK: '',
        OG: '',
        OGLOGO: '',
        FAVICON: '',
        SITE_URL: '',
        SLOGAN: '',
        FOOTER: '',
        OGTITLE: '',
        OGAUTHOR: '',
        OGDESC: '',
        GTAG: '',
        STYLES_VER: 1,
        KNOWN_RESOURCES: {},
        HAS_AAI: false,
      } as BrandConfig;
    }
    throw error;
  }
}

/**
 * Handle complete brand config save workflow including state updates
 */
export async function saveBrandConfigWithStateUpdate(
  tenantId: string,
  currentState: BrandConfigState
  //originalState: BrandConfigState
): Promise<BrandConfigState> {
  const backendFormat = convertToBackendFormat(currentState);

  try {
    // Send COMPLETE config, not just changed fields
    await saveBrandConfig(tenantId, backendFormat);

    // Get the complete updated config from backend
    const freshConfig = await getBrandConfig(tenantId);

    // Convert updated config back to local state format
    const newLocalState = convertToLocalState(freshConfig);

    return newLocalState;
  } catch (error) {
    throw error;
  }
}
