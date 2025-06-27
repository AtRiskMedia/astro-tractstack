import { copyFileSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AstroIntegrationLogger } from 'astro';

export async function injectTemplateFiles(
  resolve: (...paths: string[]) => string,
  logger: AstroIntegrationLogger
): Promise<void> {
  logger.info('TractStack: injectTemplateFiles called');

  const templateFiles = [
    // Basic layout and pages
    {
      src: resolve('templates/src/layouts/Layout.astro'),
      dest: 'src/layouts/Layout.astro'
    },
    {
      src: resolve('templates/src/pages/index.astro'),
      dest: 'src/pages/index.astro'
    },

    // API endpoints
    {
      src: resolve('templates/src/pages/api/auth/visit.ts'),
      dest: 'src/pages/api/auth/visit.ts'
    },

    // Components
    {
      src: resolve('templates/src/components/Fragment.astro'),
      dest: 'src/components/Fragment.astro'
    },
    {
      src: resolve('templates/src/components/Counter.tsx'),
      dest: 'src/components/Counter.tsx'
    },
    {
      src: resolve('templates/src/components/auth/SessionInit.astro'),
      dest: 'src/components/auth/SessionInit.astro'
    },

    // Auth utilities
    {
      src: resolve('templates/src/utils/auth/sessionManager.ts'),
      dest: 'src/utils/auth/sessionManager.ts'
    },
    {
      src: resolve('templates/src/utils/sessionSync.ts'),
      dest: 'src/utils/sessionSync.ts'
    },

    // Types and utilities
    {
      src: resolve('templates/src/types/tractstack.ts'),
      dest: 'src/types/tractstack.ts'
    },
    {
      src: resolve('templates/src/utils/api.ts'),
      dest: 'src/utils/api.ts'
    },

    // Project files
    {
      src: resolve('templates/.gitignore'),
      dest: '.gitignore'
    }
  ];

  for (const file of templateFiles) {
    try {
      // Ensure destination directory exists
      const destDir = dirname(file.dest);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      // Always overwrite all template files (they are all essential)
      if (existsSync(file.src)) {
        copyFileSync(file.src, file.dest);
        logger.info(`Updated ${file.dest}`);
      } else {
        // Create basic placeholder for missing templates
        const placeholder = createPlaceholder(file.dest);
        writeFileSync(file.dest, placeholder);
        logger.info(`Created placeholder ${file.dest}`);
      }
    } catch (error) {
      logger.error(`Failed to create ${file.dest}: ${error}`);
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
export default function Placeholder() {
  return <div>TractStack placeholder: ${filePath}</div>;
}`;
  }

  if (filePath.endsWith('.ts')) {
    return `// TractStack placeholder utility
export const placeholder = "${filePath}";`;
  }

  return `# TractStack placeholder: ${filePath}`;
}
