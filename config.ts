import type { TractStackConfig } from './types.js';

/**
 * Define TractStack configuration with TypeScript support
 */
export function defineConfig(config: TractStackConfig): TractStackConfig {
  return config;
}

/**
 * Default configuration values
 */
export const defaultConfig: Required<TractStackConfig> = {
  theme: {
    colorScheme: 'auto',
    customCss: undefined
  },
  htmx: {
    version: '2.0.4',
    extensions: []
  },
  dev: {
    debug: false
  }
};

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: TractStackConfig): Required<TractStackConfig> {
  return {
    theme: {
      colorScheme: userConfig.theme?.colorScheme ?? defaultConfig.theme.colorScheme,
      customCss: userConfig.theme?.customCss ?? defaultConfig.theme.customCss
    },
    htmx: {
      version: userConfig.htmx?.version ?? defaultConfig.htmx.version,
      extensions: userConfig.htmx?.extensions ?? defaultConfig.htmx.extensions
    },
    dev: {
      debug: userConfig.dev?.debug ?? defaultConfig.dev.debug
    }
  };
}
