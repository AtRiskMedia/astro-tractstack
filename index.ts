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

        // Check SSR configuration
        if (config.output !== 'server') {
          logger.error('TractStack requires SSR mode. Please set output: "server" in your astro.config.mjs');
          throw new Error('TractStack requires SSR mode. Please set output: "server" in your astro.config.mjs');
        }

        if (!config.adapter) {
          logger.error('TractStack requires an SSR adapter. Please add @astrojs/node adapter to your astro.config.mjs');
          throw new Error('TractStack requires an SSR adapter. Please add @astrojs/node adapter to your astro.config.mjs');
        }

        // Update vite config for compatibility
        updateConfig({
          vite: {
            define: {
              __TRACTSTACK_VERSION__: JSON.stringify('2.0.0')
            },
            ssr: {
              noExternal: ['path-to-regexp']
            }
          }
        });

        logger.info('TractStack integration configured successfully!');
      },

      'astro:config:done': ({ config, logger }) => {
        // Verify configuration
        if (config.output !== 'server') {
          logger.error(`TractStack requires SSR mode but output is: ${config.output}`);
          throw new Error('TractStack integration failed: SSR mode not configured');
        }

        if (!config.adapter) {
          logger.error('TractStack requires an adapter but none is configured');
          throw new Error('TractStack integration failed: No adapter configured');
        }

        logger.info('✅ TractStack SSR configuration verified');

        // Environment variable validation
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
