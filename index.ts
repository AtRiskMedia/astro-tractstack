import type { AstroIntegration } from 'astro';
import type { TractStackConfig } from '@/types/tractstack';
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

        // Check for multi-tenant environment variable
        const enableMultiTenant = userConfig.enableMultiTenant || false;
        logger.info(
          `DEBUG: enableMultiTenant = ${enableMultiTenant}, process.env.PUBLIC_ENABLE_MULTI_TENANT = ${process.env.PUBLIC_ENABLE_MULTI_TENANT}`
        );

        logger.info('TractStack: Starting file injection...');
        await injectTemplateFiles(resolveTemplate, logger, {
          includeExamples: userConfig.includeExamples,
          enableMultiTenant,
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
              'import.meta.env.PUBLIC_ENABLE_MULTI_TENANT': JSON.stringify(
                enableMultiTenant.toString()
              ),
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
            build: {
              chunkSizeWarningLimit: 650,
            },
            ssr: {
              noExternal: [
                'path-to-regexp',
                '@ark-ui/react',
                '@heroicons/react',
                '@nanostores/react',
                'nanostores',
                'recharts',
                'd3',
                'd3-sankey',
                '@internationalized/date',
                'player.js',
              ],
            },
            optimizeDeps: {
              include: [
                '@heroicons/react/24/outline',
                '@heroicons/react/20/solid',
                '@heroicons/react/24/solid',
                '@ark-ui/react',
                '@nanostores/react',
                'nanostores',
                'recharts',
                'd3',
                'd3-sankey',
                '@internationalized/date',
              ],
            },
          },
        });

        logger.info('TractStack integration configured successfully!');
      },
    },
  };
}
