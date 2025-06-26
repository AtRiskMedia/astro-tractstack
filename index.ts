import type { AstroIntegration } from 'astro';
import type { TractStackConfig } from './types.js';
import { createResolver } from './utils/create-resolver.js';
import { validateConfig } from './utils/validate-config.js';
import { injectTemplateFiles } from './utils/inject-files.js';

export default function tractstack(userConfig: TractStackConfig = {}): AstroIntegration {
  const { resolve } = createResolver(import.meta.url);

  return {
    name: 'astro-tractstack',
    hooks: {
      'astro:config:setup': async ({
        config,
        updateConfig,
        logger
      }) => {
        // Validate and merge user config with defaults
        const tractStackConfig = validateConfig(userConfig, logger);

        logger.info('TractStack: Starting file injection...');

        // Inject template files into the project
        await injectTemplateFiles(resolve, logger);

        logger.info('TractStack: File injection complete.');

        // Simple Astro config update - no virtual modules
        updateConfig({
          vite: {
            define: {
              __TRACTSTACK_VERSION__: JSON.stringify('2.0.0')
            }
          }
        });

        logger.info('TractStack integration configured successfully!');
      },

      'astro:config:done': ({ config, logger }) => {
        // Validate environment variables
        const requiredEnvVars = ['PUBLIC_GO_BACKEND', 'PUBLIC_TENANTID'];
        const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

        if (missing.length > 0) {
          logger.warn(`Missing environment variables: ${missing.join(', ')}`);
          logger.info('Run setup: npx create-tractstack');
        }
      }
    }
  };
}

// Named export for the integration
export { tractstack };

// Export types and utilities
export type { TractStackConfig } from './types.js';
export { defineConfig } from './config.js';
