import { useMemo, useEffect, useState } from 'react';
import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import {
  styleElementInfoStore,
  resetStyleElementInfo,
  settingsPanelStore,
} from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { StylesMemory } from '@/components/edit/state/StylesMemory';
import {
  isMarkdownPaneFragmentNode,
  isGridLayoutNode,
} from '@/utils/compositor/typeGuards';
import { getNodeText } from '@/utils/compositor/nodesHelper';
import { cloneDeep } from '@/utils/helpers';
import { processClassesForViewports } from '@/utils/compositor/reduceNodesClassNames';
import SelectedTailwindClass from '@/components/fields/SelectedTailwindClass';
import { tagTitles } from '@/types/compositorTypes';
import type {
  Tag,
  FlatNode,
  MarkdownPaneFragmentNode,
  GridLayoutNode,
} from '@/types/compositorTypes';

type SpanOverride = {
  mobile?: Record<string, string>;
  tablet?: Record<string, string>;
  desktop?: Record<string, string>;
};

const spanStyleClasses: SpanOverride[] = [
  {
    mobile: {
      bgCLIP: 'text',
      bgGradientDIRECTION: 'r',
      gradientFrom: 'blue-600',
      gradientTo: 'teal-500',
      textCOLOR: 'transparent',
    },
  },
  {
    mobile: {
      textCOLOR: 'blue-600',
    },
  },
  {
    mobile: {
      bgCOLOR: 'yellow-300',
      textCOLOR: 'slate-900',
      px: '1',
      rounded: 'sm',
    },
  },
  {
    mobile: {
      display: 'inline-block',
      bgCOLOR: 'indigo-100',
      textCOLOR: 'indigo-700',
      textSIZE: 'xs',
      fontWEIGHT: 'bold',
      px: '2.5',
      py: '0.5',
      rounded: 'full',
    },
  },
  {
    mobile: {
      bgCLIP: 'text',
      textCOLOR: 'transparent',
      bgGradientDIRECTION: 'r',
      gradientFrom: 'orange-400',
      gradientVia: 'pink-500',
      gradientTo: 'purple-600',
      fontWEIGHT: 'bold',
    },
  },
  {
    mobile: {
      textDECORATION: 'underline',
      textDECORATIONSTYLE: 'wavy',
      textDECORATIONCOLOR: 'teal-400',
      textDECORATIONTHICKNESS: '4',
      textUNDERLINEOFFSET: '4',
    },
  },
  {
    mobile: {
      display: 'inline-block',
      bgCOLOR: 'rose-500',
      textCOLOR: 'white',
      px: '2',
      skew: '-3',
    },
  },
];

export interface StyleElementPanelProps {
  node: FlatNode;
  parentNode: MarkdownPaneFragmentNode | GridLayoutNode;
  onTitleChange?: (title: string) => void;
}

const StyleElementPanel = ({
  node,
  parentNode,
  onTitleChange,
}: StyleElementPanelProps) => {
  const [showPresets, setShowPresets] = useState(true);

  if (
    !node?.tagName ||
    (!isMarkdownPaneFragmentNode(parentNode) && !isGridLayoutNode(parentNode))
  ) {
    return null;
  }

  const defaultClasses = parentNode.defaultClasses?.[node.tagName];
  const overrideClasses = node.overrideClasses;

  const hasOverrides = useMemo(() => {
    return (
      overrideClasses &&
      ((overrideClasses.mobile &&
        Object.keys(overrideClasses.mobile).length > 0) ||
        (overrideClasses.tablet &&
          Object.keys(overrideClasses.tablet).length > 0) ||
        (overrideClasses.desktop &&
          Object.keys(overrideClasses.desktop).length > 0))
    );
  }, [overrideClasses]);

  const mergedClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    if (defaultClasses) {
      Object.keys(defaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: defaultClasses.mobile[className],
          ...(defaultClasses.tablet && {
            tablet: defaultClasses.tablet[className],
          }),
          ...(defaultClasses.desktop && {
            desktop: defaultClasses.desktop[className],
          }),
        };
      });
    }

    if (overrideClasses) {
      ['mobile', 'tablet', 'desktop'].forEach((viewport) => {
        const viewportOverrides =
          overrideClasses[viewport as keyof typeof overrideClasses];
        if (viewportOverrides) {
          Object.entries(viewportOverrides).forEach(([className, value]) => {
            if (!result[className]) {
              result[className] = { mobile: value };
            } else {
              result[className] = {
                ...result[className],
                [viewport]: value,
              };
            }
          });
        }
      });
    }

    return result;
  }, [defaultClasses, overrideClasses]);

  const handleClickAdd = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: `style-element-add`,
      expanded: true,
    });
  };

  const handleRemove = (className: string) => {
    settingsPanelStore.set({
      nodeId: node.id,
      className,
      action: `style-element-remove`,
      expanded: true,
    });
  };

  const handleUpdate = (className: string) => {
    styleElementInfoStore.setKey('className', className);
    settingsPanelStore.set({
      nodeId: node.id,
      className,
      action: `style-element-update`,
      expanded: true,
    });
  };

  const applySpanPreset = (styleIndex: number) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const targetNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    if (!targetNode) return;

    const preset = spanStyleClasses[styleIndex];

    targetNode.overrideClasses = {
      ...targetNode.overrideClasses,
      ...preset,
    };

    ctx.modifyNodes([{ ...targetNode, isChanged: true }]);

    setShowPresets(false);
  };

  useEffect(() => {
    if (
      styleElementInfoStore.get().markdownParentId !== parentNode.id ||
      styleElementInfoStore.get().tagName !== node.tagName
    ) {
      styleElementInfoStore.set({
        markdownParentId: parentNode.id,
        tagName: node.tagName,
        overrideNodeId: null,
        className: null,
      });
    }

    return () => {
      resetStyleElementInfo();
    };
  }, [parentNode.id, node.tagName]);

  useEffect(() => {
    if (node?.tagName && onTitleChange) {
      const tagTitle =
        tagTitles[node.tagName as Tag] || node.tagName.toUpperCase();
      onTitleChange(`Style ${tagTitle}`);
    }
  }, [node?.tagName, onTitleChange]);

  const shouldShowQuickStyles =
    node.tagName === 'span' && !hasOverrides && showPresets;
  const nodeText = shouldShowQuickStyles ? getNodeText(node) : '';

  return (
    <div className="space-y-4">
      {node.wordCarouselPayload && (
        <div className="pb-2">
          <div className="text-myblack hover:bg-mygreen/20 w-fit rounded border border-slate-200 p-2 text-sm">
            <div
              title="Configure Word Carousel"
              className="flex items-center gap-2 font-bold"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              <button
                onClick={() =>
                  settingsPanelStore.set({
                    nodeId: node.id,
                    action: 'style-word-carousel',
                    expanded: true,
                  })
                }
              >
                Configure Word Carousel
              </button>
            </div>
          </div>
        </div>
      )}

      {shouldShowQuickStyles ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-mydarkgrey text-sm font-bold">
              Quick Style Selection
            </h3>
            <p className="text-xs text-gray-500">
              Select a preset style for your text selection.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {spanStyleClasses.map((style, index) => {
              const [classesPayload] = processClassesForViewports(
                style as any,
                {},
                1
              );
              const combinedClasses = classesPayload[0] || '';

              return (
                <button
                  key={index}
                  onClick={() => applySpanPreset(index)}
                  className="group w-full text-left text-xl transition-colors hover:outline-dotted hover:outline-2 hover:outline-black"
                >
                  <span className={combinedClasses}>
                    {nodeText || 'Sample Text'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={() => setShowPresets(false)}
              className="text-myblue w-full text-center text-sm underline hover:text-black"
            >
              Apply your own styles manually
            </button>
          </div>
        </div>
      ) : (
        <>
          {Object.keys(mergedClasses).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(mergedClasses).map(([className, values]) => (
                <SelectedTailwindClass
                  key={className}
                  name={className}
                  values={values}
                  onRemove={handleRemove}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <em>No styles.</em>
            </div>
          )}

          <div className="space-y-4">
            <ul className="text-mydarkgrey flex flex-wrap gap-x-4 gap-y-1">
              <li>
                <em>Actions:</em>
              </li>
              <li>
                <button
                  onClick={() => handleClickAdd()}
                  className="text-myblue font-bold underline hover:text-black"
                >
                  Add Style
                </button>
              </li>
              <li>
                <StylesMemory node={node} parentNode={parentNode} />
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default StyleElementPanel;
