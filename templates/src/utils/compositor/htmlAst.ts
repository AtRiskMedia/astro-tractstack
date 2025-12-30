import type { CreativePanePayload, HtmlAstNode } from '@/types/compositorTypes';

const VERBOSE = false;

const logger = {
  log: (...args: any[]) => VERBOSE && console.log('[htmlAst]', ...args),
  error: (...args: any[]) => console.error('[htmlAst]', ...args),
  group: (label: string) => VERBOSE && console.group(`[htmlAst] ${label}`),
  groupEnd: () => VERBOSE && console.groupEnd(),
};

/**
 * Handles deduplication, hashing, and deterministic viewport-aware flattening.
 */
class StyleRegistry {
  private classMap = new Map<string, Set<string>>();
  private hashToOriginal = new Map<
    string,
    { className: string; suffix: string }
  >();

  public cssBuffer: { hash: string; suffix: string; body: string }[] = [];
  public mediaBuckets: {
    minWidth: number;
    hash: string;
    suffix: string;
    body: string;
  }[] = [];

  registerRule(selector: string, body: string, bucketWidth?: number) {
    if (selector.startsWith('.')) {
      const match = selector.match(/^\.((?:[^\\:]|\\.)+)(.*)$/);
      if (match) {
        const rawClassNameEscaped = match[1];
        const suffix = match[2] || '';
        const classNameKey = rawClassNameEscaped.replace(/\\/g, '');

        const cleanDecl = body.trim();
        // Hash must be unique to the content + class context
        const hash = `t8k-${this.hashString(cleanDecl + classNameKey + suffix)}`;

        if (!this.classMap.has(classNameKey))
          this.classMap.set(classNameKey, new Set());
        this.classMap.get(classNameKey)?.add(hash);
        this.hashToOriginal.set(hash, { className: classNameKey, suffix });

        const ruleObj = { hash, suffix, body: cleanDecl };

        if (bucketWidth !== undefined) {
          this.mediaBuckets.push({ minWidth: bucketWidth, ...ruleObj });
          logger.log(
            `Registered Media (${bucketWidth}px): .${hash}${suffix} for "${classNameKey}"`
          );
        } else {
          this.cssBuffer.push(ruleObj);
          logger.log(
            `Registered Base: .${hash}${suffix} for "${classNameKey}"`
          );
        }
        return hash;
      }
    }
    return null;
  }

  registerInlineStyle(declaration: string): string {
    const cleanDecl = declaration.trim();
    const hash = `t8k-${this.hashString(cleanDecl + 'inline')}`;
    this.cssBuffer.push({ hash, suffix: '', body: cleanDecl });
    logger.log(`Registered Inline Style: ${hash}`);
    return hash;
  }

  lookupClass(className: string): string {
    const hashes = this.classMap.get(className);
    return hashes ? Array.from(hashes).join(' ') : className;
  }

  getCompiledCss(): string {
    const base = this.cssBuffer
      .map((r) => `.${r.hash}${r.suffix} { ${r.body} }`)
      .join('\n');
    const bucketGroups = Array.from(
      new Set(this.mediaBuckets.map((b) => b.minWidth))
    )
      .sort((a, b) => a - b)
      .map((width) => {
        const rules = this.mediaBuckets
          .filter((b) => b.minWidth === width)
          .map((r) => `.${r.hash}${r.suffix} { ${r.body} }`)
          .join('\n');
        return `@media (min-width: ${width}px) { ${rules} }`;
      })
      .join('\n');
    return `${base}\n${bucketGroups}`;
  }

  generateViewportCss(): { xs: string; md: string; xl: string } {
    logger.group('Deterministic Flattening Strategy');

    const createSnapshot = (targetBreakPoint: number, label: string) => {
      logger.group(`Snapshot: ${label} (Breakpoint: ${targetBreakPoint}px)`);

      // 1. Determine "Winners" for every unique Class+Suffix combination
      // Map<"className:suffix", hash>
      const winners = new Map<string, string>();

      // Initialize with Base Rules
      this.cssBuffer.forEach((rule) => {
        const info = this.hashToOriginal.get(rule.hash);
        if (info) winners.set(`${info.className}${info.suffix}`, rule.hash);
      });

      // Layer on Media Queries up to target
      this.mediaBuckets
        .filter((b) => b.minWidth <= targetBreakPoint)
        .sort((a, b) => a.minWidth - b.minWidth)
        .forEach((rule) => {
          const info = this.hashToOriginal.get(rule.hash);
          if (info) {
            const key = `${info.className}${info.suffix}`;
            logger.log(
              `Override found for ${key}: ${winners.get(key)} -> ${rule.hash}`
            );
            winners.set(key, rule.hash);
          }
        });

      // 2. Output ONLY rules whose hashes are current winners
      const output: string[] = [];
      const winnerHashes = new Set(winners.values());

      // Collect all available rules (Base + Matching Buckets)
      const allCandidateRules = [
        ...this.cssBuffer,
        ...this.mediaBuckets.filter((b) => b.minWidth <= targetBreakPoint),
      ];

      allCandidateRules.forEach((rule) => {
        if (winnerHashes.has(rule.hash)) {
          output.push(`.${rule.hash}${rule.suffix} { ${rule.body} }`);
          // Remove from set so we don't print duplicates if multiple buckets match the same hash
          winnerHashes.delete(rule.hash);
        } else {
          const info = this.hashToOriginal.get(rule.hash);
          if (info)
            logger.log(
              `Suppressed: .${rule.hash}${rule.suffix} (Class "${info.className}" has better candidate)`
            );
        }
      });

      logger.groupEnd();
      return output
        .join('\n')
        .replace(/(\d*\.?\d+)(vw|vh)/gi, (m, n) => `${n}%`);
    };

    const final = {
      xs: createSnapshot(0, 'XS'),
      md: createSnapshot(801, 'MD'),
      xl: createSnapshot(1367, 'XL'),
    };
    logger.groupEnd();
    return final;
  }

  private hashString(str: string): string {
    let hash = 5381,
      i = str.length;
    while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
    return (hash >>> 0).toString(16);
  }
}

export async function htmlToHtmlAst(
  html: string,
  userCss: string
): Promise<CreativePanePayload> {
  logger.log('--- Pipeline Start ---');
  const registry = new StyleRegistry();

  let tailwindCss = '';
  try {
    const res = await fetch('/api/css', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) tailwindCss = data.css;
    }
  } catch (e) {
    logger.error('Tailwind API Fetch Failed', e);
  }

  processCssString(tailwindCss, registry);
  processCssString(userCss, registry);

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tree = Array.from(doc.body.children).map((child) =>
    processNode(child as HTMLElement, 'root', 0, registry)
  );

  const payload = {
    css: registry.getCompiledCss(),
    viewportCss: registry.generateViewportCss(),
    tree,
  };
  logger.log('--- Pipeline Complete ---');
  return payload;
}

function processCssString(css: string, registry: StyleRegistry) {
  if (!css.trim()) return;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  try {
    const sheet = styleEl.sheet;
    if (!sheet) return;
    Array.from(sheet.cssRules).forEach((rule) => {
      if (rule instanceof CSSStyleRule) {
        rule.selectorText
          .split(',')
          .forEach((sel) =>
            registry.registerRule(sel.trim(), rule.style.cssText)
          );
      } else if (rule instanceof CSSMediaRule) {
        const match = rule.conditionText.match(/min-width:\s*(\d+)px/);
        const width = match ? parseInt(match[1], 10) : undefined;
        Array.from(rule.cssRules).forEach((inner) => {
          if (inner instanceof CSSStyleRule) {
            inner.selectorText
              .split(',')
              .forEach((sel) =>
                registry.registerRule(sel.trim(), inner.style.cssText, width)
              );
          }
        });
      }
    });
  } finally {
    document.head.removeChild(styleEl);
  }
}

function processNode(
  el: HTMLElement,
  path: string,
  index: number,
  registry: StyleRegistry
): HtmlAstNode {
  const tagName = el.tagName.toLowerCase();
  const isEditable = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(
    tagName
  );
  const isIdentifiable = ['a', 'button', 'img'].includes(tagName);

  const id =
    isEditable || isIdentifiable
      ? `ast-${hashPath(`${path}-${index}-${el.tagName}`)}`
      : undefined;

  const attrs: Record<string, string> = {};

  if (el.hasAttributes()) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === 'style') {
        const hash = registry.registerInlineStyle(attr.value);
        attrs['class'] = `${attrs['class'] || ''} ${hash}`.trim();
      } else if (attr.name === 'class') {
        const tokens = attr.value
          .split(/\s+/)
          .flatMap((c) => registry.lookupClass(c).split(/\s+/));
        attrs['class'] = Array.from(new Set(tokens.filter(Boolean))).join(' ');
      } else {
        attrs[attr.name] = attr.value;
      }
    }
  }

  const children: HtmlAstNode[] = el.childNodes.length
    ? Array.from(el.childNodes)
        .map((child, i) => {
          if (child.nodeType === Node.ELEMENT_NODE)
            return processNode(child as HTMLElement, id || path, i, registry);
          if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
            return {
              tag: 'text',
              text: child.textContent,
              id: isEditable ? `ast-${hashPath(`${id}-text-${i}`)}` : undefined,
            };
          }
          return null;
        })
        .filter((n): n is HtmlAstNode => n !== null)
    : [];

  return { tag: tagName, attrs, children, id };
}

function hashPath(str: string): string {
  let hash = 5381,
    i = str.length;
  while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
  return (hash >>> 0).toString(16);
}

export function extractTextFromAst(tree: HtmlAstNode[]): string {
  // Tags that naturally create a visual block/break
  const blockTags = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'div',
    'section',
    'article',
    'li',
    'blockquote',
    'ul',
    'ol',
    'main',
    'header',
    'footer',
    'tr',
    'table',
    'form',
    'nav',
    'dt',
    'dd',
  ]);

  // Tags that represent distinct data cells/slots
  const cellTags = new Set(['td', 'th']);

  function traverse(nodes: HtmlAstNode[]): string {
    return nodes
      .map((node) => {
        if (node.tag === 'text') {
          // Normalize internal whitespace of the text node to single spaces
          return node.text?.replace(/\s+/g, ' ') || '';
        }

        if (node.tag === 'br') return '\n';
        if (node.tag === 'hr') return '\n---\n';

        const childText = node.children ? traverse(node.children) : '';

        if (blockTags.has(node.tag)) {
          // Ensure block tags break the line
          return `\n${childText}\n`;
        }

        if (cellTags.has(node.tag)) {
          // Ensure table cells have separation (using a pipe helps the AI see structure)
          return ` ${childText} | `;
        }

        // Inline elements (span, b, i, a) flow together naturally
        return childText;
      })
      .join(''); // Join with empty string; specific tags provide their own spacing
  }

  return traverse(tree)
    .replace(/[ \t]+/g, ' ') // Collapse multiple spaces/tabs
    .replace(/ \|\n/g, '\n') // Clean up trailing pipes at end of rows
    .replace(/\n\s+/g, '\n') // Clean start of lines
    .replace(/\s+\n/g, '\n') // Clean end of lines
    .replace(/\n+/g, '\n') // Collapse multiple newlines into one
    .trim();
}
