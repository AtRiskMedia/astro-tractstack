import { ulid } from 'ulid';
import type {
  TemplatePane,
  TemplateNode,
  TemplateMarkdown,
  ParentClassesPayload,
  DefaultClasses,
  ResponsiveClasses,
  ButtonPayload,
  GridLayoutNode
} from '@/types/compositorTypes';
import { isDeepEqual } from '@/utils/helpers';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';

type LLMShellLayer = {
  mobile?: string;
  tablet?: string;
  desktop?: string;
};

type LLMColumnLayer = {
  gridClasses: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
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
  columns?: LLMColumnLayer[];
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

/**
 * Calculates the difference between a node's full style and the default theme for its tag.
 * @returns An object with only the override styles, or undefined if there are no overrides.
 */
function calculateOverrides(
  fullStyle: ResponsiveClasses,
  defaultStyle: DefaultClassValue
): ResponsiveClasses | undefined {
  const overrides: ResponsiveClasses = {};
  const viewports: Array<keyof ResponsiveClasses> = ['mobile', 'tablet', 'desktop'];

  for (const viewport of viewports) {
    const fullVPStyle = fullStyle[viewport];
    const defaultVPStyle = defaultStyle[viewport];

    if (!fullVPStyle) {
      continue;
    }

    for (const key in fullVPStyle) {
      if (
        Object.prototype.hasOwnProperty.call(fullVPStyle, key) &&
        fullVPStyle[key] !== defaultVPStyle?.[key]
      ) {
        if (!overrides[viewport]) {
          overrides[viewport] = {};
        }
        overrides[viewport]![key] = fullVPStyle[key];
      }
    }
  }

  if (Object.keys(overrides).length > 0 && !isDeepEqual(overrides, {})) {
    return overrides;
  }

  return undefined;
}

/**
 * Reconciles classes for a set of final TemplateNodes against a base theme.
 * It discovers the true theme from the content, merges it into the base theme,
 * and then mutates the nodes to only contain true override classes.
 * @param nodes The array of TemplateNode objects to mutate.
 * @param baseDefaults The base theme object to mutate.
 */
function reconcileClasses(
  nodes: TemplateNode[],
  baseDefaults: DefaultClasses
): void {
  const nodesByTag: Record<string, TemplateNode[]> = {};
  const tempParsedNodes: ParsedNode[] = [];

  nodes.forEach(node => {
    // Create a temporary ParsedNode structure for analysis
    const tempParsedNode: ParsedNode = {
      flatNode: node,
      responsiveClasses: node.overrideClasses || {},
    };
    tempParsedNodes.push(tempParsedNode);

    const tagName = node.tagName;
    if (!['p', 'h2', 'h3', 'h4', 'h5'].includes(tagName)) {
      return;
    }
    if (!nodesByTag[tagName]) {
      nodesByTag[tagName] = [];
    }
    nodesByTag[tagName].push(node);
  });

  const finalDefaults = JSON.parse(JSON.stringify(baseDefaults));

  for (const tagName in nodesByTag) {
    const nodesForTag = nodesByTag[tagName];
    const tempParsedForTag = nodesForTag.map(n => ({ flatNode: n, responsiveClasses: n.overrideClasses || {} }));

    const commonStyleForTag = findMostCommonClasses(tempParsedForTag);
    const mergedDefault = mergeResponsive(finalDefaults[tagName], commonStyleForTag);
    finalDefaults[tagName] = ensureRequiredViewports(mergedDefault);
  }

  nodes.forEach(node => {
    const tagName = node.tagName;
    const defaultStyleForTag = finalDefaults[tagName];
    const fullStyle = node.overrideClasses || {};

    if (defaultStyleForTag) {
      const overrides = calculateOverrides(fullStyle, defaultStyleForTag);
      node.overrideClasses = overrides;
    } else if (Object.keys(fullStyle).length > 0 && node.tagName !== 'span') {
      if (!isDeepEqual(fullStyle, {})) {
        node.overrideClasses = fullStyle;
      } else {
        node.overrideClasses = undefined;
      }
    } else if (node.tagName !== 'span') {
      node.overrideClasses = undefined;
    }
  });

  Object.keys(baseDefaults).forEach(key => delete baseDefaults[key]);
  Object.assign(baseDefaults, finalDefaults);
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

function transformClassesFromShellLayer(
  layer: LLMShellLayer | LLMColumnLayer['gridClasses']
): DefaultClassValue {
  const mergeIntoLayer = (
    targetLayer: DefaultClassValue,
    classString: string | undefined
  ) => {
    if (!classString) return;
    const parsed = sanitizeResponsiveClasses(classString);
    if (parsed.mobile)
      targetLayer.mobile = { ...targetLayer.mobile, ...parsed.mobile };
    if (parsed.tablet)
      targetLayer.tablet = { ...targetLayer.tablet, ...parsed.tablet };
    if (parsed.desktop)
      targetLayer.desktop = { ...targetLayer.desktop, ...parsed.desktop };
  };

  const finalLayer: DefaultClassValue = {
    mobile: {},
    tablet: {},
    desktop: {},
  };

  mergeIntoLayer(finalLayer, layer.mobile);
  mergeIntoLayer(finalLayer, layer.tablet);
  mergeIntoLayer(finalLayer, layer.desktop);

  return finalLayer;
}

function transformParentClassesFromShell(
  llmParentClasses: LLMShellLayer[]
): ParentClassesPayload {
  return llmParentClasses.map((layer) => transformClassesFromShellLayer(layer));
}

export const parseAiPane = (
  shellJson: string,
  copyHtml: string | string[],
  layout: string
): Omit<TemplatePane, 'nodes'> & { nodes?: (TemplateMarkdown | GridLayoutNode)[] } => {
  const shell: ShellJson = JSON.parse(shellJson);
  const paneId = ulid();

  // --- GRID LAYOUT PATH ---
  if (shell.columns && Array.isArray(copyHtml)) {
    const gridLayoutId = ulid();
    const shellDefaults = parseDefaultClassesFromShell(shell.defaultClasses);
    const transformedParentClasses = transformParentClassesFromShell(
      shell.parentClasses || []
    );

    const childMarkdownNodes = shell.columns.map((column, index) => {
      const markdownId = ulid();
      const gridClasses = transformClassesFromShellLayer(column.gridClasses);
      const templateNodes = parseAiCopyHtml(copyHtml[index] || '', markdownId);

      const markdownNode: TemplateMarkdown = {
        id: markdownId,
        nodeType: 'Markdown',
        parentId: gridLayoutId,
        type: 'markdown',
        markdownId: ulid(),
        gridClasses,
        nodes: templateNodes,
      };
      return markdownNode;
    });

    const gridLayoutNode: GridLayoutNode & { nodes: TemplateMarkdown[] } = {
      id: gridLayoutId,
      nodeType: 'GridLayoutNode',
      parentId: paneId,
      type: 'grid-layout',
      parentClasses: transformedParentClasses,
      defaultClasses: shellDefaults,
      gridColumns: {
        mobile: 1,
        tablet: 2,
        desktop: 2,
      },
      nodes: childMarkdownNodes,
    };

    const templatePane = {
      id: paneId,
      nodeType: 'Pane' as const,
      parentId: '',
      title: 'AI Pane',
      slug: `ai-${paneId.slice(-4)}`,
      bgColour: shell.bgColour,
      isDecorative: false,
      nodes: [gridLayoutNode],
    };
    return templatePane;
  }

  // --- SINGLE-COLUMN LAYOUT PATH ---
  if (typeof copyHtml === 'string') {
    const markdownId = ulid();
    const shellDefaults = parseDefaultClassesFromShell(shell.defaultClasses);
    const transformedParentClasses = transformParentClassesFromShell(
      shell.parentClasses || []
    );
    const templateNodes = parseAiCopyHtml(copyHtml, markdownId);

    reconcileClasses(templateNodes, shellDefaults);

    const markdownNode: TemplateMarkdown = {
      id: markdownId,
      nodeType: 'Markdown',
      parentId: paneId,
      type: 'markdown',
      markdownId: ulid(),
      parentClasses: transformedParentClasses,
      defaultClasses: shellDefaults,
      nodes: templateNodes,
    };

    const templatePane = {
      id: paneId,
      nodeType: 'Pane' as const,
      parentId: '',
      title: 'AI Pane',
      slug: `ai-${paneId.slice(-4)}`,
      bgColour: shell.bgColour,
      isDecorative: false,
      markdown: markdownNode,
    };
    return templatePane;
  }

  // Fallback for invalid input
  throw new Error('Invalid input for parseAiPane');
};
