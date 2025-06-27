// utils/validate-config.ts
import type { AstroIntegrationLogger } from 'astro';
import type { TractStackConfigWithAuth, TractStackConfigComplete } from '../config.js';
import { defineConfig } from '../config.js';

export function validateConfig(
  userConfig: TractStackConfigWithAuth,
  logger: AstroIntegrationLogger
): TractStackConfigComplete {
  // Use defineConfig to merge with defaults and validate
  const config = defineConfig(userConfig);

  // Log configuration summary
  logger.info('TractStack auth configuration applied');

  if (config.auth.enableDebugMode) {
    logger.info('Debug mode enabled - detailed logs will be available in browser console');
  }

  if (config.auth.requireConsent) {
    logger.info('Consent required for session persistence');
  }

  if (!config.auth.enableAutoSession) {
    logger.warn('Auto-session disabled - you must manually trigger session initialization');
  }

  // Validate environment at build time (non-blocking warnings)
  const goBackend = process.env.PUBLIC_GO_BACKEND;
  const tenantId = process.env.PUBLIC_TENANTID;

  if (!goBackend) {
    logger.warn('PUBLIC_GO_BACKEND not set - this will be required at runtime');
  } else {
    try {
      new URL(goBackend);
      logger.info(`Backend URL validated: ${goBackend}`);
    } catch {
      logger.error(`PUBLIC_GO_BACKEND is not a valid URL: ${goBackend}`);
    }
  }

  if (!tenantId) {
    logger.warn('PUBLIC_TENANTID not set - this will be required at runtime');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    logger.error(`PUBLIC_TENANTID contains invalid characters: ${tenantId}`);
  } else {
    logger.info(`Tenant ID validated: ${tenantId}`);
  }

  return config;
}
