import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AstroIntegrationLogger } from 'astro';

export async function injectTemplateFiles(
  resolve: (...paths: string[]) => string,
  logger: AstroIntegrationLogger
): Promise<void> {
  logger.info('TractStack: injectTemplateFiles called');

  const templateFiles = [
    // Middleware
    {
      src: resolve('templates/src/middleware.ts'),
      dest: 'src/middleware.ts'
    },
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
      // Always create the file (overwrite if exists for essential files)
      const isEssentialFile = file.dest.includes('index.astro') ||
        file.dest.includes('Layout.astro') ||
        file.dest.includes('visit.ts') ||
        file.dest.includes('middleware.ts');

      if (existsSync(file.dest) && !isEssentialFile) {
        logger.info(`Skipping ${file.dest} (already exists)`);
        continue;
      }

      // Ensure destination directory exists
      const destDir = dirname(file.dest);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      // Copy template file if source exists, otherwise create placeholder
      if (existsSync(file.src)) {
        copyFileSync(file.src, file.dest);
        logger.info(`Created ${file.dest}`);
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
  const filename = filePath.split('/').pop() || '';

  if (filename.endsWith('.astro')) {
    return `---
// TractStack ${filename}
// Generated placeholder - customize as needed
---

<div>
  <h1>TractStack ${filename}</h1>
  <p>This is a placeholder file. Customize it for your needs.</p>
</div>
`;
  }

  if (filename.endsWith('.tsx')) {
    return `// TractStack ${filename}
// Generated placeholder - customize as needed

interface Props {
  children?: React.ReactNode;
}

export default function ${filename.replace('.tsx', '')}({ children }: Props) {
  return (
    <div>
      <h1>TractStack ${filename}</h1>
      <p>This is a placeholder component. Customize it for your needs.</p>
      {children}
    </div>
  );
}
`;
  }

  if (filename.endsWith('.ts')) {
    return `// TractStack ${filename}
// Generated placeholder - customize as needed

export interface PlaceholderInterface {
  message: string;
}

export const placeholder: PlaceholderInterface = {
  message: 'This is a placeholder file. Customize it for your needs.'
};
`;
  }

  return `// TractStack ${filename}
// Generated placeholder - customize as needed
`;
}
