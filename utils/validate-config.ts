// utils/validate-config.ts
import type { TractStackConfig, AstroIntegrationLogger } from '@/types/astro';

export function validateConfig(
  userConfig: TractStackConfig,
  logger: AstroIntegrationLogger
): TractStackConfig {
  // Log configuration summary
  logger.info('TractStack configuration applied');

  if (userConfig.enableMultiTenant) {
    logger.info('Multi-tenant mode enabled');
  }

  if (userConfig.includeExamples) {
    logger.info('Example components will be included');
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

  return userConfig;
}
