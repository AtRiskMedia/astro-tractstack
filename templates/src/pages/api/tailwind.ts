import type { APIRoute } from '@/types/astro';
import { createTailwindcss } from '@mhsdesign/jit-browser-tailwindcss';
import fs from 'node:fs/promises';
import path from 'node:path';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { dirtyPaneIds, dirtyClasses } = await request.json();

    const tenantId =
      request.headers.get('X-Tenant-ID') ||
      import.meta.env.PUBLIC_TENANTID ||
      'default';
    const isMultiTenant =
      import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === 'true' &&
      tenantId !== 'default';

    if (isMultiTenant) {
      return new Response('CSS generation disabled in multi-tenant mode', {
        status: 403,
      });
    }

    // Read tailwind config from project root
    const configPath = path.join(process.cwd(), 'tailwind.config.cjs');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const tailwindConfig = new Function(
      'module',
      'exports',
      configContent + '; return module.exports;'
    )({ exports: {} }, {});

    const goBackend =
      import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

    // Forward authentication cookies to the backend
    const cookieHeader = request.headers.get('cookie') || '';

    // Get classes from Go backend (includes whitelist + clean panes)
    const classesResponse = await fetch(
      `${goBackend}/api/v1/tailwind/classes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({ excludePaneIds: dirtyPaneIds || [] }),
      }
    );

    if (!classesResponse.ok) {
      throw new Error(
        `Failed to get classes from Go backend: ${classesResponse.status}`
      );
    }

    const { classes: cleanClasses } = await classesResponse.json();

    // Combine clean classes from backend with dirty classes from frontend
    const allClasses = [
      ...new Set([...(cleanClasses || []), ...(dirtyClasses || [])]),
    ];

    // Generate CSS using JIT
    const tailwindCss = createTailwindcss({ tailwindConfig });
    const htmlContent = [`<span class="${allClasses.join(' ')}"></span>`];
    const generatedCss = await tailwindCss.generateStylesFromContent(
      `@tailwind base; @tailwind utilities;`,
      htmlContent
    );

    return new Response(
      JSON.stringify({
        success: true,
        classes: allClasses.length,
        frontend: generatedCss.length,
        stylesVer: Date.now(),
        generatedCss,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Tailwind Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
