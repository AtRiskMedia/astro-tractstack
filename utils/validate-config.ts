import type { AstroIntegrationLogger } from 'astro';
import type { TractStackConfig } from '../types.js';
import { mergeConfig } from '../config.js';

export function validateConfig(
  userConfig: TractStackConfig,
  logger: AstroIntegrationLogger
): Required<TractStackConfig> {
  // Merge user config with defaults
  const config = mergeConfig(userConfig);

  // Check if environment variables exist (for build-time validation)
  const goBackend = process.env.PUBLIC_GO_BACKEND;
  const tenantId = process.env.PUBLIC_TENANTID;

  if (!goBackend) {
    logger.warn('PUBLIC_GO_BACKEND not set in environment');
  }

  if (!tenantId) {
    logger.warn('PUBLIC_TENANTID not set in environment');
  }

  return config;
}
