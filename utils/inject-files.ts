import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'child_process';
import type { AstroIntegrationLogger } from 'astro';

export async function injectTemplateFiles(
  resolve: (...paths: string[]) => string,
  logger: AstroIntegrationLogger
): Promise<void> {
  logger.info('TractStack: injectTemplateFiles called');

  const templateFiles = [
    {
      src: resolve('templates/src/layouts/Layout.astro'),
      dest: 'src/layouts/Layout.astro',
    },
    {
      src: resolve('templates/src/pages/index.astro'),
      dest: 'src/pages/index.astro',
    },
    {
      src: resolve('templates/src/pages/api/auth/visit.ts'),
      dest: 'src/pages/api/auth/visit.ts',
    },
    {
      src: resolve('templates/src/components/Fragment.astro'),
      dest: 'src/components/Fragment.astro',
    },
    {
      src: resolve('templates/src/components/Counter.tsx'),
      dest: 'src/components/Counter.tsx',
    },
    {
      src: resolve('templates/src/components/auth/SessionInit.astro'),
      dest: 'src/components/auth/SessionInit.astro',
    },
    {
      src: resolve('templates/src/utils/sessionSync.ts'),
      dest: 'src/utils/sessionSync.ts',
    },
    {
      src: resolve('templates/src/types/tractstack.ts'),
      dest: 'src/types/tractstack.ts',
    },
    { src: resolve('templates/src/utils/api.ts'), dest: 'src/utils/api.ts' },
    { src: resolve('templates/.gitignore'), dest: '.gitignore' },
    {
      src: resolve('templates/src/pages/profile.astro'),
      dest: 'src/pages/profile.astro',
    },
    {
      src: resolve('templates/src/pages/api/profile.ts'),
      dest: 'src/pages/api/profile.ts',
    },
    {
      src: resolve('templates/src/components/profile/ProfileSwitch.tsx'),
      dest: 'src/components/profile/ProfileSwitch.tsx',
    },
    {
      src: resolve('templates/src/components/profile/ProfileCreate.tsx'),
      dest: 'src/components/profile/ProfileCreate.tsx',
    },
    {
      src: resolve('templates/src/components/profile/ProfileEdit.tsx'),
      dest: 'src/components/profile/ProfileEdit.tsx',
    },
    {
      src: resolve('templates/src/components/profile/ProfileUnlock.tsx'),
      dest: 'src/components/profile/ProfileUnlock.tsx',
    },
    {
      src: resolve('templates/src/utils/profileStorage.ts'),
      dest: 'src/utils/profileStorage.ts',
    },
    {
      src: resolve('templates/css/custom.css'),
      dest: 'public/styles/custom.css',
    },
    {
      src: resolve('templates/css/frontend.css'),
      dest: 'public/styles/frontend.css',
    },
    {
      src: resolve('templates/css/storykeep.css'),
      dest: 'public/styles/storykeep.css',
    },
    {
      src: resolve('templates/fonts/Inter-Black.woff2'),
      dest: 'public/fonts/Inter-Black.woff2',
    },
    {
      src: resolve('templates/fonts/Inter-Bold.woff2'),
      dest: 'public/fonts/Inter-Bold.woff2',
    },
    {
      src: resolve('templates/fonts/Inter-Regular.woff2'),
      dest: 'public/fonts/Inter-Regular.woff2',
    },
    {
      src: resolve('templates/tailwind.config.cjs'),
      dest: 'tailwind.config.cjs',
    },
  ];

  for (const file of templateFiles) {
    try {
      const destDir = dirname(file.dest);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      const shouldOverwrite =
        file.dest === 'tailwind.config.cjs' ||
        file.dest.startsWith('src/') ||
        file.dest === '.gitignore';

      if (!existsSync(file.dest) || shouldOverwrite) {
        if (existsSync(file.src)) {
          copyFileSync(file.src, file.dest);
          logger.info(`Updated ${file.dest}`);
        } else {
          const placeholder = createPlaceholder(file.dest);
          writeFileSync(file.dest, placeholder);
          logger.info(`Created placeholder ${file.dest}`);
        }
      } else {
        logger.info(`Skipped existing ${file.dest}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create ${file.dest}: ${message}`);
    }
  }
}

function createPlaceholder(filePath: string): string {
  if (filePath.endsWith('.astro')) {
    return `---
// TractStack placeholder component
---
<div>TractStack placeholder: ${filePath}</div>`;
  }

  if (filePath.endsWith('.tsx')) {
    return `// TractStack placeholder component
import React from 'react';
export default function Placeholder() {
  return <div>TractStack placeholder: ${filePath}</div>;
}`;
  }

  if (filePath.endsWith('.ts')) {
    return `// TractStack placeholder utility
export const placeholder = "${filePath}";`;
  }

  if (filePath.endsWith('.cjs')) {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};`;
  }

  return `# TractStack placeholder: ${filePath}`;
}
