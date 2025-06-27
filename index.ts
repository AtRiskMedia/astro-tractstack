import type { AstroIntegration } from 'astro';
import node from '@astrojs/node';
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

        // FORCE SSR mode - override any existing configuration
        logger.info('TractStack: Configuring SSR mode...');

        updateConfig({
          output: 'server',
          adapter: node({ mode: 'standalone' }),
          vite: {
            define: {
              __TRACTSTACK_VERSION__: JSON.stringify('2.0.0')
            }
          }
        });

        logger.info('TractStack: SSR configuration applied');
        logger.info('TractStack integration configured successfully!');
      },

      'astro:config:done': ({ config, logger }) => {
        // VALIDATE that SSR mode was actually applied
        if (config.output !== 'server') {
          logger.error(`TractStack requires SSR mode but output is: ${config.output}`);
          logger.error('TractStack integration must be loaded BEFORE other integrations that set output mode');
          throw new Error('TractStack integration failed: SSR mode not applied. Ensure tractstack() is first in your integrations array.');
        }

        if (!config.adapter) {
          logger.error('TractStack requires Node.js adapter but no adapter is configured');
          throw new Error('TractStack integration failed: Node.js adapter not applied');
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
