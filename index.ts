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
        const tractStackConfig = validateConfig(userConfig, logger);

        logger.info('TractStack: Starting file injection...');

        // Inject files FIRST
        await injectTemplateFiles(resolve, logger);

        logger.info('TractStack: File injection complete.');
        logger.info('TractStack: Middleware file should be auto-detected by Astro');

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
        const requiredEnvVars = ['PUBLIC_GO_BACKEND', 'PUBLIC_TENANTID'];
        const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

        if (missing.length > 0) {
          logger.warn(`Missing environment variables: ${missing.join(', ')}`);
          logger.info('Run setup: npx create-tractstack');
        } else {
          logger.info(`TractStack configured for tenant: ${process.env.PUBLIC_TENANTID}`);
          logger.info(`Backend URL: ${process.env.PUBLIC_GO_BACKEND}`);
        }
      }
    }
  };
}

export { tractstack };

export type { TractStackConfig } from './types.js';
export { defineConfig } from './config.js';
