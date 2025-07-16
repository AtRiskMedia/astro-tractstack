import type { AstroIntegration } from 'astro';
import type { TractStackConfig } from './types.js';
import { createResolver } from './utils/create-resolver.js';
import { validateConfig } from './utils/validate-config.js';
import { injectTemplateFiles } from './utils/inject-files.js';
import { resolve } from 'path';

export default function tractstack(
  userConfig: TractStackConfig = {}
): AstroIntegration {
  const { resolve: resolveTemplate } = createResolver(import.meta.url);

  return {
    name: 'astro-tractstack',
    hooks: {
      'astro:config:setup': async ({ config, updateConfig, logger }) => {
        const tractStackConfig = validateConfig(userConfig, logger);

        logger.info('TractStack: Starting file injection...');
        await injectTemplateFiles(resolveTemplate, logger, {
          includeExamples: userConfig.includeExamples,
        });
        logger.info('TractStack: File injection complete.');

        if (config.output !== 'server') {
          logger.error(
            'TractStack requires SSR mode. Please set output: "server" in your astro.config.mjs'
          );
          throw new Error(
            'TractStack requires SSR mode. Please set output: "server" in your astro.config.mjs'
          );
        }

        if (!config.adapter) {
          logger.error(
            'TractStack requires an SSR adapter. Please add @astrojs/node adapter to your astro.config.mjs'
          );
          throw new Error(
            'TractStack requires an SSR adapter. Please add @astrojs/node adapter to your astro.config.mjs'
          );
        }

        updateConfig({
          vite: {
            define: {
              __TRACTSTACK_VERSION__: JSON.stringify('2.0.0-alpha.1'),
            },
            resolve: {
              alias: {
                '@': resolve(process.cwd(), 'src'),
                '@/components': resolve(process.cwd(), 'src/components'),
                '@/utils': resolve(process.cwd(), 'src/utils'),
                '@/types': resolve(process.cwd(), 'src/types'),
                '@/layouts': resolve(process.cwd(), 'src/layouts'),
                '@/pages': resolve(process.cwd(), 'src/pages'),
              },
            },
            ssr: {
              noExternal: ['path-to-regexp', '@ark-ui/react'],
            },
            optimizeDeps: {
              include: [
                '@heroicons/react/24/outline',
                '@heroicons/react/20/solid',
              ],
            },
          },
        });

        logger.info('TractStack integration configured successfully!');
      },
    },
  };
}
