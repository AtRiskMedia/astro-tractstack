import { copyFileSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AstroIntegrationLogger } from 'astro';

export async function injectTemplateFiles(
  resolve: (...paths: string[]) => string,
  logger: AstroIntegrationLogger
): Promise<void> {
  logger.info('TractStack: injectTemplateFiles called');

  const templateFiles = [
    // Middleware - SPECIAL HANDLING
    {
      src: resolve('templates/src/middleware.ts'),
      dest: 'src/middleware.ts',
      transform: true
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

      // Handle middleware transformation
      if (file.transform && file.dest.includes('middleware.ts')) {
        if (existsSync(file.src)) {
          const templateContent = readFileSync(file.src, 'utf8');
          const transformedContent = transformMiddleware(templateContent);
          writeFileSync(file.dest, transformedContent);
          logger.info(`Created and transformed ${file.dest}`);
        } else {
          logger.error(`Middleware template not found: ${file.src}`);
          // Create proper middleware manually since template is missing
          const manualMiddleware = createProperMiddleware();
          writeFileSync(file.dest, manualMiddleware);
          logger.info(`Created manual middleware ${file.dest}`);
        }
        continue;
      }

      // Normal file copying
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

function transformMiddleware(templateContent: string): string {
  // Add the proper Astro import at the top
  const astroImport = "import { defineMiddleware } from 'astro:middleware';\n\n";

  // Remove the comment about transformation
  let content = templateContent.replace(/\/\/ TEMPLATE:.*$/gm, '');
  content = content.replace(/\/\/ DO NOT ADD ASTRO IMPORTS HERE.*$/gm, '');

  // Replace the export function with defineMiddleware wrapper
  content = content.replace(
    /export const onRequest = async \(context: any, next: any\) => {/,
    'export const onRequest = defineMiddleware(async (context, next) => {'
  );

  // Add the import at the beginning
  content = astroImport + content;

  return content;
}

function createProperMiddleware(): string {
  return `import { defineMiddleware } from 'astro:middleware';

export interface TenantContext {
  id: string;
  domain: string;
  subdomain?: string;
  isMultiTenant: boolean;
  isLocalhost: boolean;
}

export interface SessionContext {
  fingerprint?: string;
  visitId?: string;
  consent?: string;
  hasProfile?: boolean;
  isReady: boolean;
}

function extractTenantFromHostname(hostname: string): TenantContext {
  const isLocalhost = hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('localhost:') ||
    hostname.startsWith('127.0.0.1:');

  if (isLocalhost) {
    return {
      id: 'default',
      domain: hostname,
      isMultiTenant: false,
      isLocalhost: true
    };
  }

  return {
    id: 'default',
    domain: hostname,
    isMultiTenant: false,
    isLocalhost: false
  };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach((cookie: string) => {
    const trimmed = cookie.trim();
    const equalIndex = trimmed.indexOf('=');
    
    if (equalIndex > 0) {
      const name = trimmed.substring(0, equalIndex);
      const value = trimmed.substring(equalIndex + 1);
      if (name && value) {
        cookies[name] = value;
      }
    }
  });
  
  return cookies;
}

export const onRequest = defineMiddleware(async (context, next) => {
  console.log('MIDDLEWARE RUNNING - URL:', context.url.pathname);
  
  const hostname = context.request.headers.get("x-forwarded-host") ||
    context.request.headers.get("host") ||
    context.url.hostname;

  if (!hostname) {
    return new Response("Missing hostname", { status: 400 });
  }

  const tenant = extractTenantFromHostname(hostname);

  // Parse cookies from request headers (can read HttpOnly cookies)
  const cookieHeader = context.request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);

  console.log('Middleware cookies:', cookies);

  // Session ready if we have fingerprint OR visit_id
  const hasFingerprint = !!(cookies.fp_id && cookies.fp_id.trim());
  const hasVisitId = !!(cookies.visit_id && cookies.visit_id.trim());
  const hasProfile = !!cookies.profile_token; // HttpOnly cookie only visible here
  const isSessionReady = hasFingerprint || hasVisitId;

  const session: SessionContext = {
    fingerprint: cookies.fp_id || undefined,
    visitId: cookies.visit_id || undefined,
    consent: cookies.consent || undefined,
    hasProfile: hasProfile,
    isReady: isSessionReady
  };

  console.log('Middleware - Session State:', {
    hasFingerprint,
    hasVisitId,
    hasProfile,
    isReady: isSessionReady,
    cookieCount: Object.keys(cookies).length
  });

  context.locals.tenant = tenant;
  context.locals.session = session;

  return next();
});`;
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
