import type { APIRoute } from '@/types/astro';
import { createTailwindcss } from '@mhsdesign/jit-browser-tailwindcss';
import fs from 'node:fs/promises';
import path from 'node:path';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { html } = await request.json();

    // Read base tailwind config from project root
    const configPath = path.join(process.cwd(), 'tailwind.config.cjs');
    const configContent = await fs.readFile(configPath, 'utf-8');

    // Eval the config file to get the object
    const tailwindConfig = new Function(
      'module',
      'exports',
      configContent + '; return module.exports;'
    )({ exports: {} }, {});

    // Create a disposable JIT instance for this specific HTML snippet
    const tailwindCss = createTailwindcss({
      tailwindConfig: {
        ...tailwindConfig,
        content: [{ raw: html, extension: 'html' }],
        corePlugins: { preflight: false }, // Disable reset to keep styles scoped
      },
    });

    const generatedCss = await tailwindCss.generateStylesFromContent(
      `@tailwind utilities;`,
      [html]
    );

    return new Response(
      JSON.stringify({
        success: true,
        css: generatedCss,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('CSS Compilation Error:', error);
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
