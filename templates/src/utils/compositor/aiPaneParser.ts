import { ulid } from 'ulid';
import type {
  TemplatePane,
  TemplateNode,
  TemplateMarkdown,
  ParentClassesPayload,
  DefaultClasses,
  ResponsiveClasses,
  ButtonPayload,
} from '@/types/compositorTypes';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
import { isDeepEqual } from '@/utils/helpers';

type LLMShellLayer = {
  mobile?: Record<string, string>;
  tablet?: Record<string, string>;
  desktop?: Record<string, string>;
};

type LLMDefaultClasses = {
  [tagName: string]: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
};

type ShellJson = {
  bgColour: string;
  parentClasses: LLMShellLayer[];
  defaultClasses: LLMDefaultClasses;
};

type ParsedNode = {
  flatNode: TemplateNode;
  responsiveClasses: ResponsiveClasses;
};

type ParentClassLayer = {
  mobile: Record<string, string>;
  tablet: Record<string, string>;
  desktop: Record<string, string>;
};

type DefaultClassValue = {
  mobile: Record<string, string>;
  tablet: Record<string, string>;
  desktop: Record<string, string>;
};

type ClassLookupValue = {
  key: string;
  value: string;
  viewport: 'mobile' | 'tablet' | 'desktop';
};

let KEY_NORMALIZATION_LOOKUP: Map<string, string> | null = null;
let RESPONSIVE_CLASS_LOOKUP: Map<string, ClassLookupValue> | null = null;
let BUTTON_CLASS_LOOKUP: Map<string, { key: string; value: string }> | null =
  null;

const ALLOWED_TAGS = new Set([
  'ul',
  'li',
  'h2',
  'h3',
  'h4',
  'h5',
  'p',
  'span',
  'em',
  'strong',
  'button',
  'a',
]);

function buildKeyNormalizationLookup(): Map<string, string> {
  if (KEY_NORMALIZATION_LOOKUP) {
    return KEY_NORMALIZATION_LOOKUP;
  }

  const keyMap = new Map<string, string>();
  for (const key in tailwindClasses) {
    keyMap.set(key.toLowerCase(), key);
  }
  KEY_NORMALIZATION_LOOKUP = keyMap;
  return keyMap;
}

function normalizeKeys(
  styleObj: Record<string, string> | undefined
): Record<string, string> {
  if (!styleObj) return {};

  const keyMap = buildKeyNormalizationLookup();
  const normalized: Record<string, string> = {};

  for (const key in styleObj) {
    if (Object.prototype.hasOwnProperty.call(styleObj, key)) {
      const lowerKey = key.toLowerCase();
      const correctKey = keyMap.get(lowerKey);
      normalized[correctKey || key] = styleObj[key];
    }
  }
  return normalized;
}

function buildResponsiveClassLookup(): Map<string, ClassLookupValue> {
  if (RESPONSIVE_CLASS_LOOKUP) {
    return RESPONSIVE_CLASS_LOOKUP;
  }

  const classMap = new Map<string, ClassLookupValue>();
  const viewports: Array<{
    prefix: string;
    key: 'mobile' | 'tablet' | 'desktop';
  }> = [
    { prefix: '', key: 'mobile' },
    { prefix: 'md:', key: 'tablet' },
    { prefix: 'xl:', key: 'desktop' },
  ];

  for (const tailwindKey in tailwindClasses) {
    const def = tailwindClasses[tailwindKey];
    const classKey = tailwindKey;

    def.values.forEach((value) => {
      const className = def.useKeyAsClass ? value : `${def.prefix}${value}`;
      viewports.forEach((vp) => {
        const fullClassName = `${vp.prefix}${className}`;
        classMap.set(fullClassName, {
          key: classKey,
          value: value,
          viewport: vp.key,
        });
      });
    });

    if (def.allowNegative) {
      def.values.forEach((value) => {
        if (value === '0') return;
        const className = def.useKeyAsClass ? value : `${def.prefix}${value}`;
        viewports.forEach((vp) => {
          const fullClassName = `${vp.prefix}-${className}`;
          classMap.set(fullClassName, {
            key: classKey,
            value: `-${value}`,
            viewport: vp.key,
          });
        });
      });
    }
  }
  RESPONSIVE_CLASS_LOOKUP = classMap;
  return classMap;
}

function buildButtonClassLookup(): Map<string, { key: string; value: string }> {
  if (BUTTON_CLASS_LOOKUP) {
    return BUTTON_CLASS_LOOKUP;
  }

  const classMap = new Map<string, { key: string; value: string }>();

  for (const tailwindKey in tailwindClasses) {
    const def = tailwindClasses[tailwindKey];
    const classKey = tailwindKey;

    def.values.forEach((value) => {
      const className = def.useKeyAsClass ? value : `${def.prefix}${value}`;
      classMap.set(className, {
        key: classKey,
        value: value,
      });
    });

    if (def.allowNegative) {
      def.values.forEach((value) => {
        if (value === '0') return;
        const className = def.useKeyAsClass ? value : `${def.prefix}${value}`;
        classMap.set(`-${className}`, {
          key: classKey,
          value: `-${value}`,
        });
      });
    }
  }
  BUTTON_CLASS_LOOKUP = classMap;
  return classMap;
}

function sanitizeResponsiveClasses(
  classString: string | null | undefined
): ResponsiveClasses {
  const responsive: ResponsiveClasses = {};

  if (!classString) {
    return responsive;
  }

  const classMap = buildResponsiveClassLookup();
  const classes = classString.split(/\s+/).filter(Boolean);

  classes.forEach((className) => {
    const lookup = classMap.get(className);
    if (lookup) {
      if (!responsive[lookup.viewport]) {
        responsive[lookup.viewport] = {};
      }
      responsive[lookup.viewport]![lookup.key] = lookup.value;
    }
  });

  return responsive;
}

function sanitizeButtonClasses(
  classString: string | null | undefined
): ButtonPayload {
  const buttonPayload: ButtonPayload = {
    buttonClasses: {},
    buttonHoverClasses: {},
    callbackPayload: '',
  };

  if (!classString) {
    return buttonPayload;
  }

  const classMap = buildButtonClassLookup();
  const classes = classString.split(/\s+/).filter(Boolean);

  classes.forEach((className) => {
    let targetClasses = buttonPayload.buttonClasses;
    let cleanClassName = className;

    if (className.startsWith('hover:')) {
      targetClasses = buttonPayload.buttonHoverClasses;
      cleanClassName = className.substring(6);
    }

    const lookup = classMap.get(cleanClassName);
    if (lookup) {
      if (!targetClasses[lookup.key]) {
        targetClasses[lookup.key] = [];
      }
      targetClasses[lookup.key]!.push(lookup.value);
    }
  });

  return buttonPayload;
}

function walkDom(
  domNode: Node,
  parentId: string,
  parsedNodes: ParsedNode[],
  markdownId: string
) {
  if (domNode.nodeType === Node.TEXT_NODE) {
    const copy = domNode.textContent || '';
    const trimmedCopy = copy.replace(/\s+/g, ' ').trim();

    if (trimmedCopy.length > 0) {
      let finalCopy = copy.replace(/\s+/g, ' ');
      if (copy.startsWith(' ') && domNode.previousSibling) {
        finalCopy = ' ' + finalCopy.trimStart();
      }
      if (copy.endsWith(' ') && domNode.nextSibling) {
        finalCopy = finalCopy.trimEnd() + ' ';
      }
      if (
        trimmedCopy.length === 0 &&
        copy.length > 0 &&
        domNode.previousSibling &&
        domNode.nextSibling
      ) {
        finalCopy = ' ';
      }

      if (finalCopy.trim().length > 0 || finalCopy === ' ') {
        const textNode: TemplateNode = {
          id: ulid(),
          nodeType: 'TagElement',
          parentId: parentId,
          tagName: 'text',
          copy: finalCopy,
        };
        parsedNodes.push({
          flatNode: textNode,
          responsiveClasses: {},
        });
      }
    }
    return;
  }

  if (domNode.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const el = domNode as Element;
  const tagName = el.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    el.childNodes.forEach((child) =>
      walkDom(child, parentId, parsedNodes, markdownId)
    );
    return;
  }

  if (tagName === 'button') {
    let finalParentId = parentId;

    const parentDomEl = el.parentNode as Element;
    const parentTagName = parentDomEl?.tagName?.toLowerCase();

    if (parentId === markdownId || parentTagName === 'li') {
      const pNodeId = ulid();
      const pNode: TemplateNode = {
        id: pNodeId,
        nodeType: 'TagElement',
        parentId: parentId,
        tagName: 'p',
      };
      parsedNodes.push({
        flatNode: pNode,
        responsiveClasses: {},
      });
      finalParentId = pNodeId;
    }

    const buttonPayload = sanitizeButtonClasses(el.getAttribute('class'));

    const flatNode: TemplateNode = {
      id: ulid(),
      nodeType: 'TagElement',
      parentId: finalParentId,
      tagName: 'a',
      href: '#',
      buttonPayload: {
        ...buttonPayload,
        callbackPayload: '',
      },
    };

    parsedNodes.push({
      flatNode,
      responsiveClasses: {},
    });

    el.childNodes.forEach((child) =>
      walkDom(child, flatNode.id, parsedNodes, markdownId)
    );
    return;
  }

  const responsive = sanitizeResponsiveClasses(el.getAttribute('class'));

  const flatNode: TemplateNode = {
    id: ulid(),
    nodeType: 'TagElement',
    parentId: parentId,
    tagName: tagName,
  };

  if (tagName === 'span') {
    flatNode.overrideClasses = responsive;
  }

  parsedNodes.push({
    flatNode,
    responsiveClasses: responsive,
  });

  el.childNodes.forEach((child) =>
    walkDom(child, flatNode.id, parsedNodes, markdownId)
  );
}

function findMostCommonClasses(nodes: ParsedNode[]): ResponsiveClasses {
  if (nodes.length === 0) return {};
  const classCounts = new Map<string, number>();
  const classMap = new Map<string, ResponsiveClasses>();

  nodes.forEach((node) => {
    const key = JSON.stringify(
      node.responsiveClasses,
      Object.keys(node.responsiveClasses).sort()
    );
    classCounts.set(key, (classCounts.get(key) || 0) + 1);
    if (!classMap.has(key)) {
      classMap.set(key, node.responsiveClasses);
    }
  });

  let mostCommonKey = '';
  let maxCount = 0;
  classCounts.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonKey = key;
    }
  });

  return classMap.get(mostCommonKey) || {};
}

function ensureRequiredViewports(
  responsive: ResponsiveClasses | undefined
): DefaultClassValue {
  const base = responsive || {};
  return {
    mobile: base.mobile || {},
    tablet: base.tablet || {},
    desktop: base.desktop || {},
  };
}

function mergeResponsive(
  base: ResponsiveClasses | DefaultClassValue | undefined,
  override: ResponsiveClasses | DefaultClassValue | undefined
): ResponsiveClasses {
  const merged = base ? JSON.parse(JSON.stringify(base)) : {};
  if (!override) return merged;

  (['mobile', 'tablet', 'desktop'] as Array<keyof ResponsiveClasses>).forEach(
    (vp) => {
      if (override[vp]) {
        if (!merged[vp]) {
          merged[vp] = {};
        }
        merged[vp] = { ...merged[vp], ...override[vp] };
      }
    }
  );

  const result: ResponsiveClasses = {};
  if (merged.mobile && Object.keys(merged.mobile).length > 0)
    result.mobile = merged.mobile;
  if (merged.tablet && Object.keys(merged.tablet).length > 0)
    result.tablet = merged.tablet;
  if (merged.desktop && Object.keys(merged.desktop).length > 0)
    result.desktop = merged.desktop;
  return result;
}

function parseDefaultClassesFromShell(
  llmDefaults: LLMDefaultClasses | undefined
): DefaultClasses {
  const sanitizedDefaults: DefaultClasses = {};
  if (!llmDefaults) return sanitizedDefaults;

  for (const tagName in llmDefaults) {
    if (Object.prototype.hasOwnProperty.call(llmDefaults, tagName)) {
      const tagClasses = llmDefaults[tagName];
      let responsiveForTag: ResponsiveClasses = {};

      if (tagClasses.mobile) {
        responsiveForTag = mergeResponsive(
          responsiveForTag,
          sanitizeResponsiveClasses(tagClasses.mobile)
        );
      }
      if (tagClasses.tablet) {
        const tabletClasses = sanitizeResponsiveClasses(tagClasses.tablet);
        if (tabletClasses.mobile) {
          responsiveForTag.tablet = {
            ...responsiveForTag.tablet,
            ...tabletClasses.mobile,
          };
        }
      }
      if (tagClasses.desktop) {
        const desktopClasses = sanitizeResponsiveClasses(tagClasses.desktop);
        if (desktopClasses.mobile) {
          responsiveForTag.desktop = {
            ...responsiveForTag.desktop,
            ...desktopClasses.mobile,
          };
        }
      }
      sanitizedDefaults[tagName] = ensureRequiredViewports(responsiveForTag);
    }
  }
  return sanitizedDefaults;
}

/**
 * Parses a raw HTML string from the AI into a structured array of TemplateNodes.
 * @param copyHtml The raw HTML string.
 * @param markdownId The parent ID for the top-level nodes.
 * @returns An array of TemplateNodes representing the structured content.
 */
export function parseAiCopyHtml(
  copyHtml: string,
  markdownId: string
): TemplateNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(copyHtml, 'text/html');

  const allParsedNodes: ParsedNode[] = [];
  walkDom(doc.body, markdownId, allParsedNodes, markdownId);

  // When parsing copy in isolation, all classes are treated as potential overrides.
  // The consumer is responsible for merging these with a set of defaults if needed.
  return allParsedNodes.map((pNode) => {
    if (
      Object.keys(pNode.responsiveClasses).length > 0 &&
      pNode.flatNode.tagName !== 'span'
    ) {
      pNode.flatNode.overrideClasses = pNode.responsiveClasses;
    }
    return pNode.flatNode;
  });
}

export const parseAiPane = (
  shellJson: string,
  copyHtml: string,
  layout: string
): TemplatePane => {
  const shell: ShellJson = JSON.parse(shellJson);

  const paneId = ulid();
  const markdownId = ulid();

  const transformedParentClasses: ParentClassesPayload = (
    shell.parentClasses || []
  ).map(
    (layer): ParentClassLayer => ({
      mobile: normalizeKeys(layer.mobile),
      tablet: normalizeKeys(layer.tablet),
      desktop: normalizeKeys(layer.desktop),
    })
  );

  const shellDefaults = parseDefaultClassesFromShell(shell.defaultClasses);

  const markdownNode: TemplateMarkdown = {
    id: markdownId,
    nodeType: 'Markdown',
    parentId: paneId,
    type: 'markdown',
    markdownId: ulid(),
    parentClasses: transformedParentClasses,
    defaultClasses: shellDefaults,
  };

  const templateNodes = parseAiCopyHtml(copyHtml, markdownId);

  const templatePane: TemplatePane = {
    id: paneId,
    nodeType: 'Pane',
    parentId: '',
    title: 'AI Pane',
    slug: `ai-${paneId.slice(-4)}`,
    bgColour: shell.bgColour,
    isDecorative: false,
    markdown: {
      ...markdownNode,
      nodes: templateNodes,
    },
  };

  return templatePane;
};
