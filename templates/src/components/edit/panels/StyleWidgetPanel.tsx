import { useMemo } from 'react';
import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import { settingsPanelStore } from '@/stores/storykeep';
import { StylesMemory } from '@/components/edit/state/StylesMemory';
import SelectedTailwindClass from '@/components/fields/SelectedTailwindClass';
import { isMarkdownPaneFragmentNode } from '@/utils/compositor/typeGuards';
import { widgetMeta } from '@/constants';
import type {
  FlatNode,
  MarkdownPaneFragmentNode,
} from '@/types/compositorTypes';

interface StyleWidgetPanelProps {
  node: FlatNode;
  containerNode: FlatNode;
  outerContainerNode: FlatNode;
  parentNode: MarkdownPaneFragmentNode;
}

const StyleWidgetPanel = ({
  node,
  containerNode,
  outerContainerNode,
  parentNode,
}: StyleWidgetPanelProps) => {
  if (
    !node?.tagName ||
    !containerNode?.tagName ||
    !outerContainerNode?.tagName ||
    !isMarkdownPaneFragmentNode(parentNode)
  ) {
    return null;
  }
  const codeDefaultClasses = parentNode.defaultClasses?.[node.tagName];
  const codeOverrideClasses = node.overrideClasses;
  const containerDefaultClasses =
    parentNode.defaultClasses?.[containerNode.tagName];
  const containerOverrideClasses = containerNode.overrideClasses;
  const outerDefaultClasses =
    parentNode.defaultClasses?.[outerContainerNode.tagName];
  const outerOverrideClasses = outerContainerNode.overrideClasses;

  // Extract the widget type from the node's copy
  const regexpHook =
    /^(identifyAs|youtube|bunny|bunnyContext|toggle|resource|belief|signup)\((.*)\)$/;
  const hookMatch = node.copy?.match(regexpHook);
  const widgetId = hookMatch ? hookMatch[1] : 'unknown';
  const widgetName = widgetMeta[widgetId]?.title || `Widget`;

  // Merge classes for widget
  const mergedImgClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    // Add default classes
    if (codeDefaultClasses) {
      Object.keys(codeDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: codeDefaultClasses.mobile[className],
          ...(codeDefaultClasses.tablet && {
            tablet: codeDefaultClasses.tablet[className],
          }),
          ...(codeDefaultClasses.desktop && {
            desktop: codeDefaultClasses.desktop[className],
          }),
        };
      });
    }

    // Add override classes
    if (codeOverrideClasses) {
      ['mobile', 'tablet', 'desktop'].forEach((viewport) => {
        const viewportOverrides =
          codeOverrideClasses[viewport as keyof typeof codeOverrideClasses];
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
  }, [codeDefaultClasses, codeOverrideClasses]);

  // Merge classes for container
  const mergedContainerClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    if (containerDefaultClasses) {
      Object.keys(containerDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: containerDefaultClasses.mobile[className],
          ...(containerDefaultClasses.tablet && {
            tablet: containerDefaultClasses.tablet[className],
          }),
          ...(containerDefaultClasses.desktop && {
            desktop: containerDefaultClasses.desktop[className],
          }),
        };
      });
    }

    if (containerOverrideClasses) {
      ['mobile', 'tablet', 'desktop'].forEach((viewport) => {
        const viewportOverrides =
          containerOverrideClasses[
            viewport as keyof typeof containerOverrideClasses
          ];
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
  }, [containerDefaultClasses, containerOverrideClasses]);

  // Merge classes for outer container
  const mergedOuterClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    if (outerDefaultClasses) {
      Object.keys(outerDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: outerDefaultClasses.mobile[className],
          ...(outerDefaultClasses.tablet && {
            tablet: outerDefaultClasses.tablet[className],
          }),
          ...(outerDefaultClasses.desktop && {
            desktop: outerDefaultClasses.desktop[className],
          }),
        };
      });
    }

    if (outerOverrideClasses) {
      ['mobile', 'tablet', 'desktop'].forEach((viewport) => {
        const viewportOverrides =
          outerOverrideClasses[viewport as keyof typeof outerOverrideClasses];
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
  }, [outerDefaultClasses, outerOverrideClasses]);

  const handleImgAdd = () => {
    settingsPanelStore.set({
      action: `style-code-add`,
      nodeId: node.id,
      expanded: true,
    });
  };

  const handleContainerAdd = () => {
    settingsPanelStore.set({
      action: `style-code-container-add`,
      nodeId: containerNode.id,
      childId: node.id,
      expanded: true,
    });
  };

  const handleOuterAdd = () => {
    settingsPanelStore.set({
      action: `style-code-outer-add`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      expanded: true,
    });
  };

  const handleImgRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-code-remove`,
      nodeId: node.id,
      className,
      expanded: true,
    });
  };

  const handleContainerRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-code-container-remove`,
      nodeId: containerNode.id,
      childId: node.id,
      className,
      expanded: true,
    });
  };

  const handleOuterRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-code-outer-remove`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      className,
      expanded: true,
    });
  };

  const handleImgUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-code-update`,
      nodeId: node.id,
      className,
      expanded: true,
    });
  };

  const handleContainerUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-code-container-update`,
      nodeId: containerNode.id,
      childId: node.id,
      className,
      expanded: true,
    });
  };

  const handleOuterUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-code-outer-update`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      className,
      expanded: true,
    });
  };

  const handleWidgetConfig = () => {
    settingsPanelStore.set({
      action: `style-code-config`,
      nodeId: node.id,
      expanded: true,
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Setup {widgetName}</h3>

        <div className="pb-2">
          <div className="text-myblack hover:bg-mygreen/20 w-fit rounded border border-slate-200 p-2 text-sm">
            <div
              title="Configure this Widget"
              className="flex items-center gap-2 font-bold"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              <button onClick={() => handleWidgetConfig()}>
                Configure this Widget
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold">Widget Styles</h3>
          {Object.keys(mergedImgClasses).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(mergedImgClasses).map(([className, values]) => (
                <SelectedTailwindClass
                  key={className}
                  name={className}
                  values={values}
                  onRemove={handleImgRemove}
                  onUpdate={handleImgUpdate}
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
                  onClick={handleImgAdd}
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
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold">Container Styles</h3>

        {Object.keys(mergedContainerClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedContainerClasses).map(
              ([className, values]) => (
                <SelectedTailwindClass
                  key={className}
                  name={className}
                  values={values}
                  onRemove={handleContainerRemove}
                  onUpdate={handleContainerUpdate}
                />
              )
            )}
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
                onClick={handleContainerAdd}
                className="text-myblue font-bold underline hover:text-black"
              >
                Add Style
              </button>
            </li>
            <li>
              <StylesMemory node={containerNode} parentNode={parentNode} />
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold">Outer Container Styles</h3>

        {Object.keys(mergedOuterClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedOuterClasses).map(([className, values]) => (
              <SelectedTailwindClass
                key={className}
                name={className}
                values={values}
                onRemove={handleOuterRemove}
                onUpdate={handleOuterUpdate}
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
                onClick={handleOuterAdd}
                className="text-myblue font-bold underline hover:text-black"
              >
                Add Style
              </button>
            </li>
            <li>
              <StylesMemory node={outerContainerNode} parentNode={parentNode} />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StyleWidgetPanel;
