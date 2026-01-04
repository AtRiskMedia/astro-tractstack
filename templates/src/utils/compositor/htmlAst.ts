import { ulid } from 'ulid';
import type {
  CreativePanePayload,
  HtmlAstNode,
  EditableElementMetadata,
} from '@/types/compositorTypes';

const VERBOSE = false;

const logger = {
  log: (...args: any[]) => VERBOSE && console.log('[htmlAst]', ...args),
  error: (...args: any[]) => console.error('[htmlAst]', ...args),
  group: (label: string) => VERBOSE && console.group(`[htmlAst] ${label}`),
  groupEnd: () => VERBOSE && console.groupEnd(),
};

class StyleRegistry {
  private rules = new Map<string, string>();
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

        // Store rule for lookup by className during the walk
        this.rules.set(classNameKey, cleanDecl);

        const hash = `t8k-${this.hashString(cleanDecl + classNameKey + suffix)}`;
        if (!this.classMap.has(classNameKey))
          this.classMap.set(classNameKey, new Set());
        this.classMap.get(classNameKey)?.add(hash);
        this.hashToOriginal.set(hash, { className: classNameKey, suffix });

        const ruleObj = { hash, suffix, body: cleanDecl };
        if (bucketWidth !== undefined) {
          this.mediaBuckets.push({ minWidth: bucketWidth, ...ruleObj });
        } else {
          this.cssBuffer.push(ruleObj);
        }
        return hash;
      }
    }
    return null;
  }

  getRuleBody(className: string): string | undefined {
    return this.rules.get(className);
  }

  registerInlineStyle(declaration: string): string {
    const cleanDecl = declaration.trim();
    const hash = `t8k-${this.hashString(cleanDecl + 'inline')}`;
    this.hashToOriginal.set(hash, { className: hash, suffix: '' });
    this.cssBuffer.push({ hash, suffix: '', body: cleanDecl });
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
    const createSnapshot = (targetBreakPoint: number) => {
      const winners = new Map<string, string>();
      this.cssBuffer.forEach((rule) => {
        const info = this.hashToOriginal.get(rule.hash);
        if (info) winners.set(`${info.className}${info.suffix}`, rule.hash);
      });
      this.mediaBuckets
        .filter((b) => b.minWidth <= targetBreakPoint)
        .sort((a, b) => a.minWidth - b.minWidth)
        .forEach((rule) => {
          const info = this.hashToOriginal.get(rule.hash);
          if (info) winners.set(`${info.className}${info.suffix}`, rule.hash);
        });
      const output: string[] = [];
      const winnerHashes = new Set(winners.values());
      const allCandidateRules = [
        ...this.cssBuffer,
        ...this.mediaBuckets.filter((b) => b.minWidth <= targetBreakPoint),
      ];
      allCandidateRules.forEach((rule) => {
        if (winnerHashes.has(rule.hash)) {
          output.push(`.${rule.hash}${rule.suffix} { ${rule.body} }`);
          winnerHashes.delete(rule.hash);
        }
      });
      return output
        .join('\n')
        .replace(/(\d*\.?\d+)(vw|vh)/gi, (m, n) => `${n}%`);
    };
    return {
      xs: createSnapshot(0),
      md: createSnapshot(801),
      xl: createSnapshot(1367),
    };
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
  const styleRegistry = new StyleRegistry();
  const editableRegistry: Record<string, EditableElementMetadata> = {};

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

  processCssString(tailwindCss, styleRegistry);
  processCssString(userCss, styleRegistry);

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const tree = Array.from(doc.body.children).map((child) =>
    processNode(child as HTMLElement, styleRegistry, editableRegistry)
  );

  return {
    css: styleRegistry.getCompiledCss(),
    viewportCss: styleRegistry.generateViewportCss(),
    tree,
    editableElements: editableRegistry,
  };
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

export function rehydrateChildrenFromHtml(html: string): HtmlAstNode[] {
  logger.group('rehydrateChildrenFromHtml');
  const editableRegistry: Record<string, EditableElementMetadata> = {};

  const div = document.createElement('div');
  div.innerHTML = html;

  const nodes = Array.from(div.childNodes)
    .map((child) => {
      if (child.nodeType === Node.ELEMENT_NODE)
        return processRehydratedNode(child as HTMLElement, editableRegistry);
      if (child.nodeType === Node.TEXT_NODE && child.textContent)
        return { tag: 'text', text: child.textContent };
      return null;
    })
    .filter((n): n is HtmlAstNode => n !== null);

  logger.log(
    `Rehydration Complete. Assets synced: ${Object.keys(editableRegistry).length}`
  );
  logger.groupEnd();
  return nodes;
}

export function extractTextFromAst(tree: HtmlAstNode[]): string {
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
  function traverse(nodes: HtmlAstNode[]): string {
    return nodes
      .map((node) => {
        if (node.tag === 'text') return node.text?.replace(/\s+/g, ' ') || '';
        if (node.tag === 'br') return '\n';
        const childText = node.children ? traverse(node.children) : '';
        return blockTags.has(node.tag) ? `\n${childText}\n` : childText;
      })
      .join('');
  }
  return traverse(tree)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
}

/**
 * Serializes the AST back to a raw HTML string to feed the pipeline.
 * Preserves data-ast-id to maintain node identity during regeneration.
 */
function serializeAstToHtml(nodes: HtmlAstNode[]): string {
  const voidTags = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);

  return nodes
    .map((node) => {
      if (node.tag === 'text') return node.text || '';

      const attrs = Object.entries(node.attrs || {})
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

      // Crucial: Inject the ID back so the pipeline re-claims it
      const idAttr = node.id ? `data-ast-id="${node.id}"` : '';
      const space = attrs || idAttr ? ' ' : '';
      const combinedAttrs = [idAttr, attrs].filter(Boolean).join(' ');

      const openTag = `<${node.tag}${space}${combinedAttrs}>`;

      if (voidTags.has(node.tag)) return openTag;

      const children = node.children ? serializeAstToHtml(node.children) : '';
      return `${openTag}${children}</${node.tag}>`;
    })
    .join('');
}

/**
 * Scanner: Detects Assets based on Tags or Background Image URLs.
 */
function extractMetadataFromNode(
  el: HTMLElement,
  astId: string,
  registry?: StyleRegistry
): EditableElementMetadata | null {
  logger.group(`extractMetadataFromNode Trace: ${astId}`);
  const tagName = el.tagName.toLowerCase();
  const classList = Array.from(el.classList);
  logger.log(`Target: <${tagName}> | Classes:`, classList);

  // Helper to extract common identity attributes
  const getIdentity = () => ({
    fileId: el.getAttribute('data-file-id') || undefined,
    collection: el.getAttribute('data-collection') || undefined,
    image: el.getAttribute('data-image') || undefined,
  });

  // 1. Tag-based Assets
  if (tagName === 'img') {
    const imgEl = el as HTMLImageElement;
    const meta: EditableElementMetadata = {
      astId,
      tagName,
      src: imgEl.getAttribute('src') || '',
      srcSet: imgEl.getAttribute('srcset') || undefined,
      alt: imgEl.getAttribute('alt') || '',
      ...getIdentity(),
    };
    logger.log(`[Discovery] MATCH: <img> tag`, meta);
    logger.groupEnd();
    return meta;
  }

  if (tagName === 'a') {
    const anchorEl = el as HTMLAnchorElement;
    const meta: EditableElementMetadata = {
      astId,
      tagName,
      href: anchorEl.getAttribute('href') || '',
      // Links can now carry button-like payloads (e.g. video triggers)
      buttonPayload: {
        callbackPayload: el.getAttribute('data-callback') || '',
        isExternalUrl: el.getAttribute('data-external') === 'true',
        bunnyPayload: el.getAttribute('data-bunny-payload')
          ? JSON.parse(el.getAttribute('data-bunny-payload')!)
          : undefined,
      },
    };
    logger.log(`[Discovery] MATCH: <a> tag`, meta);
    logger.groupEnd();
    return meta;
  }

  if (tagName === 'button') {
    const meta: EditableElementMetadata = {
      astId,
      tagName,
      buttonPayload: {
        callbackPayload: el.getAttribute('data-callback') || '',
        isExternalUrl: el.getAttribute('data-external') === 'true',
        bunnyPayload: el.getAttribute('data-bunny-payload')
          ? JSON.parse(el.getAttribute('data-bunny-payload')!)
          : undefined,
      },
    };
    logger.log(`[Discovery] MATCH: <button> tag`, meta);
    logger.groupEnd();
    return meta;
  }

  // 2. Background Image Detection (URL only)
  let bgImageUrl = '';

  // Check Inline Style
  const inlineBg = el.style.backgroundImage;
  if (inlineBg && inlineBg !== 'none') {
    const match = inlineBg.match(/url\(["']?(.*?)["']?\)/);
    if (match) {
      bgImageUrl = match[1];
      logger.log(`[Discovery] Found inline background-image: ${bgImageUrl}`);
    }
  }

  // Check Registry for class-based background image URLs
  if (!bgImageUrl && registry) {
    for (const cls of classList) {
      const ruleBody = registry.getRuleBody(cls);
      if (ruleBody) {
        const urlMatch = ruleBody.match(
          /background-image:\s*url\(["']?(.*?)["']?\)/
        );
        if (urlMatch) {
          bgImageUrl = urlMatch[1];
          logger.log(
            `[Discovery] SUCCESS: Found background image in class "${cls}": ${bgImageUrl}`
          );
          break;
        }
      }
    }
  }

  if (bgImageUrl) {
    const meta: EditableElementMetadata = {
      astId,
      tagName,
      src: bgImageUrl,
      isCssBackground: true,
      ...getIdentity(),
    };
    logger.groupEnd();
    return meta;
  }

  logger.log(`[Discovery] REJECTED: No managed capabilities found.`);
  logger.groupEnd();
  return null;
}

/**
 * processNode: The primary entry point for converting a live DOM element into an AST node.
 * Strictly whitelists allowed attributes and sanitizes text content to prevent
 * "sloppy" storage and ephemeral attribute leakage.
 */
function processNode(
  el: HTMLElement,
  registry: StyleRegistry,
  editableRegistry: Record<string, EditableElementMetadata>
): HtmlAstNode {
  const tagName = el.tagName.toLowerCase();

  const isTextEditable = [
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'li',
  ].includes(tagName);

  const metadataCheck = extractMetadataFromNode(el, 'temp', registry);
  const isIdentifiableAsset = !!metadataCheck;

  const existingId = el.getAttribute('data-ast-id');
  let id: string | undefined = existingId || undefined;

  if (!id && (isTextEditable || isIdentifiableAsset)) {
    id = `ast-${ulid().toLowerCase()}`;
  }

  if (id && isIdentifiableAsset) {
    const finalMetadata = extractMetadataFromNode(el, id, registry);
    if (finalMetadata) {
      editableRegistry[id] = finalMetadata;
    }
  }

  const attrs: Record<string, string> = {};
  const allowedAttributes = [
    'src',
    'srcset',
    'alt',
    'href',
    'target',
    'type',
    'value',
    'placeholder',
    // Expanded whitelist for persistence
    'data-file-id',
    'data-collection',
    'data-image',
    'data-callback',
    'data-external',
    'data-bunny-payload',
  ];

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
      } else if (allowedAttributes.includes(attr.name)) {
        attrs[attr.name] = attr.value;
      }
    }
  }

  const children: HtmlAstNode[] = Array.from(el.childNodes)
    .map((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        return processNode(child as HTMLElement, registry, editableRegistry);
      }
      if (child.nodeType === Node.TEXT_NODE) {
        const cleanedText = child.textContent?.replace(/\n/g, '').trim();
        if (cleanedText) {
          return {
            tag: 'text',
            text: cleanedText,
            id: isTextEditable ? `ast-${ulid().toLowerCase()}` : undefined,
          };
        }
      }
      return null;
    })
    .filter((n): n is HtmlAstNode => n !== null);

  return { tag: tagName, attrs, children, id };
}

/**
 * processRehydratedNode: Rebuilds an AST node from a static HTML snippet.
 * Shares the same strict attribute whitelist and text sanitization as processNode.
 */
function processRehydratedNode(
  el: HTMLElement,
  editableRegistry: Record<string, EditableElementMetadata>
): HtmlAstNode {
  const tagName = el.tagName.toLowerCase();
  const id = el.getAttribute('data-ast-id') || undefined;

  if (id) {
    const metadata = extractMetadataFromNode(el, id);
    if (metadata) {
      editableRegistry[id] = metadata;
    }
  } else {
    const capabilityMeta = extractMetadataFromNode(
      el,
      `rehydrated-${ulid().toLowerCase()}`
    );
    if (capabilityMeta) {
      editableRegistry[capabilityMeta.astId] = capabilityMeta;
    }
  }

  const attrs: Record<string, string> = {};
  const allowedAttributes = [
    'class',
    'style',
    'src',
    'srcset',
    'alt',
    'href',
    'target',
    'type',
    'value',
    'placeholder',
    'data-file-id',
    'data-collection',
    'data-image',
    'data-callback',
    'data-external',
    'data-bunny-payload',
  ];

  if (el.hasAttributes()) {
    for (const attr of Array.from(el.attributes)) {
      if (allowedAttributes.includes(attr.name)) {
        attrs[attr.name] = attr.value;
      }
    }
  }

  const children: HtmlAstNode[] = Array.from(el.childNodes)
    .map((child) => {
      if (child.nodeType === Node.ELEMENT_NODE)
        return processRehydratedNode(child as HTMLElement, editableRegistry);
      if (child.nodeType === Node.TEXT_NODE) {
        const cleanedText = child.textContent?.replace(/\n/g, '').trim();
        if (cleanedText) {
          return { tag: 'text', text: cleanedText };
        }
      }
      return null;
    })
    .filter((n): n is HtmlAstNode => n !== null);

  return { tag: tagName, attrs, children, id };
}

/**
 * atomic update logic for Creative Panes.
 * 1. Patches the AST (for src/href/callback).
 * 2. Patches the CSS (for background images).
 * 3. Re-runs the pipeline to generate fresh viewport CSS and registry.
 */
export async function regenerateCreativePane(
  originalPayload: CreativePanePayload,
  astId: string,
  updates: Partial<EditableElementMetadata>
): Promise<CreativePanePayload> {
  const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
  const tree = deepClone(originalPayload.tree);
  let css = originalPayload.css;

  const findAndPatchNode = (nodes: HtmlAstNode[]): HtmlAstNode | null => {
    for (const node of nodes) {
      if (node.id === astId) return node;
      if (node.children) {
        const found = findAndPatchNode(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const targetNode = findAndPatchNode(tree);

  if (targetNode) {
    if (!targetNode.attrs) targetNode.attrs = {};

    // 1. Identity Persistence (Uploaded Files)
    if (updates.fileId) targetNode.attrs['data-file-id'] = updates.fileId;
    if (updates.fileId === undefined && updates.src === '')
      delete targetNode.attrs['data-file-id']; // Clear if removed

    // 2. Identity Persistence (Artpack)
    if (updates.collection) {
      targetNode.attrs['data-collection'] = updates.collection;
    } else if (updates.collection === null) {
      delete targetNode.attrs['data-collection'];
    }
    if (updates.image) {
      targetNode.attrs['data-image'] = updates.image;
    } else if (updates.image === null) {
      delete targetNode.attrs['data-image'];
    }

    if (updates.src && updates.tagName === 'img') {
      targetNode.attrs.src = updates.src;
      if (updates.srcSet) targetNode.attrs.srcset = updates.srcSet;
    }
    if (updates.alt) {
      targetNode.attrs.alt = updates.alt;
    }
    if (updates.href && updates.tagName === 'a') {
      targetNode.attrs.href = updates.href;
    }

    // 3. Button Payload Persistence (Buttons & Links)
    if (updates.buttonPayload) {
      const { callbackPayload, isExternalUrl, bunnyPayload } =
        updates.buttonPayload;

      if (callbackPayload) targetNode.attrs['data-callback'] = callbackPayload;
      if (isExternalUrl !== undefined)
        targetNode.attrs['data-external'] = String(isExternalUrl);
      if (bunnyPayload)
        targetNode.attrs['data-bunny-payload'] = JSON.stringify(bunnyPayload);
    }

    if (updates.isCssBackground && updates.src) {
      const classes = (targetNode.attrs.class || '').split(/\s+/);
      for (const cls of classes) {
        const ruleRegex = new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`, 'g');
        const match = css.match(ruleRegex);

        if (match && match[0].includes('background-image:')) {
          const newRule = match[0].replace(
            /url\(["']?(.*?)["']?\)/,
            `url('${updates.src}')`
          );
          css = css.replace(match[0], newRule);
          break;
        }
      }
    }
  }

  const html = serializeAstToHtml(tree);
  const newPayload = await htmlToHtmlAst(html, css);

  if (newPayload.editableElements[astId]) {
    newPayload.editableElements[astId] = {
      ...newPayload.editableElements[astId],
      ...updates,
    };
  }

  return newPayload;
}
