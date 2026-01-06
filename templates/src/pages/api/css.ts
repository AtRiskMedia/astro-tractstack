import type { APIRoute } from '@/types/astro';
import { createTailwindcss } from '@mhsdesign/jit-browser-tailwindcss';
import fs from 'node:fs/promises';
import path from 'node:path';
import postcss, { type Rule, type AtRule } from 'postcss';
import selectorParser, {
  type Root,
  type ClassName,
} from 'postcss-selector-parser';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { html, css: userCss } = await request.json();

    const configPath = path.join(process.cwd(), 'tailwind.config.cjs');
    const configContent = await fs.readFile(configPath, 'utf-8');

    const tailwindConfig = new Function(
      'module',
      'exports',
      configContent + '; return module.exports;'
    )({ exports: {} }, {});

    const tailwindCss = createTailwindcss({
      tailwindConfig: {
        ...tailwindConfig,
        content: [{ raw: html, extension: 'html' }],
        corePlugins: { preflight: false },
      },
    });

    const generatedCss = await tailwindCss.generateStylesFromContent(
      `@tailwind utilities;`,
      [html]
    );

    const combinedCss = `${generatedCss}\n${userCss || ''}`;

    const classMap: Record<string, string> = {};
    const ruleMap: Record<string, string> = {};
    const cssBuffer: { hash: string; body: string }[] = [];
    const mediaBuckets: { minWidth: number; hash: string; body: string }[] = [];

    const hashString = (str: string) => {
      let hash = 5381,
        i = str.length;
      while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
      return (hash >>> 0).toString(16);
    };

    const hashPlugin = () => {
      return {
        postcssPlugin: 'hash-styles',
        Root(root: any) {
          root.walkRules((rule: Rule) => {
            const ruleHash = `t8k-${hashString(rule.toString())}`;

            const transformSelector = selectorParser((selectors: Root) => {
              selectors.walkClasses((classNode: ClassName) => {
                const rawClass = classNode.value;

                if (!classMap[rawClass]) {
                  classMap[rawClass] = ruleHash;
                } else if (!classMap[rawClass].includes(ruleHash)) {
                  classMap[rawClass] += ' ' + ruleHash;
                }

                classNode.value = ruleHash;
              });
            });

            try {
              rule.selector = transformSelector.processSync(rule.selector);
            } catch (e) {
              // Skip invalid selectors from user input
              return;
            }

            ruleMap[ruleHash] = rule.toString();

            let bucketWidth: number | undefined;
            if (
              rule.parent &&
              rule.parent.type === 'atrule' &&
              (rule.parent as AtRule).name === 'media'
            ) {
              const params = (rule.parent as AtRule).params;
              const match = params.match(/min-width:\s*(\d+)px/);
              if (match) bucketWidth = parseInt(match[1], 10);
            }

            const ruleEntry = {
              hash: ruleHash,
              body: rule.toString(),
            };

            if (bucketWidth !== undefined) {
              mediaBuckets.push({ minWidth: bucketWidth, ...ruleEntry });
            } else {
              cssBuffer.push(ruleEntry);
            }
          });
        },
      };
    };
    hashPlugin.postcss = true;

    const result = await postcss([hashPlugin()]).process(combinedCss, {
      from: undefined,
    });

    const generateSnapshot = (targetBreakPoint: number) => {
      const applicableMedia = mediaBuckets
        .filter((b) => b.minWidth <= targetBreakPoint)
        .sort((a, b) => a.minWidth - b.minWidth);

      return [...cssBuffer, ...applicableMedia]
        .map((r) => r.body)
        .join('\n')
        .replace(/(\d*\.?\d+)(vw|vh)/gi, (_, n) => `${n}%`);
    };

    const viewportCss = {
      xs: generateSnapshot(0),
      md: generateSnapshot(801),
      xl: generateSnapshot(1367),
    };

    return new Response(
      JSON.stringify({
        success: true,
        css: result.css,
        viewportCss,
        classMap,
        ruleMap,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('CSS Compilation Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
